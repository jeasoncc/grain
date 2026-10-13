import { useCallback, useLayoutEffect, useRef } from "react"
import type { OrgRemarkPanel, OrgRemarkWorkflow } from "@/hooks/use-org-remark-workflow"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { OrgEditor, type OrgEditorCommandTarget } from "@/views/org-editor"
import { Button } from "@/views/ui/button"
import { ApplicationToolSurface, useApplicationToolRegistration, useApplicationTools } from "@/views/application/application-tool-provider"

let nextRemarkWindow = 0
function RemarkNotesWindow({ panel, controller, onSave, onInputCommand }: {
	readonly panel: OrgRemarkPanel
	readonly controller: OrgWorkspaceController
	readonly onSave: () => void
	readonly onInputCommand: (id: string) => boolean
}) {
	const windowId = useRef<string | undefined>(undefined)
	if (!windowId.current) windowId.current = `${panel.notes.workspaceSessionId}:remark:${++nextRemarkWindow}`
	const focused = useRef(false)
	useLayoutEffect(() => {
		if (panel.retired || !panel.notes.runtime || panel.notes.runtime.closed) return
		return controller.registerBufferWindow(windowId.current!, panel.notes.bufferId!)
	}, [controller.registerBufferWindow, panel.notes.bufferId, panel.notes.runtime, panel.notes.runtime?.closed, panel.retired])
	const focusNote = useCallback((target: OrgEditorCommandTarget | null) => {
		if (!target || focused.current || !panel.focus || !panel.origin.isLive() || panel.notes.runtime?.closed || !document.hasFocus()) return
		focused.current = true
		target.restoreFocus()
	}, [panel.focus, panel.origin, panel.notes.runtime])
	const entry = panel.entry
	const source = panel.notes.content
	const cursor = entry && entry.bodyFrom === entry.entryTo &&
		(source.endsWith("\r\n\r\n", entry.entryTo) || source.endsWith("\n\n", entry.entryTo))
		? entry.entryTo - (source.endsWith("\r\n", entry.entryTo) ? 2 : 1) : entry?.bodyFrom ?? 0
	return <OrgEditor
		runtime={panel.retired || panel.notes.runtime?.closed ? undefined : panel.notes.runtime ?? undefined}
		windowId={windowId.current}
		sessionKey={`${panel.notes.workspaceSessionId}\u0000${panel.notes.bufferId}:remark`}
		value={panel.notes.content}
		documentPath={panel.notes.document.relativePath}
		documentFilename={`${panel.notes.rootPath.replace(/[\\/]+$/, "")}/${panel.notes.document.relativePath}`}
		captureClockContext={controller.clock.captureSparseContext}
		ariaLabel={`Remark notes for ${panel.sourcePath}`}
		initialCursor={cursor}
		visibleSourceRange={panel.entry ? { from: panel.entry.entryFrom, to: panel.entry.entryTo } : null}
		readOnly={panel.readOnly}
		inputScope="org-remark"
		onInputCommand={onInputCommand}
		onSave={onSave}
		onOpenOrgLink={(target) => { if (!panel.retired && panel.origin.isLive()) void controller.openOrgLink(target) }}
		onOpenFileLink={(relativePath) => { if (!panel.retired && panel.origin.isLive()) void controller.openDocumentPath(relativePath) }}
		onCommandTarget={focusNote}
		getTodoNotePermit={() => panel.readOnly || !panel.origin.isLive() ? () => false : controller.captureBufferWindowPermit(windowId.current!, panel.notes.bufferId!)}
	/>
}

export function OrgRemarkWorkflowView({ workflow, controller }: {
	readonly workflow: OrgRemarkWorkflow
	readonly controller: OrgWorkspaceController
}) {
	const panel = workflow.panel
	return <>
		{workflow.pending && <div role="status" className="flex shrink-0 items-center justify-between border-t px-3 py-1 text-xs text-muted-foreground">
			<span>Reading source-side remark notes…</span>
			<Button variant="ghost" size="sm" onClick={workflow.cancel}>Cancel read</Button>
		</div>}
		{panel && <RemarkPanel panel={panel} workflow={workflow} controller={controller} />}
	</>
}

