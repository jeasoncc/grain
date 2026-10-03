import * as E from "fp-ts/Either"
import { describe, expect, it, vi } from "vitest"
import type { OrgDocumentWriteResultInterface, OrgFileError } from "@/types/org"
import {
	saveAllOrgDocumentsFlow,
	type OrgSaveAllCapture,
	type OrgSaveAllPorts,
} from "./org-save-all.flow"

const capture = (path: string): OrgSaveAllCapture =>
	Object.freeze({
		document: Object.freeze({ relativePath: path, revision: `old-${path}`, content: "baseline" }),
		content: `body-${path}`,
		workspaceRoot: "/Work/Org",
		capabilityToken: "grant",
	})
const captures = Object.freeze([capture("A.org"), capture("b.org")])
const receipt = (path: string) => ({ relativePath: path, revision: `new-${path}` })
const ports = (): OrgSaveAllPorts<OrgSaveAllCapture> => ({
	isFresh: vi.fn(() => true),
	isOwnerCurrent: vi.fn(() => true),
	write: vi.fn((input) => async () => E.right(receipt(input.relativePath))),
	commitConfirmed: vi.fn(),
})
const deferred = <T>() => {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((done) => {
		resolve = done
	})
	return { promise, resolve }
}

describe("save all orchestration", () => {
	it("empty selection performs no reads, writes, guards or commits", async () => {
		const p = ports()
		expect(await saveAllOrgDocumentsFlow([], p)).toEqual({ kind: "success", confirmedPaths: [] })
		for (const port of Object.values(p)) expect(port).not.toHaveBeenCalled()
	})

	it("awaits each write and commits once before next freshness check, using captured casing/body/root/revision/grant", async () => {
		const waiting = deferred<E.Either<OrgFileError, OrgDocumentWriteResultInterface>>()
		const events: string[] = []
		const p = ports()
		const write = vi.fn((input) => {
			events.push(`write:${input.relativePath}`)
			return () =>
				input.relativePath === "A.org"
					? waiting.promise
					: Promise.resolve(E.right(receipt(input.relativePath)))
		})
		const run = saveAllOrgDocumentsFlow(captures, {
			...p,
			write,
			isFresh: (c) => {
				events.push(`fresh:${c.document.relativePath}`)
				return true
			},
			isOwnerCurrent: () => {
				events.push("owner")
				return true
			},
			commitConfirmed: (c) => {
				events.push(`commit:${c.document.relativePath}`)
			},
		})
		expect(events).toEqual(["fresh:A.org", "write:A.org"])
		waiting.resolve(E.right(receipt("A.org")))
		expect(await run).toEqual({ kind: "success", confirmedPaths: ["A.org", "b.org"] })
		expect(events).toEqual([
			"fresh:A.org",
			"write:A.org",
			"owner",
			"commit:A.org",
			"fresh:b.org",
			"write:b.org",
			"owner",
			"commit:b.org",
		])
		expect(write.mock.calls.map(([input]) => input)).toEqual(
			captures.map((c) => ({
				content: c.content,
				relativePath: c.document.relativePath,
				expectedRevision: c.document.revision,
				workspaceRoot: c.workspaceRoot,
				capabilityToken: c.capabilityToken,
			})),
		)
	})

	it.each([
		0, 1,
	])("rejects stale capture/owner before write %i without writing it", async (index) => {
		const p = ports()
		const result = await saveAllOrgDocumentsFlow(captures, {
			...p,
			isFresh: (c) => c !== captures[index],
		})
		expect(result).toMatchObject({
			kind: index ? "partial" : "rejected",
			failureKind: "stale-capture",
			confirmedPaths: index ? ["A.org"] : [],
		})
		expect(p.write).toHaveBeenCalledTimes(index)
		expect(p.commitConfirmed).toHaveBeenCalledTimes(index)
	})

	it.each([
		"right",
		"left",
	])("owner loss while a deferred %s write settles prevents commits and subsequent writes", async (side) => {
		const waiting = deferred<E.Either<OrgFileError, OrgDocumentWriteResultInterface>>()
		let current = true
		const p = ports()
		const write = vi.fn(() => () => waiting.promise)
		const run = saveAllOrgDocumentsFlow(captures, { ...p, write, isOwnerCurrent: () => current })
		current = false
		waiting.resolve(
			side === "right"
				? E.right(receipt("A.org"))
				: E.left({ type: "ORG_FILE_ERROR", message: "denied" } as OrgFileError),
		)
		expect(await run).toMatchObject({
			failureKind: "owner-lost",
			writingPath: "A.org",
			confirmedPaths: [],
		})
		expect(write).toHaveBeenCalledTimes(1)
		expect(p.commitConfirmed).not.toHaveBeenCalled()
	})

	it("first Left stops after confirmed commits, retains exact diagnostic and never retries", async () => {
		const p = ports()
		const write = vi.fn(
			(input) => async () =>
				input.relativePath === "A.org"
					? E.right(receipt("A.org"))
					: E.left({ message: "revision mismatch" } as OrgFileError),
		)
		expect(
			await saveAllOrgDocumentsFlow([...captures, capture("later.org")], { ...p, write }),
		).toEqual({
			kind: "partial",
			confirmedPaths: ["A.org"],
			failureKind: "write-left",
			writingPath: "b.org",
			message:
				"Save all stopped at b.org: revision mismatch. Buffers were retained; files may have changed. Reread affected files before a manual retry. Do not automatically retry.",
		})
		expect(write).toHaveBeenCalledTimes(2)
		expect(p.commitConfirmed).toHaveBeenCalledTimes(1)
	})

	it.each([
		{ relativePath: "a.org", revision: "ok" },
		{ relativePath: "A.org", revision: "" },
		{ relativePath: "A.org", revision: null },
	])("malformed receipt %j is uncertain, never committed", async (bad) => {
		const p = ports()
		const write = vi.fn(() => async () => E.right(bad as OrgDocumentWriteResultInterface))
		expect(await saveAllOrgDocumentsFlow(captures, { ...p, write })).toMatchObject({
			kind: "rejected",
			failureKind: "unexpected",
			confirmedPaths: [],
			writingPath: "A.org",
		})
		expect(p.commitConfirmed).not.toHaveBeenCalled()
		expect(write).toHaveBeenCalledTimes(1)
	})

	it("a later commit throw counts only earlier completed commits and never writes remaining captures", async () => {
		const p = ports()
		const committed: string[] = []
		const result = await saveAllOrgDocumentsFlow([...captures, capture("later.org")], {
			...p,
			commitConfirmed: (c) => {
				if (c.document.relativePath === "b.org") throw new Error("mirror failure")
				committed.push(c.document.relativePath)
			},
		})
		expect(result).toMatchObject({
			kind: "partial",
			confirmedPaths: ["A.org"],
			failureKind: "commit",
			writingPath: "b.org",
		})
		expect(committed).toEqual(["A.org"])
		expect(p.write).toHaveBeenCalledTimes(2)
		expect(captures[1].content).toBe("body-b.org")
	})

	it.each([
		"adapter",
		"task",
		"commit",
	])("%s throw stops without claiming failed confirmation or mutating capture source", async (where) => {
		const p = ports()
		const write = vi.fn((input) => {
			if (where === "adapter") throw new Error("adapter")
			return async () => {
				if (where === "task") throw new Error("task")
				return E.right(receipt(input.relativePath))
			}
		})
		const commitConfirmed = vi.fn(() => {
			throw new Error("commit")
		})
		const result = await saveAllOrgDocumentsFlow(captures, { ...p, write, commitConfirmed })
		expect(result).toMatchObject({
			kind: "rejected",
			failureKind: where === "commit" ? "commit" : "unexpected",
			confirmedPaths: [],
			writingPath: "A.org",
		})
		expect(result).toHaveProperty(
			"message",
			"Save all ended unexpectedly at A.org; files may have changed. All editor bodies were retained. Reread affected files before reconciling; do not automatically retry. No rollback was attempted.",
		)
		expect(write).toHaveBeenCalledTimes(1)
		expect(captures[0].content).toBe("body-A.org")
		expect(captures[0].document.content).toBe("baseline")
	})
})
