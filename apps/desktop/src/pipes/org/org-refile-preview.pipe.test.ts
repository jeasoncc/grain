import { describe, expect, it } from "vitest"
import { DEFAULT_ORG_BEHAVIOR_CONFIGURATION } from "./org-behavior-configuration.pipe"
import { createOrgRefileTargetSnapshot, orgRefileTargetCandidates } from "./org-refile-target.pipe"
import { configuredOrgRefileTargetCandidates, planOrgRefilePreview } from "./org-refile-preview.pipe"
import { parseOrgSparseTreeQuery } from "./org-sparse-tree.pipe"
import { prepareOrgSparseTreeContext } from "@/flows/org-command/org-sparse-tree-context"

const raw = "* Move 😀\r\nbody\0\r** Child\nchild\r\n* Target :work:\r\nkeep\r\n** Nested :work:\r\n* Peer\r"
const source = { relativePath: "source.org", content: raw, cursor: 2 }

describe("configured exact-source Refile planning", () => {
	it("preserves default root/all-heading selection and excludes only the moving subtree", () => {
		const snapshot = createOrgRefileTargetSnapshot("source.org", "source-one", raw)
		const movedTo = raw.indexOf("* Target")
		const candidates = configuredOrgRefileTargetCandidates(snapshot, DEFAULT_ORG_BEHAVIOR_CONFIGURATION, { from: 0, to: movedTo })
		expect(candidates.map((candidate) => candidate.kind === "heading" ? candidate.target.heading : candidate.kind)).toEqual(["root", "* Target :work:", "** Nested :work:", "* Peer"])
		expect(configuredOrgRefileTargetCandidates(snapshot, DEFAULT_ORG_BEHAVIOR_CONFIGURATION)).toEqual(orgRefileTargetCandidates(snapshot, true))
	})
	it("combines file allowlist, target-parent depth and full match filters without allowing excluded descendants", () => {
		const snapshot = createOrgRefileTargetSnapshot("source.org", "one", raw)
		const configuration = { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION, refile: { files: ["source.org"], maxDepth: 1, includeRoot: false, match: "work+LEVEL=1" } }
		const candidates = configuredOrgRefileTargetCandidates(snapshot, configuration, { from: 0, to: raw.indexOf("* Target") }, { calendar: { today: "2026-10-10" }, nativeContext: {} })
		expect(candidates).toHaveLength(1)
		expect(candidates[0].kind === "heading" && candidates[0].target.heading).toBe("* Target :work:")
		expect(configuredOrgRefileTargetCandidates(createOrgRefileTargetSnapshot("other.org", "one", raw), configuration)).toEqual([])
	})
	it("shares configured tag and EFFORT/REPEAT_TO_STATE inheritance for exact target descendants", () => {
		const body = "#+FILETAGS: :work:\r\n* Projects\r\n:PROPERTIES:\r\n:EFFORT: 0:30\r\n:REPEAT_TO_STATE: NEXT\r\n:END:\r\n** Inbox 😀\r\n[[file:source.org::*Move][source]]\r\n** Override\r\n:PROPERTIES:\r\n:EFFORT: 1:00\r\n:END:\r\n"
		const snapshot = createOrgRefileTargetSnapshot("target.org", "target-r1", body)
		const configuration = {
			...DEFAULT_ORG_BEHAVIOR_CONFIGURATION,
			refile: { files: ["target.org"], maxDepth: 2, includeRoot: false, match: '+work+LEVEL=2+EFFORT="0:30"+REPEAT_TO_STATE="NEXT"' },
			inheritance: { tags: true, tagExclusions: [], properties: ["EFFORT", "REPEAT_TO_STATE"], propertyExclusions: [] },
		}
		const context = { calendar: { today: "2026-10-12" }, nativeContext: {} }
		const candidates = configuredOrgRefileTargetCandidates(snapshot, configuration, undefined, context)
		expect(candidates.map(entry => entry.kind === "heading" && entry.target.heading)).toEqual(["** Inbox 😀"])
		expect(configuredOrgRefileTargetCandidates(snapshot, {
			...configuration, inheritance: { ...configuration.inheritance, properties: false },
		}, undefined, context)).toEqual([])
		expect(configuredOrgRefileTargetCandidates(snapshot, {
			...configuration, inheritance: { ...configuration.inheritance, tags: false },
		}, undefined, context)).toEqual([])
	})
	it("previews exactly the payload committed by the same-file atomic batch with immutable source/target identity", () => {
		const snapshot = createOrgRefileTargetSnapshot("source.org", "one", raw)
		const candidate = orgRefileTargetCandidates(snapshot).find((entry) => entry.kind === "heading" && entry.target.heading === "* Target :work:")!
		const plan = planOrgRefilePreview(source, snapshot, candidate)
		expect(plan.kind).toBe("local")
		if (plan.kind !== "local") throw new Error("Expected local plan")
		const insertion = plan.batch.changes.find((change) => change.insert.length > 0)!
		expect(plan.preview.source).toBe(insertion.insert)
		expect(insertion.insert).toContain("** Move 😀\r\nbody\0\r*** Child\nchild\r\n")
		let projected = raw
		for (const change of [...plan.batch.changes].reverse()) projected = projected.slice(0, change.from) + change.insert + projected.slice(change.to)
		expect(projected).toBe("* Target :work:\r\nkeep\r\n** Nested :work:\r\n** Move 😀\r\nbody\0\r*** Child\nchild\r\n* Peer\r")
		expect(Object.isFrozen(plan.batch)).toBe(true)
		expect(plan.batch.changes.every(Object.isFrozen)).toBe(true)
		expect(Object.isFrozen(plan.preview)).toBe(true)
		expect(snapshot.source).toBe(raw)
	})
	it("previews cross-file insertion/releveling from the exact read-backed target without modifying either body", () => {
		const targetSource = "* Target\r\nbody\r\n** Existing\r\nkeep\r\n* Peer\r\n"
		const snapshot = createOrgRefileTargetSnapshot("target.org", "opaque-revision", targetSource)
		const candidate = orgRefileTargetCandidates(snapshot)[0]
		const plan = planOrgRefilePreview(source, snapshot, candidate)
		expect(plan.kind).toBe("transfer")
		if (plan.kind !== "transfer") throw new Error("Expected transfer")
		expect(plan.preview.source).toBe("** Move 😀\r\nbody\0\r*** Child\nchild\r\n")
		expect(plan.target).toBe(snapshot)
		expect(plan.candidate).toBe(candidate)
		expect(plan.target.revision).toBe("opaque-revision")
		expect(plan.preview.detail).toContain(String(targetSource.indexOf("* Peer")))
		expect(snapshot.source).toBe(targetSource)
		expect(source.content).toBe(raw)
	})
	it("rejects foreign exact-looking headings, changed local source and descendant insertion", () => {
		const snapshot = createOrgRefileTargetSnapshot("source.org", "one", raw)
		const candidate = orgRefileTargetCandidates(snapshot)[0]
		expect(planOrgRefilePreview(source, snapshot, candidate).kind).toBe("rejected")
		const foreign = orgRefileTargetCandidates(createOrgRefileTargetSnapshot("other.org", "one", raw))[2]
		expect(planOrgRefilePreview(source, snapshot, foreign).kind).toBe("rejected")
		const changed = createOrgRefileTargetSnapshot("source.org", "two", raw + "changed")
		expect(planOrgRefilePreview(source, changed, orgRefileTargetCandidates(changed, true)[0]).kind).toBe("rejected")
	})
	it("uses approved FILE, native string ordering and a single relative calendar for exact raw targets", async () => {
		const body = '* Good\r\n:PROPERTIES:\r\n:OWNER: B\r\n:WHEN: <2026-10-11 Sun>\r\n:END:\r\nraw\0😀\r\n* Other\r\n:PROPERTIES:\r\n:OWNER: A\r\n:WHEN: <2026-10-12 Mon>\r\n:END:\r\n'
		const snapshot = createOrgRefileTargetSnapshot("target.org", "r1", body)
		const configuration = { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION, refile: { files: ["target.org"], maxDepth: 1, includeRoot: false, match: 'FILE="/approved/target.org"+OWNER>"A"+WHEN="<tomorrow>"' } }
		const query = parseOrgSparseTreeQuery('FILE="/approved/target.org"', configuration.inheritance)!
		const native = await prepareOrgSparseTreeContext(body, query, "/approved/target.org")
		const context = { calendar: { today: "2026-10-10", now: "12:00" }, nativeContext: { ...native, compareStrings: (left: string, right: string) => left === right ? 0 : left === "B" && right === "A" ? 1 : -1 } }
		expect(configuredOrgRefileTargetCandidates(snapshot, configuration, undefined, context).map(entry => entry.kind === "heading" && entry.target.heading)).toEqual(["* Good"])
		expect(configuredOrgRefileTargetCandidates(snapshot, configuration, undefined, { ...context, calendar: { today: "2026-10-11" } })).toEqual([])
		expect(() => configuredOrgRefileTargetCandidates(snapshot, configuration)).toThrow()
	})
	it("keeps configured matches in GNU match grammar and shares Source tag-group expansion", () => {
		const body = "#+TAGS: [ CLOCKSUM : work ]\r\n* TODO Pending\r\n* DONE Tagged :todo:\r\n* Group :work:\r\n"
		const snapshot = createOrgRefileTargetSnapshot("target.org", "r1", body)
		const context = { calendar: { today: "2026-10-10" }, nativeContext: {} }
		for (const [match, heading] of [["todo", "* DONE Tagged :todo:"], ['CLOCKSUM="unused"', "* Group :work:"]]) {
			const configuration = { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION, refile: { files: ["target.org"], maxDepth: 1, includeRoot: false, match } }
			expect(configuredOrgRefileTargetCandidates(snapshot, configuration, undefined, context).map(entry => entry.kind === "heading" && entry.target.heading)).toEqual([heading])
		}
	})
})
