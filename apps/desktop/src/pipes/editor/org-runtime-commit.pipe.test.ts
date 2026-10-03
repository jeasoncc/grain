import { describe, expect, it } from "vitest"
import type { OrgRuntimeCommitContext } from "@/types/editor/org-runtime-owner.interface"
import { guardOrgRuntimeCommit } from "./org-runtime-commit.pipe"

const base: OrgRuntimeCommitContext = Object.freeze({
	mounted: true,
	closeReady: true,
	grantMatches: true,
	sessionMatches: true,
	isActiveOwner: true,
	previous: "old",
	next: "new",
	activeSource: "old",
	runtimeBufferId: "G1:buffer-1",
	loading: false,
	mutationInProgress: false,
	ordinarySaveInFlight: false,
})
const installation = Object.freeze({ bufferId: base.runtimeBufferId, expected: "old", next: "new" })
const accepted = (destination: "active" | "parked", reason: "edit" | "installation") => ({
	kind: "accepted",
	destination,
	reason,
})

// Independent transcription of the pre-extraction Boolean contract.
const legacyAccepts = (c: OrgRuntimeCommitContext): boolean => {
	const exactOwner =
		c.mounted && c.closeReady && c.grantMatches && c.sessionMatches && c.isActiveOwner
	const i = c.authorizedInstallation
	if (
		!exactOwner &&
		i?.bufferId === c.runtimeBufferId &&
		i.expected === c.previous &&
		i.next === c.next &&
		c.mounted &&
		c.closeReady &&
		c.grantMatches &&
		c.sessionMatches &&
		c.parkedSource !== undefined &&
		c.parkedSource === c.previous
	)
		return true
	return (
		exactOwner &&
		c.previous === c.activeSource &&
		(Boolean(
			i && i.bufferId === c.runtimeBufferId && i.expected === c.previous && i.next === c.next,
		) ||
			(!c.loading && (!c.mutationInProgress || c.ordinarySaveInFlight)))
	)
}

