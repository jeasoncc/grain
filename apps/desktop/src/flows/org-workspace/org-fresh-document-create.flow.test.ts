import { describe, expect, it, vi } from "vitest"
import { createOrgFileRepository } from "@/io/file/org-file.repository"
import type { InvokeCommand } from "@/io/file/org-file.repository"
import { planOrgDiary } from "@/pipes/org/org-diary.pipe"
import { createOrgFreshDocumentFlow } from "./org-fresh-document-create.flow"

const id = "bb36ad93-7f03-459c-90c7-e47bbdba0f75"
const instant = new Date(2026, 9, 6, 23, 59, 58, 999)
const directory = "ا-diary/year-2026-Horse/month-10-October/day-06-Tuesday"
const expectedSource = ":PROPERTIES:\n:ID:       bb36ad93-7f03-459c-90c7-e47bbdba0f75\n:END:\n#+TITLE: 日记 2026-10-06 23:59:58\n#+DATE: 2026-10-06\n#+TIME: 2026-10-06 23:59:58\n#+FILETAGS: :diary:\n#+LATEX_CLASS: elegant-book\n#+OPTIONS: num:nil toc:nil ^:nil\n\n* 今日记录\n\n"
const fixture = () => {
	const disk = new Map<string, string>([["diary/2026-10-06.org", "legacy\r\nuntouched"]])
	const invoke = vi.fn(async (command: string, payload?: Record<string, unknown>): Promise<unknown> => {
		if (command === "create_org_directory") return undefined
		if (command !== "write_org_document" || !payload) throw new Error("Unexpected IO")
		const path = String(payload.relativePath)
		if (disk.has(path) && payload.expectedRevision === "<missing>") throw { kind: "creation-collision", relativePath: path, noWrite: true, message: "exists" }
		disk.set(path, String(payload.content))
		return { relativePath: path, revision: `confirmed-${disk.size}` }
	})
	const repository = createOrgFileRepository(invoke as InvokeCommand)
	const input = {
		workspaceRoot: "/approved",
		capabilityToken: "exact-live-grant",
		plan: planOrgDiary(instant, id),
		documentLabel: "Diary" as const,
		occupiedPaths: [] as readonly string[],
		confirmCurrent: () => true,
	}
	return { disk, invoke, repository, input }
}
const basePath = `${directory}/diary-${Math.floor(instant.getTime() / 1000)}-23-59-58.org`

