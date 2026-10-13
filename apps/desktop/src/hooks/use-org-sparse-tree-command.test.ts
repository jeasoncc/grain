import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { orgSparseTreeBufferCommand } from "@/flows/org-command/org-sparse-tree.command"
import type { OrgEditorCommandTarget } from "@/views/org-editor/org-editor.types"
import type { OrgWorkspaceController } from "./use-org-workspace"
import { useOrgCommandMinibuffer } from "./use-org-command-minibuffer"
import { createOrgClockOwner } from "@/flows/org-workspace/org-clock-owner"

const controller = {
	clock: createOrgClockOwner(),
	workspace: { rootPath: "/workspace", capabilityToken: "G1", documents: [] },
	workspaceSessionId: "G1",
	activeBufferId: "note",
	content: "* TODO Real\n* DONE Hidden",
	activeDocument: { relativePath: "note.org", revision: "one" },
	isDirty: false,
} as unknown as OrgWorkspaceController
const target = (supported = true): OrgEditorCommandTarget => {
	const restoreFocus = vi.fn()
	const ownership = {}
	return {
		getCommandContext: () => ({ ownership, revision: 0, available: true, content: controller.content, cursor: 0, readOnly: false, relativePath: "note.org" }),
		executeCommand: () => false,
		captureCommand: () => null,
		captureFocus: () => () => { restoreFocus(); return true },
		applyEdit: vi.fn(() => true),
		restoreFocus,
		applyView: supported ? vi.fn(() => true) : undefined,
	}
}
describe("sparse parameter callback fences", () => {
	it("rejects unsupported targets without editing or focus restoration", () => {
		const port = target(false)
		const ref = { current: port }
		const { result } = renderHook(() => useOrgCommandMinibuffer(controller, false, ref))
		act(() => result.current.open(orgSparseTreeBufferCommand, 0))
		act(() => expect(result.current.session!.onAccept("todo")).toMatchObject({ ok: false }))
		expect(port.applyEdit).not.toHaveBeenCalled()
		expect(port.restoreFocus).not.toHaveBeenCalled()
	})
	it("cancelled and superseded callbacks cannot apply to the newest peer target", () => {
		const origin = target(),
			peer = target()
		const ref = { current: origin }
		const { result, rerender } = renderHook(() => useOrgCommandMinibuffer(controller, false, ref))
		act(() => result.current.open(orgSparseTreeBufferCommand, 0))
		const cancelled = result.current.session!
		act(() => cancelled.onCancel())
		expect(cancelled.onAccept("todo")).toMatchObject({ ok: false })
		act(() => result.current.open(orgSparseTreeBufferCommand, 0))
		const stale = result.current.session!
		ref.current = peer
		rerender()
		act(() => result.current.open(orgSparseTreeBufferCommand, 0))
		expect(stale.onAccept("todo")).toMatchObject({ ok: false })
		expect(origin.applyView).not.toHaveBeenCalled()
		expect(peer.applyView).not.toHaveBeenCalled()
		act(() => expect(result.current.session!.onAccept("todo")).toMatchObject({ ok: true }))
		expect(peer.applyView).toHaveBeenCalledTimes(1)
	})
})
