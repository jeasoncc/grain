import { useRef, type ComponentProps, type ReactNode } from "react"
import { render as renderReact, renderHook as renderReactHook, type RenderHookOptions, type RenderOptions } from "@testing-library/react"
import { ConfirmProvider } from "@/views/ui/confirm"
import { ApplicationCommandProvider, useApplicationCommandRegistration, type ApplicationCommandDescriptor } from "@/views/application/application-command-provider"
import { ApplicationToolProvider } from "@/views/application/application-tool-provider"
import { getOrgCommandDisabledReason, orgCommandDefinitions } from "@/flows/org-command/org-workspace-command"
import { OrgDocumentPane, type OrgDocumentCommandPort } from "@/views/org-workspace/org-document-pane.view.fn"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { createOrgClockOwner, type OrgClockOwner } from "@/flows/org-workspace/org-clock-owner"

/** Supply the real epoch owner to isolated controller fixtures, never a guessed clock. */
export function configureApplicationTestClock(clock: OrgClockOwner, controller: OrgWorkspaceController) {
	const workspace = controller.workspace
	const session = controller.workspaceSessionId
	const current = () => controller.workspace === workspace && controller.workspaceSessionId === session
	clock.configure({
		scope: workspace,
		rootPath: workspace?.rootPath ?? null,
		isCurrent: current,
		buffers: () => controller.liveBuffers?.map(buffer => ({ relativePath: buffer.document.relativePath, runtime: buffer.runtime })) ??
			(controller.activeBufferRuntime && controller.activeDocument ? [{ relativePath: controller.activeDocument.relativePath, runtime: controller.activeBufferRuntime }] : []),
		available: path => {
			const id = controller.liveBuffers?.find(buffer => buffer.document.relativePath === path)?.bufferId ??
				(controller.activeDocument?.relativePath === path ? controller.activeBufferId : null)
			const state = id ? controller.getBufferEffectState?.(id) : null
			return current() && !controller.isLoading && !controller.isSaving && !state?.busy && !state?.loading && !state?.saving && !state?.readOnly
		},
		commit: (runtime, source, edits, guard) => guard() && runtime.applyCommandEdits(source, edits),
		agenda: (entry, command, signal, isCurrent) => controller.executeAgendaCommand(entry, command, signal, { isCurrent }),
	})
}

export function createApplicationTestClock(controller: OrgWorkspaceController): OrgClockOwner {
	const clock = createOrgClockOwner()
	configureApplicationTestClock(clock, controller)
	return clock
}

/** Standalone panes use the same captured editor commands as the workspace container. */
export function ApplicationTestDocumentPane(props: Omit<ComponentProps<typeof OrgDocumentPane>, "active">) {
	const fixtureClock = useRef<OrgClockOwner | null>(null)
	if (!props.controller.clock) {
		fixtureClock.current ??= createApplicationTestClock(props.controller)
		Object.assign(props.controller, { clock: fixtureClock.current })
	}
	if (props.controller.clock === fixtureClock.current) configureApplicationTestClock(props.controller.clock, props.controller)
	const owner = useRef({})
	const controllerRef = useRef(props.controller)
	controllerRef.current = props.controller
	const localCommandPortRef = useRef<OrgDocumentCommandPort | null>(null)
	const commandPortRef = props.commandPortRef ?? localCommandPortRef
	const getContext = () => {
		const current = controllerRef.current
		return {
			hasWorkspace: Boolean(current.workspace),
			hasDocument: Boolean(current.activeDocument),
			hasBuffers: Boolean(current.openBuffers?.length),
			hasDirtyBuffers: Boolean(current.openBuffers?.some((buffer) => buffer.isDirty)),
			isDirty: current.isDirty,
			isBusy: props.isBusy,
			sidebarVisible: props.sidebarVisible,
			inspectorVisible: props.inspectorVisible,
			editor: commandPortRef.current?.getContext(current),
		}
	}
	const descriptors: readonly ApplicationCommandDescriptor[] = orgCommandDefinitions
		.filter((definition) => definition.scope === "editor" || definition.id === "save" || definition.id === "save-all")
		.map((definition) => ({
			id: definition.id,
			label: definition.label,
			group: "Org workspace",
			shortcut: "shortcut" in definition ? definition.shortcut : undefined,
			getDisabledReason: () => getOrgCommandDisabledReason(definition.id, getContext()),
			capture: () => {
				const reason = getOrgCommandDisabledReason(definition.id, getContext())
				if (reason) return { kind: "rejected", message: reason }
				const current = controllerRef.current
				if (definition.id === "save") {
					const target = commandPortRef.current?.getTarget(current)
					const context = target?.getCommandContext()
					const bufferId = current.activeBufferId
					const runtime = current.activeBufferRuntime
					const save = current.activeBufferId ? current.captureBufferSave(current.activeBufferId) : null
					if (!target || !context || !save) return { kind: "rejected", message: "The exact Source Save origin is unavailable" }
					return async () => {
						const live = controllerRef.current
						const latest = target.getCommandContext()
						if (live.activeBufferId !== bufferId || live.activeBufferRuntime !== runtime ||
							commandPortRef.current?.getTarget(live) !== target ||
							!latest.available || latest.ownership !== context.ownership || latest.windowId !== context.windowId)
							return { kind: "rejected", message: "The originating Source window changed before Save" }
						return await save() ? { kind: "success" } : { kind: "rejected", message: "The captured Source was not saved" }
					}
				}
				if (definition.id === "save-all") {
					const saveAll = current.saveAllDocuments
					return async () => {
						const result = await saveAll()
						return { kind: result.remainingDirtyPaths.length ? "rejected" : "success" }
					}
				}
				const execute = commandPortRef.current?.capture(definition.id, controllerRef.current)
				if (!execute) return { kind: "rejected", message: "The originating editor window is no longer available" }
				return async () => await execute() ? { kind: "success" } : { kind: "rejected", message: "The originating editor window changed" }
			},
		}))
	useApplicationCommandRegistration(owner.current, descriptors)
	return <OrgDocumentPane {...props} active commandPortRef={commandPortRef} />
}

export function ApplicationTestProviders({ children }: { readonly children: ReactNode }) {
	return <ConfirmProvider><ApplicationCommandProvider><ApplicationToolProvider>{children}</ApplicationToolProvider></ApplicationCommandProvider></ConfirmProvider>
}
export function render(ui: ReactNode, options?: RenderOptions) {
	const Wrapper = options?.wrapper
	return renderReact(ui, { ...options, wrapper: ({ children }) => <ApplicationTestProviders>
		{Wrapper ? <Wrapper>{children}</Wrapper> : children}
	</ApplicationTestProviders> })
}

export function renderHook<Result, Props>(callback: (props: Props) => Result, options?: RenderHookOptions<Props>) {
	const Wrapper = options?.wrapper
	return renderReactHook(callback, { ...options, wrapper: ({ children }) => <ApplicationTestProviders>
		{Wrapper ? <Wrapper>{children}</Wrapper> : children}
	</ApplicationTestProviders> })
}
