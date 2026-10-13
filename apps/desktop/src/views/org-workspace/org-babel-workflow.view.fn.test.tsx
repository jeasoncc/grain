import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { render } from "@/test/application-providers"
import { createOrgBabelExecution } from "@/flows/org-execution/org-babel-execution"
import type { OrgExecutionService, OrgExternalExecutionResult } from "@/io/execution/org-execution.types"
import { OrgBabelWorkflowView } from "./org-babel-workflow.view.fn"
import { StrictMode } from "react"

afterEach(cleanup)
const SOURCE = "#+PROPERTY: header-args :results output raw\n#+begin_src emacs-lisp\n(princ \"result\")\n#+end_src\n\n#+RESULTS:\n| old |\n"
function fixture() {
	let enabled = false
	let current = true
	const from = SOURCE.indexOf("| old |")
	const pageText = JSON.stringify({ protocol: "grain-org-babel/2", nonce: "intent", kind: "results", from, to: from + 7, removed: "| old |", insert: "* reviewed result" }, null, 2).replace(/\n/g, "\r\n")
	const bytes = new TextEncoder().encode(pageText)
	const applyResults = vi.fn(() => true)
	const validateDisk = vi.fn(async () => true)
	const result = { outcome: "completed" as const, executionId: "receipt", stdoutBytes: String(bytes.length), stderrBytes: "0", exitCode: 0, signal: null, error: null }
	const service: OrgExecutionService = {
		getEnabled: vi.fn(async () => enabled), setEnabled: vi.fn(async (next) => { enabled = next }),
		execute: vi.fn(async () => result),
		readOutput: vi.fn(async ({ stream, offset }) => ({ bytes: stream === "stdout" ? [...bytes.slice(Number(offset))] : [], nextOffset: stream === "stdout" ? String(bytes.length) : "0", eof: true })),
		releaseOutput: vi.fn(async () => undefined),
	}
	const execution = createOrgBabelExecution({ executionKind: "babel", workspaceRoot: "/approved", capabilityToken: "captured-grant", path: "/approved/source.org", source: SOURCE, cursor: 65, isCurrent: () => current, validateDisk, applyResults, origin: { isLive: () => current, restore: vi.fn() } }, service, "intent")
	return { execution, service, result, pageText, applyResults, validateDisk, retire: () => { current = false } }
}
async function prepare() {
	await waitFor(() => expect(screen.getByRole("button", { name: "Enable execution" })).toBeEnabled())
	fireEvent.change(screen.getByRole("textbox", { name: "GNU Emacs interpreter" }), { target: { value: "/usr/bin/emacs" } })
	fireEvent.change(screen.getByRole("textbox", { name: "Babel complete environment" }), { target: { value: '{\n "LANG": "C.UTF-8"\n}' } })
	fireEvent.click(screen.getByRole("button", { name: "Prepare disclosed run" }))
	fireEvent.click(screen.getByRole("button", { name: "Enable execution" }))
	await waitFor(() => expect(screen.getByRole("button", { name: "Run once — request native consent" })).toBeEnabled())
}

