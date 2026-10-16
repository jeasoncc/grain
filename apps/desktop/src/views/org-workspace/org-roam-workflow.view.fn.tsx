import { useCallback, useRef, useState } from "react"
import type { OrgRoamCaptureTool } from "@/hooks/use-org-roam-workflow"
import { OrgEditor, type OrgEditorCommandTarget } from "@/views/org-editor"
import { ApplicationToolSurface, useApplicationToolRegistration, useApplicationTools } from "@/views/application/application-tool-provider"
import { useOrgScopedInput } from "@/hooks/use-org-scoped-input"
import type { OrgPrefixSession } from "@/types/editor/org-keymap.interface"
import { OrgWhichKey } from "./org-which-key.view.fn"

/** Full, un-narrowed chronological note source; publication requires explicit Finish. */
export const OrgRoamWorkflowView = ({ tool }: { readonly tool: OrgRoamCaptureTool | null }) =>
	tool ? <RoamScratch key={tool.id} tool={tool} /> : null

const RoamScratch = ({ tool }: { readonly tool: OrgRoamCaptureTool }) => {
	const latest = useRef(tool)
	latest.current = tool
	const [prefix, setPrefix] = useState<OrgPrefixSession | null>(null)
	const composing = useRef(false)
	const scratch = useRef<HTMLDivElement>(null)
	const host = useRef<HTMLElement>(null)
	const bindHost = useCallback((node: HTMLElement | null) => {
		host.current = node
		latest.current.bindHost(node)
	}, [])
	const focused = useRef(false)
	const commandTarget = useRef<OrgEditorCommandTarget | null>(null)
	const owner = useRef({}).current
	const [inputError, setInputError] = useState<string | null>(null)
	const tools = useApplicationTools()
	const fence = useRef({ content: tool.content, readOnly: tool.readOnly, message: tool.message, scope: tool.closeFence, version: 0 })
	if (fence.current.content !== tool.content || fence.current.readOnly !== tool.readOnly || fence.current.message !== tool.message || fence.current.scope !== tool.closeFence)
		fence.current = { content: tool.content, readOnly: tool.readOnly, message: tool.message, scope: tool.closeFence, version: fence.current.version + 1 }
	const lease = useApplicationToolRegistration(owner, {
		id: "org-roam", label: `Org-roam · ${tool.title}`, layout: "bottom", active: true,
		state: { dirty: tool.dirty, pending: tool.pending, readOnly: tool.readOnly, fence: fence.current.version },
		captureOrigin: () => tool.origin,
		requestClose: () => { if (tool.pending) return false; tool.cancel(); return true },
		dispose: tool.drain,
	})
	const windowId = tools.tools.find((item) => item.lease === lease)?.windowId
	const editable = () => tools.registry.getSnapshot().some((item) => item.lease === lease && item.open && !item.closing && item.windowId === windowId)
	const finish = () => {
		if (!editable() || latest.current.readOnly) return
		// Disabled Finish and a readonly contenteditable lose focus in native WebKit.
		// Hand it to this stable owned host before either control is reconfigured.
		if (host.current?.contains(document.activeElement)) host.current.focus({ preventScroll: true })
		latest.current.finish()
	}
	const closeTool = () => { void tools.close(lease) }
	const focusScratch = useCallback((target: OrgEditorCommandTarget | null) => {
		commandTarget.current = target
		if (!target) { focused.current = false; return }
		if (focused.current || composing.current) return
		const before = document.activeElement
		const session = before?.closest("[data-org-parameter-session]")
		if (before !== document.body && !scratch.current?.contains(before) && session?.getAttribute("data-org-parameter-session") !== String(latest.current.id)) return
		focused.current = true
		target.restoreFocus()
	}, [])
	const executeInputCommand = (id: string): boolean => {
		if (id === "org-roam.finish") {
			if (!editable() || latest.current.readOnly || composing.current) return false
			finish()
			return true
		}
		if (id === "org-roam.cancel") {
			if (!editable() || latest.current.pending) return false
			closeTool()
			return true
		}
		return false
	}
	const outerInput = useOrgScopedInput({
		scope: "org-roam", owner,
		active: editable() && !tool.pending,
		execute: executeInputCommand,
		onUnavailable: (id) => setInputError(`Input command "${id}" is unavailable in this tool window.`),
	})
	return (
		<ApplicationToolSurface lease={lease}>
		<section
			ref={bindHost}
			tabIndex={-1}
			aria-label="Org-roam capture tool buffer"
			data-org-parameter-input="true"
			data-org-roam-session={tool.id}
			aria-busy={tool.pending}
			className="shrink-0 border-t border-border bg-background p-3 shadow-lg"
			onCompositionStart={() => { composing.current = true }}
			onCompositionEnd={() => { composing.current = false }}
			onKeyDown={(event) => {
				event.stopPropagation()
				if (event.target instanceof Node && scratch.current?.contains(event.target)) return
				outerInput.handleKeyDown(event.nativeEvent, {
					isComposing: composing.current,
					isParameterInput: Boolean((event.target as Element | null)?.closest?.("[data-org-parameter-session]")),
				})
				if (event.nativeEvent.defaultPrevented) event.preventDefault()
			}}
		>
			<header className="mb-2 font-medium">Org-roam capture · {tool.title} · Full Org scratch</header>
			<p className="mb-2 text-xs">Target: {tool.relativePath} (collision-safe publication)</p>
			<div ref={scratch} className="max-h-[40vh] overflow-auto">
				<OrgEditor
					sessionKey={`org-roam:${tool.id}`}
					value={tool.content}
					initialCursor={tool.content.length}
					onCommandTarget={focusScratch}
					inputScope="org-roam"
					onPrefixChange={setPrefix}
					onInputCommand={executeInputCommand}
					onChange={(content) => { if (editable()) { outerInput.cancel(); latest.current.onChange(content) } }}
					onSave={finish}
					readOnly={tool.readOnly}
					getEditPermission={() => editable() && !latest.current.readOnly && (latest.current.origin?.isLive() ?? true)}
					ariaLabel="Org-roam capture draft"
				/>
			</div>
			<OrgWhichKey prefix={outerInput.prefix ?? prefix} getInputCommandDisabledReason={(id) =>
				id === "org-roam.finish" && tool.readOnly ? "Capture is not editable" :
					id === "org-roam.cancel" && tool.pending ? "Publication is pending" : null} />
			{inputError && <p role="alert">{inputError}</p>}
			{tool.message && <p role="alert">{tool.message}</p>}
			{tool.pending && <output>Publishing note… Started IO cannot be cancelled.</output>}
			<footer className="flex gap-3 text-xs">
				<button type="button" disabled={tool.readOnly} onClick={finish}>Finish</button>
				<button type="button" disabled={tool.pending} onClick={closeTool}>{tool.readOnly ? "Dismiss (no rollback)" : "Cancel"}</button>
				<span>Default keys: C-c C-c / Mod-S finish · C-c C-k / C-g cancel. Configure tool keys in config.json under keymaps.</span>
			</footer>
		</section>
		</ApplicationToolSurface>
	)
}
