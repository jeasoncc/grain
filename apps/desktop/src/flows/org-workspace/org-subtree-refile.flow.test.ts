import * as TE from "fp-ts/TaskEither"
import { describe, expect, it, vi } from "vitest"
import type { OrgFileRepository } from "@/io/file/org-file.repository"
import type { OrgFileError } from "@/types/org"
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
		const targetResult = await refileOrgSubtreeFlow(
			input,
			repositoryWith({ writeDocument: () => TE.left(targetFailure) }),
		)()

		expect(scanResult).toEqual({ _tag: "Left", left: scanFailure })
		expect(readResult).toEqual({ _tag: "Left", left: readFailure })
		expect(targetResult).toEqual({ _tag: "Left", left: targetFailure })
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
		const result = await refileOrgSubtreeFlow(
			{ ...input, confirmSourceUnchanged: () => false },
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
