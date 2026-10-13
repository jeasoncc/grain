import type { ApplicationCommandResult } from "@/flows/application-command-registry"
import { createOrgBufferRuntime } from "@/flows/org-editor-runtime"
import { type OrgSourceExportTool, useOrgSourceTools } from "@/hooks/use-org-source-tools"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { saveOrgExport, type OrgExportSaveOutcome } from "@/io/file/org-export.service"
import { render } from "@/test/application-providers"
import { act, cleanup, waitFor, fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { type OrgEditorCommandTarget, OrgEditor } from "../org-editor"
import { OrgSourceExportView } from "./org-source-export.view.fn"
import { StrictMode } from "react"
import { EditorView } from "@codemirror/view"
import { undoDepth } from "@codemirror/commands"
import { orgExecutionService } from "@/io/execution/org-execution.service"

vi.mock("@/io/file/org-export.service", () => ({ saveOrgExport: vi.fn() }))

afterEach(() => { cleanup(); vi.clearAllMocks() })

interface ExportConsumer {
	readonly exports: readonly OrgSourceExportTool[]
	readonly captureExport: (format: "html" | "markdown") => (() => ApplicationCommandResult) | null
	readonly closeExport: (id: string) => void
}

function fixture() {
	const source = "#+UNKNOWN: 🧪\r\n* Literal source\r\n未保存 <unsafe> & text\0😀\r\n"
	const runtime = createOrgBufferRuntime({ source, key: { workspaceSessionId: "export-retirement", bufferId: "source" }, canCommit: () => true, onCommit: () => {} })
	const document = { relativePath: "a.org", revision: "disk-revision", content: source }
	const controller = { workspaceSessionId: "export-retirement", workspace: { rootPath: "/approved", capabilityToken: "captured-grant", documents: [document], directories: [] },
		activeBufferRuntime: runtime, activeDocument: document, liveBuffers: [{ runtime, document }], captureBufferWindowPermit: () => () => true } as unknown as OrgWorkspaceController
	let target: OrgEditorCommandTarget | null = null
	let tools: ExportConsumer | null = null
	function Producer() {
		const current = useOrgSourceTools({ controller, getTarget: () => target, captureOrigin: () => ({ isLive: () => true, restore: () => {} }) })
		tools = current
		return <><OrgEditor runtime={runtime} windowId="export-source-window" documentPath="a.org" value={source} ariaLabel="Export Source" onSave={() => {}} onCommandTarget={(value) => { target = value }} />
			{current.exports.map((tool) => <OrgSourceExportView key={tool.id} tool={tool} onClosed={current.closeExport} />)}</>
	}
	return { source, runtime, Producer, getTools: () => tools! }
}

describe("real Source export producer retirement", () => {
	it.each(["html", "markdown"] as const)("exports dirty canonical Source to %s with table/link content and no execution or source/history mutation", async (format) => {
		const f = fixture()
		vi.mocked(saveOrgExport).mockResolvedValueOnce({ kind: "cancelled" })
		const execute = vi.spyOn(orgExecutionService, "execute")
		render(<f.Producer />)
		const view = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Export Source" }))!
		const added = "\n* Unsaved target\n[[https://example.test/read?q=1&x=2][read link]]\n| Name | Value |\n|------+-------|\n| dirty table | 42 |\n#+begin_src emacs-lisp\n(error \"must not execute during export\")\n#+end_src\n"
		act(() => view.dispatch({ changes: { from: view.state.doc.length, insert: added } }))
		const capturedSource = f.runtime.source
		const history = undoDepth(f.runtime.state)
		expect(capturedSource).not.toBe(f.source)
		act(() => { expect(f.getTools().captureExport(format)!().kind).toBe("success") })
		const tool = f.getTools().exports[0]
		const body = screen.getByRole("textbox", { name: "Copy exact Org export output" })
		expect(body.textContent).toBe(tool.content)
		expect(tool.content).toContain("Unsaved target")
		expect(tool.content).toContain("dirty table")
		expect(tool.content).toContain("must not execute during export")
		expect(tool.content).toContain(format === "html" ? '<a href="https://example.test/read?q=1&amp;x=2"' : "[read link](<https://example.test/read?q=1&x=2>)")
		expect(tool.content).toContain(format === "html" ? "<table>" : "| --- | --- |")
		expect(saveOrgExport).not.toHaveBeenCalled()
		expect(execute).not.toHaveBeenCalled()
		fireEvent.click(screen.getByRole("button", { name: "Save export with native picker" }))
		await waitFor(() => expect(screen.getByRole("button", { name: "Save export with native picker" })).toBeEnabled())
		expect(saveOrgExport).toHaveBeenCalledWith({ format, suggestedName: `a.${format === "html" ? "html" : "md"}`, content: tool.content, workspaceRoot: "/approved", capabilityToken: "captured-grant" })
		expect(f.runtime.source).toBe(capturedSource)
		expect(undoDepth(f.runtime.state)).toBe(history)
		expect(execute).not.toHaveBeenCalled()
		execute.mockRestore()
		f.runtime.close()
	})
	it("keeps the original literal output selectable after producer removal and a declined dirty close, but retires its save authority", async () => {
		const f = fixture()
		const mounted = render(<StrictMode><f.Producer /></StrictMode>)
		act(() => { expect(f.getTools().captureExport("html")!().kind).toBe("success") })
		const tool = f.getTools().exports[0]
		const body = screen.getByRole("textbox", { name: "Copy exact Org export output" })
		const frame = body.closest("[data-application-compiled-tool]")!.parentElement
		body.focus()
		document.getSelection()!.setBaseAndExtent(body.firstChild!, 16, body.firstChild!, 1)
		await act(async () => { mounted.rerender(<></>); await Promise.resolve() })
		await waitFor(() => expect(screen.getByRole("button", { name: "Keep draft" })).toBeInTheDocument())
		fireEvent.click(screen.getByRole("button", { name: "Keep draft" }))
		await waitFor(() => expect(screen.getByRole("button", { name: "Close output" })).toBeEnabled())
		expect(screen.getByRole("textbox", { name: "Copy exact Org export output" })).toBe(body)
		expect(body.closest("[data-application-compiled-tool]")!.parentElement).toBe(frame)
		expect(body).toHaveAttribute("aria-readonly", "true")
		expect(body.textContent).toBe(tool.content)
		const selection = document.getSelection()!
		expect([selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset]).toEqual([body.firstChild, 16, body.firstChild, 1])
		expect(selection.toString()).toBe(tool.content.slice(1, 16))
		fireEvent.keyDown(body, { key: "a", ctrlKey: true })
		expect(document.getSelection()!.toString()).toBe(tool.content)
		expect(screen.getByRole("button", { name: "Save export with native picker" })).toBeDisabled()
		await expect(tool.save()).rejects.toThrow("retired")
		expect(saveOrgExport).not.toHaveBeenCalled()
		expect(f.runtime.closed).toBe(false)
		expect(f.runtime.source).toBe(f.source)
		fireEvent.click(screen.getByRole("button", { name: "Close output" }))
		await waitFor(() => expect(screen.getByRole("button", { name: "Close tool" })).toBeInTheDocument())
		fireEvent.click(screen.getByRole("button", { name: "Close tool" }))
		await waitFor(() => expect(body.isConnected).toBe(false))
		f.runtime.close()
	})

	it.each([
		{ kind: "cancelled" },
		{ kind: "saved", path: "/chosen/a.md", recoveryPath: "/chosen/recovery" },
	] as const)("drains an accepted native export save and retains its $kind outcome in the original body until explicit discard", async (outcome) => {
		const f = fixture()
		const native = Promise.withResolvers<OrgExportSaveOutcome>()
		vi.mocked(saveOrgExport).mockImplementationOnce(() => native.promise)
		const mounted = render(<f.Producer />)
		act(() => { expect(f.getTools().captureExport("markdown")!().kind).toBe("success") })
		const tool = f.getTools().exports[0]
		const body = screen.getByRole("textbox", { name: "Copy exact Org export output" })
		body.focus()
		document.getSelection()!.setBaseAndExtent(body.firstChild!, 12, body.firstChild!, 2)
		fireEvent.click(screen.getByRole("button", { name: "Save export with native picker" }))
		expect(saveOrgExport).toHaveBeenCalledTimes(1)
		await act(async () => { mounted.rerender(<></>); await Promise.resolve() })
		expect(body.isConnected).toBe(true)
		expect(screen.getByRole("button", { name: "Close output" })).toBeDisabled()
		expect(screen.queryByRole("button", { name: "Close tool" })).toBeNull()
		await act(async () => { native.resolve(outcome); await Promise.resolve() })
		await waitFor(() => expect(screen.getByRole("button", { name: "Keep draft" })).toBeInTheDocument())
		fireEvent.click(screen.getByRole("button", { name: "Keep draft" }))
		await waitFor(() => expect(screen.getByRole("button", { name: "Close output" })).toBeEnabled())
		expect(screen.getByRole("textbox", { name: "Copy exact Org export output" })).toBe(body)
		expect(body.textContent).toBe(tool.content)
		const selection = document.getSelection()!
		expect([selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset]).toEqual([body.firstChild, 12, body.firstChild, 2])
		expect(selection.toString()).toBe(tool.content.slice(2, 12))
		expect(screen.getByRole("button", { name: "Save export with native picker" })).toBeDisabled()
		expect(f.runtime.source).toBe(f.source)
		fireEvent.click(screen.getByRole("button", { name: "Copy displayed output" }))
		expect(screen.getByRole("alert")).toBeVisible()
		fireEvent.click(screen.getByRole("checkbox", { name: "Hex UTF-8 bytes" }))
		const hexadecimal = screen.getByRole("textbox", { name: "Copy Org export UTF-8 hex bytes" }).textContent!
		expect(Array.from(Uint8Array.from(hexadecimal.split(" "), byte => Number.parseInt(byte, 16)))).toEqual(Array.from(new TextEncoder().encode(tool.content)))
		expect(f.runtime.source).toBe(f.source)
		fireEvent.click(screen.getByRole("button", { name: "Close output" }))
		await waitFor(() => expect(screen.getByRole("button", { name: "Close tool" })).toBeInTheDocument())
		fireEvent.click(screen.getByRole("button", { name: "Close tool" }))
		await waitFor(() => expect(body.isConnected).toBe(false))
		f.runtime.close()
	})
})