describe("Doom diary source and no-clobber publication", () => {
	it("prepares exact LF bytes with a trailing empty EOF line from the local instant", () => {
		const plan = planOrgDiary(instant, id)
		expect(plan.directory).toBe(directory)
		expect(plan.filenameStem).toBe(`diary-${Math.floor(instant.getTime() / 1000)}-23-59-58`)
		expect(plan.content).toBe(expectedSource)
	})
	it.each([
		[new Date(1899, 11, 31, 23, 59, 59), "year-1899-Pig/month-12-December/day-31-Sunday", "1899-12-31 23:59:59"],
		[new Date(1900, 0, 1, 0, 0, 0), "year-1900-Rat/month-01-January/day-01-Monday", "1900-01-01 00:00:00"],
		[new Date(2024, 1, 29, 0, 0, 0), "year-2024-Dragon/month-02-February/day-29-Thursday", "2024-02-29 00:00:00"],
		[new Date(2027, 0, 1, 0, 0, 0), "year-2027-Goat/month-01-January/day-01-Friday", "2027-01-01 00:00:00"],
	] as const)("uses Gregorian year and local day boundaries for %s", (date, path, timestamp) => {
		const plan = planOrgDiary(date, id)
		expect(plan.directory).toBe(`ا-diary/${path}`)
		expect(plan.content).toContain(`#+TITLE: 日记 ${timestamp}\n`)
	})
	it("floors pre-epoch seconds instead of truncating", () => {
		expect(planOrgDiary(new Date(-1), id).filenameStem).toMatch(/^diary--1-/)
	})
	it("publishes several same-second entries without reads, overwrites, or legacy migration", async () => {
		const { disk, repository, input } = fixture()
		const ids = [id, "e1369c17-3448-4ccc-859a-185f915293bb", "8db9db4b-4df5-4ff2-b1cc-e090c7203a37"]
		for (const [index, uuid] of ids.entries()) {
			const result = await createOrgFreshDocumentFlow({ ...input, plan: planOrgDiary(instant, uuid) }, repository)()
			expect(result).toMatchObject({ _tag: "Right", right: { relativePath: index === 0 ? basePath : basePath.replace(/\.org$/, `-${index + 1}.org`) } })
		}
		expect(disk.get(basePath)).toBe(expectedSource)
		expect(disk.get("diary/2026-10-06.org")).toBe("legacy\r\nuntouched")
		expect([...disk.values()].filter((source) => source.startsWith(":PROPERTIES:"))).toHaveLength(3)
		for (const uuid of ids) expect([...disk.values()].some((source) => source.includes(`:ID:       ${uuid}\n`))).toBe(true)
	})
	it("skips known occupied candidates and advances on an authoritative racing collision only", async () => {
		const { disk, invoke, repository, input } = fixture()
		disk.set(basePath, "original-one")
		disk.set(basePath.replace(/\.org$/, "-2.org"), "racing-two")
		const result = await createOrgFreshDocumentFlow({ ...input, occupiedPaths: [basePath] }, repository)()
		expect(result).toMatchObject({ _tag: "Right", right: { relativePath: basePath.replace(/\.org$/, "-3.org") } })
		expect(disk.get(basePath)).toBe("original-one")
		expect(disk.get(basePath.replace(/\.org$/, "-2.org"))).toBe("racing-two")
		expect(invoke.mock.calls.filter(([command]) => command === "write_org_document")).toHaveLength(2)
	})
	it.each([
		"permission denied",
		"revision conflict: expected <missing>, found occupied",
		{ kind: "creation-collision", relativePath: "other.org", noWrite: true },
		{ kind: "creation-collision", relativePath: basePath, noWrite: false },
		{ kind: "creation-collision", relativePath: basePath },
	])("does not retry unproven write failure %j", async (cause) => {
		const { invoke, repository, input, disk } = fixture()
		invoke.mockImplementationOnce(async () => undefined).mockRejectedValueOnce(cause)
		const result = await createOrgFreshDocumentFlow(input, repository)()
		expect(result).toMatchObject({ _tag: "Left", left: { kind: "uncertain" } })
		expect(invoke).toHaveBeenCalledTimes(2)
		expect(disk.size).toBe(1)
	})
	it("retains a published entry when its receipt is lost, without trying a second filename", async () => {
		const { invoke, repository, input, disk } = fixture()
		invoke.mockImplementationOnce(async () => undefined).mockImplementationOnce(async (_command, payload) => {
			disk.set(String(payload?.relativePath), String(payload?.content))
			throw new Error("lost receipt after publication")
		})
		const result = await createOrgFreshDocumentFlow(input, repository)()
		expect(result).toMatchObject({ _tag: "Left", left: { kind: "uncertain" } })
		expect(disk.get(basePath)).toBe(expectedSource)
		expect(invoke).toHaveBeenCalledTimes(2)
	})
	it.each([{}, { relativePath: "other.org", revision: "confirmed" }, { relativePath: basePath, revision: "<missing>" }])("rejects an invalid receipt %j without retry", async (receipt) => {
		const { invoke, repository, input } = fixture()
		invoke.mockImplementationOnce(async () => undefined).mockResolvedValueOnce(receipt)
		expect(await createOrgFreshDocumentFlow(input, repository)()).toMatchObject({ _tag: "Left", left: { kind: "uncertain" } })
		expect(invoke).toHaveBeenCalledTimes(2)
	})
	it("rejects missing approval and directory failure before a write", async () => {
		const { invoke, repository, input } = fixture()
		expect(await createOrgFreshDocumentFlow({ ...input, capabilityToken: "" }, repository)()).toMatchObject({ _tag: "Left", left: { kind: "rejected" } })
		expect(invoke).not.toHaveBeenCalled()
		invoke.mockRejectedValueOnce("directory denied")
		expect(await createOrgFreshDocumentFlow(input, repository)()).toMatchObject({ _tag: "Left", left: { kind: "rejected" } })
		expect(invoke).toHaveBeenCalledTimes(1)
	})
	it("fences a stale owner before IO, after directory creation, and before collision retry", async () => {
		for (const stopAfter of [0, 1, 2]) {
			const { invoke, repository, input, disk } = fixture()
			if (stopAfter === 2) disk.set(basePath, "racing-entry")
			const result = await createOrgFreshDocumentFlow({ ...input, confirmCurrent: () => invoke.mock.calls.length < stopAfter }, repository)()
			expect(result).toMatchObject({ _tag: "Left", left: { kind: "stale" } })
			expect(invoke).toHaveBeenCalledTimes(stopAfter)
			expect(disk.get("diary/2026-10-06.org")).toBe("legacy\r\nuntouched")
		}
	})
})

