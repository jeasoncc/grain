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
			documents: [
				{ relativePath: "note.org" },
				{ relativePath: "inbox.org" },
				{ relativePath: "projects/work.org" },
			],
		},
		isDirty: false,
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
			cancelWhileAccepting: false,
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
		const session = result.current.session!
		let pending!: ReturnType<typeof session.onAccept>
		act(() => {
			pending = session.onAccept(kind === "refile" ? "inbox.org" : "yes")
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
		const session = result.current.session!
		await act(async () => {
			expect(await session.onAccept("inbox.org")).toMatchObject({ ok: false })
		})
		expect(result.current.session).toBeNull()
		expect(result.current.echo).toBe("Reread both documents before retrying.")
		expect(session.onAccept("inbox.org")).toMatchObject({ ok: false })
		expect(controller.refileSubtree).toHaveBeenCalledExactlyOnceWith(2, "inbox.org")
		expect(controller.content).toBe("* Note")
		expect(target.applyEdit).not.toHaveBeenCalled()
	})

	it.each(["refile", "archive"] as const)(
		"retires a rejecting %s controller without retry or local edits",
		async (kind) => {
			const controller = makeController()
			const effect = kind === "refile" ? controller.refileSubtree : controller.archiveSubtree
			vi.mocked(effect).mockRejectedValueOnce(new Error("unconfirmed write"))
			const target = makeTarget()
			const { result } = renderHook(() =>
				useOrgCommandMinibuffer(controller, false, { current: target }),
			)
			act(() => (kind === "refile" ? result.current.openRefile(2) : result.current.openArchive(2)))
			const session = result.current.session!
			const input = kind === "refile" ? "inbox.org" : "yes"
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
		},
	)

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
