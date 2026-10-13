import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { describe, expect, it, vi } from "vitest"
import type { OrgFileRepository } from "@/io/file/org-file.repository"
import type { OrgDocumentWriteResultInterface, OrgFileError } from "@/types/org"
import type { CaptureOrgEntryInput } from "@/types/editor/org-capture.interface"
import { captureOrgEntryFlow, readOrgCaptureTargetFlow } from "./org-capture-entry.flow"

const input = {
	workspaceRoot: "/fixture",
	target: { kind: "file", relativePath: "inbox.org" },
	entryType: "entry",
	capabilityToken: "exact-token",
	entrySource: "* TODO 中文\r\nbody\0🙂",
} satisfies CaptureOrgEntryInput
const error: OrgFileError = {
	type: "ORG_FILE_ERROR",
	operation: "write",
	command: "fixture",
	message: "failed",
	cause: "fixture",
}
const fixture = (overrides: Partial<OrgFileRepository> = {}) => {
	const scanWorkspace = vi.fn(() =>
		TE.right({
			documents: [{ relativePath: "inbox.org", revision: "stale-scan" }],
			directories: [],
		}),
	)
	const readDocument = vi.fn(() =>
		TE.right({ content: "unknown\r\nlast", relativePath: "inbox.org", revision: "latest-read" }),
	)
	const writeDocument = vi.fn(() => TE.right({ relativePath: "inbox.org", revision: "confirmed" }))
	return {
		scanWorkspace,
		readDocument,
		writeDocument,
		...overrides,
	} as unknown as OrgFileRepository
}

const expectRejected = (
	result: E.Either<unknown, unknown>,
	phase: string,
) => {
	expect(result).toMatchObject({
		_tag: "Left",
		left: { type: "ORG_CAPTURE_REJECTED_ERROR", phase, noWrite: true },
	})
}

// Deliberately cross the typed RPC boundary with untrusted runtime payloads.
const untrustedRight = <T>(value: unknown): TE.TaskEither<OrgFileError, T> => TE.right(value as T)

