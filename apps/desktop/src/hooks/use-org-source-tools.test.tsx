import { EditorSelection } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { undoDepth } from "@codemirror/commands"
import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { render } from "@/test/application-providers"
import { createOrgBufferRuntime } from "@/flows/org-editor-runtime"
import type { ApplicationCommandResult } from "@/flows/application-command-registry"
import type { OrgBabelExecution } from "@/flows/org-execution/org-babel-execution"
import { OrgEditor } from "@/views/org-editor/org-editor.view.fn"
import type { OrgEditorCommandTarget } from "@/views/org-editor/org-editor.types"
import type { OrgWorkspaceController } from "./use-org-workspace"
import { useOrgSourceTools } from "./use-org-source-tools"
import { orgExecutionService } from "@/io/execution/org-execution.service"
import type { OrgExternalExecutionResult } from "@/io/execution/org-execution.types"
import { orgFileRepository } from "@/io/file/org-file.repository"
import * as E from "fp-ts/Either"

interface ConsumerTools {
	readonly babelTools: readonly OrgBabelExecution[]
	readonly captureBabel: (executionKind: "babel" | "table") => (() => ApplicationCommandResult) | null
	readonly captureExport: (format: "html" | "markdown") => (() => ApplicationCommandResult) | null
}

describe("compiled builtin Source tool consumer", () => {
	afterEach(() => { cleanup(); vi.restoreAllMocks() })
	it("captures a nonactive real Source origin and applies through canonical transforms with all selections and one undo", async () => {
		const source = "#+UNKNOWN: 🧪\r\n#+begin_src emacs-lisp\r\n(+ 1 2)\r\n#+end_src\r\nlone\rraw LF\n"
		const runtime = createOrgBufferRuntime({ source, key: { workspaceSessionId: "source-tools", bufferId: "buffer" }, canCommit: () => true, onCommit: () => {} })
		const document = { relativePath: "a.org", revision: "disk-revision", content: source }
		let permitLive = true
		// Only the host scope ports consumed by this builtin are supplied; Source is a real canonical runtime/editor.
		const controller = { workspaceSessionId: "source-tools", workspace: { rootPath: "/approved", capabilityToken: "test-grant", documents: [document], directories: [] },
			activeBufferRuntime: null, activeDocument: null, liveBuffers: [{ runtime, document }], captureBufferWindowPermit: () => () => permitLive } as unknown as OrgWorkspaceController
		let target: OrgEditorCommandTarget | null = null
		let tools: ConsumerTools | null = null
		function Consumer() {
			tools = useOrgSourceTools({ controller, getTarget: () => target,
				captureOrigin: () => ({ isLive: () => permitLive, restore: () => {} }) })
			return <OrgEditor runtime={runtime} windowId="source-tools-window" documentPath="a.org" value={source} ariaLabel="Compiled Source" onSave={() => {}} onCommandTarget={(value) => { target = value }} />
		}
		const mounted = render(<Consumer />)
		const view = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Compiled Source" }))!
		const selection = EditorSelection.create([EditorSelection.cursor(3, 1, 1, 7), EditorSelection.range(42, 39, 12, 2, -1)], 1)
		act(() => view.dispatch({ selection }))
		const open = tools!.captureBabel("babel")!
		act(() => { expect(open().kind).toBe("success") })
		const execution = tools!.babelTools[0]
		const insertion = "#+RESULTS:\r\n: 😀\r\n"
		const at = source.indexOf("lone")
		const editorAt = at - (source.slice(0, at).match(/\r\n/g)?.length ?? 0)
		const expectedSelection = selection.map(view.state.changes({ from: editorAt, insert: insertion }))
		await act(async () => {
			expect(await execution.source.applyResults(source, { changes: [{ from: at, to: at, insert: insertion }], cursor: source.length })).toBe(true)
		})
		expect(runtime.source).toBe(source.slice(0, at) + insertion + source.slice(at))
		expect(view.state.selection.eq(expectedSelection, true)).toBe(true)
		expect(view.state.selection.mainIndex).toBe(1)
		expect(view.state.selection.ranges).toHaveLength(2)
		expect(undoDepth(runtime.state)).toBe(1)
		act(() => fireEvent.keyDown(view.contentDOM, { ctrlKey: true, key: "z", keyCode: 90 }))
		expect(runtime.source).toBe(source)
		await act(async () => { expect(await execution.source.applyResults(source, { changes: [{ from: 0, to: 0, insert: "ABA" }], cursor: 0 })).toBe(false) })
		const staleExport = tools!.captureExport("html")!
		permitLive = false
		act(() => { expect(staleExport().kind).toBe("rejected") })
		permitLive = true
		const retiredOpen = tools!.captureBabel("babel")!
		mounted.unmount()
		expect(retiredOpen().kind).toBe("rejected")
		expect(runtime.closed).toBe(false)
		expect(runtime.source).toBe(source)
		runtime.close()
	})
	it.each([false, true])("applies a native-shaped receipt through the real Source exactly once, unless its source generation has ABA changed=%s", async (aba) => {
		const source = "#+begin_src emacs-lisp\n(+ 1 2)\n#+end_src\n"
		const runtime = createOrgBufferRuntime({ source, key: { workspaceSessionId: "babel-apply", bufferId: "source" }, canCommit: () => true, onCommit: () => {} })
		const document = { relativePath: "a.org", revision: "disk-revision", content: source }
		const controller = { workspaceSessionId: "babel-apply", workspace: { rootPath: "/approved", capabilityToken: "captured-grant", documents: [document], directories: [] },
			activeBufferRuntime: runtime, activeDocument: document, liveBuffers: [{ runtime, document }], captureBufferWindowPermit: () => () => true } as unknown as OrgWorkspaceController
		let target: OrgEditorCommandTarget | null = null
		let tools: ConsumerTools | null = null
		function Consumer() {
			tools = useOrgSourceTools({ controller, getTarget: () => target, captureOrigin: () => ({ isLive: () => true, restore: () => {} }) })
			return <OrgEditor runtime={runtime} windowId="babel-apply-window" documentPath="a.org" value={source} ariaLabel="Babel applying Source" onSave={() => {}} onCommandTarget={(value) => { target = value }} />
		}
		const insertion = "\n#+RESULTS:\n: 3\n"
		let bytes = new Uint8Array()
		vi.spyOn(orgExecutionService, "getEnabled").mockResolvedValue(true)
		const execute = vi.spyOn(orgExecutionService, "execute").mockImplementation(async (request) => {
			bytes = new TextEncoder().encode(JSON.stringify({ protocol: "grain-org-babel/2", nonce: JSON.parse(request.stdin!).nonce, kind: "results", from: source.length, to: source.length, removed: "", insert: insertion }))
			return { outcome: "completed", executionId: "apply-receipt", stdoutBytes: String(bytes.length), stderrBytes: "0", exitCode: 0, signal: null, error: null }
		})
		vi.spyOn(orgExecutionService, "readOutput").mockImplementation(async ({ stream }) => ({ bytes: stream === "stdout" ? [...bytes] : [], nextOffset: stream === "stdout" ? String(bytes.length) : "0", eof: true }))
		const disk = vi.spyOn(orgFileRepository, "readDocument").mockImplementation(() => async () => E.right(document))
		render(<Consumer />)
		const view = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Babel applying Source" }))!
		act(() => view.dispatch({ selection: EditorSelection.cursor(source.indexOf("(+")) }))
		act(() => { expect(tools!.captureBabel("babel")!().kind).toBe("success") })
		const execution = tools!.babelTools[0]
		await act(async () => {
			await execution.initialize()
			expect(execution.configure("/usr/bin/emacs", {})).toBe(true)
			expect(execute).not.toHaveBeenCalled()
			await execution.runOnce()
		})
		expect(runtime.source).toBe(source)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(execution.getSnapshot().batch).not.toBeNull()
		if (aba) {
			act(() => view.dispatch({ changes: { from: source.indexOf("1"), to: source.indexOf("1") + 1, insert: "9" } }))
			act(() => fireEvent.keyDown(view.contentDOM, { ctrlKey: true, key: "z", keyCode: 90 }))
			expect(runtime.source).toBe(source)
		}
		await act(async () => { expect(await execution.apply()).toBe(!aba) })
		expect(runtime.source).toBe(aba ? source : source + insertion)
		expect(disk).toHaveBeenCalledTimes(aba ? 0 : 1)
		expect(undoDepth(runtime.state)).toBe(aba ? 0 : 1)
		await act(async () => { expect(await execution.apply()).toBe(false) })
		if (!aba) {
			act(() => fireEvent.keyDown(view.contentDOM, { ctrlKey: true, key: "z", keyCode: 90 }))
			expect(runtime.source).toBe(source)
		}
		expect(execute).toHaveBeenCalledTimes(1)
		runtime.close()
	})
	it("retires a real Babel Source producer without releasing a receipt from its accepted native execution", async () => {
		const source = "#+begin_src emacs-lisp\n(+ 1 2)\n#+end_src\n"
		const runtime = createOrgBufferRuntime({ source, key: { workspaceSessionId: "babel-retirement", bufferId: "source" }, canCommit: () => true, onCommit: () => {} })
		const document = { relativePath: "a.org", revision: "disk-revision", content: source }
		const controller = { workspaceSessionId: "babel-retirement", workspace: { rootPath: "/approved", capabilityToken: "captured-grant", documents: [document], directories: [] },
			activeBufferRuntime: runtime, activeDocument: document, liveBuffers: [{ runtime, document }], captureBufferWindowPermit: () => () => true } as unknown as OrgWorkspaceController
		let target: OrgEditorCommandTarget | null = null
		let tools: ConsumerTools | null = null
		function Consumer() {
			tools = useOrgSourceTools({ controller, getTarget: () => target, captureOrigin: () => ({ isLive: () => true, restore: () => {} }) })
			return <OrgEditor runtime={runtime} windowId="babel-retirement-window" documentPath="a.org" value={source} ariaLabel="Babel retiring Source" onSave={() => {}} onCommandTarget={(value) => { target = value }} />
		}
		const bytes = new TextEncoder().encode("literal retained stdout\n未知")
		const native = Promise.withResolvers<OrgExternalExecutionResult>()
		const started = Promise.withResolvers<void>()
		vi.spyOn(orgExecutionService, "getEnabled").mockResolvedValue(true)
		const enable = vi.spyOn(orgExecutionService, "setEnabled").mockResolvedValue(undefined)
		vi.spyOn(orgExecutionService, "execute").mockImplementationOnce(() => { started.resolve(); return native.promise })
		vi.spyOn(orgExecutionService, "readOutput").mockImplementation(async ({ stream }) => ({ bytes: stream === "stdout" ? [...bytes] : [], nextOffset: stream === "stdout" ? String(bytes.length) : "0", eof: true }))
		const release = vi.spyOn(orgExecutionService, "releaseOutput").mockResolvedValue(undefined)
		const mounted = render(<Consumer />)
		const view = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Babel retiring Source" }))!
		act(() => view.dispatch({ selection: EditorSelection.cursor(source.indexOf("(+")) }))
		act(() => { expect(tools!.captureBabel("babel")!().kind).toBe("success") })
		const execution = tools!.babelTools[0]
		await execution.initialize()
		expect(execution.configure("/usr/bin/emacs", {})).toBe(true)
		const running = execution.runOnce()
		await started.promise
		await act(async () => { mounted.rerender(<></>); await Promise.resolve() })
		expect(execution.getSnapshot().closed).toBe(false)
		expect(release).not.toHaveBeenCalled()
		await act(async () => {
			native.resolve({ outcome: "completed", executionId: "retained-receipt", stdoutBytes: String(bytes.length), stderrBytes: "0", exitCode: 1, signal: null, error: null })
			await running
		})
		expect(execution.getSnapshot().closed).toBe(false)
		expect(execution.getSnapshot().pending).toBe(false)
		expect(release).not.toHaveBeenCalled()
		expect((await execution.readPage("stdout", "0")).bytes).toEqual([...bytes])
		expect(await execution.apply()).toBe(false)
		await execution.setEnabled(false)
		expect(enable).not.toHaveBeenCalled()
		expect(runtime.source).toBe(source)
		expect(runtime.closed).toBe(false)
		expect(await execution.close()).toBe(true)
		expect(release).toHaveBeenCalledWith("retained-receipt")
		runtime.close()
	})
})
