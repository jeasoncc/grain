import * as TE from "fp-ts/TaskEither"
import { describe, expect, it, vi } from "vitest"
import type { OrgFileRepository } from "@/io/file/org-file.repository"
import type { OrgDocumentInterface, OrgFileError } from "@/types/org"
import {
	archiveOrgSubtreeFlow,
	ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE,
	refileOrgSubtreeFlow,
} from "./org-subtree-refile.flow"

const snapshot = {
	directories: [],
	documents: [
		{ relativePath: "source.org", revision: "source-r1" },
		{ relativePath: "target.org", revision: "target-r1" },
	],
}

const fileError = (message: string): OrgFileError => ({
	cause: message,
	command: "write_org_document",
	message,
	operation: "write",
	type: "ORG_FILE_ERROR",
})

const repositoryWith = (overrides: Partial<OrgFileRepository> = {}): OrgFileRepository => ({
	clearDerivedIndex: () =>
		TE.right({ agendaCount: 0, documentCount: 0, headingCount: 0, linkCount: 0 }),
	createDirectory: () => TE.right(undefined),
	deleteDocument: () => TE.right(undefined),
	getDerivedIndexStats: () =>
		TE.right({ agendaCount: 0, documentCount: 0, headingCount: 0, linkCount: 0 }),
	moveDocument: () => TE.right({ relativePath: "moved.org", revision: "moved" }),
	openDefaultWorkspace: () => TE.right({ ...snapshot, rootPath: "/notes" }),
	readDocument: () =>
		TE.right({ content: "#+title: Target\r\n", relativePath: "target.org", revision: "target-r1" }),
	readMigrationRecovery: () => TE.left(fileError("unexpected recovery read")),
	releaseWorkspace: () => TE.right(undefined),
	reopenDefaultWorkspace: () => TE.right(null),
	replaceDerivedIndex: () =>
		TE.right({ agendaCount: 0, documentCount: 0, headingCount: 0, linkCount: 0 }),
	scanWorkspace: () => TE.right(snapshot),
	selectWorkspace: () => TE.right(null),
	unwatchWorkspace: () => TE.right(undefined),
	verifyMigration: () => TE.right({ checkedCount: 0, mismatches: [] }),
	watchWorkspace: () => TE.right("token"),
	writeDocument: (input) =>
		TE.right({ relativePath: input.relativePath, revision: `${input.relativePath}-written` }),
	writeMigration: () =>
		TE.right({ artifacts: [], verificationPath: "verification.json", writtenPaths: [] }),
	...overrides,
})

const input = {
	cursor: 12,
	expectedSourceRevision: "source-r1",
	sourceContent: "preamble\n* Move\nbody\n** Child\nchild\n* Keep\n",
	sourceRelativePath: "source.org",
	targetRelativePath: "target.org",
	workspaceRoot: "/notes",
}

