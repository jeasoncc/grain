import * as E from "fp-ts/Either"
import { describe, expect, it, vi } from "vitest"
import type { OrgDocumentWriteResultInterface, OrgFileError } from "@/types/org"
import { saveOrgWorkingCopyFlow, type OrgSaveWorkingCopyPorts } from "./org-save-working-copy.flow"

const capture = Object.freeze({
	relativePath: "a.org",
	content: "captured body",
	expectedRevision: "base",
	workspaceRoot: "/notes",
	capabilityToken: "G1",
})
const receipt = { relativePath: "a.org", revision: "confirmed" }
type Result = E.Either<OrgFileError, OrgDocumentWriteResultInterface>
const deferred = () => {
	let resolve!: (result: Result) => void
	let reject!: (error: unknown) => void
	const promise = new Promise<Result>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, resolve, reject }
}
const setup = () => {
	const ports: OrgSaveWorkingCopyPorts<typeof capture> = {
		isFresh: vi.fn(() => true),
		isCurrent: vi.fn(() => true),
		write: vi.fn(() => vi.fn(async () => E.right(receipt))),
		onWriteStarted: vi.fn(),
		commitConfirmed: vi.fn(),
	}
	return ports
}

describe("single working-copy save effect", () => {
	it("orders fresh, write start, notification, awaited current, validation and synchronous commit", async () => {
		const pending = deferred()
		const order: string[] = []
		let waiter!: Promise<boolean>
		const saving = saveOrgWorkingCopyFlow(capture, {
			isFresh: (value) => {
				expect(value).toBe(capture)
				order.push("fresh")
				return true
			},
			write: (input) => {
				expect(input).toEqual(capture)
				order.push("write")
				return () => {
					order.push("task")
					return pending.promise
				}
			},
			onWriteStarted: (settled) => {
				order.push("started")
				waiter = settled
			},
			isCurrent: () => {
				order.push("current")
				return true
			},
			commitConfirmed: (value, confirmation) => {
				expect(value).toBe(capture)
				expect(confirmation).toBe(receipt)
				order.push("commit")
			},
		})
		expect(order).toEqual(["fresh", "write", "task", "started"])
		pending.resolve(E.right(receipt))
		expect(await saving).toEqual({ kind: "confirmed", effectStarted: true })
		expect(await waiter).toBe(true)
		expect(order).toEqual(["fresh", "write", "task", "started", "current", "commit"])
	})

	it("rejects stale-before without starting IO", async () => {
		const ports = setup()
		vi.mocked(ports.isFresh).mockReturnValue(false)
		expect(await saveOrgWorkingCopyFlow(capture, ports)).toEqual({
			kind: "stale-before",
			effectStarted: false,
		})
		expect(ports.write).not.toHaveBeenCalled()
		expect(ports.isCurrent).not.toHaveBeenCalled()
	})

	it.each([
		"right",
		"left",
		"malformed",
	])("owner loss after deferred %s precedes interpretation and commit", async (mode) => {
		const ports = setup()
		const pending = deferred()
		vi.mocked(ports.write).mockReturnValue(() => pending.promise)
		const saving = saveOrgWorkingCopyFlow(capture, ports)
		vi.mocked(ports.isCurrent).mockReturnValue(false)
		pending.resolve(
			mode === "right"
				? E.right(receipt)
				: mode === "left"
					? E.left({ message: "left" } as OrgFileError)
					: E.right(null as never),
		)
		expect(await saving).toEqual({ kind: "stale-after", effectStarted: true })
		expect(ports.commitConfirmed).not.toHaveBeenCalled()
	})

	it("preserves a write-left exactly and supplies a false nonrejecting navigation waiter", async () => {
		const ports = setup()
		const error: OrgFileError = {
			type: "ORG_FILE_ERROR",
			operation: "write",
			command: "write_org_document",
			message: "exact error",
			cause: null,
		}
		vi.mocked(ports.write).mockReturnValue(async () => E.left(error))
		expect(await saveOrgWorkingCopyFlow(capture, ports)).toEqual({
			kind: "write-left",
			effectStarted: true,
			error,
		})
		expect(await vi.mocked(ports.onWriteStarted!).mock.calls[0][0]).toBe(false)
		expect(ports.commitConfirmed).not.toHaveBeenCalled()
	})

	it.each([
		{ relativePath: "wrong.org", revision: "ok" },
		{ relativePath: "a.org", revision: "" },
		{ relativePath: "a.org", revision: 3 },
		null,
		undefined,
	])("rejects malformed confirmation %j without commit", async (bad) => {
		const ports = setup()
		vi.mocked(ports.write).mockReturnValue(async () => E.right(bad as never))
		expect(await saveOrgWorkingCopyFlow(capture, ports)).toEqual({
			kind: "invalid-confirmation",
			effectStarted: true,
		})
		expect(ports.commitConfirmed).not.toHaveBeenCalled()
	})

	it.each([
		"fresh",
		"write",
		"task",
		"notification",
		"current",
		"commit",
		"rejection",
	])("classifies %s throw without retry or rollback", async (stage) => {
		const ports = setup()
		const fail = () => {
			throw new Error(stage)
		}
		if (stage === "fresh") vi.mocked(ports.isFresh).mockImplementation(fail)
		if (stage === "write") vi.mocked(ports.write).mockImplementation(fail)
		if (stage === "task") vi.mocked(ports.write).mockReturnValue(fail)
		if (stage === "notification") vi.mocked(ports.onWriteStarted!).mockImplementation(fail)
		if (stage === "current") vi.mocked(ports.isCurrent).mockImplementation(fail)
		if (stage === "commit") vi.mocked(ports.commitConfirmed).mockImplementation(fail)
		if (stage === "rejection")
			vi.mocked(ports.write).mockReturnValue(async () => {
				throw new Error("rejected task")
			})
		expect(await saveOrgWorkingCopyFlow(capture, ports)).toEqual({
			kind: stage === "commit" ? "commit" : "unexpected",
			effectStarted: stage !== "fresh",
		})
		expect(ports.write).toHaveBeenCalledTimes(stage === "fresh" ? 0 : 1)
		expect(ports.commitConfirmed).toHaveBeenCalledTimes(stage === "commit" ? 1 : 0)
		if (stage === "rejection")
			expect(await vi.mocked(ports.onWriteStarted!).mock.calls[0][0]).toBe(false)
	})

	it.each([
		"right",
		"rejection",
	])("drains deferred %s after notification failure without commit or retry", async (mode) => {
		const ports = setup()
		const pending = deferred()
		vi.mocked(ports.write).mockReturnValue(() => pending.promise)
		vi.mocked(ports.onWriteStarted!).mockImplementation(() => {
			throw new Error("notification")
		})
		let completed = false
		const saving = saveOrgWorkingCopyFlow(capture, ports).then((outcome) => {
			completed = true
			return outcome
		})
		await Promise.resolve()
		await Promise.resolve()
		expect(completed).toBe(false)
		expect(ports.isCurrent).not.toHaveBeenCalled()
		if (mode === "right") pending.resolve(E.right(receipt))
		else pending.reject(new Error("late rejection"))
		expect(await saving).toEqual({ kind: "unexpected", effectStarted: true })
		expect(await vi.mocked(ports.onWriteStarted!).mock.calls[0][0]).toBe(mode === "right")
		expect(ports.isCurrent).toHaveBeenCalledTimes(1)
		expect(ports.write).toHaveBeenCalledTimes(1)
		expect(ports.commitConfirmed).not.toHaveBeenCalled()
	})

	it("checks the retired owner after draining a failed notification", async () => {
		const ports = setup()
		const pending = deferred()
		vi.mocked(ports.write).mockReturnValue(() => pending.promise)
		vi.mocked(ports.onWriteStarted!).mockImplementation(() => {
			throw new Error("observer")
		})
		const saving = saveOrgWorkingCopyFlow(capture, ports)
		vi.mocked(ports.isCurrent).mockReturnValue(false)
		pending.resolve(E.right(receipt))
		expect(await saving).toEqual({ kind: "stale-after", effectStarted: true })
		expect(ports.commitConfirmed).not.toHaveBeenCalled()
		expect(ports.write).toHaveBeenCalledTimes(1)
	})

	it("does not require a navigation notification", async () => {
		const { onWriteStarted: _, ...ports } = setup()
		expect(await saveOrgWorkingCopyFlow(capture, ports)).toEqual({
			kind: "confirmed",
			effectStarted: true,
		})
	})
})
