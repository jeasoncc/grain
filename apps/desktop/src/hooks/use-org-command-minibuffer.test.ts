import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { orgTagsBufferCommand } from "@/flows/org-command/org-tags.command"
import { createOrgPlanningCommand } from "@/flows/org-command/org-planning.command"
import type { OrgWorkspaceController } from "./use-org-workspace"
import { useOrgCommandMinibuffer } from "./use-org-command-minibuffer"

const makeController = (rootPath = "/workspace") =>
	({
		workspace: {
			rootPath,
			capabilityToken: "grant-one",
			documents: [
				{ relativePath: "note.org" },
				{ relativePath: "inbox.org" },
				{ relativePath: "projects/work.org" },
			],
		},
		workspaceSessionId: "G1",
		activeBufferId: "note-buffer",
		isDirty: false,
		readRefileTarget: vi
			.fn<OrgWorkspaceController["readRefileTarget"]>()
			.mockImplementation(async (relativePath) => ({
				kind: "ready",
				snapshot: { relativePath, revision: "target-one", headings: [] },
			})),
		refileSubtree: vi
			.fn<OrgWorkspaceController["refileSubtree"]>()
			.mockResolvedValue({ kind: "success" }),
		archiveSubtree: vi
			.fn<OrgWorkspaceController["archiveSubtree"]>()
			.mockResolvedValue({ kind: "success" }),
		content: "* Note",
		activeDocument: { relativePath: "note.org", revision: "one" },
	}) as unknown as OrgWorkspaceController
const makeTarget = () => ({ applyEdit: vi.fn(() => true), restoreFocus: vi.fn() })

describe("buffer parameter session origin ownership", () => {
	it("dismisses and invalidates buffer parameters while a workspace parameter surface owns input", () => {
		const target = makeTarget()
		const { result, rerender } = renderHook(
			({ suspended }) =>
				useOrgCommandMinibuffer(makeController(), false, { current: target }, suspended),
			{ initialProps: { suspended: false } },
		)
		act(() => result.current.open(orgTagsBufferCommand, 2))
		const old = result.current.session!
		rerender({ suspended: true })
		expect(result.current.session).toBeNull()
		act(() => {
			expect(old.onAccept("work")).toMatchObject({ ok: false })
			result.current.open(orgTagsBufferCommand, 2)
		})
		expect(result.current.session).toBeNull()
		expect(target.applyEdit).not.toHaveBeenCalled()
		expect(target.restoreFocus).not.toHaveBeenCalled()
	})
	it("rejects an older callback after another command replaces its session", () => {
		const target = makeTarget()
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(makeController(), false, { current: target }),
		)
		act(() => result.current.open(orgTagsBufferCommand, 2))
		const old = result.current.session!
		act(() => result.current.open(createOrgPlanningCommand("SCHEDULED", "2026-09-30"), 2))
		act(() => {
			expect(old.onAccept("work")).toMatchObject({ ok: false })
		})
		act(() => old.onCancel())
		expect(target.applyEdit).not.toHaveBeenCalled()
		expect(target.restoreFocus).not.toHaveBeenCalled()
		expect(result.current.session?.prompt).toBe("Schedule (YYYY-MM-DD):")
	})
	it("rejects the same relative path under a different workspace", () => {
		const target = makeTarget()
		const { result, rerender } = renderHook(
			({ root }) => useOrgCommandMinibuffer(makeController(root), false, { current: target }),
			{ initialProps: { root: "/workspace" } },
		)
		act(() => result.current.open(orgTagsBufferCommand, 2))
		const old = result.current.session!
		rerender({ root: "/other" })
		act(() => {
			expect(old.onAccept("work")).toMatchObject({ ok: false })
		})
		expect(target.applyEdit).not.toHaveBeenCalled()
		expect(result.current.session).toBeNull()
	})
	it("rejects late callbacks after unmount", () => {
		const target = makeTarget()
		const { result, unmount } = renderHook(() =>
			useOrgCommandMinibuffer(makeController(), false, { current: target }),
		)
		act(() => result.current.open(orgTagsBufferCommand, 2))
		const old = result.current.session!
		unmount()
		expect(old.onAccept("work")).toMatchObject({ ok: false })
		old.onCancel()
		expect(target.applyEdit).not.toHaveBeenCalled()
		expect(target.restoreFocus).not.toHaveBeenCalled()
	})
})

