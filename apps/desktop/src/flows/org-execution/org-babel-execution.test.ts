import { describe, expect, it, vi } from "vitest"
import type { OrgExecutionService, OrgExternalExecutionResult } from "@/io/execution/org-execution.types"
import { createOrgBabelExecution, type OrgBabelCapturedSource, type OrgBabelExecution } from "./org-babel-execution"

const completed: OrgExternalExecutionResult = { outcome: "completed", executionId: "receipt", stdoutBytes: "0", stderrBytes: "0", exitCode: 0, signal: null, error: null }
const SOURCE = "#+begin_src emacs-lisp :results value\n(+ 1 1)\n#+end_src\n"
function fixture(options: { enabled?: boolean; bytes?: Uint8Array; result?: Partial<OrgExternalExecutionResult> } = {}) {
	let current = true
	let enabled = options.enabled ?? true
	const bytes = options.bytes ?? new TextEncoder().encode(JSON.stringify({ protocol: "grain-org-babel/2", nonce: "intent", kind: "results", from: SOURCE.length, to: SOURCE.length, removed: "", insert: "\n#+RESULTS:\n: 2\n" }))
	const result = { ...completed, stdoutBytes: String(bytes.length), ...options.result }
	const source: OrgBabelCapturedSource = { executionKind: "babel", workspaceRoot: "/approved", capabilityToken: "grant", path: "/approved/test.org", source: SOURCE, cursor: 40, isCurrent: () => current, validateDisk: vi.fn(async () => true), applyResults: vi.fn(() => true), origin: { isLive: () => current, restore: vi.fn() } }
	const service: OrgExecutionService = {
		getEnabled: vi.fn(async () => enabled), setEnabled: vi.fn(async (value) => { enabled = value }), execute: vi.fn(async () => result),
		readOutput: vi.fn(async (request) => { const start = Number(request.offset); const page = request.stream === "stdout" ? bytes.slice(start, start + request.limit) : new Uint8Array(); return { bytes: [...page], nextOffset: String(start + page.length), eof: request.stream === "stderr" || start + page.length === bytes.length } }),
		releaseOutput: vi.fn(async () => undefined),
	}
	const execution = createOrgBabelExecution(source, service, "intent")
	return { execution, source, service, result, retire: () => { current = false } }
}
async function ready(f: { readonly execution: OrgBabelExecution }) {
	await f.execution.initialize()
	expect(f.execution.configure("/usr/bin/emacs", {})).toBe(true)
}