describe("refileOrgSubtreeFlow", () => {
	it.each([
		"synthetic-refile-capability",
		undefined,
	])("forwards capability %s through every refile/archive scan, read, and write", async (capabilityToken) => {
		for (const archive of [false, true]) {
			for (const targetExists of [false, true]) {
				const targetPath = archive ? "source_archive.org" : "target.org"
				let target = { content: "", relativePath: targetPath, revision: "target-r1" }
				const scanWorkspace = vi.fn<OrgFileRepository["scanWorkspace"]>(() =>
					TE.right({ directories: [], documents: targetExists ? [target] : [] }),
				)
				const readDocument = vi.fn<OrgFileRepository["readDocument"]>(() => TE.right(target))
				const writeDocument = vi.fn<OrgFileRepository["writeDocument"]>((request) => {
					if (request.relativePath === targetPath) {
						target = { content: request.content, relativePath: targetPath, revision: "written" }
					}
					return TE.right({ relativePath: request.relativePath, revision: "written" })
				})
				const repository = repositoryWith({ scanWorkspace, readDocument, writeDocument })
				const request = { ...input, capabilityToken }
				const result = await (archive
					? archiveOrgSubtreeFlow(request, repository)
					: refileOrgSubtreeFlow(request, repository))()
				expect(result).toHaveProperty("_tag", "Right")
				expect(scanWorkspace).toHaveBeenCalledExactlyOnceWith("/notes", capabilityToken)
				expect(readDocument).toHaveBeenCalledTimes(targetExists ? 2 : 1)
				expect(writeDocument).toHaveBeenCalledTimes(2)
				for (const [operation] of [...readDocument.mock.calls, ...writeDocument.mock.calls]) {
					expect(operation.capabilityToken).toBe(capabilityToken)
					expect(operation.workspaceRoot).toBe("/notes")
				}
			}
		}
	})

	it("reads an existing target, writes the appended copy first, then removes the exact source range", async () => {
		const calls: string[] = []
		let targetRead = 0
		const readDocument = vi.fn((request) => {
			calls.push("read-target")
			targetRead += 1
			return TE.right({
				content:
					targetRead === 1
						? "#+title: Target\r\nlast line"
						: "#+title: Target\r\nlast line\r\n* Move\nbody\n** Child\nchild\n",
				relativePath: request.relativePath,
				revision: targetRead === 1 ? "target-r1" : "target.org-r2",
			})
		})
		const writeDocument = vi.fn((request) => {
			calls.push(`write-${request.relativePath}`)
			return TE.right({
				relativePath: request.relativePath,
				revision: `${request.relativePath}-r2`,
			})
		})
		const repository = repositoryWith({ readDocument, writeDocument })

		const result = await refileOrgSubtreeFlow(input, repository)()

		expect(calls).toEqual(["read-target", "write-target.org", "read-target", "write-source.org"])
		expect(writeDocument).toHaveBeenNthCalledWith(1, {
			content: "#+title: Target\r\nlast line\r\n* Move\nbody\n** Child\nchild\n",
			expectedRevision: "target-r1",
			relativePath: "target.org",
			workspaceRoot: "/notes",
		})
		expect(writeDocument).toHaveBeenNthCalledWith(2, {
			content: "preamble\n* Keep\n",
			expectedRevision: "source-r1",
			relativePath: "source.org",
			workspaceRoot: "/notes",
		})
		expect(result).toEqual({
			_tag: "Right",
			right: {
				source: {
					content: "preamble\n* Keep\n",
					relativePath: "source.org",
					revision: "source.org-r2",
				},
				target: {
					content: "#+title: Target\r\nlast line\r\n* Move\nbody\n** Child\nchild\n",
					relativePath: "target.org",
					revision: "target.org-r2",
				},
			},
		})
	})

	it("creates a missing target from the exact subtree with the missing revision", async () => {
		const readDocument = vi.fn((request) =>
			TE.right({
				content: "* Move\nbody\n** Child\nchild\n",
				relativePath: request.relativePath,
				revision: "written",
			}),
		)
		const writeDocument = vi.fn((request) =>
			TE.right({ relativePath: request.relativePath, revision: "written" }),
		)
		const repository = repositoryWith({
			readDocument,
			scanWorkspace: () => TE.right({ directories: [], documents: [snapshot.documents[0]] }),
			writeDocument,
		})

		const result = await refileOrgSubtreeFlow(
			{ ...input, targetRelativePath: "source_archive.org" },
			repository,
		)()

		expect(readDocument).toHaveBeenCalledOnce()
		expect(writeDocument).toHaveBeenNthCalledWith(1, {
			content: "* Move\nbody\n** Child\nchild\n",
			expectedRevision: "<missing>",
			relativePath: "source_archive.org",
			workspaceRoot: "/notes",
		})
		expect(result._tag).toBe("Right")
	})

	it("stops without touching the source when scanning, reading, or target writing fails", async () => {
		const scanFailure = fileError("scan failed")
		const readFailure = fileError("read failed")
		const targetFailure = fileError("target conflict")
		const sourceWrite = vi.fn(() => TE.right({ relativePath: "source.org", revision: "r2" }))

		const scanResult = await refileOrgSubtreeFlow(
			input,
			repositoryWith({ scanWorkspace: () => TE.left(scanFailure), writeDocument: sourceWrite }),
		)()
		const readResult = await refileOrgSubtreeFlow(
			input,
			repositoryWith({ readDocument: () => TE.left(readFailure), writeDocument: sourceWrite }),
		)()
		const targetWrite = vi.fn(() => TE.left(targetFailure))
		const targetResult = await refileOrgSubtreeFlow(
			input,
			repositoryWith({ writeDocument: targetWrite }),
		)()

		expect(scanResult).toEqual({ _tag: "Left", left: scanFailure })
		expect(readResult).toEqual({ _tag: "Left", left: readFailure })
		expect(targetResult).toEqual({
			_tag: "Left",
			left: {
				type: "ORG_SUBTREE_REFILE_UNCERTAIN_WRITE_ERROR",
				cause: targetFailure,
				targetRelativePath: "target.org",
				message:
					"The target write did not report a confirmed result; the target may already contain the subtree. This operation did not remove the source. Reread both documents and reconcile any duplicate before retrying. Do not retry automatically. No rollback was attempted. Original error: target conflict",
			},
		})
		expect(targetWrite).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ relativePath: "target.org" }),
		)
		expect(sourceWrite).not.toHaveBeenCalled()
	})

	it("returns a typed partial error with the successful target and duplicate-copy recovery", async () => {
		const sourceFailure = fileError("source revision conflict")
		let writes = 0
		let reads = 0
		const writeDocument = vi.fn((request) => {
			writes += 1
			return writes === 1
				? TE.right({ relativePath: request.relativePath, revision: "target-r2" })
				: TE.left(sourceFailure)
		})

		const result = await refileOrgSubtreeFlow(
			input,
			repositoryWith({
				readDocument: (request) => {
					reads += 1
					return TE.right({
						content:
							reads === 1
								? "#+title: Target\r\n"
								: "#+title: Target\r\n* Move\nbody\n** Child\nchild\n",
						relativePath: request.relativePath,
						revision: reads === 1 ? "target-r1" : "target-r2",
					})
				},
				writeDocument,
			}),
		)()

		expect(result).toEqual({
			_tag: "Left",
			left: {
				cause: sourceFailure,
				message: ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE,
				recovery: ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE,
				target: {
					content: "#+title: Target\r\n* Move\nbody\n** Child\nchild\n",
					relativePath: "target.org",
					revision: "target-r2",
				},
				type: "ORG_SUBTREE_REFILE_PARTIAL_ERROR",
			},
		})
		expect(writeDocument).toHaveBeenCalledTimes(2)
	})

	it("checks the live source guard after copying and before removing", async () => {
		const writeDocument = vi.fn((request) =>
			TE.right({ relativePath: request.relativePath, revision: "written" }),
		)
		let guardCalls = 0
		const result = await refileOrgSubtreeFlow(
			{ ...input, confirmSourceUnchanged: () => ++guardCalls === 1 },
			repositoryWith({
				readDocument: (request) =>
					TE.right({
						content: "* Move\nbody\n** Child\nchild\n",
						relativePath: request.relativePath,
						revision: "written",
					}),
				scanWorkspace: () => TE.right({ directories: [], documents: [snapshot.documents[0]] }),
				writeDocument,
			}),
		)()
		expect(result._tag).toBe("Left")
		if (result._tag === "Left") {
			expect(result.left.type).toBe("ORG_SUBTREE_REFILE_PARTIAL_ERROR")
		}
		expect(writeDocument).toHaveBeenCalledTimes(1)
	})

	it("archives to the conventional sibling archive file", async () => {
		const writeDocument = vi.fn((request) =>
			TE.right({ relativePath: request.relativePath, revision: "written" }),
		)
		const { targetRelativePath: _target, ...archiveInput } = input
		const result = await archiveOrgSubtreeFlow(
			archiveInput,
			repositoryWith({
				readDocument: (request) =>
					TE.right({
						content: "* Move\nbody\n** Child\nchild\n",
						relativePath: request.relativePath,
						revision: "written",
					}),
				writeDocument,
			}),
		)()
		expect(result._tag).toBe("Right")
		expect(writeDocument).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ relativePath: "source_archive.org" }),
		)
	})

	it.each([
		[{ sourceRelativePath: "../source.org" }, "source"],
		[{ targetRelativePath: "TARGET.ORG" }, "target"],
		[{ targetRelativePath: "source.org" }, "different"],
		[{ targetRelativePath: "SOURCE.org" }, "different"],
		[{ targetRelativePath: "https://example.test/target.org" }, "target"],
		[{ cursor: input.sourceContent.indexOf("body") }, "heading"],
	])("validates paths, distinct documents, and heading cursor before IO", async (change, message) => {
		const scanWorkspace = vi.fn(() => TE.right(snapshot))
		const result = await refileOrgSubtreeFlow(
			{ ...input, ...change },
			repositoryWith({ scanWorkspace }),
		)()

		expect(result._tag).toBe("Left")
		if (result._tag === "Left") {
			expect(result.left.type).toBe("ORG_SUBTREE_REFILE_VALIDATION_ERROR")
			expect(result.left.message).toContain(message)
		}
		expect(scanWorkspace).not.toHaveBeenCalled()
	})
})

