import { editorOffsetFromSource } from "./org-source-offset.pipe"
import { Decoration, EditorView } from "@codemirror/view"
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { OrgEditorCommandTarget } from "./org-editor.types"
import { OrgEditor } from "./org-editor.view.fn"
import { orgSparseTreeField } from "./org-sparse-tree.extension"

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
		expect(view.state.field(orgSparseTreeField)!.plan.matchedHeadingStarts).toEqual([
			raw.indexOf("* TODO Keep"),
			raw.indexOf("* TODO Last"),
		])
		expect(view.state.field(orgSparseTreeField)!.plan.hiddenRanges).toEqual([
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
})
