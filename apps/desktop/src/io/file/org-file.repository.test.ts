import { describe, expect, it, vi } from "vitest"
import {
	createOrgFileRepository,
	isAuthorizedOrgPathAbsent,
	type InvokeCommand,
} from "./org-file.repository"

const asInvokeCommand = (mock: ReturnType<typeof vi.fn>): InvokeCommand =>
	mock as unknown as InvokeCommand

describe("org file repository", () => {
	it("refuses release without an approved lease", async () => {
		const invokeMock = vi.fn().mockResolvedValue(undefined)
		const repository = createOrgFileRepository(asInvokeCommand(invokeMock))
		expect(await repository.releaseWorkspace("/notes")()).toMatchObject({ _tag: "Left" })
		expect(await repository.releaseWorkspace("/notes", "")()).toMatchObject({ _tag: "Left" })
		expect(invokeMock).not.toHaveBeenCalled()
	})

	it("maps rejected commands to an operation-specific Org file error", async () => {
		const cause = new Error("permission denied")
		const invokeMock = vi.fn().mockRejectedValue(cause)
		const repository = createOrgFileRepository(asInvokeCommand(invokeMock))

		const result = await repository.readDocument({
			relativePath: "private.org",
			workspaceRoot: "/notes",
		})()

		expect(result).toMatchObject({
			_tag: "Left",
			left: {
				operation: "read",
				type: "ORG_FILE_ERROR",
			},
		})
	})
	it("accepts only the exact authorized native read absence envelope, never text or another path/command", async () => {
		const proof = { kind: "document-path-absent", relativePath: "missing.org", authorizedObservation: true }
		const invokeMock = vi.fn().mockRejectedValue(proof)
		const repository = createOrgFileRepository(asInvokeCommand(invokeMock))
		const result = await repository.readDocument({ workspaceRoot: "/notes", capabilityToken: "grant", relativePath: "missing.org" })()
		if (result._tag !== "Left") throw new Error("Expected native absence error")
		expect(isAuthorizedOrgPathAbsent(result.left, "missing.org")).toBe(true)
		expect(isAuthorizedOrgPathAbsent(result.left, "other.org")).toBe(false)
		expect(isAuthorizedOrgPathAbsent({ ...result.left, cause: "Org document path is absent: missing.org" }, "missing.org")).toBe(false)
		expect(isAuthorizedOrgPathAbsent({ ...result.left, command: "write_org_document" }, "missing.org")).toBe(false)
		expect(isAuthorizedOrgPathAbsent({ ...result.left, operation: "scan" }, "missing.org")).toBe(false)
		for (const cause of [{ ...proof, authorizedObservation: false }, { ...proof, relativePath: "other.org" }, { kind: proof.kind, relativePath: proof.relativePath }])
			expect(isAuthorizedOrgPathAbsent({ ...result.left, cause }, "missing.org")).toBe(false)
	})

	it.each([
		{ manifest: "{}", rawBackups: [], recoverySql: null },
		{ manifest: "{not-json", graph: {}, rawBackups: [], recoverySql: "" },
	])("maps malformed recovery receipts to typed errors instead of accepting old optional graphs", async (receipt) => {
		const invokeMock = vi.fn().mockResolvedValue(receipt)
		const repository = createOrgFileRepository(asInvokeCommand(invokeMock))
		expect(await repository.readMigrationRecovery("/notes", "Book/migration-manifest.json", "grant")())
			.toMatchObject({ _tag: "Left", left: { type: "ORG_FILE_ERROR", operation: "readMigrationRecovery" } })
	})
})
