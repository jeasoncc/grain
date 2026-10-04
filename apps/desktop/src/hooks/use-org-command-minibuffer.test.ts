import { act, renderHook } from "@testing-library/react"
import { createElement, StrictMode, type ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { orgTagsBufferCommand } from "@/flows/org-command/org-tags.command"
import { orgSparseTreeBufferCommand } from "@/flows/org-command/org-sparse-tree.command"
import { createOrgPlanningCommand } from "@/flows/org-command/org-planning.command"
import type { OrgEditorCommandTarget } from "@/views/org-editor"
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
const deferred = <T>() => {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((done) => {
		resolve = done
	})
	return { promise, resolve }
}
const strictWrapper = ({ children }: { children: ReactNode }) =>
	createElement(StrictMode, null, children)

describe("sparse tree view parameters", () => {
	it.each([
		true,
		false,
		undefined,
	])("explicitly applies view or refuses absent/failed port (%s)", (applied) => {
		const target = {
			...makeTarget(),
			applyView: applied === undefined ? undefined : vi.fn(() => applied),
		}
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(makeController(), false, { current: target }),
		)
		act(() => result.current.open(orgSparseTreeBufferCommand, 0))
		act(() => {
			expect(result.current.session!.onAccept("todo")).toMatchObject({ ok: applied === true })
		})
		expect(target.applyEdit).not.toHaveBeenCalled()
		if (target.applyView)
			expect(target.applyView).toHaveBeenCalledWith("* Note", {
				kind: "sparse-tree",
				query: "todo",
			})
		expect(result.current.session === null).toBe(applied === true)
		expect(target.restoreFocus).not.toHaveBeenCalled()
	})
	it("rejects invalid query and stale source before reaching the editor", () => {
		const target = { ...makeTarget(), applyView: vi.fn(() => true) }
		const controller = makeController()
		const { result, rerender } = renderHook(
			({ content }) =>
				useOrgCommandMinibuffer({ ...controller, content }, false, { current: target }),
			{ initialProps: { content: controller.content } },
		)
		act(() => result.current.open(orgSparseTreeBufferCommand, 0))
		act(() => {
			expect(result.current.session!.onAccept("tag:")).toMatchObject({ ok: false })
		})
		rerender({ content: "changed" })
		act(() => {
			expect(result.current.session!.onAccept("todo")).toMatchObject({ ok: false })
		})
		expect(target.applyView).not.toHaveBeenCalled()
		expect(target.applyEdit).not.toHaveBeenCalled()
	})
	it("clears only through the optional view port and retires older callbacks", () => {
		const target = { ...makeTarget(), applyView: vi.fn(() => true) }
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(makeController(), false, { current: target }),
		)
		act(() => result.current.open(orgSparseTreeBufferCommand, 0))
		const old = result.current.session!
		act(() => result.current.clearSparseTree())
		expect(target.applyView).toHaveBeenCalledWith("* Note", { kind: "sparse-tree", query: null })
		expect(old.onAccept("todo")).toMatchObject({ ok: false })
		expect(target.applyEdit).not.toHaveBeenCalled()
		expect(result.current.echo).toBe("Sparse tree cleared")
	})
})

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
		expect(target.restoreFocus).not.toHaveBeenCalled()
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
	it("offers dirty sources without looking up disk", () => {
		const controller = { ...makeController(), isDirty: true }
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(controller, false, { current: makeTarget() }),
		)
		act(() => result.current.openRefile(2))
		expect(result.current.session?.candidates).toContain("note.org")
		expect(controller.readRefileTarget).not.toHaveBeenCalled()
	})
})

