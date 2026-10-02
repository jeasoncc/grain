import { describe, expect, it } from "vitest"
import type {
	OrgBufferContext,
	OrgBufferOpenResult,
	OrgBufferResult,
	OrgBufferSnapshot,
} from "@/types/editor/org-buffer.interface"
import {
	beginOrgBufferSave,
	createOrgBuffer,
	discardCloseOrgBuffer,
	failOrgBufferSave,
	finishOrgBufferSave,
	isOrgBufferDirty,
	observeOrgBufferExternal,
	openOrgBuffer,
	renameOrgBufferWithApprovedCapability,
	updateOrgBufferContent,
} from "./org-buffer.pipe"

const identity = {
	bufferId: "buffer-1",
	relativePath: "notes/inbox.org",
	workspaceId: "approved-capability-1",
} as const
const unwrap = (result: OrgBufferResult | OrgBufferOpenResult): OrgBufferSnapshot => {
	if (result.status === "rejected") {
		throw new Error(result.reason)
	}
	return result.snapshot
}
const open = (content = "base"): OrgBufferSnapshot =>
	unwrap(openOrgBuffer({ ...identity, baseRevision: "r1", content }))
const context = (snapshot: OrgBufferSnapshot): OrgBufferContext => ({
	bufferId: snapshot.bufferId,
	expectedBaseRevision: snapshot.baseRevision,
	expectedGeneration: snapshot.editGeneration,
	relativePath: snapshot.relativePath,
	workspaceId: snapshot.workspaceId,
})
const edit = (snapshot: OrgBufferSnapshot, content: string): OrgBufferSnapshot =>
	unwrap(updateOrgBufferContent(snapshot, context(snapshot), content))
const begin = (snapshot: OrgBufferSnapshot, token = "request-1"): OrgBufferSnapshot =>
	unwrap(beginOrgBufferSave(snapshot, context(snapshot), token))
const capture = (snapshot: OrgBufferSnapshot) => {
	if (!snapshot.saving) {
		throw new Error("Missing capture")
	}
	return snapshot.saving
}
const external = { externalContent: "external", externalRevision: "r-external" } as const
const rename = (snapshot: OrgBufferSnapshot, path: string): OrgBufferSnapshot =>
	unwrap(
		renameOrgBufferWithApprovedCapability(snapshot, {
			...context(snapshot),
			capabilityApproved: true,
			newRelativePath: path,
		}),
	)
const rejected = (result: OrgBufferResult, snapshot: OrgBufferSnapshot, reason: string) => {
	expect(result).toEqual({ reason, snapshot, status: "rejected" })
	expect(result.snapshot).toBe(snapshot)
}

