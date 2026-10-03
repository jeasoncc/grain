import { describe, expect, it } from "vitest"
import { planOrgWorkingCopyAck } from "./org-working-copy-ack.pipe"
import type { OrgWorkingCopyAckContext } from "@/types/editor/org-working-copy-ack.interface"

const context = (): OrgWorkingCopyAckContext => ({
	expectedDocument: Object.freeze({ relativePath: "a.org", revision: "old", content: "base" }),
	currentDocument: Object.freeze({ relativePath: "a.org", revision: "old", content: "base" }),
	workingSource: "newer",
	capturedSource: "captured",
	receipt: Object.freeze({ relativePath: "a.org", revision: "ack" }),
})
describe("working-copy baseline ACK", () => {
	it.each([
		"\r",
		"\n",
		"\r\n\0字😀",
		"EOF",
		"EOF\n",
		"",
	])("preserves literal source %j without mutation", (source) => {
		const input = Object.freeze({ ...context(), capturedSource: source, workingSource: source })
		const before = JSON.stringify(input)
		expect(planOrgWorkingCopyAck(input)).toEqual({
			kind: "ack",
			document: { relativePath: "a.org", revision: "ack", content: source },
			workingSource: source,
			isDirty: false,
		})
		expect(JSON.stringify(input)).toBe(before)
	})
	it.each([
		"newer",
		"base",
		"captured",
	])("compares working %s to captured ACK, not old baseline", (workingSource) => {
		expect(planOrgWorkingCopyAck({ ...context(), workingSource })).toMatchObject({
			kind: "ack",
			workingSource,
			isDirty: workingSource !== "captured",
		})
	})
	it.each([
		["missing-baseline", { currentDocument: null }],
		[
			"path-drift",
			{ currentDocument: { relativePath: "b.org", revision: "old", content: "base" } },
		],
		[
			"revision-drift",
			{ currentDocument: { relativePath: "a.org", revision: "new", content: "base" } },
		],
		[
			"content-drift",
			{ currentDocument: { relativePath: "a.org", revision: "old", content: "drift" } },
		],
		["receipt-path", { receipt: { relativePath: "A.org", revision: "ack" } }],
		["receipt-revision", { receipt: { relativePath: "a.org", revision: " \t" } }],
	] as const)("rejects %s without mutation", (reason, change) => {
		const input = Object.freeze({ ...context(), ...change })
		const before = JSON.stringify(input)
		expect(planOrgWorkingCopyAck(input)).toEqual({ kind: "rejected", reason })
		expect(JSON.stringify(input)).toBe(before)
	})
})