describe("two-phase refile ownership", () => {
	it("selects exact line-qualified duplicate headings and rejects naked offsets", async () => {
		const controller = makeController()
		vi.mocked(controller.readRefileTarget).mockResolvedValue({
			kind: "ready",
			snapshot: {
				relativePath: "inbox.org",
				revision: "R2",
				headings: [
					{ from: 0, heading: "* Same", level: 1, outlinePath: "Same", lineNumber: 1 },
					{ from: 7, heading: "* Same", level: 1, outlinePath: "Same", lineNumber: 2 },
				],
			},
		})
		const target = makeTarget()
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(controller, false, { current: target }),
		)
		act(() => result.current.openRefile(2))
		const file = result.current.session!
		await act(async () => {
			expect(await file.onAccept("inbox.org")).toEqual({ ok: true })
		})
		const heading = result.current.session!
		expect(heading.id).not.toBe(file.id)
		expect(heading).toMatchObject({
			prompt: "Refile under heading:",
			initialInput: "(file root)",
			acceptCandidate: true,
			cancelWhileAccepting: false,
			candidates: ["(file root)", "Same [line 1]", "Same [line 2]"],
		})
		expect(heading.historyKey).not.toBe(file.historyKey)
		expect(controller.refileSubtree).not.toHaveBeenCalled()
		await act(async () => {
			expect(await heading.onAccept("7")).toMatchObject({ ok: false })
		})
		await act(async () => {
			expect(await heading.onAccept("Same")).toMatchObject({ ok: false })
		})
		await act(async () => {
			expect(await heading.onAccept("Same [line 2]")).toEqual({ ok: true })
		})
		expect(controller.refileSubtree).toHaveBeenCalledExactlyOnceWith(2, "inbox.org", {
			expectedTargetRevision: "R2",
			targetHeading: { from: 7, heading: "* Same" },
		})
	})
	it("permits root-only new targets without performing a write during lookup", async () => {
		const controller = makeController()
		const target = makeTarget()
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(controller, false, { current: target }),
		)
		act(() => result.current.openRefile(2))
		await act(async () => {
			await result.current.session!.onAccept("new.org")
		})
		expect(controller.refileSubtree).not.toHaveBeenCalled()
		expect(result.current.session!.candidates).toEqual(["(file root)"])
		await act(async () => {
			await result.current.session!.onAccept("(file root)")
		})
		expect(controller.refileSubtree).toHaveBeenCalledExactlyOnceWith(2, "new.org", {
			expectedTargetRevision: "target-one",
		})
	})
	it("keeps lookup rejection inline and allows a corrected file", async () => {
		const controller = makeController()
		vi.mocked(controller.readRefileTarget).mockResolvedValueOnce({
			kind: "rejected",
			message: "Target is dirty",
		})
		const target = makeTarget()
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(controller, false, { current: target }),
		)
		act(() => result.current.openRefile(2))
		const file = result.current.session!
		await act(async () => {
			expect(await file.onAccept("inbox.org")).toEqual({ ok: false, message: "Target is dirty" })
		})
		expect(result.current.session).toBe(file)
		await act(async () => {
			await file.onAccept("new.org")
		})
		expect(result.current.session!.prompt).toBe("Refile under heading:")
	})
	it.each([
		"cancel",
		"unmount",
		"suspend",
		"grant",
		"token",
		"activation",
		"body",
		"editor",
	] as const)("aborts lookup on %s without stealing newer focus or echo", async (change) => {
		const controller = makeController()
		let resolve!: (value: Awaited<ReturnType<OrgWorkspaceController["readRefileTarget"]>>) => void
		vi.mocked(controller.readRefileTarget).mockImplementation(
			() =>
				new Promise((done) => {
					resolve = done
				}),
		)
		const target = makeTarget()
		const ref = { current: target }
		const { result, rerender, unmount } = renderHook(
			({ current, suspended }) => useOrgCommandMinibuffer(current, false, ref, suspended),
			{ initialProps: { current: controller, suspended: false } },
		)
		act(() => result.current.openRefile(2))
		const file = result.current.session!
		let pending!: ReturnType<typeof file.onAccept>
		act(() => {
			pending = file.onAccept("inbox.org")
		})
		const signal = vi.mocked(controller.readRefileTarget).mock.calls[0][1]!
		act(() => {
			expect(file.onAccept("other.org")).toMatchObject({ ok: false })
		})
		expect(controller.readRefileTarget).toHaveBeenCalledOnce()
		if (change === "cancel") act(() => file.onCancel())
		else if (change === "unmount") unmount()
		else {
			if (change === "editor") ref.current = makeTarget()
			rerender({
				suspended: change === "suspend",
				current: {
					...controller,
					...(change === "grant" ? { workspaceSessionId: "G2" } : {}),
					...(change === "token"
						? { workspace: { ...controller.workspace!, capabilityToken: "new-grant" } }
						: {}),
					...(change === "activation" ? { activeBufferId: "new-buffer" } : {}),
					...(change === "body" ? { content: "* Changed" } : {}),
				},
			})
		}
		expect(signal.aborted).toBe(true)
		await act(async () => {
			resolve({
				kind: "ready",
				snapshot: { relativePath: "inbox.org", revision: "R", headings: [] },
			})
			expect(await pending).toMatchObject({ ok: false })
		})
		if (change !== "unmount") expect(result.current.session).toBeNull()
		expect(controller.refileSubtree).not.toHaveBeenCalled()
		expect(target.restoreFocus).toHaveBeenCalledTimes(change === "cancel" ? 1 : 0)
		if (change === "cancel") {
			act(() => result.current.openRefile(2))
			expect(result.current.session!.prompt).toBe("Refile to Org file:")
		}
	})
	it.each([
		"body",
		"dirty",
		"busy",
		"conflict",
		"editor",
	] as const)("rejects heading commit after source %s changes", async (change) => {
		const controller = makeController()
		const target = makeTarget()
		const ref = { current: target }
		const { result, rerender } = renderHook(
			({ current, busy }) => useOrgCommandMinibuffer(current, busy, ref),
			{ initialProps: { current: controller, busy: false } },
		)
		act(() => result.current.openRefile(2))
		await act(async () => {
			await result.current.session!.onAccept("inbox.org")
		})
		const heading = result.current.session!
		if (change === "editor") ref.current = makeTarget()
		rerender({
			busy: change === "busy",
			current: {
				...controller,
				...(change === "body" ? { content: "* Changed" } : {}),
				...(change === "dirty" ? { isDirty: true } : {}),
				...(change === "conflict"
					? {
							openBuffers: [
								{
									bufferId: "note-buffer",
									relativePath: "note.org",
									isDirty: false,
									hasConflict: true,
									baseRevision: "one",
								},
							],
						}
					: {}),
			},
		})
		await act(async () => {
			expect(await heading.onAccept("(file root)")).toMatchObject({ ok: false })
		})
		expect(controller.refileSubtree).not.toHaveBeenCalled()
		expect(target.restoreFocus).not.toHaveBeenCalled()
	})
	it("does not lookup dirty sources", () => {
		const controller = { ...makeController(), isDirty: true }
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(controller, false, { current: makeTarget() }),
		)
		act(() => result.current.openRefile(2))
		expect(result.current.session).toBeNull()
		expect(controller.readRefileTarget).not.toHaveBeenCalled()
	})
})