describe("Org buffer memory-only lifecycle", () => {
	it.each([
		"",
		"LF\n",
		"CRLF\r\n",
		"mixed\r\n\n\rEOF",
		"终点🪷e\u0301\u0000tail",
		"no terminal newline",
		"\n\n",
	])("preserves raw body verbatim: %j", (body) => {
		const initial = open(body)
		expect(initial.content).toBe(body)
		expect(initial.baseContent).toBe(body)
		expect(isOrgBufferDirty(initial)).toBe(false)
		const saving = begin(edit(initial, `${body}\u0000新\r\n`))
		const saved = unwrap(finishOrgBufferSave(saving, capture(saving), "r2"))
		expect(saved.content).toBe(`${body}\u0000新\r\n`)
		expect(saved.baseContent).toBe(saved.content)
		expect(isOrgBufferDirty(saved)).toBe(false)
	})

	it("opens caller identities and creates absent-file snapshots without IDs or clocks", () => {
		const first = open()
		expect(open()).toEqual(first)
		expect(first).toMatchObject({ ...identity, conflict: null, editGeneration: 0, saving: null })
		const created = unwrap(createOrgBuffer({ ...identity, content: "unsaved" }))
		expect(created.baseRevision).toBeNull()
		expect(created.baseContent).toBe("")
		expect(isOrgBufferDirty(created)).toBe(true)
		const saved = begin(created)
		expect(capture(saved).baseRevision).toBeNull()
		expect(isOrgBufferDirty(unwrap(finishOrgBufferSave(saved, capture(saved), "created-r1")))).toBe(
			false,
		)
	})

	it.each([
		"",
		"/root.org",
		"../x.org",
		"a/../x",
		"./x",
		"a//b",
		"a/",
		"C:/x",
		"a\\b",
		"a\u0000b",
	])("rejects non-relative or ambiguous path %j", (relativePath) => {
		expect(openOrgBuffer({ ...identity, baseRevision: null, content: "", relativePath })).toEqual({
			reason: "invalid-relative-path",
			status: "rejected",
		})
	})

	it("rejects missing identities", () => {
		for (const ids of [{ bufferId: "" }, { workspaceId: "" }]) {
			expect(openOrgBuffer({ ...identity, ...ids, baseRevision: null, content: "" })).toEqual({
				reason: "invalid-identity",
				status: "rejected",
			})
		}
	})

	it("uses generation, not text equality, to prevent ABA and same-text stale edits", () => {
		const initial = open("A")
		const aba = edit(edit(initial, "B"), "A")
		expect(isOrgBufferDirty(aba)).toBe(false)
		expect(aba.editGeneration).toBe(2)
		rejected(updateOrgBufferContent(aba, context(initial), "stale"), aba, "stale-generation")
		const same = edit(aba, "A")
		expect(same.editGeneration).toBe(3)
		rejected(updateOrgBufferContent(same, context(aba), "stale"), same, "stale-generation")
	})

	it("captures the full identity and body and commits captured text without losing newer edits", () => {
		const saving = begin(edit(open(), "captured"))
		const request = capture(saving)
		expect(request).toEqual({
			...identity,
			baseRevision: "r1",
			content: "captured",
			editGeneration: 1,
			token: "request-1",
		})
		const live = edit(saving, "newer")
		const completed = unwrap(finishOrgBufferSave(live, request, "r2"))
		expect(completed).toMatchObject({
			baseContent: "captured",
			baseRevision: "r2",
			content: "newer",
			editGeneration: 2,
			saving: null,
		})
		expect(isOrgBufferDirty(completed)).toBe(true)
		expect(saving.content).toBe("captured")
		// A baseline change makes pre-save commands stale even without an edit.
		const noEdit = unwrap(finishOrgBufferSave(saving, request, "r2"))
		rejected(updateOrgBufferContent(noEdit, context(saving), "stale"), noEdit, "stale-revision")
	})

	it("rejects duplicate completion, old callbacks, cloned captures, and overlapping saves", () => {
		const saving = begin(edit(open(), "body"))
		const old = capture(saving)
		rejected(beginOrgBufferSave(saving, context(saving), "other"), saving, "save-in-flight")
		rejected(finishOrgBufferSave(saving, { ...old }, "bad"), saving, "wrong-capture")
		rejected(
			finishOrgBufferSave(saving, { ...old, token: "wrong" }, "bad"),
			saving,
			"wrong-capture",
		)
		const failed = unwrap(failOrgBufferSave(saving, old, { kind: "failed" }))
		// Even deliberate caller token reuse cannot make the old object authoritative.
		const retry = begin(failed)
		rejected(finishOrgBufferSave(retry, old, "bad"), retry, "wrong-capture")
		rejected(
			failOrgBufferSave(retry, old, { external, kind: "revision-conflict" }),
			retry,
			"wrong-capture",
		)
		const completed = unwrap(finishOrgBufferSave(retry, capture(retry), "r2"))
		rejected(finishOrgBufferSave(completed, capture(retry), "r3"), completed, "wrong-capture")
		rejected(
			failOrgBufferSave(completed, capture(retry), { kind: "failed" }),
			completed,
			"wrong-capture",
		)
		rejected(beginOrgBufferSave(failed, context(failed), ""), failed, "invalid-save-token")
	})

	it.each([
		[{ workspaceId: "another-capability" }, "wrong-workspace"],
		[{ bufferId: "another-buffer" }, "wrong-buffer"],
		[{ relativePath: "moved.org" }, "moved-path"],
	] as const)("rejects wrong scope without changing state: %j", (scope, reason) => {
		const saving = begin(edit(open(), "local"))
		const wrong = { ...context(saving), ...scope }
		for (const result of [
			updateOrgBufferContent(saving, wrong, "bad"),
			beginOrgBufferSave(saving, wrong, "bad"),
			observeOrgBufferExternal(saving, wrong, external),
			renameOrgBufferWithApprovedCapability(saving, {
				...wrong,
				capabilityApproved: true,
				newRelativePath: "new.org",
			}),
			finishOrgBufferSave(saving, { ...capture(saving), ...scope }, "bad"),
			failOrgBufferSave(saving, { ...capture(saving), ...scope }, { kind: "failed" }),
		]) {
			rejected(result, saving, reason)
		}
		expect(discardCloseOrgBuffer(saving, wrong, true)).toEqual({
			reason,
			snapshot: saving,
			status: "rejected",
		})
	})

	it("failed saves preserve body/baseline and revision errors explicitly emit a conflict message", () => {
		const saving = begin(edit(open(), "local"))
		const live = edit(saving, "newer")
		const failed = unwrap(failOrgBufferSave(live, capture(saving), { kind: "failed" }))
		expect(failed).toMatchObject({
			baseContent: "base",
			baseRevision: "r1",
			conflict: null,
			content: "newer",
			editGeneration: 2,
			saving: null,
		})
		const result = failOrgBufferSave(live, capture(saving), { external, kind: "revision-conflict" })
		expect(result.status === "updated" && result.effect).toEqual({
			kind: "revision-conflict",
			...identity,
			...external,
		})
		expect(unwrap(result)).toMatchObject({
			baseContent: "base",
			baseRevision: "r1",
			conflict: external,
			content: "newer",
			saving: null,
		})
	})

	it("observes dirty external revisions as conflicts and never overwrites local or captured text", () => {
		const dirty = edit(open(), "local")
		const result = observeOrgBufferExternal(dirty, context(dirty), external)
		const conflicted = unwrap(result)
		expect(conflicted).toMatchObject({
			baseContent: "base",
			baseRevision: "r1",
			conflict: external,
			content: "local",
			editGeneration: 1,
		})
		expect(result.status === "updated" && result.effect?.kind).toBe("revision-conflict")
		const saving = begin(dirty)
		const observed = unwrap(observeOrgBufferExternal(saving, context(saving), external))
		const completed = unwrap(finishOrgBufferSave(observed, capture(saving), "r2"))
		expect(completed.conflict).toEqual(external)
		const confirmed = unwrap(
			finishOrgBufferSave(observed, capture(saving), external.externalRevision),
		)
		expect(confirmed.conflict).toBeNull()
	})

	it("reloads clean buffers, advances generation and rejects stale reload observations", () => {
		const initial = open()
		const reload = unwrap(observeOrgBufferExternal(initial, context(initial), external))
		expect(reload).toMatchObject({
			baseContent: "external",
			baseRevision: "r-external",
			conflict: null,
			content: "external",
			editGeneration: 1,
		})
		expect(isOrgBufferDirty(reload)).toBe(false)
		rejected(
			observeOrgBufferExternal(reload, context(initial), {
				externalContent: "old",
				externalRevision: "old",
			}),
			reload,
			"stale-generation",
		)
		const unchanged = unwrap(observeOrgBufferExternal(reload, context(reload), external))
		expect(unchanged).toBe(reload)
		const deleted = unwrap(
			observeOrgBufferExternal(reload, context(reload), {
				externalContent: "",
				externalRevision: null,
			}),
		)
		expect(deleted).toMatchObject({
			baseContent: "",
			baseRevision: null,
			content: "",
			editGeneration: 2,
		})
		const cleanSaving = begin(initial)
		rejected(
			observeOrgBufferExternal(cleanSaving, context(cleanSaving), external),
			cleanSaving,
			"save-in-flight",
		)
	})

	it("requires explicit rename approval, keeps IDs/body/conflict, rejects in-flight moves and stale save after rename", () => {
		const saving = begin(edit(open(), "local"))
		const request = capture(saving)
		rejected(
			renameOrgBufferWithApprovedCapability(saving, {
				...context(saving),
				capabilityApproved: true,
				newRelativePath: "new.org",
			}),
			saving,
			"save-in-flight",
		)
		const failed = unwrap(
			failOrgBufferSave(saving, request, { external, kind: "revision-conflict" }),
		)
		rejected(
			renameOrgBufferWithApprovedCapability(failed, {
				...context(failed),
				capabilityApproved: false,
				newRelativePath: "new.org",
			}),
			failed,
			"rename-not-approved",
		)
		rejected(
			renameOrgBufferWithApprovedCapability(failed, {
				...context(failed),
				capabilityApproved: true,
				newRelativePath: "../bad",
			}),
			failed,
			"invalid-relative-path",
		)
		const moved = rename(failed, "new.org")
		expect(moved).toMatchObject({
			...identity,
			baseContent: "base",
			baseRevision: "r1",
			conflict: external,
			content: "local",
			editGeneration: 2,
			relativePath: "new.org",
		})
		rejected(finishOrgBufferSave(moved, request, "bad"), moved, "moved-path")
		rejected(failOrgBufferSave(moved, request, { kind: "failed" }), moved, "moved-path")
		const back = rename(moved, identity.relativePath)
		rejected(updateOrgBufferContent(back, context(failed), "bad"), back, "stale-generation")
		const retry = begin(back)
		rejected(finishOrgBufferSave(retry, request, "bad"), retry, "wrong-capture")
	})

	it("never retires a live save owner, even with explicit discard", () => {
		for (const body of ["base", "local"]) {
			const saving = begin(edit(open(), body))
			for (const force of [false, true]) {
				expect(discardCloseOrgBuffer(saving, context(saving), force)).toMatchObject({
					status: "rejected",
					reason: "save-in-flight",
					snapshot: saving,
				})
			}
		}
	})

	it("guards dirty close unless forced and returns only an explicit close decision", () => {
		const clean = open()
		expect(discardCloseOrgBuffer(clean, context(clean))).toEqual({ identity, status: "closed" })
		const dirty = edit(clean, "local")
		expect(discardCloseOrgBuffer(dirty, context(dirty))).toEqual({
			reason: "dirty-buffer",
			snapshot: dirty,
			status: "rejected",
		})
		expect(discardCloseOrgBuffer(dirty, context(dirty), true)).toEqual({
			identity,
			status: "closed",
		})
		expect(discardCloseOrgBuffer(dirty, context(clean), true)).toEqual({
			reason: "stale-generation",
			snapshot: dirty,
			status: "rejected",
		})
		expect(dirty.content).toBe("local")
	})

	it("freezes output data and copies nested caller payloads without mutating inputs", () => {
		const initial = open()
		const saving = begin(edit(initial, "local"))
		const mutableExternal = { ...external }
		const observed = unwrap(observeOrgBufferExternal(saving, context(saving), mutableExternal))
		expect(Object.isFrozen(initial)).toBe(true)
		expect(Object.isFrozen(saving)).toBe(true)
		expect(Object.isFrozen(capture(saving))).toBe(true)
		expect(Object.isFrozen(observed.conflict)).toBe(true)
		expect(observed.conflict).not.toBe(mutableExternal)
		expect(initial.content).toBe("base")
		expect(initial.editGeneration).toBe(0)
		expect(saving.conflict).toBeNull()
	})

	it("projects external data so extra caller fields cannot replace capability identities", () => {
		const dirty = edit(open(), "local")
		const payload = {
			...external,
			bufferId: "wrong",
			content: "wrong",
			kind: "wrong",
			workspaceId: "wrong",
		}
		const result = observeOrgBufferExternal(dirty, context(dirty), payload)
		expect(unwrap(result).conflict).toEqual(external)
		expect(result.status === "updated" && result.effect).toEqual({
			kind: "revision-conflict",
			...identity,
			...external,
		})
	})

	it("rejects generation overflow rather than silently breaking ABA guards", () => {
		const exhausted = Object.freeze({ ...open(), editGeneration: Number.MAX_SAFE_INTEGER })
		rejected(
			updateOrgBufferContent(exhausted, context(exhausted), "local"),
			exhausted,
			"generation-exhausted",
		)
		rejected(
			observeOrgBufferExternal(exhausted, context(exhausted), external),
			exhausted,
			"generation-exhausted",
		)
		rejected(
			renameOrgBufferWithApprovedCapability(exhausted, {
				...context(exhausted),
				capabilityApproved: true,
				newRelativePath: "new.org",
			}),
			exhausted,
			"generation-exhausted",
		)
	})
})
