import { describe, expect, it, vi } from "vitest"
import type { OrgDocumentInterface, OrgWorkspaceInterface } from "@/types/org"
import {
	hasDefaultWorkspacePreference,
	isDirtyCaptureTarget,
	ORG_WORKSPACE_PREFERENCE_KEY,
	setDefaultWorkspacePreference,
	updateWorkspaceDocument,
} from "./use-org-workspace"

const workspace: OrgWorkspaceInterface = {
	directories: [],
	documents: [
		{ relativePath: "z.org", revision: "z-1" },
		{ relativePath: "inbox.org", revision: "old" },
	],
	rootPath: "/notes",
}

const captured: OrgDocumentInterface = {
	content: "* TODO Captured\n",
	relativePath: "inbox.org",
	revision: "new",
}

describe("Org workspace preference", () => {
	it("persists only the fixed default workspace choice", () => {
		const values = new Map<string, string>()
		const storage = {
			getItem: vi.fn((key: string) => values.get(key) ?? null),
			removeItem: vi.fn((key: string) => values.delete(key)),
			setItem: vi.fn((key: string, value: string) => values.set(key, value)),
		}

		expect(hasDefaultWorkspacePreference(storage)).toBe(false)
		setDefaultWorkspacePreference(true, storage)
		expect(values.get(ORG_WORKSPACE_PREFERENCE_KEY)).toBe("default")
		expect(hasDefaultWorkspacePreference(storage)).toBe(true)
		setDefaultWorkspacePreference(false, storage)
		expect(hasDefaultWorkspacePreference(storage)).toBe(false)
	})
})

describe("Org workspace capture helpers", () => {
	it("blocks capture only for the active dirty target", () => {
		expect(isDirtyCaptureTarget(captured, true, "inbox.org")).toBe(true)
		expect(isDirtyCaptureTarget(captured, false, "inbox.org")).toBe(false)
		expect(isDirtyCaptureTarget(captured, true, "other.org")).toBe(false)
		expect(isDirtyCaptureTarget(null, true, "inbox.org")).toBe(false)
	})

	it("updates existing revisions and inserts new targets in sorted order", () => {
		expect(updateWorkspaceDocument(workspace, captured).documents).toEqual([
			{ relativePath: "inbox.org", revision: "new" },
			{ relativePath: "z.org", revision: "z-1" },
		])

		const created = { ...captured, relativePath: "archive.org", revision: "created" }
		expect(updateWorkspaceDocument(workspace, created).documents).toEqual([
			{ relativePath: "archive.org", revision: "created" },
			{ relativePath: "inbox.org", revision: "old" },
			{ relativePath: "z.org", revision: "z-1" },
		])
	})
})