describe("guardOrgRuntimeCommit", () => {
	it.each([
		["ordinary edit", {}, accepted("active", "edit")],
		[
			"ordinary save allows typing",
			{ mutationInProgress: true, ordinarySaveInFlight: true },
			accepted("active", "edit"),
		],
		["transfer refuses typing", { mutationInProgress: true }, "mutation-in-progress"],
		[
			"loading refuses typing even during ordinary save",
			{ loading: true, ordinarySaveInFlight: true },
			"loading",
		],
		[
			"active installation during loading/mutation",
			{ authorizedInstallation: installation, loading: true, mutationInProgress: true },
			accepted("active", "installation"),
		],
		[
			"parked installation during loading/mutation",
			{
				isActiveOwner: false,
				parkedSource: "old",
				authorizedInstallation: installation,
				loading: true,
				mutationInProgress: true,
			},
			accepted("parked", "installation"),
		],
		[
			"no user-writable inactive buffer",
			{ isActiveOwner: false, parkedSource: "old" },
			"inactive-owner",
		],
		[
			"no parked body",
			{ isActiveOwner: false, authorizedInstallation: installation },
			"inactive-owner",
		],
		[
			"wrong parked body",
			{ isActiveOwner: false, parkedSource: "different", authorizedInstallation: installation },
			"inactive-owner",
		],
		[
			"wrong destination cannot borrow parked source",
			{ activeSource: "different", parkedSource: "old", authorizedInstallation: installation },
			"stale-source",
		],
		[
			"unauthorized installation cannot bypass root",
			{ grantMatches: false, authorizedInstallation: installation, parkedSource: "old" },
			"wrong-grant",
		],
		["G1 runtime under G2 grant", { grantMatches: false }, "wrong-grant"],
		["same-root new session", { sessionMatches: false }, "wrong-session"],
		["unmounted", { mounted: false }, "unmounted"],
		["close protection unavailable", { closeReady: false }, "close-not-ready"],
		[
			"changed expected blocks installation",
			{
				mutationInProgress: true,
				authorizedInstallation: { ...installation, expected: "changed" },
			},
			"mutation-in-progress",
		],
		[
			"changed next blocks installation",
			{ mutationInProgress: true, authorizedInstallation: { ...installation, next: "changed" } },
			"mutation-in-progress",
		],
		[
			"wrong buffer blocks installation",
			{
				mutationInProgress: true,
				authorizedInstallation: { ...installation, bufferId: "G2:buffer-1" },
			},
			"mutation-in-progress",
		],
		[
			"invalid installation does not block ordinary edit",
			{ authorizedInstallation: { ...installation, expected: "changed" } },
			accepted("active", "edit"),
		],
	] as const)("%s", (_name, patch, expected) => {
		const decision = guardOrgRuntimeCommit(Object.freeze({ ...base, ...patch }))
		if (typeof expected === "string") {
			expect(decision).toMatchObject({ kind: "rejected", reason: expected })
			if (decision.kind === "rejected") expect(decision.message.length).toBeGreaterThan(0)
		} else expect(decision).toEqual(expected)
	})

	it("exhaustively preserves the Boolean contract across authority, destination, bodies and installations", () => {
		const booleans = [
			"mounted",
			"closeReady",
			"grantMatches",
			"sessionMatches",
			"isActiveOwner",
			"loading",
			"mutationInProgress",
			"ordinarySaveInFlight",
		] as const
		for (let mask = 0; mask < 256; mask++) {
			const flags = Object.fromEntries(
				booleans.map((key, bit) => [key, Boolean(mask & (1 << bit))]),
			)
			for (const activeSource of ["old", "other"])
				for (const parkedSource of [undefined, "old", "other", ""])
					for (const authorizedInstallation of [
						undefined,
						installation,
						{ ...installation, bufferId: "wrong" },
						{ ...installation, expected: "wrong" },
						{ ...installation, next: "wrong" },
					]) {
						const context = Object.freeze({
							...base,
							...flags,
							activeSource,
							parkedSource,
							authorizedInstallation,
						})
						const decision = guardOrgRuntimeCommit(context)
						expect(decision.kind === "accepted").toBe(legacyAccepts(context))
						if (decision.kind === "accepted") {
							expect(decision.destination).toBe(context.isActiveOwner ? "active" : "parked")
							expect(decision.reason).toBe(
								authorizedInstallation === installation ? "installation" : "edit",
							)
						}
					}
		}
	})

	it.each([
		"",
		"\n",
		"\r\n",
		"* Heading\n",
		"* Heading\r\n",
		"e\u0301",
		"é",
		"\u0000",
		" 😀 ",
	])("uses literal source scalars, including %j", (source) => {
		const c = Object.freeze({ ...base, previous: source, activeSource: source, next: `${source}x` })
		expect(guardOrgRuntimeCommit(c)).toEqual(accepted("active", "edit"))
		expect(guardOrgRuntimeCommit({ ...c, activeSource: `${source} ` })).toMatchObject({
			kind: "rejected",
			reason: "stale-source",
		})
		expect(
			guardOrgRuntimeCommit({
				...c,
				isActiveOwner: false,
				parkedSource: source,
				authorizedInstallation: { bufferId: c.runtimeBufferId, expected: source, next: c.next },
			}),
		).toEqual(accepted("parked", "installation"))
	})

	it.each([
		["* Heading\n", "* Heading\r\n"],
		["e\u0301", "é"],
		["body", "body\n"],
		["body", " body"],
	])("does not normalize %j into %j", (previous, other) => {
		const context = { ...base, previous, activeSource: other }
		expect(guardOrgRuntimeCommit(context)).toMatchObject({
			kind: "rejected",
			reason: "stale-source",
		})
		expect(
			guardOrgRuntimeCommit({
				...context,
				isActiveOwner: false,
				parkedSource: other,
				authorizedInstallation: { ...installation, expected: previous },
			}),
		).toMatchObject({ kind: "rejected", reason: "inactive-owner" })
	})

	it("ABA active ownership permits the retained runtime only with the current literal body", () => {
		expect(guardOrgRuntimeCommit(base)).toEqual(accepted("active", "edit"))
		expect(guardOrgRuntimeCommit({ ...base, isActiveOwner: false, parkedSource: "old" }).kind).toBe(
			"rejected",
		)
		expect(guardOrgRuntimeCommit({ ...base, activeSource: "after B" }).kind).toBe("rejected")
		expect(
			guardOrgRuntimeCommit({ ...base, previous: "after B", activeSource: "after B" }),
		).toEqual(accepted("active", "edit"))
	})

	it("baseline equality and paused autosave are not typing authority or updater flags", () => {
		// These reconciliation fields belong to their separate updater, not this guard.
		const owner = Object.freeze({
			...base,
			baseSource: "old",
			autosavePaused: true,
			hasConflict: true,
		})
		expect(guardOrgRuntimeCommit(owner)).toEqual(accepted("active", "edit"))
		expect(owner.autosavePaused).toBe(true)
		expect(owner.hasConflict).toBe(true)
	})
})
