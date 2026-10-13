import { act, renderHook } from "@testing-library/react"
import { undoDepth } from "@codemirror/commands"
import { EditorView } from "@codemirror/view"
import { render as renderApplication } from "@/test/application-providers"
import { createOrgBufferRuntime } from "@/flows/org-editor-runtime"
import { OrgEditor } from "@/views/org-editor/org-editor.view.fn"
import { createElement, StrictMode, type ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { orgTagsBufferCommand } from "@/flows/org-command/org-tags.command"
import { orgSparseTreeBufferCommand } from "@/flows/org-command/org-sparse-tree.command"
import { createOrgPlanningCommand } from "@/flows/org-command/org-planning.command"
import type { OrgEditorCommandTarget } from "@/views/org-editor"
import type { OrgRefileTargetOutcome, OrgWorkspaceController } from "./use-org-workspace"
import { useOrgCommandMinibuffer } from "./use-org-command-minibuffer"
import { useSettings } from "./use-settings"
import { DEFAULT_ORG_BEHAVIOR_CONFIGURATION } from "@/pipes/org/org-behavior-configuration.pipe"
import { createOrgRefileTargetSnapshot } from "@/pipes/org/org-refile-target.pipe"
import type { OrgTextEditBatch } from "@/pipes/org/org-text.pipe"
import type { OrgMinibufferAcceptResult } from "@/types/editor/minibuffer.interface"
import * as sparseContext from "@/flows/org-command/org-sparse-tree-context"
import type { OrgSparseTreeNativeContext } from "@/pipes/org/org-sparse-tree.pipe"
import type { OrgTodoNoteRequest } from "@/flows/org-command/org-todo-note"
import { createOrgClockOwner } from "@/flows/org-workspace/org-clock-owner"

beforeEach(() => { useSettings.setState({ orgBehaviorConfigurationJson: "" }) })
afterEach(() => { useSettings.setState({ orgBehaviorConfigurationJson: "" }) })

const makeController = (rootPath = "/workspace") =>
	({
		clock: createOrgClockOwner(),
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
				snapshot: { relativePath, revision: "target-one", source: "", headings: [] },
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
const makeTarget = () => {
	const restoreFocus = vi.fn()
	const ownership = {}
	return {
		applyEdit: vi.fn(() => true), restoreFocus,
		getCommandContext: () => ({ ownership, revision: 0, available: true, content: "* Note", cursor: 2, readOnly: false, relativePath: "note.org" }),
		executeCommand: () => false,
		captureCommand: () => null,
		captureFocus: () => () => { restoreFocus(); return true },
	}
}
const deferred = <T>() => {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((done) => {
		resolve = done
	})
	return { promise, resolve }
}
const strictWrapper = ({ children }: { children: ReactNode }) =>
	createElement(StrictMode, null, children)

describe("planning accept-time clock", () => {
	it.each([
		"SCHEDULED",
		"DEADLINE",
	] as const)("resolves %s after midnight at accept, not when opening the session", (kind) => {
		let clock = new Date(2026, 8, 30, 23, 59)
		const now = vi.fn(() => clock)
		const controller = makeController()
		const target = makeTarget()
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(controller, false, { current: target }, false, now),
		)
		act(() => result.current.open(createOrgPlanningCommand(kind, "2026-09-30"), 2))
		clock = new Date(2026, 9, 1, 0, 1)
		act(() => {
			expect(result.current.session!.onAccept("tomorrow")).toEqual({ ok: true })
		})
		expect(target.applyEdit).toHaveBeenCalledExactlyOnceWith(
			controller.content,
			expect.objectContaining({ insert: `\n${kind}: <2026-10-02>` }),
		)
		expect(result.current.session).toBeNull()
	})

	it.each([
		["today", "2026-09-30"],
		["tomorrow", "2026-10-01"],
		["yesterday", "2026-09-29"],
		["今天", "2026-09-30"],
		["明天", "2026-10-01"],
		["昨天", "2026-09-29"],
	])("accepts alias %s as %s", (input, date) => {
		const controller = makeController()
		const target = makeTarget()
		const now = vi.fn(() => new Date(2026, 8, 30, 12))
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(controller, false, { current: target }, false, now),
		)
		act(() => result.current.open(createOrgPlanningCommand("SCHEDULED", "2026-09-30"), 2))
		act(() => {
			expect(result.current.session!.onAccept(input)).toEqual({ ok: true })
		})
		expect(target.applyEdit).toHaveBeenCalledExactlyOnceWith(
			controller.content,
			expect.objectContaining({ insert: `\nSCHEDULED: <${date}>` }),
		)
	})

	it.each([
		"invalid",
		"throws",
	] as const)("retains the session without edits when the clock %s, then allows correction", (failure) => {
		let failing = false
		const now = () => {
			if (!failing) return new Date(2026, 8, 30, 12)
			if (failure === "throws") throw new Error("Clock unavailable")
			return new Date(Number.NaN)
		}
		const source = "* Note\r\nraw\0😀\n"
		const runtime = createOrgBufferRuntime({
			key: { workspaceSessionId: "G1", bufferId: "note-buffer" },
			source, canCommit: () => true, onCommit: vi.fn(),
		})
		const controller = Object.assign(makeController(), { activeBufferRuntime: runtime })
		Object.defineProperty(controller, "content", { get: () => runtime.source })
		const targetRef: { current: OrgEditorCommandTarget | null } = { current: null }
		const rendered = renderApplication(createElement(OrgEditor, {
			runtime, value: source, documentPath: "note.org", ariaLabel: "Clock failure Source",
			onSave: vi.fn(),
			onCommandTarget: target => { targetRef.current = target },
		}))
		const editor = EditorView.findFromDOM(rendered.getByRole("textbox", { name: "Clock failure Source" }))!
		const { result, unmount } = renderHook(() =>
			useOrgCommandMinibuffer(controller, false, targetRef, false, now),
		)
		try {
			act(() => result.current.open(createOrgPlanningCommand("DEADLINE", "2026-09-30"), 2))
			const session = result.current.session!
			const selection = editor.state.selection
			failing = true
			for (const input of ["garbage", "明天"]) {
				act(() => { expect(session.onAccept(input)).toMatchObject({ ok: false }) })
				expect(result.current.session).toBe(session)
				expect(runtime.source).toBe(source)
				expect(editor.state.sliceDoc()).toBe(source)
				expect(editor.state.selection.eq(selection, true)).toBe(true)
				expect(undoDepth(runtime.state)).toBe(0)
			}
			failing = false
			act(() => { expect(session.onAccept("2026-10-01")).toEqual({ ok: true }) })
			expect(runtime.source).toBe("* Note\r\nDEADLINE: <2026-10-01>\r\nraw\0😀\n")
			expect(editor.state.sliceDoc()).toBe(runtime.source)
			expect(undoDepth(runtime.state)).toBe(1)
			expect(result.current.session).toBeNull()
		} finally {
			unmount()
			rendered.unmount()
			runtime.close()
		}
	})
})

describe("sparse tree view parameters", () => {
	it("clears only through the optional view port and retires older callbacks", () => {
		const target = { ...makeTarget(), applyView: vi.fn(() => true) }
		const { result } = renderHook(() =>
			useOrgCommandMinibuffer(makeController(), false, { current: target }),
		)
		act(() => result.current.open(orgSparseTreeBufferCommand, 0))
		const old = result.current.session!
		act(() => result.current.clearSparseTree())
		expect(old.onAccept("todo")).toMatchObject({ ok: false })
		expect(target.applyEdit).not.toHaveBeenCalled()
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
		const replacement = result.current.session!
		act(() => {
			expect(old.onAccept("work")).toMatchObject({ ok: false })
		})
		act(() => old.onCancel())
		expect(target.applyEdit).not.toHaveBeenCalled()
		expect(target.restoreFocus).not.toHaveBeenCalled()
		expect(result.current.session).toBe(replacement)
		expect(replacement).not.toBe(old)
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

describe("refile source/target provenance ownership", () => {
	it("selects exact line-qualified duplicate headings and rejects naked offsets", async () => {
		const controller = makeController()
		vi.mocked(controller.readRefileTarget).mockResolvedValue({
			kind: "ready",
			snapshot: {
				relativePath: "inbox.org",
				revision: "R2",
				source: "* Same\n* Same",
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
		expect(controller.refileSubtree).not.toHaveBeenCalled()
		expect(result.current.session!.preview?.source).toBe("\n** Note")
		await act(async () => { expect(await result.current.session!.onAccept("yes")).toEqual({ ok: true }) })
		expect(controller.refileSubtree).toHaveBeenCalledTimes(1)
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
		expect(controller.refileSubtree).not.toHaveBeenCalled()
		await act(async () => { await result.current.session!.onAccept("yes") })
		expect(controller.refileSubtree).toHaveBeenCalledTimes(1)
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
		expect(controller.refileSubtree).not.toHaveBeenCalled()
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
				snapshot: { relativePath: "inbox.org", revision: "R", source: "", headings: [] },
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
		expect(result.current.session!.candidates).toEqual(["note.org", "inbox.org", "projects/work.org"])
		expect(result.current.session!.initialInput).toBe("inbox.org")
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
		if (kind === "refile") await act(async () => { await result.current.session!.onAccept("(file root)") })
		const session = result.current.session!
		let pending!: ReturnType<typeof session.onAccept>
		act(() => {
			pending = session.onAccept("yes")
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
		await act(async () => { await result.current.session!.onAccept("(file root)") })
		const session = result.current.session!
		await act(async () => {
			expect(await session.onAccept("yes")).toMatchObject({ ok: false })
		})
		expect(result.current.session).toBeNull()
		expect(result.current.result?.kind).toBe("rejected")
		expect(session.onAccept("inbox.org")).toMatchObject({ ok: false })
		expect(controller.refileSubtree).toHaveBeenCalledTimes(1)
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
		if (kind === "refile") await act(async () => { await result.current.session!.onAccept("(file root)") })
		const session = result.current.session!
		const input = "yes"
		await act(async () => {
			expect(await session.onAccept(input)).toMatchObject({
				ok: false,
				message: expect.stringContaining("Do not automatically retry"),
			})
		})
		expect(result.current.session).toBeNull()
		expect(result.current.result?.kind).toBe("rejected")
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
		act(() => {
			file.onCancel()
			expect(file.onAccept("note.org")).toMatchObject({ ok: false })
		})
		expect(result.current.session).toBe(heading)
		expect(result.current.result).toBeNull()
		expect(target.restoreFocus).not.toHaveBeenCalled()
		act(() => {
			expect(heading.onAccept("Destination [line 3]")).toEqual({ ok: true })
		})
		const confirmation = result.current.session!
		expect(confirmation.id).not.toBe(heading.id)
		expect(confirmation.preview).toBeDefined()
		expect(target.applyEdits).not.toHaveBeenCalled()
		act(() => {
			heading.onCancel()
			expect(heading.onAccept("Destination [line 3]")).toMatchObject({ ok: false })
		})
		expect(result.current.session).toBe(confirmation)
		await act(async () => {
			expect(await confirmation.onAccept("yes")).toEqual({ ok: true })
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
				snapshot: { relativePath: "inbox.org", revision: "old", source: "", headings: [] },
			})
			expect(await oldPending).toMatchObject({ ok: false })
		})
		expect(result.current.session).toBe(newer)
		expect(result.current.result).toBeNull()
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
				snapshot: { relativePath: "projects/work.org", revision: "new", source: "", headings: [] },
			})
			expect(await newPending).toMatchObject({ ok: false })
		})
		expect(result.current.session).toBe(tags)
		expect(result.current.result).toBeNull()
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
		expect(newHook.result.current.result).toBeNull()
		expect(controller.archiveSubtree).toHaveBeenCalledTimes(2)
		expect(oldTarget.restoreFocus).not.toHaveBeenCalled()
		expect(newTarget.restoreFocus).not.toHaveBeenCalled()
		await act(async () => {
			newOutcome.resolve({ kind: "success" })
			expect(await newPending).toEqual({ ok: true })
		})
		expect(newHook.result.current.session).toBeNull()
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
					await act(async () => { await hook.result.current.session!.onAccept(hook.result.current.session!.candidates.find((label) => label.includes("Destination"))!) })
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
									? "yes"
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
			if (operation === "refile") await act(async () => { await hook.result.current.session!.onAccept(hook.result.current.session!.candidates.find((label) => label.includes("Destination"))!) })
			const session = hook.result.current.session!
			input.dataset.orgParameterSession = String(session.id)
			input.focus()
			await act(async () => {
				if (operation === "clear") hook.result.current.clearSparseTree()
				else
					expect(
						await session.onAccept(
							operation === "refile"
								? "yes"
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

describe("configured Refile preview and affirmative admission", () => {
	it.each([
		"{broken",
		JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION, refile: { files: ["inbox.org"], maxDepth: 0, includeRoot: false, match: null } }),
	])("rejects invalid configured targets before lookup or mutation: %s", (configuration) => {
		useSettings.setState({ orgBehaviorConfigurationJson: configuration })
		const controller = { ...makeController(), content: "* Note\r\nretained\0\r\n" }
		const target = { ...makeTarget(), applyEdits: vi.fn(() => true) }
		const { result } = renderHook(() => useOrgCommandMinibuffer(controller, false, { current: target }))
		act(() => result.current.openRefile(2))
		expect(result.current.session).toBeNull()
		expect(result.current.result).toMatchObject({ kind: "rejected" })
		expect(controller.content).toBe("* Note\r\nretained\0\r\n")
		expect(controller.readRefileTarget).not.toHaveBeenCalled()
		expect(controller.refileSubtree).not.toHaveBeenCalled()
		expect(target.applyEdit).not.toHaveBeenCalled()
		expect(target.applyEdits).not.toHaveBeenCalled()
	})

	it("does not preview or create an allowlisted file absent from the fresh target scan", async () => {
		useSettings.setState({ orgBehaviorConfigurationJson: JSON.stringify({
			...DEFAULT_ORG_BEHAVIOR_CONFIGURATION,
			refile: { files: ["inbox.org"], maxDepth: null, includeRoot: true, match: null },
		}) })
		const controller = makeController()
		vi.mocked(controller.readRefileTarget).mockResolvedValue({
			kind: "ready", snapshot: createOrgRefileTargetSnapshot("inbox.org", "<missing>", ""),
		})
		const target = { ...makeTarget(), applyEdits: vi.fn(() => true) }
		const { result } = renderHook(() => useOrgCommandMinibuffer(controller, false, { current: target }))
		act(() => result.current.openRefile(2))
		await act(async () => {
			expect(await result.current.session!.onAccept("inbox.org")).toMatchObject({ ok: false })
		})
		expect(result.current.session!.prompt).toBe("Refile to Org file:")
		expect(result.current.session!.preview).toBeUndefined()
		expect(controller.content).toBe("* Note")
		expect(controller.refileSubtree).not.toHaveBeenCalled()
		expect(target.applyEdit).not.toHaveBeenCalled()
		expect(target.applyEdits).not.toHaveBeenCalled()
	})

	it("uses configured file/depth/filter rules and does not transfer until an explicit yes", async () => {
		const raw = JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION, refile: { files: ["inbox.org"], maxDepth: 1, includeRoot: false, match: "+work+LEVEL=1" } })
		useSettings.setState({ orgBehaviorConfigurationJson: raw })
		const controller = makeController()
		vi.mocked(controller.readRefileTarget).mockResolvedValue({
			kind: "ready",
			snapshot: createOrgRefileTargetSnapshot("inbox.org", "exact-target", "* Keep :work:\n** Deep :work:\n* Other :home:\n"),
		})
		const target = makeTarget()
		const { result } = renderHook(() => useOrgCommandMinibuffer(controller, false, { current: target }))
		act(() => result.current.openRefile(2))
		expect(result.current.session!.candidates).toEqual(["inbox.org"])
		await act(async () => { expect(await result.current.session!.onAccept("other.org")).toMatchObject({ ok: false }) })
		expect(controller.readRefileTarget).not.toHaveBeenCalled()
		await act(async () => { await result.current.session!.onAccept("inbox.org") })
		expect(result.current.session!.candidates).toHaveLength(1)
		await act(async () => { await result.current.session!.onAccept(result.current.session!.candidates[0]) })
		const confirmation = result.current.session!
		expect(confirmation.preview!.source).toBe("** Note\n")
		expect(controller.refileSubtree).not.toHaveBeenCalled()
		await act(async () => { expect(await confirmation.onAccept("sure")).toMatchObject({ ok: false }) })
		expect(controller.refileSubtree).not.toHaveBeenCalled()
		await act(async () => { expect(await confirmation.onAccept("yes")).toEqual({ ok: true }) })
		expect(controller.refileSubtree).toHaveBeenCalledTimes(1)
		expect(confirmation.onAccept("yes")).toMatchObject({ ok: false })
	})

	it("retains dirty local source and applies exactly the previewed frozen atomic batch only on yes", async () => {
		const controller = { ...makeController(), isDirty: true, content: "* Note\r\nbody\0\r\n* Destination\r\nkeep\r\n* Peer\r\n" }
		const target = { ...makeTarget(), applyEdits: vi.fn(() => true) }
		const { result } = renderHook(() => useOrgCommandMinibuffer(controller, false, { current: target }))
		act(() => result.current.openRefile(2))
		await act(async () => { await result.current.session!.onAccept("note.org") })
		await act(async () => { await result.current.session!.onAccept(result.current.session!.candidates.find((label) => label.includes("Destination"))!) })
		const confirmation = result.current.session!
		expect(confirmation.preview!.source).toBe("\r\n** Note\r\nbody\0\r\n")
		expect(target.applyEdits).not.toHaveBeenCalled()
		await act(async () => { await confirmation.onAccept("yes") })
		const [expected, batch] = target.applyEdits.mock.calls[0] as unknown as [string, OrgTextEditBatch]
		expect(expected).toBe(controller.content)
		expect(batch.changes.find((change) => change.insert.length > 0)!.insert).toBe(confirmation.preview!.source)
		expect(Object.isFrozen(batch)).toBe(true)
		expect(controller.readRefileTarget).not.toHaveBeenCalled()
		expect(controller.refileSubtree).not.toHaveBeenCalled()
	})

	it.each(["no", "cancel"])("leaves both authorities unchanged when confirmation is declined: %s", async (choice) => {
		const controller = makeController()
		const target = { ...makeTarget(), applyEdits: vi.fn(() => true) }
		const { result } = renderHook(() => useOrgCommandMinibuffer(controller, false, { current: target }))
		act(() => result.current.openRefile(2))
		await act(async () => { await result.current.session!.onAccept("inbox.org") })
		await act(async () => { await result.current.session!.onAccept("(file root)") })
		const confirmation = result.current.session!
		await act(async () => { if (choice === "cancel") confirmation.onCancel(); else await confirmation.onAccept("no") })
		expect(result.current.session).toBeNull()
		expect(controller.content).toBe("* Note")
		expect(controller.refileSubtree).not.toHaveBeenCalled()
		expect(target.applyEdits).not.toHaveBeenCalled()
	})

	it("retires stale confirmation on behavior changes and rejects its retained callback", async () => {
		const controller = makeController()
		const target = makeTarget()
		const { result } = renderHook(() => useOrgCommandMinibuffer(controller, false, { current: target }))
		act(() => result.current.openRefile(2))
		await act(async () => { await result.current.session!.onAccept("inbox.org") })
		await act(async () => { await result.current.session!.onAccept("(file root)") })
		const confirmation = result.current.session!
		act(() => useSettings.setState({ orgBehaviorConfigurationJson: JSON.stringify(DEFAULT_ORG_BEHAVIOR_CONFIGURATION) }))
		expect(result.current.session).toBeNull()
		expect(confirmation.onAccept("yes")).toMatchObject({ ok: false })
		expect(controller.refileSubtree).not.toHaveBeenCalled()
	})

	it("aborts a settings-invalidated read and ignores its late source snapshot", async () => {
		const controller = makeController()
		const lookup = deferred<OrgRefileTargetOutcome>()
		vi.mocked(controller.readRefileTarget).mockReturnValue(lookup.promise)
		const target = makeTarget()
		const { result } = renderHook(() => useOrgCommandMinibuffer(controller, false, { current: target }))
		act(() => result.current.openRefile(2))
		let pending!: OrgMinibufferAcceptResult | Promise<OrgMinibufferAcceptResult>
		act(() => { pending = result.current.session!.onAccept("inbox.org") })
		const signal = vi.mocked(controller.readRefileTarget).mock.calls[0][1]!
		act(() => useSettings.setState({ orgBehaviorConfigurationJson: "{broken" }))
		expect(signal.aborted).toBe(true)
		await act(async () => { lookup.resolve({ kind: "ready", snapshot: createOrgRefileTargetSnapshot("inbox.org", "late", "* Late") }); expect(await pending).toMatchObject({ ok: false }) })
		expect(result.current.session).toBeNull()
		expect(controller.refileSubtree).not.toHaveBeenCalled()
	})
})

describe("Refile captured context and logging effects", () => {
	it.each(["time", "note", "note-cancel"] as const)("moves or cancels %s logging with one canonical raw history owner", async (kind) => {
		useSettings.setState({ orgBehaviorConfigurationJson: JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION,
			logging: { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION.logging, refile: kind === "time" ? "time" : "note" } }) })
		const source = "* Note 😀\r\nbody\0\r\n* Destination\r\nkeep\r\n* Peer\r\n"
		const runtime = createOrgBufferRuntime({ key: { workspaceSessionId: "G1", bufferId: "note-buffer" }, source, canCommit: () => true, onCommit: vi.fn() })
		const controller = Object.assign(makeController(), { isDirty: true, activeBufferRuntime: runtime })
		Object.defineProperty(controller, "content", { get: () => runtime.source })
		const targetRef: { current: OrgEditorCommandTarget | null } = { current: null }
		let noteRequest: OrgTodoNoteRequest | undefined
		const rendered = renderApplication(createElement(OrgEditor, { runtime, value: source, documentPath: "note.org", ariaLabel: "Logged Refile Source", onSave: vi.fn(),
			getTodoNotePermit: () => () => true, onTodoNoteRequest: request => { noteRequest = request },
			onCommandTarget: target => { targetRef.current = target } }))
		const editor = EditorView.findFromDOM(rendered.getByRole("textbox", { name: "Logged Refile Source" }))!
		const hook = renderHook(() => useOrgCommandMinibuffer(controller, false, targetRef, false, () => new Date(2026, 9, 10, 12, 34)))
		try {
			act(() => hook.result.current.openRefile(2))
			await act(async () => { await hook.result.current.session!.onAccept("note.org") })
			await act(async () => { await hook.result.current.session!.onAccept(hook.result.current.session!.candidates.find(label => label.includes("Destination"))!) })
			await act(async () => { await hook.result.current.session!.onAccept("yes") })
			if (kind !== "time") {
				expect(runtime.source).toBe(source)
				expect(undoDepth(runtime.state)).toBe(0)
				expect(noteRequest!.validate!()).toEqual({ kind: "ready" })
				if (kind === "note-cancel") {
					act(() => noteRequest!.abort())
					expect(runtime.source).toBe(source)
					expect(await noteRequest!.execute("discarded")).toMatchObject({ kind: "rejected" })
					expect(undoDepth(runtime.state)).toBe(0)
					expect(controller.refileSubtree).not.toHaveBeenCalled()
					return
				}
				await act(async () => { expect(await noteRequest!.execute("literal\0😀\r\n* not structure")).toEqual({ kind: "applied" }) })
			}
			expect(runtime.source.match(/Refiled on/g)).toHaveLength(1)
			expect(runtime.source).toContain("** Note 😀\r\n- Refiled on [2026-10-10 Sat 12:34]\r\n")
			expect(runtime.source).toContain("body\0\r\n")
			expect(undoDepth(runtime.state)).toBe(1)
			act(() => {
				editor.focus()
				editor.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "z", code: "KeyZ", ctrlKey: true, bubbles: true, cancelable: true }))
				editor.contentDOM.dispatchEvent(new KeyboardEvent("keyup", { key: "z", code: "KeyZ", ctrlKey: true, bubbles: true }))
			})
			expect(runtime.source).toBe(source)
			expect(editor.state.sliceDoc()).toBe(source)
			expect(undoDepth(runtime.state)).toBe(0)
			expect(controller.refileSubtree).not.toHaveBeenCalled()
		} finally { hook.unmount(); rendered.unmount(); runtime.close() }
	})
	it.each((["cancel", "config-aba", "source-aba"] as const).flatMap(mode => [true, false].map(local => ({ mode, local }))))("retires pending context after $mode (local=$local) without preview or effect", async ({ mode, local }) => {
		const path = local ? "note.org" : "inbox.org"
		const configuration = JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION, refile: { files: [path], includeRoot: false, maxDepth: 1, match: 'OWNER>"A"' } })
		useSettings.setState({ orgBehaviorConfigurationJson: configuration })
		const source = "* Note\r\nraw\0😀\r\n* Destination\r\n:PROPERTIES:\r\n:OWNER: B\r\n:END:\r\n"
		const pending = deferred<OrgSparseTreeNativeContext>()
		let signal: AbortSignal | undefined
		const capture = vi.spyOn(sparseContext, "prepareOrgSparseTreeContext").mockImplementation((_source, _query, _filename, abort) => { signal = abort; return pending.promise })
		let revision = 0
		const listeners = new Set<() => void>()
		const controller = { ...makeController(), isDirty: local, content: source }
		vi.mocked(controller.readRefileTarget).mockResolvedValue({ kind: "ready", snapshot: createOrgRefileTargetSnapshot(path, "target-r1", source) })
		const ownership = {}
		const target = { ...makeTarget(), applyEdits: vi.fn(() => true), getCommandContext: () => ({ ownership, revision, available: true, content: source, cursor: 2, readOnly: false, relativePath: "note.org" }),
			subscribeCommandContext: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } } }
		const hook = renderHook(() => useOrgCommandMinibuffer(controller, false, { current: target }, false, () => new Date(2026, 9, 10, 12)))
		try {
			act(() => hook.result.current.openRefile(2))
			const session = hook.result.current.session!
			let reading!: OrgMinibufferAcceptResult | Promise<OrgMinibufferAcceptResult>
			await act(async () => { reading = session.onAccept(path); await Promise.resolve() })
			expect(capture).toHaveBeenCalledWith(source, expect.anything(), `/workspace/${path}`, expect.any(AbortSignal), expect.any(Function))
			act(() => {
				if (mode === "cancel") session.onCancel()
				else if (mode === "config-aba") { useSettings.setState({ orgBehaviorConfigurationJson: "" }); useSettings.setState({ orgBehaviorConfigurationJson: configuration }) }
				else { revision += 2; for (const listener of listeners) listener() }
			})
			expect(signal?.aborted).toBe(true)
			await act(async () => { pending.resolve({ compareStrings: () => 1 }); await reading })
			expect(hook.result.current.session).toBeNull()
			expect(target.applyEdits).not.toHaveBeenCalled()
			expect(controller.refileSubtree).not.toHaveBeenCalled()
		} finally { hook.unmount(); capture.mockRestore() }
	})
})