describe("subtree transfer parameter sessions", () => {
	it.each([
		"hasConflict",
		"autosavePaused",
	] as const)("refuses local selection with unresolved %s", async (flag) => {
		const base = makeController()
		const controller = {
			...base,
			openBuffers: [
				{
					bufferId: base.activeBufferId!,
					relativePath: "note.org",
					baseRevision: "r1",
					isDirty: true,
					hasConflict: false,
					[flag]: true,
				},
			],
		}
		const target = makeTarget()
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(controller, false, { current: target }),
		)
		act(() => result.current.openRefile(2))
		await act(async () => {
			expect(await result.current.session!.onAccept("note.org")).toMatchObject({ ok: false })
		})
		expect(controller.readRefileTarget).not.toHaveBeenCalled()
		expect(controller.refileSubtree).not.toHaveBeenCalled()
		expect(target.applyEdit).not.toHaveBeenCalled()
	})
	it("offers workspace targets including the exact source", () => {
		const controller = makeController()
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(controller, false, { current: makeTarget() }),
		)
		act(() => result.current.openRefile(2))
		expect(result.current.session).toMatchObject({
			prompt: "Refile to Org file:",
			initialInput: "inbox.org",
			candidates: ["note.org", "inbox.org", "projects/work.org"],
			cancelWhileAccepting: true,
		})
		expect(controller.refileSubtree).not.toHaveBeenCalled()
	})

	it.each([
		"../outside.org",
		"/outside.org",
		"NOTE.org",
	])("rejects unsafe or alias target %s without effects", async (input) => {
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
		expect(target.restoreFocus).not.toHaveBeenCalled()
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
		expect(target.restoreFocus).not.toHaveBeenCalled()
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

describe("adopted editor parameter lifecycle", () => {
	it("locks direct concurrent archive accepts before React rerenders", async () => {
		const controller = makeController()
		const outcome = deferred<{ kind: "success" }>()
		vi.mocked(controller.archiveSubtree).mockReturnValueOnce(outcome.promise)
		const target = makeTarget()
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(controller, false, { current: target }),
		)
		act(() => result.current.openArchive(2))
		const session = result.current.session!
		let pending!: ReturnType<typeof session.onAccept>
		act(() => {
			pending = session.onAccept("yes")
			expect(session.onAccept("yes")).toMatchObject({ ok: false })
			session.onCancel()
			result.current.open(orgTagsBufferCommand, 2)
		})
		expect(controller.archiveSubtree).toHaveBeenCalledExactlyOnceWith(2)
		expect(result.current.session).toBe(session)
		expect(target.restoreFocus).not.toHaveBeenCalled()
		await act(async () => {
			outcome.resolve({ kind: "success" })
			expect(await pending).toEqual({ ok: true })
		})
		expect(result.current.session).toBeNull()
		expect(result.current.echo).toBe("Subtree archived")
		expect(target.restoreFocus).not.toHaveBeenCalled()
		expect(target.applyEdit).not.toHaveBeenCalled()
	})

	it("ignores the file phase cancel after advancing a same-file refile", async () => {
		const controller = { ...makeController(), content: "* Note\nbody\n* Destination" }
		const target = {
			...makeTarget(),
			applyEdits: vi.fn<NonNullable<OrgEditorCommandTarget["applyEdits"]>>(() => true),
		}
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(controller, false, { current: target }),
		)
		act(() => result.current.openRefile(2))
		const file = result.current.session!
		await act(async () => {
			expect(await file.onAccept("note.org")).toEqual({ ok: true })
		})
		const heading = result.current.session!
		expect(heading.id).not.toBe(file.id)
		expect(heading.prompt).toBe("Refile under heading:")
		act(() => {
			file.onCancel()
			expect(file.onAccept("note.org")).toMatchObject({ ok: false })
		})
		expect(result.current.session).toBe(heading)
		expect(result.current.echo).toBeNull()
		expect(target.restoreFocus).not.toHaveBeenCalled()
		act(() => {
			expect(heading.onAccept("Destination [line 3]")).toEqual({ ok: true })
		})
		expect(target.applyEdits).toHaveBeenCalledOnce()
		expect(target.applyEdits.mock.calls[0][0]).toBe(controller.content)
		expect(result.current.session).toBeNull()
		expect(target.restoreFocus).not.toHaveBeenCalled()
		expect(controller.readRefileTarget).not.toHaveBeenCalled()
		expect(controller.refileSubtree).not.toHaveBeenCalled()
		expect(controller.archiveSubtree).not.toHaveBeenCalled()
	})

	it("does not let a canceled read's finally release or erase a newer read", async () => {
		const controller = makeController()
		type Lookup = Awaited<ReturnType<OrgWorkspaceController["readRefileTarget"]>>
		const oldRead = deferred<Lookup>()
		const newRead = deferred<Lookup>()
		vi.mocked(controller.readRefileTarget)
			.mockReturnValueOnce(oldRead.promise)
			.mockReturnValueOnce(newRead.promise)
		const target = makeTarget()
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(controller, false, { current: target }),
		)
		act(() => result.current.openRefile(2))
		const old = result.current.session!
		let oldPending!: ReturnType<typeof old.onAccept>
		act(() => {
			oldPending = old.onAccept("inbox.org")
		})
		const oldSignal = vi.mocked(controller.readRefileTarget).mock.calls[0][1]!
		act(() => old.onCancel())
		expect(oldSignal.aborted).toBe(true)
		act(() => result.current.openRefile(2))
		const newer = result.current.session!
		let newPending!: ReturnType<typeof newer.onAccept>
		act(() => {
			newPending = newer.onAccept("projects/work.org")
		})
		const newSignal = vi.mocked(controller.readRefileTarget).mock.calls[1][1]!
		await act(async () => {
			oldRead.resolve({
				kind: "ready",
				snapshot: { relativePath: "inbox.org", revision: "old", headings: [] },
			})
			expect(await oldPending).toMatchObject({ ok: false })
		})
		expect(result.current.session).toBe(newer)
		expect(result.current.echo).toBeNull()
		expect(newSignal.aborted).toBe(false)
		act(() => {
			expect(newer.onAccept("other.org")).toMatchObject({ ok: false })
			result.current.openArchive(2)
		})
		expect(result.current.session).toBe(newer)
		expect(controller.readRefileTarget).toHaveBeenCalledTimes(2)
		act(() => newer.onCancel())
		expect(newSignal.aborted).toBe(true)
		act(() => result.current.open(orgTagsBufferCommand, 2))
		const tags = result.current.session!
		await act(async () => {
			newRead.resolve({
				kind: "ready",
				snapshot: { relativePath: "projects/work.org", revision: "new", headings: [] },
			})
			expect(await newPending).toMatchObject({ ok: false })
		})
		expect(result.current.session).toBe(tags)
		expect(result.current.echo).toBeNull()
		expect(target.restoreFocus).not.toHaveBeenCalled()
		expect(controller.refileSubtree).not.toHaveBeenCalled()
	})

	it("drains an unmounted StrictMode archive without disturbing a new owner's effect lock", async () => {
		const controller = makeController()
		const oldOutcome = deferred<{ kind: "success" }>()
		const newOutcome = deferred<{ kind: "success" }>()
		vi.mocked(controller.archiveSubtree)
			.mockReturnValueOnce(oldOutcome.promise)
			.mockReturnValueOnce(newOutcome.promise)
		const oldTarget = makeTarget()
		const oldHook = renderHook(
			() => useOrgCommandMinibuffer(controller, false, { current: oldTarget }),
			{ wrapper: strictWrapper },
		)
		act(() => oldHook.result.current.openArchive(2))
		const oldSession = oldHook.result.current.session!
		let oldPending!: ReturnType<typeof oldSession.onAccept>
		act(() => {
			oldPending = oldSession.onAccept("yes")
		})
		oldHook.unmount()
		const newTarget = makeTarget()
		const newHook = renderHook(
			() => useOrgCommandMinibuffer(controller, false, { current: newTarget }),
			{ wrapper: strictWrapper },
		)
		act(() => newHook.result.current.openArchive(2))
		const newSession = newHook.result.current.session!
		let newPending!: ReturnType<typeof newSession.onAccept>
		act(() => {
			newPending = newSession.onAccept("yes")
		})
		await act(async () => {
			oldOutcome.resolve({ kind: "success" })
			expect(await oldPending).toEqual({ ok: true })
		})
		act(() => {
			oldSession.onCancel()
			expect(oldSession.onAccept("yes")).toMatchObject({ ok: false })
			newSession.onCancel()
			expect(newSession.onAccept("yes")).toMatchObject({ ok: false })
			newHook.result.current.open(orgTagsBufferCommand, 2)
		})
		expect(newHook.result.current.session).toBe(newSession)
		expect(newHook.result.current.echo).toBeNull()
		expect(controller.archiveSubtree).toHaveBeenCalledTimes(2)
		expect(oldTarget.restoreFocus).not.toHaveBeenCalled()
		expect(newTarget.restoreFocus).not.toHaveBeenCalled()
		await act(async () => {
			newOutcome.resolve({ kind: "success" })
			expect(await newPending).toEqual({ ok: true })
		})
		expect(newHook.result.current.session).toBeNull()
		expect(newHook.result.current.echo).toBe("Subtree archived")
		expect(newTarget.restoreFocus).not.toHaveBeenCalled()
		expect(oldTarget.restoreFocus).not.toHaveBeenCalled()
	})

	it("does not steal focus moved externally by a metadata edit callback", () => {
		const external = document.createElement("button")
		const input = document.createElement("input")
		document.body.append(external, input)
		try {
			const target = {
				...makeTarget(),
				applyEdit: vi.fn(() => {
					external.focus()
					return true
				}),
			}
			const { result } = renderHook(() =>
				useOrgCommandMinibuffer(makeController(), false, { current: target }),
			)
			act(() => result.current.open(orgTagsBufferCommand, 2))
			const session = result.current.session!
			input.setAttribute("data-org-parameter-session", String(session.id))
			input.focus()
			expect(document.activeElement).toBe(input)
			act(() => {
				expect(session.onAccept("work")).toEqual({ ok: true })
			})
			expect(target.applyEdit).toHaveBeenCalledOnce()
			expect(result.current.session).toBeNull()
			expect(result.current.echo).toBe("Tags updated")
			expect(document.activeElement).toBe(external)
			expect(target.restoreFocus).not.toHaveBeenCalled()
		} finally {
			input.remove()
			external.remove()
		}
	})
})

