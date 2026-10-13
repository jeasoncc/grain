import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"
import {
	clearOrgCaptureDrafts,
	hasOrgCaptureDrafts,
	OrgCaptureDraftPublicationError,
	readOrgCaptureDrafts,
	removeOrgCaptureDraft,
	saveOrgCaptureDraft,
	type OrgCaptureDraftRecord,
	type OrgCaptureDraftStorage,
} from "./org-capture-draft.storage"

const fixture = () => {
	const data = new Map<string, string>()
	const bodyReads: string[] = []
	const storage: OrgCaptureDraftStorage = {
		get length() { return data.size },
		key: (index) => [...data.keys()][index] ?? null,
		getItem: (key) => { bodyReads.push(key); return data.get(key) ?? null },
		setItem: (key, value) => { data.set(key, value) },
		removeItem: (key) => { data.delete(key) },
	}
	return { data, bodyReads, storage }
}
const draft = (patch: Partial<OrgCaptureDraftRecord> = {}): OrgCaptureDraftRecord => ({
	version: 1, id: "captured-1", rootPath: "/notes", templateId: "note", label: "Note", entryType: "entry",
	target: { kind: "datetree", relativePath: "journal.org", headingPath: ["Journal"], date: "2026-10-07" },
	initialSource: "* ", initialCursor: 2, draft: "* private 中文\r\n%?(literal) 😀", status: "editing", updatedAt: 100,
	...patch,
})
const right = <L, R>(result: E.Either<L, R>): R => {
	if (E.isLeft(result)) throw new Error(String(result.left))
	return result.right
}

describe("opt-in Capture draft recovery", () => {
	it("does not obtain storage or read/write a body when recovery is disabled", () => {
		const storage = new Proxy({} as OrgCaptureDraftStorage, {
			get: () => { throw new Error("Disabled recovery accessed storage") },
		})
		expect(readOrgCaptureDrafts("/notes", { enabled: false, storage })).toEqual(E.right([]))
		expect(E.isLeft(saveOrgCaptureDraft(draft(), { enabled: false, storage }))).toBe(true)
	})
	it("restores literal bytes and the frozen date after a fresh storage owner resumes", () => {
		const f = fixture()
		right(saveOrgCaptureDraft(draft(), { enabled: true, storage: f.storage }))
		const fresh = readOrgCaptureDrafts("/notes", { enabled: true, storage: { ...f.storage, length: f.data.size } })
		const restored = right(fresh)[0]
		expect(restored.draft).toBe("* private 中文\r\n%?(literal) 😀")
		expect(restored.target).toEqual({ kind: "datetree", relativePath: "journal.org", headingPath: ["Journal"], date: "2026-10-07" })
	})
	it("does not read another workspace's saved bodies", () => {
		const f = fixture()
		right(saveOrgCaptureDraft(draft(), { enabled: true, storage: f.storage }))
		right(saveOrgCaptureDraft(draft({ rootPath: "/other", id: "other-1" }), { enabled: true, storage: f.storage }))
		f.bodyReads.length = 0
		const loaded = right(readOrgCaptureDrafts("/notes", { enabled: true, storage: f.storage }))
		expect(loaded.map((record) => record.rootPath)).toEqual(["/notes"])
		expect(f.bodyReads.every((key) => key.startsWith("grain:org-capture-draft:%2Fnotes:"))).toBe(true)
	})
	it.each(["publishing", "uncertain"] as const)("never downgrades a persisted %s marker to an editable draft", (status) => {
		const f = fixture()
		right(saveOrgCaptureDraft(draft({ status }), { enabled: true, storage: f.storage }))
		const attempted = saveOrgCaptureDraft(draft({ draft: "* duplicated" }), { enabled: true, storage: f.storage })
		expect(E.isLeft(attempted) && attempted.left instanceof OrgCaptureDraftPublicationError).toBe(true)
		expect(right(readOrgCaptureDrafts("/notes", { enabled: true, storage: f.storage }))[0]).toMatchObject({ status, draft: draft().draft })
	})
	it("permits a fresh editing journal only after explicit removal of a known no-write attempt", () => {
		const f = fixture()
		right(saveOrgCaptureDraft(draft({ status: "publishing" }), { enabled: true, storage: f.storage }))
		right(removeOrgCaptureDraft("/notes", "captured-1", f.storage))
		right(saveOrgCaptureDraft(draft({ id: "fresh-2" }), { enabled: true, storage: f.storage }))
		expect(right(readOrgCaptureDrafts("/notes", { enabled: true, storage: f.storage })).map((record) => [record.id, record.status])).toEqual([["fresh-2", "editing"]])
	})
	it.each([
		{ capabilityToken: "forbidden grant" }, { runtimeIncarnation: "forbidden owner" },
		{ target: { kind: "file", relativePath: "../escape.org" } },
		{ initialCursor: 100 }, { updatedAt: Infinity },
	])("refuses authority-bearing or malformed saved data without discarding its bytes: %j", (patch) => {
		const f = fixture()
		right(saveOrgCaptureDraft(draft(), { enabled: true, storage: f.storage }))
		const key = [...f.data.keys()][0]
		const corrupted = JSON.stringify({ ...draft(), ...patch })
		f.data.set(key, corrupted)
		expect(E.isLeft(readOrgCaptureDrafts("/notes", { enabled: true, storage: f.storage }))).toBe(true)
		expect(f.data.get(key)).toBe(corrupted)
	})
	it("refuses a record copied under a different workspace/id key", () => {
		const f = fixture()
		right(saveOrgCaptureDraft(draft(), { enabled: true, storage: f.storage }))
		const key = [...f.data.keys()][0]
		f.data.set(key, JSON.stringify(draft({ rootPath: "/forged", id: "wrong-id" })))
		expect(E.isLeft(readOrgCaptureDrafts("/notes", { enabled: true, storage: f.storage }))).toBe(true)
	})
	it("checks and revokes only Capture keys without reading private bodies or clearing unrelated settings", () => {
		const f = fixture()
		right(saveOrgCaptureDraft(draft(), { enabled: true, storage: f.storage }))
		f.data.set("grain-settings", "kept")
		f.data.set("private-other-journal", "not ours")
		f.bodyReads.length = 0
		expect(hasOrgCaptureDrafts(f.storage)).toEqual(E.right(true))
		right(clearOrgCaptureDrafts(f.storage))
		expect([...f.data]).toEqual([["grain-settings", "kept"], ["private-other-journal", "not ours"]])
		expect(f.bodyReads).toEqual([])
	})
	it("surfaces quota/removal failures and retains the existing draft", () => {
		const f = fixture()
		right(saveOrgCaptureDraft(draft(), { enabled: true, storage: f.storage }))
		const failed: OrgCaptureDraftStorage = {
			...f.storage, length: f.data.size,
			setItem: () => { throw new Error("Quota exceeded") },
			removeItem: () => { throw new Error("Storage denied") },
		}
		expect(E.isLeft(saveOrgCaptureDraft(draft({ draft: "* newer" }), { enabled: true, storage: failed }))).toBe(true)
		expect(E.isLeft(removeOrgCaptureDraft("/notes", "captured-1", failed))).toBe(true)
		expect(E.isLeft(clearOrgCaptureDrafts(failed))).toBe(true)
		expect(right(readOrgCaptureDrafts("/notes", { enabled: true, storage: f.storage }))[0].draft).toBe(draft().draft)
	})
})