describe("raw capture IO flow", () => {
	it.each([
		undefined,
		null,
		{},
		{ _tag: "Right" },
		{ _tag: "Unknown", right: {} },
	])("validates repository envelopes %j before and after writing", async (envelope) => {
		const invalidTask =
			<T>(): TE.TaskEither<OrgFileError, T> =>
			async () =>
				envelope as E.Either<OrgFileError, T>
		const scanRepository = fixture({ scanWorkspace: invalidTask })
		expectRejected(await captureOrgEntryFlow(input, { isCurrent: () => true, repository: scanRepository })(), "scan")
		expect(scanRepository.writeDocument).not.toHaveBeenCalled()
		const readRepository = fixture({ readDocument: invalidTask })
		expectRejected(await captureOrgEntryFlow(input, { isCurrent: () => true, repository: readRepository })(), "read")
		expect(readRepository.writeDocument).not.toHaveBeenCalled()
		const writeDocument = vi.fn(invalidTask<OrgDocumentWriteResultInterface>)
		const result = await captureOrgEntryFlow(input, { isCurrent: () => true, repository: fixture({ writeDocument }) })()
		expect(result).toMatchObject({
			_tag: "Left",
			left: { type: "ORG_CAPTURE_UNCERTAIN_WRITE_ERROR" },
		})
		expect(writeDocument).toHaveBeenCalledTimes(1)
	})
	it.each([
		undefined,
		null,
		{},
		{ relativePath: "inbox.org", content: "body" },
		{ relativePath: "other.org", content: "body", revision: "current" },
		{ relativePath: "inbox.org", revision: "current" },
		{ relativePath: "inbox.org", content: null, revision: "current" },
		...[undefined, null, "", " ", "<missing>", 42].map((revision) => ({
			relativePath: "inbox.org",
			content: "body",
			revision,
		})),
	])("rejects malformed read %j without writing", async (document) => {
		const repository = fixture({ readDocument: () => untrustedRight(document) })
		expectRejected(await captureOrgEntryFlow(input, { isCurrent: () => true, repository: repository })(), "preparation")
		expect(repository.writeDocument).not.toHaveBeenCalled()
	})
	it.each([
		undefined,
		null,
		{},
		{ documents: null },
		{ documents: {} },
		{ documents: [null] },
		{ documents: [{}] },
		{ documents: [{ relativePath: 42 }] },
		{ documents: [{ relativePath: "" }] },
		{ documents: [{ relativePath: "inbox.org" }, { relativePath: "inbox.org" }] },
	])("rejects malformed snapshot %j without manufacturing a missing target", async (snapshot) => {
		const repository = fixture({ scanWorkspace: () => untrustedRight(snapshot) })
		expectRejected(await captureOrgEntryFlow(input, { isCurrent: () => true, repository: repository })(), "preparation")
		expect(repository.readDocument).not.toHaveBeenCalled()
		expect(repository.writeDocument).not.toHaveBeenCalled()
	})
	it.each([
		undefined,
		null,
		{},
		{ relativePath: "other.org", revision: "confirmed" },
		{ revision: "confirmed" },
		...[undefined, null, "", " ", "<missing>", 42].map((revision) => ({
			relativePath: "inbox.org",
			revision,
		})),
		...[undefined, null, -1, 1.5, Infinity, "10"].map((byteLength) => ({
			relativePath: "inbox.org",
			revision: "confirmed",
			byteLength,
		})),
	])("treats malformed write confirmation %j as uncertain without retry", async (confirmation) => {
		const writeDocument = vi.fn(() => untrustedRight<OrgDocumentWriteResultInterface>(confirmation))
		const repository = fixture({ writeDocument })
		const result = await captureOrgEntryFlow(input, { isCurrent: () => true, repository: repository })()
		expect(result).toMatchObject({
			_tag: "Left",
			left: { type: "ORG_CAPTURE_UNCERTAIN_WRITE_ERROR", targetRelativePath: "inbox.org" },
		})
		expect(writeDocument).toHaveBeenCalledTimes(1)
		expect(repository.readDocument).toHaveBeenCalledTimes(1)
	})
	it("uses local content rather than unexpected write response content", async () => {
		const repository = fixture({
			writeDocument: () =>
				untrustedRight({
					relativePath: "inbox.org",
					revision: "confirmed",
					byteLength: 0,
					content: "untrusted body",
				}),
		})
		expect(await captureOrgEntryFlow(input, { isCurrent: () => true, repository: repository })()).toEqual(
			E.right({
				relativePath: "inbox.org",
				revision: "confirmed",
				content: `unknown\r\nlast\r\n${input.entrySource}`,
			}),
		)
	})
	it("reads current target, forwards exact token and revision, and returns confirmed source", async () => {
		const repository = fixture()
		const result = await captureOrgEntryFlow(input, { isCurrent: () => true, repository: repository })()
		expect(repository.scanWorkspace).toHaveBeenCalledWith("/fixture", "exact-token")
		expect(repository.readDocument).toHaveBeenCalledWith({
			workspaceRoot: "/fixture",
			relativePath: "inbox.org",
			capabilityToken: "exact-token",
		})
		expect(repository.writeDocument).toHaveBeenCalledExactlyOnceWith({
			workspaceRoot: "/fixture",
			relativePath: "inbox.org",
			capabilityToken: "exact-token",
			expectedRevision: "latest-read",
			content: `unknown\r\nlast\r\n${input.entrySource}`,
		})
		expect(result).toEqual(
			E.right({
				relativePath: "inbox.org",
				revision: "confirmed",
				content: `unknown\r\nlast\r\n${input.entrySource}`,
			}),
		)
	})
	it("creates a title-prefixed target using missing revision without a read", async () => {
		const repository = fixture({
			scanWorkspace: vi.fn(() => TE.right({ documents: [], directories: [] })),
		})
		const result = await captureOrgEntryFlow({ ...input, capabilityToken: undefined }, { isCurrent: () => true, repository: repository })()
		expect(repository.readDocument).not.toHaveBeenCalled()
		expect(repository.writeDocument).toHaveBeenCalledWith({
			workspaceRoot: "/fixture",
			relativePath: "inbox.org",
			expectedRevision: "<missing>",
			content: `#+title: inbox\n\n${input.entrySource}`,
		})
		expect(result).toEqual(
			E.right({
				relativePath: "inbox.org",
				revision: "confirmed",
				content: `#+title: inbox\n\n${input.entrySource}`,
			}),
		)
	})
	it.each([
		"../x.org",
		"/x.org",
		"x\0.org",
		"x\n.org",
		"C:/x.org",
	])("validates unsafe target %j before any IO", async (relativePath) => {
		const repository = fixture()
		expectRejected(
			await captureOrgEntryFlow({ ...input, target: { kind: "file", relativePath } }, { isCurrent: () => true, repository })(),
			"validation",
		)
		expect(repository.scanWorkspace).not.toHaveBeenCalled()
		expect(repository.readDocument).not.toHaveBeenCalled()
		expect(repository.writeDocument).not.toHaveBeenCalled()
	})
	it("validates TODO-only before IO", async () => {
		const repository = fixture()
		expectRejected(
			await captureOrgEntryFlow({ ...input, entrySource: "* TODO " }, { isCurrent: () => true, repository: repository })(),
			"validation",
		)
		expect(repository.scanWorkspace).not.toHaveBeenCalled()
	})
	it.each([
		"scan",
		"read",
	] as const)("rejects %s Left or unexpected throw without writing", async (phase) => {
		for (const failing of [
			() => TE.left(error),
			() => {
				throw new Error("synchronous")
			},
			() => async () => {
				throw new Error("rejected promise")
			},
		]) {
			const repository = fixture({ [phase === "scan" ? "scanWorkspace" : "readDocument"]: failing })
			expectRejected(await captureOrgEntryFlow(input, { isCurrent: () => true, repository: repository })(), phase)
			expect(repository.writeDocument).not.toHaveBeenCalled()
		}
	})
	it("rejects an unclosed existing block without writing", async () => {
		const repository = fixture({
			readDocument: () =>
				TE.right({
					relativePath: "inbox.org",
					revision: "current",
					content: "#+begin_src org\n* Fake",
				}),
		})
		expectRejected(await captureOrgEntryFlow(input, { isCurrent: () => true, repository: repository })(), "preparation")
		expect(repository.writeDocument).not.toHaveBeenCalled()
	})
	it("catches unexpected local preparation throws as rejected", async () => {
		const repository = fixture({
			readDocument: () =>
				TE.right({
					relativePath: "inbox.org",
					revision: "current",
					get content(): string {
						throw new Error("preparation")
					},
				}),
		})
		expectRejected(await captureOrgEntryFlow(input, { isCurrent: () => true, repository: repository })(), "preparation")
		expect(repository.writeDocument).not.toHaveBeenCalled()
	})
	it("classifies every failure after write invocation as uncertain, without rollback/retry", async () => {
		const thrown = new Error("after persistence")
		for (const [failure, cause] of [
			[() => TE.left(error), error],
			[() => async () => E.left(error), error],
			[
				() => {
					throw thrown
				},
				thrown,
			],
			[
				() => async () => {
					throw thrown
				},
				thrown,
			],
		] as const) {
			const writeDocument = vi.fn(failure)
			const repository = fixture({ writeDocument })
			const result = await captureOrgEntryFlow(input, { isCurrent: () => true, repository: repository })()
			expect(result).toMatchObject({
				_tag: "Left",
				left: { type: "ORG_CAPTURE_UNCERTAIN_WRITE_ERROR", targetRelativePath: "inbox.org" },
			})
			if (E.isLeft(result)) {
				expect(result.left.message).toContain("target may already contain the entry")
				expect(result.left.cause).toBe(cause)
			}
			expect(writeDocument).toHaveBeenCalledTimes(1)
			expect(repository.readDocument).toHaveBeenCalledTimes(1)
		}
	})
	it("reads a real preview without creating directories or writing, then fences changed revisions", async () => {
		const createDirectory = vi.fn(() => TE.right(undefined))
		const repository = fixture({ createDirectory })
		const options = { isCurrent: () => true, repository }
		const preview = await readOrgCaptureTargetFlow(input, options)()
		expect(preview).toMatchObject({
			_tag: "Right",
			right: { target: input.target, expectedRevision: "latest-read", preview: { headingPath: [], createdHeadings: [] } },
		})
		if (E.isLeft(preview)) throw new Error("Expected preview")
		const stale = fixture({
			createDirectory,
			readDocument: () => TE.right({ relativePath: "inbox.org", revision: "external-change", content: "* Externally changed" }),
		})
		expectRejected(await captureOrgEntryFlow({ ...input, expectedRevision: preview.right.expectedRevision }, { ...options, repository: stale })(), "preparation")
		expect(stale.writeDocument).not.toHaveBeenCalled()
		expect(createDirectory).not.toHaveBeenCalled()
		expect(repository.writeDocument).not.toHaveBeenCalled()
	})
	it("previews a missing nested destination using the native missing fence, without IO mutation", async () => {
		const repository = fixture({
			scanWorkspace: () => TE.right({ documents: [], directories: [] }),
			createDirectory: vi.fn(() => TE.right(undefined)),
		})
		const target = { kind: "heading", relativePath: "deep/inbox.org", headingPath: ["Work", "Inbox"] } as const
		expect(await readOrgCaptureTargetFlow({ ...input, target }, { isCurrent: () => true, repository })()).toEqual(E.right({
			target, expectedRevision: "<missing>",
			preview: { headingPath: ["Work", "Inbox"], line: 4, createdHeadings: ["Work", "Inbox"] },
		}))
		expect(repository.readDocument).not.toHaveBeenCalled()
		expect(repository.createDirectory).not.toHaveBeenCalled()
		expect(repository.writeDocument).not.toHaveBeenCalled()
	})
	it.each(["preview", "capture"] as const)("refuses a stale or cancelled %s before any IO", async (operation) => {
		for (const cancellation of [false, true]) {
			const repository = fixture()
			const abort = new AbortController()
			if (cancellation) abort.abort()
			const options = { repository, signal: abort.signal, isCurrent: () => cancellation }
			const result = operation === "preview" ? await readOrgCaptureTargetFlow(input, options)() : await captureOrgEntryFlow(input, options)()
			expect(result).toMatchObject({ _tag: "Left", left: { noWrite: true } })
			expect(repository.scanWorkspace).not.toHaveBeenCalled()
			expect(repository.readDocument).not.toHaveBeenCalled()
			expect(repository.writeDocument).not.toHaveBeenCalled()
		}
	})
	it.each(["scan", "read"] as const)("refuses the next IO when ownership changes while awaiting %s", async (phase) => {
		let current = true
		const pending = Promise.withResolvers<E.Either<OrgFileError, { documents: { relativePath: string }[]; directories: string[] } | { relativePath: string; content: string; revision: string }>>()
		const entered = Promise.withResolvers<void>()
		const repository = fixture({
			[phase === "scan" ? "scanWorkspace" : "readDocument"]: () => async () => {
				entered.resolve()
				return pending.promise
			},
		})
		const task = captureOrgEntryFlow(input, { isCurrent: () => current, repository })()
		await entered.promise
		current = false
		pending.resolve(E.right(phase === "scan" ? { documents: [{ relativePath: "inbox.org" }], directories: [] } : { relativePath: "inbox.org", content: "* Original", revision: "current" }))
		expect(await task).toMatchObject({ _tag: "Left", left: { noWrite: true } })
		if (phase === "scan") expect(repository.readDocument).not.toHaveBeenCalled()
		expect(repository.writeDocument).not.toHaveBeenCalled()
	})
	it("creates only declared missing ancestors top-down under the exact grant before one content CAS", async () => {
		const events: string[] = []
		const createDirectory = vi.fn((location: { relativePath: string }) => async () => {
			events.push(location.relativePath)
			return E.right(undefined)
		})
		const writeDocument = vi.fn(() => async () => {
			events.push("write")
			return E.right({ relativePath: "known/new/deeper/inbox.org", revision: "written" })
		})
		const repository = fixture({ scanWorkspace: () => TE.right({ documents: [], directories: ["known"] }), createDirectory, writeDocument })
		const target = { kind: "file", relativePath: "known/new/deeper/inbox.org" } as const
		expect((await captureOrgEntryFlow({ ...input, target, expectedRevision: "<missing>" }, { isCurrent: () => true, repository })())._tag).toBe("Right")
		expect(events).toEqual(["known/new", "known/new/deeper", "write"])
		expect(createDirectory).toHaveBeenNthCalledWith(1, { workspaceRoot: "/fixture", relativePath: "known/new", capabilityToken: "exact-token" })
		expect(writeDocument).toHaveBeenCalledTimes(1)
		expect(writeDocument).toHaveBeenCalledWith(expect.objectContaining({ capabilityToken: "exact-token", expectedRevision: "<missing>" }))
	})
	it("preserves created ancestors but stops before the next directory or content write after cancellation", async () => {
		const abort = new AbortController()
		const created = Promise.withResolvers<E.Either<OrgFileError, void>>()
		const entered = Promise.withResolvers<void>()
		const createDirectory = vi.fn(() => async () => { entered.resolve(); return created.promise })
		const repository = fixture({ scanWorkspace: () => TE.right({ documents: [], directories: [] }), createDirectory })
		const task = captureOrgEntryFlow({ ...input, target: { kind: "file", relativePath: "one/two/inbox.org" } }, { repository, isCurrent: () => true, signal: abort.signal })()
		await entered.promise
		abort.abort()
		created.resolve(E.right(undefined))
		expect(await task).toMatchObject({ _tag: "Left", left: { noWrite: true } })
		expect(createDirectory).toHaveBeenCalledTimes(1)
		expect(repository.writeDocument).not.toHaveBeenCalled()
	})
	it("drains an invoked write and treats a lost owner as uncertain even with a valid ACK", async () => {
		const abort = new AbortController()
		const written = Promise.withResolvers<E.Either<OrgFileError, OrgDocumentWriteResultInterface>>()
		const entered = Promise.withResolvers<void>()
		const writeDocument = vi.fn(() => async () => { entered.resolve(); return written.promise })
		const repository = fixture({ writeDocument })
		const task = captureOrgEntryFlow(input, { repository, isCurrent: () => true, signal: abort.signal })()
		await entered.promise
		abort.abort()
		written.resolve(E.right({ relativePath: "inbox.org", revision: "written" }))
		expect(await task).toMatchObject({ _tag: "Left", left: { type: "ORG_CAPTURE_UNCERTAIN_WRITE_ERROR", targetRelativePath: "inbox.org" } })
		expect(writeDocument).toHaveBeenCalledTimes(1)
		expect(repository.readDocument).toHaveBeenCalledTimes(1)
	})
})