describe("DOM parameter focus ownership", () => {
	it.each([
		"metadata",
		"view",
		"clear",
		"refile",
		"cancel",
	] as const)("restores %s only for the exact current host", async (operation) => {
		for (const ownership of ["own", "foreign", "external"] as const) {
			const input = document.createElement("input")
			document.body.append(input)
			const target = {
				...makeTarget(),
				applyView: vi.fn(() => true),
				applyEdits: vi.fn(() => true),
			}
			const controller = { ...makeController(), content: "* Note\n* Destination\n" }
			const hook = renderHook(() => useOrgCommandMinibuffer(controller, false, { current: target }))
			try {
				act(() =>
					operation === "refile"
						? hook.result.current.openRefile(2)
						: hook.result.current.open(
								operation === "view" || operation === "clear"
									? orgSparseTreeBufferCommand
									: orgTagsBufferCommand,
								2,
							),
				)
				if (operation === "refile") {
					await act(async () => {
						await hook.result.current.session!.onAccept("note.org")
					})
				}
				const session = hook.result.current.session!
				if (ownership !== "external")
					input.dataset.orgParameterSession = String(session.id + (ownership === "foreign" ? 1 : 0))
				input.focus()
				await act(async () => {
					if (operation === "clear") hook.result.current.clearSparseTree()
					else if (operation === "cancel") session.onCancel()
					else
						expect(
							await session.onAccept(
								operation === "refile"
									? session.candidates.find((label) => label.includes("Destination"))!
									: operation === "view"
										? "todo"
										: "work",
							),
						).toMatchObject({ ok: true })
				})
				expect(target.restoreFocus).toHaveBeenCalledTimes(ownership === "own" ? 1 : 0)
			} finally {
				hook.unmount()
				input.remove()
			}
		}
	})

	it.each([
		"metadata",
		"view",
		"clear",
		"refile",
	] as const)("does not restore %s after its domain callback removes the original host and leaves body focused", async (operation) => {
		const host = document.createElement("div")
		const input = document.createElement("input")
		host.append(input)
		document.body.append(host)
		const remove = vi.fn(() => {
			host.remove()
			document.body.focus()
			return true
		})
		const target = { ...makeTarget(), applyEdit: remove, applyView: remove, applyEdits: remove }
		const controller = { ...makeController(), content: "* Note\n* Destination\n" }
		const hook = renderHook(() => useOrgCommandMinibuffer(controller, false, { current: target }))
		try {
			act(() =>
				operation === "refile"
					? hook.result.current.openRefile(2)
					: hook.result.current.open(
							operation === "view" || operation === "clear"
								? orgSparseTreeBufferCommand
								: orgTagsBufferCommand,
							2,
						),
			)
			if (operation === "refile")
				await act(async () => {
					await hook.result.current.session!.onAccept("note.org")
				})
			const session = hook.result.current.session!
			input.dataset.orgParameterSession = String(session.id)
			input.focus()
			await act(async () => {
				if (operation === "clear") hook.result.current.clearSparseTree()
				else
					expect(
						await session.onAccept(
							operation === "refile"
								? session.candidates.find((label) => label.includes("Destination"))!
								: operation === "view"
									? "todo"
									: "work",
						),
					).toMatchObject({ ok: true })
			})
			expect(remove).toHaveBeenCalledOnce()
			expect(document.activeElement).toBe(document.body)
			expect(target.restoreFocus).not.toHaveBeenCalled()
		} finally {
			hook.unmount()
			host.remove()
		}
	})

	it.each([
		"child",
		"replacement-host",
	] as const)("completion follows original host with %s focus", async (destination) => {
		const host = document.createElement("div")
		const input = document.createElement("input")
		const replacement = document.createElement("input")
		host.append(input)
		document.body.append(host)
		const target = {
			...makeTarget(),
			applyEdit: vi.fn(() => {
				input.remove()
				if (destination === "child") host.append(replacement)
				else {
					host.remove()
					replacement.dataset.orgParameterSession = host.dataset.orgParameterSession
					document.body.append(replacement)
				}
				replacement.focus()
				return true
			}),
		}
		const hook = renderHook(() =>
			useOrgCommandMinibuffer(makeController(), false, { current: target }),
		)
		try {
			act(() => hook.result.current.open(orgTagsBufferCommand, 2))
			const session = hook.result.current.session!
			host.dataset.orgParameterSession = String(session.id)
			input.focus()
			await act(async () => {
				await session.onAccept("work")
			})
			expect(target.restoreFocus).toHaveBeenCalledTimes(destination === "child" ? 1 : 0)
		} finally {
			hook.unmount()
			host.remove()
			replacement.remove()
		}
	})

	it("independent hosts have nonaliasing DOM ids and stale stage cancellation cannot steal focus", async () => {
		const firstTarget = makeTarget()
		const secondTarget = { ...makeTarget(), applyEdits: vi.fn(() => true) }
		const first = renderHook(() =>
			useOrgCommandMinibuffer(makeController(), false, { current: firstTarget }),
		)
		const second = renderHook(() =>
			useOrgCommandMinibuffer(makeController(), false, { current: secondTarget }),
		)
		const input = document.createElement("input")
		document.body.append(input)
		try {
			act(() => {
				first.result.current.open(orgTagsBufferCommand, 2)
				second.result.current.openRefile(2)
			})
			const old = second.result.current.session!
			expect(old.id).not.toBe(first.result.current.session!.id)
			await act(async () => {
				await old.onAccept("note.org")
			})
			const stage = second.result.current.session!
			input.dataset.orgParameterSession = String(stage.id)
			input.focus()
			act(() => {
				old.onCancel()
				first.result.current.session!.onCancel()
			})
			expect(second.result.current.session).toBe(stage)
			expect(firstTarget.restoreFocus).not.toHaveBeenCalled()
			expect(secondTarget.restoreFocus).not.toHaveBeenCalled()
			act(() => stage.onCancel())
			expect(secondTarget.restoreFocus).toHaveBeenCalledOnce()
		} finally {
			first.unmount()
			second.unmount()
			input.remove()
		}
	})
})
