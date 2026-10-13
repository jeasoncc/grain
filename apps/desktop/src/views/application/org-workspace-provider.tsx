import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react"
import { useOrgWorkspace, type OrgWorkspaceController } from "@/hooks/use-org-workspace"
import type { ApplicationCommandDescriptor } from "./application-command-provider"
import { useTrustedCompiledExtension } from "./trusted-compiled-extension"
import { registerOrgNativeClockHandler, registerOrgNativeWorkflowHandler, type OrgNativeWorkflowHandler } from "@/flows/org-native-window/org-native-workflow-bridge"

const OrgWorkspaceContext = createContext<OrgWorkspaceController | null>(null)

/** UI routes share this owner; native projections never mount another workspace. */
export function OrgWorkspaceProvider({ children }: { readonly children: ReactNode }) {
	const controller = useOrgWorkspace()
 const latestController = useRef(controller)
 latestController.current = controller
 useEffect(() => registerOrgNativeClockHandler((source, filename) => latestController.current.clock.captureSparseClock(source, filename)), [])
	return <OrgWorkspaceContext.Provider value={controller}>
		<div className="flex h-full min-h-0 flex-col">
			<div className="min-h-0 flex-1">{children}</div>
			{controller.nativeWindows.length !== 0 && <nav aria-label="Native Source windows" className="flex shrink-0 flex-wrap gap-3 border-t px-3 py-1 text-xs">
				{controller.nativeWindows.map((window) => <NativeWindowItem key={`${window.windowId}:${window.generation}`} controller={controller} window={window} />)}
			</nav>}
		</div>
	</OrgWorkspaceContext.Provider>
}

export function useOrgWorkspaceController(): OrgWorkspaceController {
	const controller = useContext(OrgWorkspaceContext)
	if (!controller) throw new Error("OrgWorkspaceProvider is required")
	return controller
}

/** The root route installs existing command producers; child windows never mount them. */
export function useOrgNativeWorkflowHandler(handler: OrgNativeWorkflowHandler): void {
 const controller = useOrgWorkspaceController()
 const latest = useRef(handler)
 latest.current = handler
 useEffect(() => registerOrgNativeWorkflowHandler(request => latest.current(request)), [controller.workspaceSessionId])
}

type NativeWindow = OrgWorkspaceController["nativeWindows"][number]
function NativeWindowItem({ controller, window }: { readonly controller: OrgWorkspaceController; readonly window: NativeWindow }) {
	const latest = useRef(controller)
	latest.current = controller
	const owner = useMemo(() => ({}), [window.windowId, window.generation])
	const current = () => latest.current.nativeWindows.find((candidate) =>
		candidate.label === window.label && candidate.generation === window.generation && candidate.created,
	)
	const commands: readonly ApplicationCommandDescriptor[] = [
		{
			id: `window.attach.${window.label}`, label: `Attach native Source: ${window.path}`, group: "Native windows",
			getDisabledReason: () => current()?.status === "live" ? null : "The native Source lease is not live.",
			capture: () => async () => {
				const accepted = await latest.current.attachNativeWindow(window.label, window.generation)
				return accepted
					? { kind: "success", message: "Source activated in main; native view close requested." }
					: { kind: "rejected", message: "Native Source activation was refused or its window lease changed." }
			},
		},
		{
			id: `window.close.${window.label}`, label: `Request native view close: ${window.path}`, group: "Native windows",
			getDisabledReason: () => current() ? null : "The native window was replaced or has not been created.",
			capture: () => async () => {
				const accepted = await latest.current.closeNativeWindow(window.label, window.generation)
				return accepted
					? { kind: "success", message: "Close requested; confirm/copy retained input in the native view. Its logical buffer is not closed." }
					: { kind: "rejected", message: "The native close request was not delivered to the captured window generation." }
			},
		},
		{
			id: `window.rebind.${window.label}`, label: `Bind native view to current main buffer: ${window.path}`, group: "Native windows",
			getDisabledReason: () => current()?.status === "live" && latest.current.activeBufferId ? null : "A live native view and main buffer are required.",
			capture: () => {
				const bufferId = latest.current.activeBufferId
				if (!bufferId) return { kind: "rejected", message: "No main buffer is selected." }
				return async () => {
					const accepted = await latest.current.rebindNativeWindow(window.label, window.generation, bufferId)
					return accepted
						? { kind: "success", message: "Native binding changed to the captured main buffer; projection requested." }
						: { kind: "rejected", message: "Native rebinding was refused; the window generation or target file is no longer ready." }
				}
			},
		},
	]
	useTrustedCompiledExtension({ identity: owner, commands })
	return <span className="inline-flex items-center gap-2">
		<span>{window.path} · {window.created ? window.status : "creating"}</span>
		<button type="button" disabled={!window.created || window.status !== "live"} onClick={() => { void controller.attachNativeWindow(window.label, window.generation) }}>Attach</button>
		<select aria-label={`Bind native view ${window.path}`} value={window.bufferId}
			disabled={!window.created || window.status !== "live" || controller.isWorkspaceBlocked}
			onChange={(event) => { void controller.rebindNativeWindow(window.label, window.generation, event.currentTarget.value) }}>
			{controller.liveBuffers.map((buffer) => <option key={buffer.bufferId} value={buffer.bufferId}>{buffer.document.relativePath}</option>)}
			{!controller.liveBuffers.some((buffer) => buffer.bufferId === window.bufferId) && <option value={window.bufferId}>{window.path} (retired)</option>}
		</select>
		<button type="button" disabled={!window.created} onClick={() => { void controller.closeNativeWindow(window.label, window.generation) }}>Close view</button>
	</span>
}
