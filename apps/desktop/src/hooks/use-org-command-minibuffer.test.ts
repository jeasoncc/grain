import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { orgTagsBufferCommand } from "@/flows/org-command/org-tags.command"
import { createOrgPlanningCommand } from "@/flows/org-command/org-planning.command"
import type { OrgWorkspaceController } from "./use-org-workspace"
import { useOrgCommandMinibuffer } from "./use-org-command-minibuffer"

const makeController = (rootPath = "/workspace") =>
	({
		workspace: { rootPath },
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