/** Stateful raw-text RPC fixture: successful writes become the next fresh read. */
const persistedRepository = (content = "* Parent\nbody\n* Parent\nsecond\n") => {
	let target = { content, relativePath: "target.org", revision: "target-r1" }
	const readDocument = vi.fn<OrgFileRepository["readDocument"]>(() => TE.right(target))
	const writeDocument = vi.fn<OrgFileRepository["writeDocument"]>((request) => {
		if (request.relativePath === "target.org")
			target = {
				content: request.content,
				relativePath: request.relativePath,
				revision: "target-r2",
			}
		return TE.right({
			relativePath: request.relativePath,
			revision: request.relativePath === "target.org" ? "target-r2" : "source-r2",
		})
	})
	return {
		repository: repositoryWith({ readDocument, writeDocument }),
		readDocument,
		writeDocument,
	}
}

const headingInput = {
	...input,
	expectedTargetRevision: "target-r1",
	targetHeading: { from: 0, heading: "* Parent" },
}

describe("snapshot refile RPC boundaries", () => {
	it("inserts under the exact duplicate heading offset, retaining raw unknown blocks, NUL and CRLF", async () => {
		const target = "* Parent\r\nfirst\r\n* Parent\r\nsecond\r\n* Peer\r\n"
		const fixture = persistedRepository(target)
		const sourceContent =
			"** Move\r\nbody\0\r\n#+begin_future\r\n* literal\r\n#+end_future\r\n*** Child\r\nx\r\n** Keep\r\n"
		const result = await refileOrgSubtreeFlow(
			{
				...headingInput,
				sourceContent,
				cursor: 0,
				targetHeading: { from: target.indexOf("* Parent", 1), heading: "* Parent" },
			},
			fixture.repository,
		)()
		expect(result._tag).toBe("Right")
		expect(fixture.writeDocument.mock.calls[0][0].content).toBe(
			target.replace(
				"* Peer",
				"** Move\r\nbody\0\r\n#+begin_future\r\n* literal\r\n#+end_future\r\n*** Child\r\nx\r\n* Peer",
			),
		)
		expect(fixture.writeDocument.mock.calls[1][0].content).toBe("** Keep\r\n")
	})

	it.each([
		{ expectedTargetRevision: "stale" },
		{ expectedTargetRevision: undefined },
		{ targetHeading: { from: 1, heading: "* Parent" } },
		{ targetHeading: { from: 0, heading: "* Changed" } },
		{ expectedSourceRevision: "" },
		{ expectedSourceRevision: "<missing>" },
	])("rejects stale revision/offset/line and unsaved source without writes: %j", async (change) => {
		const fixture = persistedRepository()
		const result = await refileOrgSubtreeFlow({ ...headingInput, ...change }, fixture.repository)()
		expect(result).toHaveProperty("left.type", "ORG_SUBTREE_REFILE_VALIDATION_ERROR")
		expect(fixture.writeDocument).not.toHaveBeenCalled()
	})

	it.each([
		"* Parent\n#+begin_future\n* hidden",
		"* Parent\n#+begin_src\ncode",
	])("rejects root appends into unclosed target blocks", async (content) => {
		const fixture = persistedRepository(content)
		const result = await refileOrgSubtreeFlow(input, fixture.repository)()
		expect(result).toHaveProperty("left.type", "ORG_SUBTREE_REFILE_VALIDATION_ERROR")
		expect(fixture.writeDocument).not.toHaveBeenCalled()
	})

	it("compares explicit missing-target snapshot revisions and ignores archive heading", async () => {
		const fixture = persistedRepository()
		fixture.repository = repositoryWith({
			...fixture.repository,
			scanWorkspace: () => TE.right({ directories: [], documents: [] }),
		})
		const rejected = await refileOrgSubtreeFlow(
			{ ...input, expectedTargetRevision: "old" },
			fixture.repository,
		)()
		expect(rejected).toHaveProperty("left.type", "ORG_SUBTREE_REFILE_VALIDATION_ERROR")
		expect(fixture.writeDocument).not.toHaveBeenCalled()
		const archived = await archiveOrgSubtreeFlow(
			{ ...headingInput, expectedTargetRevision: "<missing>" },
			repositoryWith({
				scanWorkspace: () => TE.right({ directories: [], documents: [] }),
				readDocument: () =>
					TE.right({
						relativePath: "source_archive.org",
						revision: "source_archive.org-written",
						content: "* Move\nbody\n** Child\nchild\n",
					}),
			}),
		)()
		expect(archived._tag).toBe("Right")
	})

	it.each([
		"scan",
		"read",
		"targetWrite",
		"confirm",
		"guard",
		"sourceWrite",
	] as const)("classifies throws at %s, both construction and execution", async (phase) => {
		for (const deferred of [false, true]) {
			const fixture = persistedRepository()
			const boom = () => {
				throw new Error("boundary throw")
			}
			const throwing = () => (deferred ? async () => boom() : boom())
			let reads = 0
			let writes = 0
			let guards = 0
			const repository = repositoryWith({
				...fixture.repository,
				scanWorkspace: phase === "scan" ? throwing : fixture.repository.scanWorkspace,
				readDocument: (request) => {
					reads++
					return (phase === "read" && reads === 1) || (phase === "confirm" && reads === 2)
						? throwing()
						: fixture.readDocument(request)
				},
				writeDocument: (request) => {
					writes++
					return (phase === "targetWrite" && writes === 1) ||
						(phase === "sourceWrite" && writes === 2)
						? throwing()
						: fixture.writeDocument(request)
				},
			})
			const result = await refileOrgSubtreeFlow(
				{
					...headingInput,
					confirmSourceUnchanged:
						phase === "guard" ? () => (++guards === 1 ? true : boom()) : undefined,
				},
				repository,
			)()
			expect(result).toHaveProperty(
				"left.type",
				phase === "targetWrite"
					? "ORG_SUBTREE_REFILE_UNCERTAIN_WRITE_ERROR"
					: phase === "scan" || phase === "read"
						? "ORG_FILE_ERROR"
						: "ORG_SUBTREE_REFILE_PARTIAL_ERROR",
			)
			expect(writes).toBe(
				phase === "scan" || phase === "read" ? 0 : phase === "sourceWrite" ? 2 : 1,
			)
		}
	})

	it.each([
		"wrong-path",
		"empty-revision",
		"missing-revision",
		"wrong-content",
		"null",
	])("preserves source on malformed/mismatched reread: %s", async (kind) => {
		const fixture = persistedRepository()
		let reads = 0
		const result = await refileOrgSubtreeFlow(
			headingInput,
			repositoryWith({
				...fixture.repository,
				readDocument: (request) => {
					reads++
					if (reads === 1) return fixture.readDocument(request)
					const content = fixture.writeDocument.mock.calls[0][0].content
					return TE.right(
						(kind === "null"
							? null
							: {
									relativePath: kind === "wrong-path" ? "other.org" : "target.org",
									revision:
										kind === "empty-revision"
											? ""
											: kind === "missing-revision"
												? "<missing>"
												: "target-r2",
									content: kind === "wrong-content" ? "externally changed" : content,
								}) as unknown as OrgDocumentInterface,
					)
				},
			}),
		)()
		expect(result).toHaveProperty("left.type", "ORG_SUBTREE_REFILE_PARTIAL_ERROR")
		expect(result).toHaveProperty("left.target.relativePath", "target.org")
		expect(fixture.writeDocument).toHaveBeenCalledTimes(1)
	})

	it.each([
		"read",
		"targetWrite",
		"sourceWrite",
	] as const)("rejects malformed %s identity/revision without relabeling", async (phase) => {
		for (const revision of ["", "<missing>", "valid"]) {
			const fixture = persistedRepository()
			let writes = 0
			const bad = {
				relativePath: revision === "valid" ? "other.org" : "target.org",
				revision,
				content: "* Parent\n",
			}
			const result = await refileOrgSubtreeFlow(
				headingInput,
				repositoryWith({
					...fixture.repository,
					readDocument: phase === "read" ? () => TE.right(bad) : fixture.readDocument,
					writeDocument: (request) => {
						writes++
						return (phase === "targetWrite" && writes === 1) ||
							(phase === "sourceWrite" && writes === 2)
							? TE.right(bad)
							: fixture.writeDocument(request)
					},
				}),
			)()
			expect(result).toHaveProperty(
				"left.type",
				phase === "read"
					? "ORG_FILE_ERROR"
					: phase === "targetWrite"
						? "ORG_SUBTREE_REFILE_UNCERTAIN_WRITE_ERROR"
						: "ORG_SUBTREE_REFILE_PARTIAL_ERROR",
			)
			expect(writes).toBe(phase === "read" ? 0 : phase === "targetWrite" ? 1 : 2)
		}
	})
})

