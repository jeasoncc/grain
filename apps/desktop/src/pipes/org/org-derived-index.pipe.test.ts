import { describe, expect, it } from "vitest"
import { buildOrgDerivedIndexDocument, parseOrgIndexHeadings } from "./org-derived-index.pipe"

describe("Org derived index parsing", () => {
	it("parses source-order headings, TODO keywords, tags, and valid property drawers", () => {
		const source = [
			"#+TODO: NEXT(n) WAIT | DONE",
			"* NEXT Ship release :work:urgent:",
			"DEADLINE: <2025-06-01 Sun>",
			":PROPERTIES:",
			":ID: first-id",
			":ID: ignored-duplicate",
			":CUSTOM_ID: release",
			":END:",
			"** Plain child :tag:",
			"Body",
			":PROPERTIES:",
			":ID: too-late",
			":END:",
		].join("\n")

		expect(parseOrgIndexHeadings("project.org", source)).toEqual([
			{
				customId: "release",
				level: 1,
				line: 2,
				orgId: "first-id",
				relativePath: "project.org",
				title: "Ship release",
				todoKeyword: "NEXT",
			},
			{
				customId: null,
				level: 2,
				line: 9,
				orgId: null,
				relativePath: "project.org",
				title: "Plain child",
				todoKeyword: null,
			},
		])
	})

	it.each(["\r\n", "\r"])("handles %j line endings throughout the payload", (newline) => {
		const payload = buildOrgDerivedIndexDocument(
			"windows.org",
			"revision-1",
			[
				`#+title: Windows`,
				`* TODO Item :tag:`,
				`SCHEDULED: <2025-02-03 Mon>`,
				`[[id:abc][Ref]]`,
			].join(newline),
		)

		expect(payload.documents).toEqual([
			{ relativePath: "windows.org", revision: "revision-1", title: "Windows" },
		])
		expect(payload.headings).toMatchObject([{ line: 2, title: "Item", todoKeyword: "TODO" }])
		expect(payload.agenda).toMatchObject([{ kind: "scheduled", line: 3 }])
		expect(payload.links).toMatchObject([{ line: 4, targetKind: "id", targetValue: "abc" }])
	})
})
