import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { describe, expect, it, vi } from "vitest"
import type { OrgFileRepository } from "@/io/file/org-file.repository"
import { orgRefileTargetCandidates } from "@/pipes/org/org-refile-target.pipe"
import { readOrgRefileTargetFlow } from "./org-refile-target.flow"

const input = {
	capabilityToken: "grant",
	sourceRelativePath: "source.org",
	targetRelativePath: "target.org",
	workspaceRoot: "/synthetic",
}
const repository = (exists = true) => {
	const scanWorkspace = vi.fn(() =>
		TE.right({
			directories: [],
			documents: exists ? [{ relativePath: "target.org", revision: "scanned" }] : [],
		}),
	)
	const readDocument = vi.fn(() =>
		TE.right({ content: "* Parent\n** Child\n", relativePath: "target.org", revision: "fresh" }),
	)
	const writeDocument = vi.fn()
	return { readDocument, scanWorkspace, writeDocument } as unknown as OrgFileRepository
}

describe("readOrgRefileTargetFlow", () => {
	it("uses fresh exact-path content/revision and forwards capability on all reads without writes", async () => {
		const repo = repository()
		const result = await readOrgRefileTargetFlow(input, repo)()
		expect(E.isRight(result)).toBe(true)
		if (E.isRight(result)) {
			expect(result.right).toMatchObject({ relativePath: "target.org", revision: "fresh" })
			expect(result.right.headings.map((h) => h.outlinePath)).toEqual(["Parent", "Parent / Child"])
		}
		expect(repo.scanWorkspace).toHaveBeenCalledWith("/synthetic", "grant")
		expect(repo.readDocument).toHaveBeenCalledWith({
			capabilityToken: "grant",
			relativePath: "target.org",
			workspaceRoot: "/synthetic",
		})
		expect(repo.writeDocument).not.toHaveBeenCalled()
	})
	it("represents missing targets as root-only snapshots without a document read", async () => {
		const repo = repository(false)
		const result = await readOrgRefileTargetFlow(input, repo)()
		expect(result).toEqual(
			E.right({ headings: [], relativePath: "target.org", revision: "<missing>" }),
		)
		if (E.isRight(result)) {
			expect(orgRefileTargetCandidates(result.right, true).map((c) => c.kind)).toEqual(["root"])
		}
		expect(repo.readDocument).not.toHaveBeenCalled()
	})
	it.each([
		"../outside.org",
		"source.org",
		"SOURCE.org",
		"target.txt",
	])("rejects unsafe/alias path %s before IO", async (targetRelativePath) => {
		const repo = repository()
		expect(E.isLeft(await readOrgRefileTargetFlow({ ...input, targetRelativePath }, repo)())).toBe(
			true,
		)
		expect(repo.scanWorkspace).not.toHaveBeenCalled()
	})
	it.each([
		{ content: "* Bad\n", relativePath: "foreign.org", revision: "fresh" },
		{ content: "* Bad\n", relativePath: "target.org", revision: "" },
		{ content: "* Bad\n", relativePath: "target.org", revision: "<missing>" },
		{ content: undefined, relativePath: "target.org", revision: "fresh" },
	])("classifies malformed reads as read errors", async (document) => {
		const repo = repository()
		vi.mocked(repo.readDocument).mockReturnValue(TE.right(document as never))
		expect(await readOrgRefileTargetFlow(input, repo)()).toMatchObject({
			_tag: "Left",
			left: { operation: "read", type: "ORG_FILE_ERROR" },
		})
	})
	it("catches thrown repository failures and preserves returned read errors", async () => {
		const repo = repository()
		vi.mocked(repo.readDocument).mockImplementation(() => {
			throw new Error("native failure")
		})
		expect(await readOrgRefileTargetFlow(input, repo)()).toMatchObject({
			_tag: "Left",
			left: { message: "native failure", operation: "read" },
		})
		vi.mocked(repo.scanWorkspace).mockImplementation(() => {
			throw new Error("scan failure")
		})
		expect(await readOrgRefileTargetFlow(input, repo)()).toMatchObject({
			_tag: "Left",
			left: { operation: "scan" },
		})
	})
	it("does not read the target when read permission expires after scan", async () => {
		const repo = repository()
		let current = true
		vi.mocked(repo.scanWorkspace).mockImplementation(() => async () => {
			current = false
			return E.right({
				directories: [],
				documents: [{ relativePath: "target.org", revision: "r" }],
			})
		})
		expect(
			E.isLeft(await readOrgRefileTargetFlow({ ...input, confirmCurrent: () => current }, repo)()),
		).toBe(true)
		expect(repo.readDocument).not.toHaveBeenCalled()
	})
})