function RemarkPanel({ panel, workflow, controller }: {
	readonly panel: OrgRemarkPanel
	readonly workflow: OrgRemarkWorkflow
	readonly controller: OrgWorkspaceController
}) {
	const tools = useApplicationTools()
	const owner = panel.notes.runtime!
	const lease = useApplicationToolRegistration(owner, {
		id: `remark:${panel.sourcePath}`, label: `Remarks · ${panel.sourcePath}`, layout: "bottom", active: true,
		state: {
			dirty: panel.notes.content !== panel.notes.document.content,
			pending: false,
			readOnly: panel.readOnly,
			fence: JSON.stringify([panel.notes.workspaceSessionId, panel.notes.runtimeIncarnation, panel.notes.sourceGeneration, panel.focusRequest]),
		},
		captureOrigin: () => panel.origin,
		requestClose: () => { workflow.closePanel(); return true },
		dispose: workflow.drainNotes,
	})
	const windowId = tools.tools.find((tool) => tool.lease === lease)?.windowId
	const live = useRef({ panel, workflow })
	live.current = { panel, workflow }
	const current = () => live.current.panel.notes.runtime === panel.notes.runtime &&
		live.current.panel.notes.workspaceSessionId === panel.notes.workspaceSessionId &&
		live.current.panel.notes.runtimeIncarnation === panel.notes.runtimeIncarnation &&
		live.current.panel.focusRequest === panel.focusRequest &&
		tools.registry.getSnapshot().some((tool) => tool.lease === lease && tool.open && !tool.closing && tool.windowId === windowId)
	const saveNotes = () => {
		if (current() && !live.current.panel.readOnly) live.current.workflow.saveNotes()
	}
	const returnSource = () => { if (current() && !live.current.panel.retired) void tools.restoreOrigin(lease) }
	const executeInputCommand = (id: string): boolean => {
		if (!current()) return false
		if (id === "org-remark.save") {
			if (live.current.panel.readOnly) return false
			saveNotes()
			return true
		}
		if (id === "org-remark.return-source") {
			if (live.current.panel.retired) return false
			returnSource()
			return true
		}
		return false
	}
	return <ApplicationToolSurface lease={lease}>
		<aside aria-label="Source-side remarks" data-org-remark-note-window="true" className="flex min-h-64 max-h-[45vh] shrink-0 flex-col border-t border-border bg-background">
			<header className="flex min-h-9 shrink-0 items-center gap-2 border-b bg-muted/20 px-3 text-xs">
				<span className="min-w-0 flex-1 truncate" title={panel.notes.document.relativePath}>
					{panel.entry ? `Remark: ${panel.entry.heading}` : panel.notes.document.relativePath}
				</span>
				{panel.notes.content !== panel.notes.document.content && <span>Unsaved *</span>}
				{panel.readOnly && <span>Read-only</span>}
				<Button variant="ghost" size="sm" disabled={panel.retired || !panel.origin.isLive()} onClick={returnSource}>Source</Button>
				<Button variant="ghost" size="sm" disabled={panel.readOnly} onClick={saveNotes}>Save notes</Button>
				<Button variant="ghost" size="sm" aria-label="Close remark window" onClick={() => { void tools.close(lease) }}>Close</Button>
			</header>
			<div className="min-h-0 flex-1 overflow-hidden">
				<RemarkNotesWindow key={`${panel.notes.runtimeIncarnation}:${panel.focusRequest}`}
					panel={panel} controller={controller} onSave={saveNotes} onInputCommand={executeInputCommand} />
			</div>
		</aside>
	</ApplicationToolSurface>
}
