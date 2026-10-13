import { undoDepth, historyField } from "@codemirror/commands"
import { EditorSelection } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { render } from "@/test/application-providers"
import { createOrgBufferRuntime, type OrgBufferRuntime } from "@/flows/org-editor-runtime"
import { OrgEditor } from "@/views/org-editor/org-editor.view.fn"
import type { OrgEditorCommandTarget } from "@/views/org-editor/org-editor.types"
import { editorOffsetFromSource } from "@/views/org-editor/org-source-offset.pipe"
import { parseOrgTableAt } from "@/pipes/org/org-table.pipe"

const source = "outer\0\ud800\r\n* Table 😀\r\n|a\\|b|🧪|\r\n|slash\\\\|界|\r\n* Outside\r\nunchanged\0\udfff"
const runtimes: OrgBufferRuntime[] = []
afterEach(() => { cleanup(); for (const runtime of runtimes.splice(0)) runtime.close() })
const mount = (narrow = false) => {
	const runtime = createOrgBufferRuntime({ key: { workspaceSessionId: "tables", bufferId: "source" }, source, canCommit: () => true, onCommit: () => undefined })
	runtimes.push(runtime)
	let target: OrgEditorCommandTarget | null = null
	render(<>
		<OrgEditor runtime={runtime} value={source} windowId="table-source" documentPath="tables.org" ariaLabel="table source" onSave={() => {}}
			visibleSourceRange={narrow ? { from: source.indexOf("|"), to: source.indexOf("|slash") } : undefined}
			onCommandTarget={value => { target = value }} />
		<OrgEditor runtime={runtime} value={source} windowId="table-peer" documentPath="tables.org" ariaLabel="table peer" onSave={() => {}} />
	</>)
	const view = EditorView.findFromDOM(screen.getByRole("textbox", { name: "table source" }))!
	const peer = EditorView.findFromDOM(screen.getByRole("textbox", { name: "table peer" }))!
	act(() => {
		view.dispatch({ selection: EditorSelection.cursor(editorOffsetFromSource(source, source.indexOf("🧪") + 2, view.state.lineBreak)) })
		peer.dispatch({ selection: EditorSelection.cursor(peer.state.doc.length) })
	})
	return { runtime, view, peer, target: () => target! }
}

describe("production pure table command transactions", () => {
	it.each(["table-align", "table-insert-row-below", "table-move-column-left"] as const)("commits %s once through Source and Undo restores every original raw byte", command => {
		const { runtime, view, peer, target } = mount()
		act(() => { expect(target().executeCommand(command)).toBe(true) })
		expect(undoDepth(runtime.state)).toBe(1)
		expect(view.state.field(historyField, false)).toBeUndefined()
		expect(peer.state.field(historyField, false)).toBeUndefined()
		expect(runtime.source.slice(0, source.indexOf("|"))).toBe(source.slice(0, source.indexOf("|")))
		expect(runtime.source.endsWith("* Outside\r\nunchanged\0\udfff")).toBe(true)
		expect(peer.state.sliceDoc()).toBe(runtime.source)
		expect(peer.state.selection.main.head).toBe(peer.state.doc.length)
		const parsed = parseOrgTableAt(runtime.source, runtime.source.indexOf("|"))
		if (parsed.kind !== "table") throw new Error(parsed.message)
		const values = parsed.table.rows.map(row => row.cells.map(cell => cell.text))
		expect(values).toEqual(command === "table-move-column-left" ? [["🧪", "a|b"], ["界", "slash\\"]]
			: command === "table-insert-row-below" ? [["a|b", "🧪"], ["", ""], ["slash\\", "界"]] : [["a|b", "🧪"], ["slash\\", "界"]])
		act(() => { fireEvent.keyDown(view.contentDOM, { key: "z", keyCode: 90, ctrlKey: true }) })
		expect(runtime.source).toBe(source)
		expect(peer.state.sliceDoc()).toBe(source)
		expect(undoDepth(runtime.state)).toBe(0)
	})
	it.each(["table-align", "table-insert-row-below", "table-move-column-left"] as const)("rejects %s across a narrowed hidden row without a canonical history event", command => {
		const { runtime, target } = mount(true)
		act(() => { expect(target().executeCommand(command)).toBe(false) })
		expect(runtime.source).toBe(source)
		expect(undoDepth(runtime.state)).toBe(0)
	})
})