describe("real Babel output tool consumer", () => {
	it("requires explicit interpreter, enable and run, discloses immutable execution and never automatically applies", async () => {
		const f = fixture()
		render(<StrictMode><OrgBabelWorkflowView execution={f.execution} onClosed={() => undefined} /></StrictMode>)
		expect(f.service.execute).not.toHaveBeenCalled()
		await prepare()
		expect(f.service.execute).not.toHaveBeenCalled()
		fireEvent.click(screen.getByRole("button", { name: "Run once — request native consent" }))
		await waitFor(() => expect(screen.getByRole("button", { name: "Apply results" })).toBeEnabled())
		expect(f.applyResults).not.toHaveBeenCalled()
		expect(f.validateDisk).not.toHaveBeenCalled()
		fireEvent.click(screen.getByRole("button", { name: "Apply results" }))
		await waitFor(() => expect(f.applyResults).toHaveBeenCalledTimes(1))
		expect(screen.getByRole("button", { name: "Run once — request native consent" })).toBeDisabled()
		expect(screen.getByRole("button", { name: "Apply results" })).toBeDisabled()
	})
	it("keeps Disable available while Run drains and retains the completed read-only output", async () => {
		const f = fixture()
		const native = Promise.withResolvers<OrgExternalExecutionResult>()
		const started = Promise.withResolvers<void>()
		vi.mocked(f.service.execute).mockImplementationOnce(() => { started.resolve(); return native.promise })
		render(<OrgBabelWorkflowView execution={f.execution} onClosed={() => undefined} />)
		await prepare()
		const disclosed = f.execution.getSnapshot().request!
		expect((screen.getByRole("textbox", { name: "Disclosed Babel program" }) as HTMLTextAreaElement).value).toBe(disclosed.program)
		expect(JSON.parse((screen.getByRole("textbox", { name: "Disclosed Babel argv" }) as HTMLTextAreaElement).value)).toEqual(disclosed.argv)
		expect(JSON.parse((screen.getByRole("textbox", { name: "Disclosed Babel environment" }) as HTMLTextAreaElement).value)).toEqual(disclosed.environment)
		expect((screen.getByRole("textbox", { name: "Disclosed Babel stdin" }) as HTMLTextAreaElement).value).toBe(disclosed.stdin)
		fireEvent.click(screen.getByRole("button", { name: "Run once — request native consent" }))
		await started.promise
		expect(screen.getByRole("button", { name: "Disable execution" })).toBeEnabled()
		fireEvent.click(screen.getByRole("button", { name: "Disable execution" }))
		await waitFor(() => expect(f.service.setEnabled).toHaveBeenLastCalledWith(false))
		expect(f.execution.getSnapshot()).toMatchObject({ pending: true, enabled: false })
		expect(screen.getByRole("button", { name: "Close results" })).toBeDisabled()
		expect(f.service.releaseOutput).not.toHaveBeenCalled()
		await act(async () => { native.resolve(f.result); await Promise.resolve() })
		await waitFor(() => expect(screen.getByRole("button", { name: "Apply results" })).toBeEnabled())
		fireEvent.click(screen.getAllByRole("button", { name: "Read first page" })[0])
		await waitFor(() => expect(screen.getByRole("textbox", { name: "Copy Babel stdout page" }).textContent).toBe(f.pageText))
		expect(screen.getByRole("textbox", { name: "Copy Babel stdout page" })).toHaveAttribute("aria-readonly", "true")
		expect(f.service.execute).toHaveBeenCalledTimes(1)
		expect(f.applyResults).not.toHaveBeenCalled()
	})
	it("retired source keeps receipt pages copyable until the user explicitly confirms output tool close", async () => {
		const f = fixture()
		const mounted = render(<OrgBabelWorkflowView execution={f.execution} onClosed={() => undefined} />)
		await prepare()
		fireEvent.click(screen.getByRole("button", { name: "Run once — request native consent" }))
		await waitFor(() => expect(screen.getByRole("button", { name: "Apply results" })).toBeEnabled())
		act(() => { f.retire(); mounted.rerender(<OrgBabelWorkflowView execution={f.execution} onClosed={() => undefined} />) })
		expect(screen.getByRole("button", { name: "Apply results" })).toBeDisabled()
		expect(f.service.releaseOutput).not.toHaveBeenCalled()
		fireEvent.click(screen.getAllByRole("button", { name: "Read first page" })[0])
		await waitFor(() => expect(screen.getByRole("textbox", { name: "Copy Babel stdout page" }).textContent).toBe(f.pageText))
		fireEvent.click(screen.getByRole("button", { name: "Close results" }))
		await waitFor(() => expect(screen.getByRole("button", { name: "Close tool" })).toBeInTheDocument())
		expect(f.service.releaseOutput).not.toHaveBeenCalled()
		fireEvent.click(screen.getByRole("button", { name: "Close tool" }))
		await waitFor(() => expect(f.service.releaseOutput).toHaveBeenCalledTimes(1))
		expect(f.applyResults).not.toHaveBeenCalled()
	})
	it("keeps the original output frame through producer unmount and a declined dirty close after an accepted native receipt arrives", async () => {
		const f = fixture()
		const native = Promise.withResolvers<OrgExternalExecutionResult>()
		const started = Promise.withResolvers<void>()
		vi.mocked(f.service.execute).mockImplementationOnce(() => { started.resolve(); return native.promise })
		const mounted = render(<OrgBabelWorkflowView execution={f.execution} onClosed={() => undefined} />)
		await prepare()
		fireEvent.click(screen.getByRole("button", { name: "Run once — request native consent" }))
		await started.promise
		const environment = screen.getByRole("textbox", { name: "Babel complete environment" }) as HTMLTextAreaElement
		environment.focus(); environment.setSelectionRange(1, 6, "backward")
		const frame = environment.closest("[data-application-compiled-tool]")!.parentElement
		await act(async () => { mounted.rerender(<></>); await Promise.resolve() })
		expect(environment.isConnected).toBe(true)
		expect(environment.readOnly).toBe(true)
		expect(f.service.releaseOutput).not.toHaveBeenCalled()
		expect(screen.queryByRole("button", { name: "Close tool" })).toBeNull()
		await act(async () => { native.resolve(f.result); await Promise.resolve() })
		await waitFor(() => expect(screen.getByRole("button", { name: "Keep draft" })).toBeInTheDocument())
		fireEvent.click(screen.getByRole("button", { name: "Keep draft" }))
		await waitFor(() => expect(screen.getByRole("button", { name: "Close results" })).toBeEnabled())
		expect(environment.closest("[data-application-compiled-tool]")!.parentElement).toBe(frame)
		expect([environment.selectionStart, environment.selectionEnd, environment.selectionDirection]).toEqual([1, 6, "backward"])
		expect(screen.getByRole("button", { name: "Apply results" })).toBeDisabled()
		fireEvent.click(screen.getAllByRole("button", { name: "Read first page" })[0])
		await waitFor(() => expect(screen.getByRole("textbox", { name: "Copy Babel stdout page" }).textContent).toBe(f.pageText))
		const page = screen.getByRole("textbox", { name: "Copy Babel stdout page" })
		page.focus()
		document.getSelection()!.setBaseAndExtent(page.firstChild!, 14, page.firstChild!, 3)
		expect(page).toHaveAttribute("aria-readonly", "true")
		expect(document.getSelection()!.toString()).toBe(f.pageText.slice(3, 14))
		expect(f.service.releaseOutput).not.toHaveBeenCalled()
		expect(f.applyResults).not.toHaveBeenCalled()
		fireEvent.click(screen.getByRole("button", { name: "Close results" }))
		await waitFor(() => expect(screen.getByRole("button", { name: "Close tool" })).toBeInTheDocument())
		fireEvent.click(screen.getByRole("button", { name: "Close tool" }))
		await waitFor(() => expect(f.service.releaseOutput).toHaveBeenCalledTimes(1))
		expect(page.isConnected).toBe(false)
		expect(environment.isConnected).toBe(false)
	})
	it("preserves a UTF-8 BOM, CRLF, NUL and astral stderr page and exposes a lossless hex copy instead of silent clipboard truncation", async () => {
		const f = fixture()
		const literal = "\uFEFFliteral\r\nNUL:\0astral:😀\r\n"
		const stderr = new TextEncoder().encode(literal)
		const stdout = new TextEncoder().encode(f.pageText)
		vi.mocked(f.service.execute).mockResolvedValueOnce({ ...f.result, stderrBytes: String(stderr.length) })
		vi.mocked(f.service.readOutput).mockImplementation(async ({ stream, offset }) => {
			const bytes = stream === "stdout" ? stdout : stderr
			return { bytes: [...bytes.slice(Number(offset))], nextOffset: String(bytes.length), eof: true }
		})
		render(<OrgBabelWorkflowView execution={f.execution} onClosed={() => undefined} />)
		await prepare()
		fireEvent.click(screen.getByRole("button", { name: "Run once — request native consent" }))
		await waitFor(() => expect(screen.getByRole("button", { name: "Apply results" })).toBeEnabled())
		fireEvent.click(screen.getAllByRole("button", { name: "Read first page" })[1])
		const page = screen.getByRole("textbox", { name: "Copy Babel stderr page" })
		await waitFor(() => expect(page.textContent).toBe(literal))
		fireEvent.keyDown(page, { key: "a", ctrlKey: true })
		expect(document.getSelection()!.toString()).toBe(literal)
		fireEvent.click(screen.getAllByRole("button", { name: "Copy displayed page" })[1])
		expect(screen.getByRole("region", { name: "Babel stderr" }).querySelector('[role="alert"]')).toBeVisible()
		fireEvent.click(screen.getAllByRole("checkbox", { name: "Hex bytes" })[1])
		expect(Array.from(Uint8Array.from(page.textContent!.split(" "), byte => Number.parseInt(byte, 16)))).toEqual(Array.from(stderr))
		expect(f.applyResults).not.toHaveBeenCalled()
	})

	it("retains a consumed native intent's failed no-receipt outcome after producer removal until explicit discard", async () => {
		const f = fixture()
		vi.mocked(f.service.execute).mockResolvedValueOnce({ ...f.result, executionId: null, stdoutBytes: "0", stderrBytes: "0", exitCode: 1, error: "Unknown native outcome" })
		const mounted = render(<OrgBabelWorkflowView execution={f.execution} onClosed={() => undefined} />)
		await prepare()
		fireEvent.click(screen.getByRole("button", { name: "Run once — request native consent" }))
		await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("No application"))
		const disclosure = screen.getByRole("textbox", { name: "Disclosed Babel stdin" }) as HTMLTextAreaElement
		const original = disclosure.value
		disclosure.focus(); disclosure.setSelectionRange(2, 20, "backward")
		await act(async () => { mounted.rerender(<></>); await Promise.resolve() })
		await waitFor(() => expect(screen.getByRole("button", { name: "Keep draft" })).toBeInTheDocument())
		fireEvent.click(screen.getByRole("button", { name: "Keep draft" }))
		await waitFor(() => expect(screen.getByRole("button", { name: "Close results" })).toBeEnabled())
		expect(disclosure.isConnected).toBe(true)
		expect(disclosure.value).toBe(original)
		expect(disclosure.readOnly).toBe(true)
		expect([disclosure.selectionStart, disclosure.selectionEnd, disclosure.selectionDirection]).toEqual([2, 20, "backward"])
		expect(screen.getByText(/No application:/)).toHaveTextContent("Unknown native outcome")
		expect(f.service.releaseOutput).not.toHaveBeenCalled()
		fireEvent.click(screen.getByRole("button", { name: "Close results" }))
		await waitFor(() => expect(screen.getByRole("button", { name: "Close tool" })).toBeInTheDocument())
		fireEvent.click(screen.getByRole("button", { name: "Close tool" }))
		await waitFor(() => expect(disclosure.isConnected).toBe(false))
	})
})