describe("Babel captured source/output ownership", () => {
	it.each([
		{ executionKind: "babel", sourceKind: "inline", source: "src_emacs-lisp{(+ 2 3)}", cursor: 18 },
		{ executionKind: "babel", sourceKind: "call", source: "#+CALL: named(a=2,b=3)\n", cursor: 8 },
		{ executionKind: "table", sourceKind: "table", source: "| 2 | 3 | 0 |\r\n#+TBLFM: $3=$1+$2\r\n", cursor: 2 },
	] as const)("retains a retired accepted $sourceKind run without retries or canonical Apply", async ({ executionKind, sourceKind, source, cursor }) => {
		const f = fixture({ bytes: new TextEncoder().encode("unknown accepted process output") })
		const execution = createOrgBabelExecution({ ...f.source, executionKind, source, cursor }, f.service, "intent")
		await ready({ execution })
		expect(execution.sourceKind).toBe(sourceKind)
		const request = execution.getSnapshot().request!
		const input = JSON.parse(request.stdin!)
		expect(input.sourceKind).toBe(sourceKind)
		expect(input.source).toBe(source)
		const accepted = Promise.withResolvers<void>()
		const native = Promise.withResolvers<OrgExternalExecutionResult>()
		vi.mocked(f.service.execute).mockImplementationOnce(() => { accepted.resolve(); return native.promise })
		const run = execution.runOnce(request)
		await accepted.promise
		const retired = execution.retire()
		native.resolve(f.result)
		await Promise.all([run, retired])
		expect(execution.getSnapshot().used).toBe(true)
		expect(execution.getSnapshot().batch).toBeNull()
		await execution.runOnce(request)
		expect(execution.configure("/usr/bin/emacs", {})).toBe(false)
		expect(f.service.execute).toHaveBeenCalledTimes(1)
		expect(await execution.apply()).toBe(false)
		expect(f.source.applyResults).not.toHaveBeenCalled()
		expect((await execution.readPage("stdout", "0")).bytes).toEqual([...new TextEncoder().encode("unknown accepted process output")])
		expect(f.service.releaseOutput).not.toHaveBeenCalled()
	})

	it("does not auto-enable, auto-run or mutate source; each producer accepts exactly one run", async () => {
		const f = fixture({ enabled: false })
		await ready(f)
		await f.execution.runOnce()
		expect(f.service.execute).not.toHaveBeenCalled()
		expect(f.service.setEnabled).not.toHaveBeenCalled()
		await f.execution.setEnabled(true)
		const first = f.execution.runOnce()
		const second = f.execution.runOnce()
		await Promise.all([first, second])
		await f.execution.runOnce()
		expect(f.service.execute).toHaveBeenCalledTimes(1)
		expect(f.source.applyResults).not.toHaveBeenCalled()
		expect(f.service.releaseOutput).not.toHaveBeenCalled()
	})
	it("rejects a callback for an old prepared intent without acquiring a new baseline", async () => {
		const f = fixture()
		await ready(f)
		const old = f.execution.getSnapshot().request!
		f.execution.configure("/opt/emacs/bin/emacs", { LANG: "C.UTF-8" })
		await f.execution.runOnce(old)
		expect(f.service.execute).not.toHaveBeenCalled()
		expect(f.execution.getSnapshot().used).toBe(false)
	})
	it("revokes a run waiting on the session read even if that read returns an older enabled value", async () => {
		const f = fixture()
		await ready(f)
		const check = Promise.withResolvers<boolean>()
		const checking = Promise.withResolvers<void>()
		vi.mocked(f.service.getEnabled).mockImplementationOnce(() => { checking.resolve(); return check.promise })
		const running = f.execution.runOnce()
		await checking.promise
		await f.execution.setEnabled(false)
		expect(f.execution.getSnapshot().pending).toBe(true)
		expect(f.execution.getSnapshot().enabled).toBe(false)
		check.resolve(true)
		await running
		expect(f.service.execute).not.toHaveBeenCalled()
		expect(f.execution.getSnapshot().enabled).toBe(false)
		expect(f.source.applyResults).not.toHaveBeenCalled()
	})
	it("disables new native execution during an accepted run without releasing its pending fence or receipt", async () => {
		const f = fixture()
		await ready(f)
		const native = Promise.withResolvers<OrgExternalExecutionResult>()
		const started = Promise.withResolvers<void>()
		vi.mocked(f.service.execute).mockImplementationOnce(() => { started.resolve(); return native.promise })
		const running = f.execution.runOnce()
		await started.promise
		await f.execution.setEnabled(false)
		expect(f.service.setEnabled).toHaveBeenCalledWith(false)
		expect(f.execution.getSnapshot()).toMatchObject({ pending: true, enabled: false, result: null })
		expect(await f.execution.close()).toBe(false)
		expect(f.service.releaseOutput).not.toHaveBeenCalled()
		native.resolve(f.result)
		await running
		expect(f.execution.getSnapshot()).toMatchObject({ pending: false, enabled: false, result: f.result })
		expect((await f.execution.readPage("stdout", "0")).bytes.length).toBe(Number(f.result.stdoutBytes))
		expect(await f.execution.apply()).toBe(true)
		expect(await f.execution.apply()).toBe(false)
		expect(f.source.applyResults).toHaveBeenCalledTimes(1)
		expect(f.service.execute).toHaveBeenCalledTimes(1)
		expect(f.service.releaseOutput).not.toHaveBeenCalled()
	})
	it("retains the close fence if execution finishes before its accepted Disable call drains", async () => {
		const f = fixture()
		await ready(f)
		const native = Promise.withResolvers<OrgExternalExecutionResult>()
		const started = Promise.withResolvers<void>()
		const disabled = Promise.withResolvers<void>()
		vi.mocked(f.service.execute).mockImplementationOnce(() => { started.resolve(); return native.promise })
		vi.mocked(f.service.setEnabled).mockImplementationOnce(() => disabled.promise)
		const running = f.execution.runOnce()
		await started.promise
		const revoking = f.execution.setEnabled(false)
		native.resolve(f.result)
		await running
		expect(f.execution.getSnapshot()).toMatchObject({ pending: true, enabled: false, result: f.result })
		expect(await f.execution.close()).toBe(false)
		expect(f.service.releaseOutput).not.toHaveBeenCalled()
		disabled.resolve()
		await revoking
		expect(f.execution.getSnapshot().pending).toBe(false)
		expect((await f.execution.readPage("stdout", "0")).bytes.length).toBe(Number(f.result.stdoutBytes))
		expect(await f.execution.close()).toBe(true)
		expect(f.service.releaseOutput).toHaveBeenCalledTimes(1)
	})
	it("requires fresh source and disk immediately before explicit application, then applies once", async () => {
		const f = fixture()
		await ready(f)
		await f.execution.runOnce()
		expect(f.source.validateDisk).not.toHaveBeenCalled()
		vi.mocked(f.source.validateDisk).mockResolvedValueOnce(false)
		expect(await f.execution.apply()).toBe(false)
		expect(f.source.applyResults).not.toHaveBeenCalled()
		expect(await f.execution.apply()).toBe(true)
		expect(await f.execution.apply()).toBe(false)
		expect(f.source.applyResults).toHaveBeenCalledTimes(1)
	})
	it.each([true, false])("waits for canonical result acknowledgement before publishing applied=%s", async (accepted) => {
		const f = fixture()
		await ready(f)
		await f.execution.runOnce()
		const acknowledgement = Promise.withResolvers<boolean>()
		const submitted = Promise.withResolvers<void>()
		vi.mocked(f.source.applyResults).mockImplementationOnce(() => {
			submitted.resolve()
			return acknowledgement.promise
		})
		const applying = f.execution.apply()
		await submitted.promise
		expect(f.execution.getSnapshot().pending).toBe(true)
		expect(f.execution.getSnapshot().applied).toBe(false)
		expect(await f.execution.close()).toBe(false)
		acknowledgement.resolve(accepted)
		expect(await applying).toBe(accepted)
		expect(f.execution.getSnapshot().applied).toBe(accepted)
		expect(f.execution.getSnapshot().pending).toBe(false)
	})
	it("rechecks source after the fresh disk read instead of adopting an updated origin", async () => {
		const f = fixture()
		await ready(f)
		await f.execution.runOnce()
		const disk = Promise.withResolvers<boolean>()
		vi.mocked(f.source.validateDisk).mockReturnValueOnce(disk.promise)
		const applying = f.execution.apply()
		await Promise.resolve()
		f.retire()
		disk.resolve(true)
		expect(await applying).toBe(false)
		expect(f.source.applyResults).not.toHaveBeenCalled()
		expect(f.service.releaseOutput).not.toHaveBeenCalled()
	})
	it("drains a started execution after retirement, keeps binary output copyable, and releases only on tool close", async () => {
		const f = fixture()
		await ready(f)
		const native = Promise.withResolvers<OrgExternalExecutionResult>()
		const started = Promise.withResolvers<void>()
		vi.mocked(f.service.execute).mockImplementationOnce(() => { started.resolve(); return native.promise })
		const run = f.execution.runOnce()
		await started.promise
		f.retire()
		expect(await f.execution.close()).toBe(false)
		native.resolve(f.result)
		await run
		expect(await f.execution.apply()).toBe(false)
		expect((await f.execution.readPage("stdout", "0")).bytes.length).toBe(Number(f.result.stdoutBytes))
		expect(f.service.releaseOutput).not.toHaveBeenCalled()
		expect(await f.execution.close()).toBe(true)
		await f.execution.dispose()
		expect(f.service.releaseOutput).toHaveBeenCalledTimes(1)
	})
	it("approved disposal drains its accepted native call before releasing the output receipt", async () => {
		const f = fixture()
		await ready(f)
		const native = Promise.withResolvers<OrgExternalExecutionResult>()
		const started = Promise.withResolvers<void>()
		vi.mocked(f.service.execute).mockImplementationOnce(() => { started.resolve(); return native.promise })
		const run = f.execution.runOnce()
		await started.promise
		const disposal = f.execution.dispose()
		expect(f.service.releaseOutput).not.toHaveBeenCalled()
		native.resolve(f.result)
		await Promise.all([run, disposal])
		expect(f.execution.getSnapshot().closed).toBe(true)
		expect(f.service.releaseOutput).toHaveBeenCalledTimes(1)
		expect(f.source.applyResults).not.toHaveBeenCalled()
	})
	it("owner retirement drains an accepted execution without discarding its receipt or granting new native work", async () => {
		const f = fixture()
		await ready(f)
		const native = Promise.withResolvers<OrgExternalExecutionResult>()
		const started = Promise.withResolvers<void>()
		vi.mocked(f.service.execute).mockImplementationOnce(() => { started.resolve(); return native.promise })
		const running = f.execution.runOnce()
		await started.promise
		let drained = false
		const retiring = f.execution.retire().then(() => { drained = true })
		await Promise.resolve()
		expect(drained).toBe(false)
		expect(f.service.releaseOutput).not.toHaveBeenCalled()
		expect(f.execution.configure("/usr/bin/emacs", {})).toBe(false)
		await f.execution.setEnabled(false)
		expect(f.service.setEnabled).not.toHaveBeenCalled()
		native.resolve(f.result)
		await Promise.all([running, retiring])
		expect(drained).toBe(true)
		expect(f.execution.getSnapshot().closed).toBe(false)
		expect(f.execution.getSnapshot().pending).toBe(false)
		expect(await f.execution.apply()).toBe(false)
		expect((await f.execution.readPage("stdout", "0")).bytes.length).toBe(Number(f.result.stdoutBytes))
		await f.execution.initialize()
		await f.execution.runOnce()
		expect(f.service.execute).toHaveBeenCalledTimes(1)
		expect(f.service.getEnabled).toHaveBeenCalledTimes(2)
		expect(f.service.releaseOutput).not.toHaveBeenCalled()
		expect(await f.execution.close()).toBe(true)
		expect(f.service.releaseOutput).toHaveBeenCalledTimes(1)
	})
	it.each([
		{ bytes: new Uint8Array([0xff]) },
		{ bytes: new TextEncoder().encode("not a frame") },
		{ bytes: new TextEncoder().encode(JSON.stringify({ protocol: "grain-org-babel/2", nonce: "other", kind: "results", from: SOURCE.length, to: SOURCE.length, removed: "", insert: "result" })) },
		{ bytes: new TextEncoder().encode(JSON.stringify({ protocol: "grain-org-babel/2", nonce: "intent", kind: "results", from: SOURCE.length - 1, to: SOURCE.length, removed: "stale", insert: "result" })) },
		{ bytes: new TextEncoder().encode(JSON.stringify({ protocol: "grain-org-babel/2", nonce: "intent", kind: "results", from: 0, to: 1, removed: "#", insert: "*" })) },
		{ bytes: new TextEncoder().encode(JSON.stringify({ protocol: "grain-org-babel/2", nonce: "intent", kind: "no-results", from: 0, to: 0, removed: "", insert: "" })) },
		{ result: { outcome: "cancelled-before-start" as const, exitCode: null } },
		{ result: { exitCode: 9 } }, { result: { signal: 15 } },
	])("retains failed/untrusted outcomes with no body application %j", async (options) => {
		const f = fixture(options)
		await ready(f)
		await f.execution.runOnce()
		expect(f.execution.getSnapshot().batch).toBeNull()
		expect(await f.execution.apply()).toBe(false)
		expect(f.source.applyResults).not.toHaveBeenCalled()
		expect(f.service.releaseOutput).not.toHaveBeenCalled()
	})
	it("rejects invalid UTF-8 stderr and malformed page offsets while retaining the receipt", async () => {
		const f = fixture({ result: { stderrBytes: "1" } })
		await ready(f)
		const original = vi.mocked(f.service.readOutput).getMockImplementation()!
		vi.mocked(f.service.readOutput).mockImplementation((request) => request.stream === "stderr"
			? Promise.resolve({ bytes: [255], nextOffset: "1", eof: true }) : original(request))
		await f.execution.runOnce()
		expect(f.execution.getSnapshot().batch).toBeNull()
		expect(await f.execution.apply()).toBe(false)
		expect(f.service.releaseOutput).not.toHaveBeenCalled()
		vi.mocked(f.service.readOutput).mockResolvedValueOnce({ bytes: [1], nextOffset: "2", eof: false })
		await expect(f.execution.readPage("stdout", "0")).rejects.toThrow("Malformed native output page")
		expect(f.service.releaseOutput).not.toHaveBeenCalled()
	})
	it("reads more than one bounded binary page and protects close while a user page read drains", async () => {
		const bytes = new TextEncoder().encode(JSON.stringify({ protocol: "grain-org-babel/2", nonce: "intent", kind: "results", from: SOURCE.length, to: SOURCE.length, removed: "", insert: "\n#+RESULTS:\n" + "x".repeat(70000) }))
		const f = fixture({ bytes })
		await ready(f)
		await f.execution.runOnce()
		expect(f.execution.getSnapshot().batch).not.toBeNull()
		const page = Promise.withResolvers<{ bytes: number[]; nextOffset: string; eof: boolean }>()
		vi.mocked(f.service.readOutput).mockReturnValueOnce(page.promise)
		const reading = f.execution.readPage("stdout", "0")
		expect(await f.execution.close()).toBe(false)
		page.resolve({ bytes: [...bytes.slice(0, 65536)], nextOffset: "65536", eof: false })
		expect((await reading).bytes).toHaveLength(65536)
		expect(await f.execution.close()).toBe(true)
	})
})