describe("subtree transfer parameter sessions", () => {
	it("offers workspace targets but never the source", () => {
		const controller = makeController()
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(controller, false, { current: makeTarget() }),
		)
		act(() => result.current.openRefile(2))
		expect(result.current.session).toMatchObject({
			prompt: "Refile to Org file:",
			initialInput: "inbox.org",
			candidates: ["inbox.org", "projects/work.org"],
			cancelWhileAccepting: true,
		})
		expect(controller.refileSubtree).not.toHaveBeenCalled()
	})

	it.each([
		"../outside.org",
		"/outside.org",
		"note.org",
	])("rejects unsafe or source target %s without effects", async (input) => {
		const controller = makeController()
		const target = makeTarget()
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(controller, false, { current: target }),
		)
		act(() => result.current.openRefile(2))
		const session = result.current.session!
		await act(async () => {
			expect(await session.onAccept(input)).toMatchObject({ ok: false })
		})
		expect(result.current.session).toBe(session)
		expect(controller.refileSubtree).not.toHaveBeenCalled()
		expect(target.applyEdit).not.toHaveBeenCalled()
	})

	it("survives revision-only changes but rejects stale content", async () => {
		const controller = makeController()
		const target = makeTarget()
		const { result, rerender } = renderHook(
			({ current }) => useOrgCommandMinibuffer(current, false, { current: target }),
			{ initialProps: { current: controller } },
		)
		act(() => result.current.openRefile(2))
		const session = result.current.session!
		rerender({
			current: {
				...controller,
				activeDocument: { ...controller.activeDocument!, revision: "saved" },
			},
		})
		expect(result.current.session).toBe(session)
		rerender({ current: { ...controller, content: "* Note changed" } })
		await act(async () => {
			expect(await session.onAccept("inbox.org")).toMatchObject({
				ok: false,
				message: expect.stringContaining("content changed"),
			})
		})
		expect(controller.refileSubtree).not.toHaveBeenCalled()
		expect(target.applyEdit).not.toHaveBeenCalled()
	})

	it.each([
		"refile",
		"archive",
	] as const)("locks duplicate accept and cancel during deferred %s", async (kind) => {
		const controller = makeController()
		let resolve!: (outcome: { kind: "success" }) => void
		const effect = vi.fn(
			() =>
				new Promise<{ kind: "success" }>((done) => {
					resolve = done
				}),
		)
		const current = {
			...controller,
			[kind === "refile" ? "refileSubtree" : "archiveSubtree"]: effect,
		}
		const target = makeTarget()
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(current, false, { current: target }),
		)
		act(() => (kind === "refile" ? result.current.openRefile(2) : result.current.openArchive(2)))
		if (kind === "refile")
			await act(async () => {
				await result.current.session!.onAccept("inbox.org")
			})
		const session = result.current.session!
		let pending!: ReturnType<typeof session.onAccept>
		act(() => {
			pending = session.onAccept(kind === "refile" ? "(file root)" : "yes")
		})
		act(() => {
			expect(session.onAccept("yes")).toMatchObject({ ok: false })
			session.onCancel()
			result.current.openArchive(2)
		})
		expect(result.current.session).toBe(session)
		expect(effect).toHaveBeenCalledOnce()
		expect(target.restoreFocus).not.toHaveBeenCalled()
		await act(async () => {
			resolve({ kind: "success" })
			expect(await pending).toEqual({ ok: true })
		})
		expect(result.current.session).toBeNull()
		expect(target.restoreFocus).toHaveBeenCalledOnce()
	})

	it.each([
		"partial",
		"rejected",
	] as const)("retires %s outcomes without blind retry or local source edits", async (kind) => {
		const controller = makeController()
		vi.mocked(controller.refileSubtree).mockResolvedValue({
			kind,
			message: "Reread both documents before retrying.",
		})
		const target = makeTarget()
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(controller, false, { current: target }),
		)
		act(() => result.current.openRefile(2))
		await act(async () => {
			await result.current.session!.onAccept("inbox.org")
		})
		const session = result.current.session!
		await act(async () => {
			expect(await session.onAccept("(file root)")).toMatchObject({ ok: false })
		})
		expect(result.current.session).toBeNull()
		expect(result.current.echo).toBe("Reread both documents before retrying.")
		expect(session.onAccept("inbox.org")).toMatchObject({ ok: false })
		expect(controller.refileSubtree).toHaveBeenCalledExactlyOnceWith(2, "inbox.org", {
			expectedTargetRevision: "target-one",
		})
		expect(controller.content).toBe("* Note")
		expect(target.applyEdit).not.toHaveBeenCalled()
	})

	it.each([
		"refile",
		"archive",
	] as const)("retires a rejecting %s controller without retry or local edits", async (kind) => {
		const controller = makeController()
		const effect = kind === "refile" ? controller.refileSubtree : controller.archiveSubtree
		vi.mocked(effect).mockRejectedValueOnce(new Error("unconfirmed write"))
		const target = makeTarget()
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(controller, false, { current: target }),
		)
		act(() => (kind === "refile" ? result.current.openRefile(2) : result.current.openArchive(2)))
		if (kind === "refile")
			await act(async () => {
				await result.current.session!.onAccept("inbox.org")
			})
		const session = result.current.session!
		const input = kind === "refile" ? "(file root)" : "yes"
		await act(async () => {
			expect(await session.onAccept(input)).toMatchObject({
				ok: false,
				message: expect.stringContaining("Do not automatically retry"),
			})
		})
		expect(result.current.session).toBeNull()
		expect(result.current.echo).toContain("Reread both documents")
		expect(result.current.echo).toContain("no rollback was attempted")
		act(() => {
			expect(session.onAccept(input)).toMatchObject({ ok: false })
			session.onCancel()
		})
		expect(effect).toHaveBeenCalledOnce()
		expect(controller.content).toBe("* Note")
		expect(target.applyEdit).not.toHaveBeenCalled()
		expect(target.restoreFocus).toHaveBeenCalledOnce()
	})

	it.each(["no", "cancel", "yes"])("archive confirmation %s is explicit", async (choice) => {
		const controller = makeController()
		const target = makeTarget()
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(controller, false, { current: target }),
		)
		act(() => result.current.openArchive(2))
		const session = result.current.session!
		expect(session.initialInput).toBe("no")
		await act(async () => {
			if (choice === "cancel") session.onCancel()
			else expect(await session.onAccept(choice)).toEqual({ ok: true })
		})
		expect(result.current.session).toBeNull()
		if (choice === "yes") expect(controller.archiveSubtree).toHaveBeenCalledExactlyOnceWith(2)
		else expect(controller.archiveSubtree).not.toHaveBeenCalled()
		expect(controller.refileSubtree).not.toHaveBeenCalled()
		expect(target.applyEdit).not.toHaveBeenCalled()
	})
})