describe("live transfer guards", () => {
	it("does not interpret truthy nonboolean protection flags as protected", async () => {
		const fixture = persistedRepository()
		const result = await refileOrgSubtreeFlow(
			{
				...headingInput,
				isProtectedPath: (() => "true") as unknown as (path: string) => boolean,
			},
			fixture.repository,
		)()
		expect(result._tag).toBe("Right")
		expect(fixture.writeDocument).toHaveBeenCalledTimes(2)
	})

	it.each([
		"scan",
		"read",
	] as const)("rejects changes during deferred %s before either write", async (boundary) => {
		for (const change of [
			"body",
			"target-dirty",
			"source-protected",
			"target-protected",
		] as const) {
			const fixture = persistedRepository()
			let unchanged = true
			const protectedPaths = new Set<string>()
			let release!: () => void
			const waiting = new Promise<void>((resolve) => {
				release = resolve
			})
			let entered!: () => void
			const started = new Promise<void>((resolve) => {
				entered = resolve
			})
			const repository = repositoryWith({
				...fixture.repository,
				scanWorkspace:
					(...args) =>
					async () => {
						if (boundary === "scan") {
							entered()
							await waiting
						}
						return fixture.repository.scanWorkspace(...args)()
					},
				readDocument: (request) => async () => {
					if (boundary === "read") {
						entered()
						await waiting
					}
					return fixture.readDocument(request)()
				},
			})
			const task = refileOrgSubtreeFlow(
				{
					...headingInput,
					confirmSourceUnchanged: () => unchanged,
					isProtectedPath: (path) => protectedPaths.has(path),
				},
				repository,
			)()
			await started
			if (change === "body" || change === "target-dirty") unchanged = false
			else protectedPaths.add(change === "source-protected" ? "source.org" : "target.org")
			release()
			expect(await task).toHaveProperty("left.type", "ORG_SUBTREE_REFILE_VALIDATION_ERROR")
			expect(fixture.writeDocument).not.toHaveBeenCalled()
		}
	})

	it.each([
		"confirm",
		"protected",
		"getter",
	] as const)("owns %s exceptions before and after target persistence", async (kind) => {
		for (const afterWrite of [false, true]) {
			const fixture = persistedRepository()
			const boom = () => {
				throw new Error("guard failed")
			}
			const shouldThrow = () => !afterWrite || fixture.writeDocument.mock.calls.length > 0
			const request = {
				...headingInput,
				confirmSourceUnchanged: () => (kind === "confirm" && shouldThrow() ? boom() : true),
				isProtectedPath: () => (kind === "protected" && shouldThrow() ? boom() : false),
			}
			if (kind === "getter")
				Object.defineProperty(request, "confirmSourceUnchanged", {
					get: () => (shouldThrow() ? boom() : () => true),
				})
			const task = refileOrgSubtreeFlow(request, fixture.repository)
			const result = await task()
			expect(result).toHaveProperty(
				"left.type",
				afterWrite ? "ORG_SUBTREE_REFILE_PARTIAL_ERROR" : "ORG_FILE_ERROR",
			)
			expect(result).toHaveProperty(afterWrite ? "left.cause.operation" : "left.operation", "read")
			expect(fixture.writeDocument).toHaveBeenCalledTimes(afterWrite ? 1 : 0)
			if (afterWrite) expect(result).toHaveProperty("left.target.relativePath", "target.org")
		}
	})

	it.each([
		"source.org",
		"target.org",
	])("rechecks protection of %s after target confirmation", async (protectedPath) => {
		const fixture = persistedRepository()
		const result = await refileOrgSubtreeFlow(
			{
				...headingInput,
				isProtectedPath: (path) =>
					fixture.writeDocument.mock.calls.length > 0 && path === protectedPath,
			},
			fixture.repository,
		)()
		expect(result).toHaveProperty("left.type", "ORG_SUBTREE_REFILE_PARTIAL_ERROR")
		expect(result).toHaveProperty("left.target.relativePath", "target.org")
		expect(fixture.writeDocument).toHaveBeenCalledTimes(1)
	})

	it.each([
		false,
		null,
		1,
		"true",
	])("requires literal true from a provided source guard (%s)", async (value) => {
		const fixture = persistedRepository()
		const result = await refileOrgSubtreeFlow(
			{
				...headingInput,
				confirmSourceUnchanged: (() => value) as () => boolean,
			},
			fixture.repository,
		)()
		expect(result).toHaveProperty("left.type", "ORG_SUBTREE_REFILE_VALIDATION_ERROR")
		expect(fixture.writeDocument).not.toHaveBeenCalled()
	})
})
