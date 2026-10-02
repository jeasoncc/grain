import { Prec, StateEffect } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { StrictMode } from "react"
import { describe, expect, it, vi } from "vitest"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { OrgCaptureWorkflow } from "./org-capture-workflow.view.fn"

const controller = () =>
	({
		activeBufferId: "origin",
		captureEntry: vi.fn(async () => ({ kind: "rejected", message: "Try later" })),
		isLoading: false,
		isSaving: false,
		openBuffers: [{ bufferId: "origin" }],
		setTransientDirty: vi.fn(),
		switchBuffer: vi.fn(async () => true),
		workspace: { capabilityToken: "token", rootPath: "/root" },
		workspaceSessionId: "g1",
	}) as unknown as OrgWorkspaceController
const choose = () => {
	const input = screen.getByRole("combobox")
	fireEvent.change(input, { target: { value: "todo" } })
	fireEvent.keyDown(input, { key: "Enter" })
	const content = screen.getByRole("textbox", { name: "Capture Org draft" })
	const view = EditorView.findFromDOM(content)!
	act(() =>
		view.dispatch({
			changes: { from: 0, insert: "* TODO Valid draft", to: view.state.doc.length },
		}),
	)
	return { content, view }
}

describe("capture keyboard with real CodeMirror", () => {
	it.each([
		false,
		true,
	])("focuses the newly accepted scratch immediately without stealing later focus (strict=%s)", (strict) => {
		const c = controller()
		const mounted = render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />, {
			wrapper: strict ? StrictMode : undefined,
		})
		const { content, view } = choose()
		expect(content).toHaveFocus()
		const target = screen.getByRole("textbox", { name: "Capture target file" })
		target.focus()
		act(() => view.dispatch({ changes: { from: view.state.doc.length, insert: "\nbody" } }))
		expect(target).toHaveFocus()
		mounted.rerender(
			<OrgCaptureWorkflow controller={{ ...c, isLoading: true }} open onOpenChange={vi.fn()} />,
		)
		expect(view.state.readOnly).toBe(true)
		expect(target).toHaveFocus()
		mounted.rerender(
			<OrgCaptureWorkflow
				controller={{ ...c, workspaceSessionId: "g2" }}
				open
				onOpenChange={vi.fn()}
			/>,
		)
		expect(screen.queryByRole("textbox", { name: "Capture Org draft" })).toBeNull()
	})

	it.each([
		"c",
		"k",
	])("does not arm C-c %s after CodeMirror natively consumes the first C-c", (second) => {
		const c = controller(),
			close = vi.fn(),
			body = vi.fn()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={close} />)
		const { content, view } = choose()
		let consumed = false
		act(() =>
			view.dispatch({
				effects: StateEffect.appendConfig.of(
					Prec.highest(
						EditorView.domEventHandlers({
							keydown: (event) => {
								if (!consumed && event.ctrlKey && event.key === "c") {
									consumed = true
									event.preventDefault()
									return true
								}
								return false
							},
						}),
					),
				),
			}),
		)
		document.body.addEventListener("keydown", body)
		try {
			fireEvent.keyDown(content, { ctrlKey: true, key: "c" })
			fireEvent.keyDown(content, { ctrlKey: true, key: second })
			expect(consumed).toBe(true)
			expect(c.captureEntry).not.toHaveBeenCalled()
			expect(c.switchBuffer).not.toHaveBeenCalled()
			expect(close).not.toHaveBeenCalled()
			expect(body).not.toHaveBeenCalled()
		} finally {
			document.body.removeEventListener("keydown", body)
		}
	})

	it("keeps normal editor prefixes and finish shortcuts, but blocks held save retries", async () => {
		const c = controller()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		const { content } = choose()
		fireEvent.keyDown(content, { ctrlKey: true, key: "s", repeat: true })
		expect(c.captureEntry).not.toHaveBeenCalled()
		await act(async () => {
			fireEvent.keyDown(content, { ctrlKey: true, key: "s" })
		})
		expect(c.captureEntry).toHaveBeenCalledTimes(1)
		await act(async () => {
			fireEvent.keyDown(content, { ctrlKey: true, key: "s", repeat: true })
		})
		expect(c.captureEntry).toHaveBeenCalledTimes(1)
		await act(async () => {
			fireEvent.keyDown(content, { ctrlKey: true, key: "c" })
			fireEvent.keyDown(content, { ctrlKey: true, key: "c" })
		})
		expect(c.captureEntry).toHaveBeenCalledTimes(2)
	})
})