describe("fresh-document capture boundaries", () => {
	it("captures full raw source, grant, path and occupied candidates before the task is invoked", async () => {
		const { invoke, repository, input, disk } = fixture()
		const source = "edited\r\nlone\rUnicode 🐉\u0000\n"
		const plan = { ...input.plan, content: source }
		const occupiedPaths = [basePath]
		const mutable = { ...input, plan, occupiedPaths }
		const publish = createOrgFreshDocumentFlow(mutable, repository)
		mutable.workspaceRoot = "/replacement"
		mutable.capabilityToken = "replacement-grant"
		mutable.confirmCurrent = () => false
		plan.directory = "replacement"
		plan.filenameStem = "replacement"
		plan.content = "replacement"
		occupiedPaths.length = 0
		const relativePath = basePath.replace(/\.org$/, "-2.org")
		expect(await publish()).toMatchObject({ _tag: "Right", right: { relativePath, content: source } })
		expect(disk.get(relativePath)).toBe(source)
		expect(invoke.mock.calls[0]).toEqual(["create_org_directory", {
			workspaceRoot: "/approved", capabilityToken: "exact-live-grant", relativePath: directory,
		}])
		expect(invoke.mock.calls[1]).toEqual(["write_org_document", {
			workspaceRoot: "/approved", capabilityToken: "exact-live-grant", relativePath,
			content: source, expectedRevision: "<missing>",
		}])
	})
	it("retains the captured body when caller-owned draft objects change during directory IO", async () => {
		const { invoke, repository, input, disk } = fixture()
		const directoryGate = Promise.withResolvers<unknown>()
		invoke.mockImplementationOnce(() => directoryGate.promise)
		const plan = { ...input.plan }
		const publish = createOrgFreshDocumentFlow({ ...input, plan }, repository)()
		plan.directory = "elsewhere"
		plan.filenameStem = "mutated"
		plan.content = "mutated"
		directoryGate.resolve(undefined)
		expect(await publish).toMatchObject({ _tag: "Right", right: { relativePath: basePath, content: expectedSource } })
		expect(disk.get(basePath)).toBe(expectedSource)
		expect(disk.has("elsewhere/mutated.org")).toBe(false)
	})
	it("returns a confirmed publication even if ownership expires with the write receipt, leaving navigation to the controller", async () => {
		const { invoke, repository, input, disk } = fixture()
		const result = await createOrgFreshDocumentFlow({
			...input,
			confirmCurrent: () => invoke.mock.calls.length < 2,
		}, repository)()
		expect(result).toMatchObject({ _tag: "Right", right: { relativePath: basePath, content: expectedSource } })
		expect(disk.get(basePath)).toBe(expectedSource)
	})
})
