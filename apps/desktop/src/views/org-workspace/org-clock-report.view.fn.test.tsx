import { undoDepth } from "@codemirror/commands"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, expect, it } from "vitest"
import { render } from "@/test/application-providers"
import { createOrgBufferRuntime, type OrgBufferRuntime } from "@/flows/org-editor-runtime"
import type { OrgEditorCommandTarget } from "@/views/org-editor/org-editor.types"
import { OrgEditor } from "@/views/org-editor/org-editor.view.fn"
import type { OrgClockReportTool } from "@/hooks/use-org-clock-workflow"
import { OrgClockReportView } from "./org-clock-report.view.fn"

const runtimes: OrgBufferRuntime[] = []
afterEach(() => { cleanup(); for (const runtime of runtimes.splice(0)) runtime.close() })
it("checks the captured Source snapshot again at Return activation and retains selectable report bytes after Source retirement", () => {
	const source = "* Clock 😀\r\nbody\0"
	const runtime = createOrgBufferRuntime({ key: { workspaceSessionId: "clock-report", bufferId: "source" }, source, canCommit: () => true, onCommit: () => undefined })
	runtimes.push(runtime)
	let target: OrgEditorCommandTarget | null = null
	const sourceMount = render(<OrgEditor runtime={runtime} value={source} windowId="report-source" documentPath="clock.org" ariaLabel="clock source" onSave={() => {}} onCommandTarget={value => { target = value }} />)
	const capturedTarget = target!
	const transform = capturedTarget.captureSourceTransform!()!
	const origin = { isLive: () => capturedTarget.getCommandContext().available !== false, restore: () => capturedTarget.restoreFocus() }
	const content = "Clock report · clock.org\nCompleted total: 0:00 (0 rows)\nOpen row is recovered/unowned; no elapsed epoch duration was inferred.\n0:00\t0:00\t* Clock 😀"
	const tool: OrgClockReportTool = { id: "retained", sourcePath: "clock.org", content, origin, isCurrent: () => transform.isCurrent() }
	render(<OrgClockReportView tool={tool} onClosed={() => {}} />)
	const view = EditorView.findFromDOM(screen.getByRole("textbox", { name: "clock source" }))!
	const report = screen.getByRole("textbox", { name: "Copy exact Org clock report" })
	expect(screen.getByRole("button", { name: "Return source" })).toBeEnabled()
	report.focus()
	act(() => view.dispatch({ changes: { from: view.state.doc.length, insert: "edited" } }))
	expect(transform.isCurrent()).toBe(false)
	fireEvent.click(screen.getByRole("button", { name: "Return source" }))
	expect(document.activeElement).toBe(report)
	expect(runtime.source).toBe(source + "edited")
	expect(undoDepth(runtime.state)).toBe(1)
	expect(report.textContent).toBe(content)
	sourceMount.unmount()
	expect(report.isConnected).toBe(true)
	expect(report.textContent).toBe(content)
	fireEvent.keyDown(report, { key: "a", ctrlKey: true })
	expect(document.getSelection()?.toString()).toBe(content)
	expect(runtime.source).toBe(source + "edited")
	expect(undoDepth(runtime.state)).toBe(1)
})
