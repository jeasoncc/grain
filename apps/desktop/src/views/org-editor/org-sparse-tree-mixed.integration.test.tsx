import { editorOffsetFromSource } from "./org-source-offset.pipe"
import { Decoration, EditorView } from "@codemirror/view"
import { act, cleanup, screen } from "@testing-library/react"
import { render } from "@/test/application-providers"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { OrgEditorCommandTarget } from "./org-editor.types"
import { OrgEditor } from "./org-editor.view.fn"
import { orgSparseTreeField } from "./org-sparse-tree.extension"
import { undoDepth } from "@codemirror/commands"
import { createOrgBufferRuntime } from "@/flows/org-editor-runtime"

describe("mixed raw heading boundaries", () => {
	afterEach(cleanup)
	it.each(["\r\n", "\r", "\n"])("renders matched and hidden headings following %j", (separator) => {
		const raw = `preamble\r\nbody${separator}* TODO Keep\nvisible body${separator}* DONE Hide\r\nhidden body${separator}* TODO Last\r\nlast body`
		let target: OrgEditorCommandTarget | null = null
		render(
			<OrgEditor
				value={raw}
				onChange={vi.fn()}
				onSave={vi.fn()}
				ariaLabel="mixed"
				onCommandTarget={(next) => {
					target = next
				}}
			/>,
		)
		const view = EditorView.findFromDOM(screen.getByRole("textbox", { name: "mixed" }))!
		act(() => {
			expect(target!.applyView!(raw, { kind: "sparse-tree", query: "todo" })).toBe(true)
		})
		expect(view.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([
			raw.indexOf("* TODO Keep"),
			raw.indexOf("* TODO Last"),
		])
		expect(view.state.field(orgSparseTreeField)!.plan?.hiddenRanges).toEqual([
			{ from: raw.indexOf("* DONE Hide"), to: raw.indexOf("* TODO Last") },
		])
		const markers: { from: number; to: number; type: Function }[] = []
		view.state
			.field(orgSparseTreeField)!
			.decorations.between(0, view.state.doc.length, (from, to, decoration) => {
				if (decoration.spec.class === "cm-org-sparse-match")
					markers.push({ from, to, type: decoration.constructor })
			})
		expect(markers).toEqual(
			["* TODO Keep", "* TODO Last"].map((heading) => ({
				from: editorOffsetFromSource(raw, raw.indexOf(heading), view.state.lineBreak),
				to: editorOffsetFromSource(
					raw,
					raw.indexOf(heading) + heading.length,
					view.state.lineBreak,
				),
				type: Decoration.mark({}).constructor,
			})),
		)
		expect(
			[...view.dom.querySelectorAll(".cm-org-sparse-match")].map((node) => node.textContent),
		).toEqual(["* TODO Keep", "* TODO Last"])
		expect(view.dom.textContent).not.toContain("* DONE Hide")
		expect(view.dom.textContent).toContain("visible body")
		expect(view.dom.textContent).toContain("last body")
		expect(view.dom.textContent).not.toContain("hidden body")
		expect(view.state.sliceDoc()).toBe(raw)
	})
	it("consumes GNU tag groups and explicit local grouping in one window, rejects hidden edits and clears without touching Source history", () => {
		const raw = "#+FILETAGS: :file:\r\n#+TAGS: [ family : work home ]\r\n* Root :work:\r\n** TODO Keep 😀\r\nvisible body\0\r\n** TODO Blocked :boss:\r\nhidden body\r\n* TODO Local :home:\r\nlocal body\r\n* TODO Outside :file:\r\noutside body"
		const runtime = createOrgBufferRuntime({ key: { bufferId: "grouped", workspaceSessionId: "sparse" }, source: raw, canCommit: () => true, onCommit: () => undefined })
		let target: OrgEditorCommandTarget | null = null
		const mounted = render(<>
			<OrgEditor runtime={runtime} value={raw} windowId="grouped" ariaLabel="grouped" documentPath="sparse.org" onSave={() => {}} onCommandTarget={next => { target = next }} />
			<OrgEditor runtime={runtime} value={raw} windowId="grouped-peer" ariaLabel="grouped peer" documentPath="sparse.org" onSave={() => {}} />
		</>)
		try {
			const view = EditorView.findFromDOM(screen.getByRole("textbox", { name: "grouped" }))!
			const peer = EditorView.findFromDOM(screen.getByRole("textbox", { name: "grouped peer" }))!
			const expected = [raw.indexOf("** TODO Keep"), raw.indexOf("* TODO Local")]
			act(() => { expect(target!.applyView!(raw, { kind: "sparse-tree", query: "+family-boss/!TODO" })).toBe(true) })
			expect(view.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual(expected)
			expect(peer.state.field(orgSparseTreeField)).toBeNull()
			act(() => { expect(target!.applyView!(raw, { kind: "sparse-tree", query: "match: (itag:work OR tag:home) AND todo:TODO AND NOT tag:boss" })).toBe(true) })
			expect(view.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual(expected)
			expect(view.contentDOM.textContent).not.toContain("hidden body")
			expect(peer.contentDOM.textContent).toContain("hidden body")
			act(() => {
				expect(target!.applyEdits!(raw, { changes: [{ from: raw.indexOf("hidden body"), to: raw.indexOf("hidden body") + 6, insert: "forged" }], cursor: raw.indexOf("hidden body") })).toBe(false)
			})
			expect(runtime.source).toBe(raw)
			expect(runtime.revision).toBe(0)
			expect(undoDepth(runtime.state)).toBe(0)
			act(() => { expect(target!.applyView!(raw, { kind: "sparse-tree", query: null })).toBe(true) })
			expect(view.state.field(orgSparseTreeField)).toBeNull()
			expect(view.contentDOM.textContent).toContain("hidden body")
			expect(peer.state.field(orgSparseTreeField)).toBeNull()
			expect(runtime.source).toBe(raw)
			expect(undoDepth(runtime.state)).toBe(0)
		} finally { mounted.unmount(); runtime.close() }
	})
})
