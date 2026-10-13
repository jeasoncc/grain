import { redoDepth, undoDepth } from "@codemirror/commands"
import { EditorSelection } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type * as TauriCore from "@tauri-apps/api/core"
import { render } from "@/test/application-providers"
import { createOrgBufferRuntime } from "@/flows/org-editor-runtime"
import { orgSparseTreeBufferCommand } from "@/flows/org-command/org-sparse-tree.command"
import { prepareOrgSparseTreeContext } from "@/flows/org-command/org-sparse-tree-context"
import type { OrgBufferCommand } from "@/flows/org-command/org-buffer-command"
import { OrgSparseTreeContextRequiredError, parseOrgSparseTreeQuery } from "@/pipes/org/org-sparse-tree.pipe"
import { DEFAULT_ORG_BEHAVIOR_CONFIGURATION } from "@/pipes/org/org-behavior-configuration.pipe"
import type { OrgMinibufferAcceptResult, OrgMinibufferSession } from "@/types/editor/minibuffer.interface"
import { OrgEditor } from "@/views/org-editor/org-editor.view.fn"
import type { OrgEditorCommandTarget } from "@/views/org-editor/org-editor.types"
import { editorOffsetFromSource } from "@/views/org-editor/org-source-offset.pipe"
import { orgSparseTreeField } from "@/views/org-editor/org-sparse-tree.extension"
import { OrgMinibuffer } from "@/views/org-workspace/org-minibuffer.view.fn"
import type { OrgWorkspaceController } from "./use-org-workspace"
import { useOrgCommandMinibuffer } from "./use-org-command-minibuffer"
import { useSettings } from "./use-settings"
import { createOrgClockOwner } from "@/flows/org-workspace/org-clock-owner"

const native = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock("@tauri-apps/api/core", async (importOriginal) => ({
	...await importOriginal<typeof TauriCore>(),
	invoke: native.invoke,
}))

beforeEach(() => {
	useSettings.setState({ orgBehaviorConfigurationJson: "" })
	native.invoke.mockReset()
})
afterEach(() => {
	cleanup()
	useSettings.setState({ orgBehaviorConfigurationJson: "" })
})

const source = "* TODO First\r\n:PROPERTIES:\r\n:NAME: a\r\n:FILE: forged\r\n:BLOCKED: t\r\n:END:\r\nfirst body\0\r\n* DONE Last\r\n:PROPERTIES:\r\n:NAME: z\r\n:END:\r\nlast body\r\n"
const clockSource = "* TODO First\r\nCLOCK: [2026-10-10 Sat 10:00]--[2026-10-10 Sat 11:00] => 99:00\r\nfirst body\r\n* DONE Last\r\nCLOCK: [2026-10-10 Sat 10:00]--[2026-10-10 Sat 12:00] => 0:01\r\nlast body\r\n"
const clockSnapshot = {
	nowEpochMs: 50_400_000,
	todayStartEpochMs: 0,
	todayEndEpochMs: 86_400_000,
	calendarEpochMs: [36_000_000, 39_600_000, 36_000_000, 43_200_000],
}
const collationSnapshot = { locale: "C", ranks: [1, 0, 2] }
interface SparseCommandHost {
	readonly session: OrgMinibufferSession | null
	readonly open: (command: OrgBufferCommand, cursor: number) => void
	readonly clearSparseTree: () => void
}

const mountSource = (raw = source, withPeer = false) => {
	const onCommit = vi.fn(), onChange = vi.fn()
	const runtime = createOrgBufferRuntime({
		key: { bufferId: "note", workspaceSessionId: "G1" },
		source: raw, canCommit: () => true, onCommit,
	})
	const clock = createOrgClockOwner()
	clock.configure({
		scope: {}, rootPath: "/workspace", isCurrent: () => !runtime.closed,
		buffers: () => runtime.closed ? [] : [{ relativePath: "note.org", runtime }],
		available: () => !runtime.closed,
		commit: (owner, expected, edits, guard) => guard() && owner.applyCommandEdits(expected, edits),
		agenda: async () => ({ kind: "rejected", message: "This Source fixture has no Agenda origin." }),
	})
	const targetRef = { current: null as OrgEditorCommandTarget | null }
	const peerRef = { current: null as OrgEditorCommandTarget | null }
	const controller = {
		clock,
		workspace: { rootPath: "/workspace", capabilityToken: "grant-one", documents: [] },
		workspaceSessionId: "G1", activeBufferId: "note",
		activeDocument: { relativePath: "note.org", revision: "one" },
		activeBufferRuntime: runtime,
		get content() { return runtime.source },
		isDirty: false,
	} as unknown as OrgWorkspaceController
	let commands!: SparseCommandHost
	const Host = ({ current }: { current: OrgWorkspaceController }) => {
		commands = useOrgCommandMinibuffer(current, false, targetRef)
		return <>
			<OrgEditor runtime={runtime} value={raw} onChange={onChange} onSave={() => {}}
				documentPath="note.org" documentFilename="/workspace/note.org" ariaLabel="Source origin"
				onCommandTarget={(target) => { targetRef.current = target }} />
			{withPeer && <OrgEditor runtime={runtime} value={raw} onChange={onChange} onSave={() => {}}
				documentPath="note.org" documentFilename="/workspace/note.org" ariaLabel="Source peer"
				onCommandTarget={(target) => { peerRef.current = target }} />}
			<OrgMinibuffer session={commands.session} />
		</>
	}
	const rendered = render(<Host current={controller} />)
	const view = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Source origin" }))!
	const peerView = withPeer ? EditorView.findFromDOM(screen.getByRole("textbox", { name: "Source peer" }))! : null
	return { runtime, view, peerView, targetRef, peerRef, controller, Host, rendered, onCommit, onChange,
		get commands() { return commands } }
}

describe("sparse acceptance at the real Source/native-read boundary", () => {
	it.each(["todo", 'NAME="a"', 'FILE="/workspace/note.org"/TODO', 'BLOCKED=""/TODO'])(
		"accepts %s synchronously using readonly Source-local context", (query) => {
			const mounted = mountSource()
			act(() => mounted.commands.open(orgSparseTreeBufferCommand, 0))
			act(() => expect(mounted.commands.session!.onAccept(query)).toEqual({ ok: true }))
			expect(mounted.view.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([0])
			expect(mounted.view.contentDOM.textContent).not.toContain("last body")
			expect(mounted.runtime.source).toBe(source)
			expect(mounted.runtime.revision).toBe(0)
			expect(undoDepth(mounted.runtime.state)).toBe(0)
			expect(mounted.onCommit).not.toHaveBeenCalled()
			expect(mounted.onChange).not.toHaveBeenCalled()
			expect(native.invoke).not.toHaveBeenCalled()
			expect(mounted.commands.session).toBeNull()
		},
	)

	it("stays synchronous when Source tag-group expansion removes a clock property dependency", () => {
		const raw = "#+TAGS: [ CLOCKSUM : duration ]\r\n* First :duration:\r\nfirst body\r\n* Last\r\nlast body\r\n"
		const mounted = mountSource(raw)
		act(() => mounted.commands.open(orgSparseTreeBufferCommand, 0))
		act(() => expect(mounted.commands.session!.onAccept('CLOCKSUM="unused"')).toEqual({ ok: true }))
		expect(mounted.view.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([raw.indexOf("* First")])
		expect(mounted.view.contentDOM.textContent).not.toContain("last body")
		expect(native.invoke).not.toHaveBeenCalled()
		expect(mounted.runtime.source).toBe(raw)
		expect(mounted.runtime.revision).toBe(0)
	})

	it("waits in the sole host, applies only its Source window and restores the exact origin selection on clear", async () => {
		const pending = Promise.withResolvers<typeof collationSnapshot>()
		native.invoke.mockReturnValueOnce(pending.promise)
		const mounted = mountSource(source, true)
		const first = editorOffsetFromSource(source, source.indexOf("first body"), "\r\n")
		const last = editorOffsetFromSource(source, source.indexOf("last body"), "\r\n")
		const selection = EditorSelection.create([
			EditorSelection.cursor(first, -1, 2, 27), EditorSelection.range(last + 4, last + 1),
		], 1)
		act(() => { mounted.view.dispatch({ selection }); mounted.view.focus(); mounted.commands.open(orgSparseTreeBufferCommand, 0) })
		const input = screen.getByRole("combobox")
		fireEvent.change(input, { target: { value: 'NAME>"m"' } })
		fireEvent.keyDown(input, { key: "Enter" })
		await act(async () => { await Promise.resolve() })
		expect(screen.getByRole("region", { name: "Minibuffer" })).toHaveAttribute("aria-busy", "true")
		expect(mounted.view.state.field(orgSparseTreeField)).toBeNull()
		expect(mounted.view.contentDOM.textContent).toContain("first body")
		expect(mounted.runtime.revision).toBe(0)
		await act(async () => { pending.resolve(collationSnapshot); await pending.promise })
		await waitFor(() => expect(mounted.commands.session).toBeNull())
		expect(mounted.view.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([source.indexOf("* DONE Last")])
		expect(mounted.view.contentDOM.textContent).not.toContain("first body")
		expect(mounted.peerView!.state.field(orgSparseTreeField)).toBeNull()
		expect(mounted.peerView!.contentDOM.textContent).toContain("first body")
		expect(mounted.view.state.field(orgSparseTreeField)!.restoreSelection!.eq(selection, true)).toBe(true)
		expect(document.activeElement).toBe(mounted.view.contentDOM)
		act(() => mounted.commands.clearSparseTree())
		expect(mounted.view.state.selection.eq(selection, true)).toBe(true)
		expect(mounted.view.state.selection.ranges[0].goalColumn).toBe(27)
		expect(mounted.view.state.selection.ranges[0].bidiLevel).toBe(2)
		expect(mounted.runtime.source).toBe(source)
		expect(mounted.runtime.revision).toBe(0)
		expect(undoDepth(mounted.runtime.state)).toBe(0)
		expect(redoDepth(mounted.runtime.state)).toBe(0)
		expect(mounted.onCommit).not.toHaveBeenCalled()
		expect(mounted.onChange).not.toHaveBeenCalled()
	})

	it("cancels the async phase before its first native invocation without applying a query", async () => {
		const mounted = mountSource()
		act(() => mounted.commands.open(orgSparseTreeBufferCommand, 0))
		const session = mounted.commands.session!
		let acceptance!: OrgMinibufferAcceptResult | Promise<OrgMinibufferAcceptResult>
		act(() => { acceptance = session.onAccept('NAME>"m"'); session.onCancel() })
		expect(acceptance).toBeInstanceOf(Promise)
		await act(async () => { expect(await acceptance).toMatchObject({ ok: false }) })
		expect(native.invoke).not.toHaveBeenCalled()
		expect(mounted.commands.session).toBeNull()
		expect(mounted.view.state.field(orgSparseTreeField)).toBeNull()
		expect(mounted.runtime.source).toBe(source)
		expect(mounted.runtime.revision).toBe(0)
	})

	it("does not resurrect cancelled native acceptance over a replacement query", async () => {
		const pending = Promise.withResolvers<typeof collationSnapshot>()
		native.invoke.mockReturnValueOnce(pending.promise)
		const mounted = mountSource()
		act(() => { mounted.view.focus(); mounted.commands.open(orgSparseTreeBufferCommand, 0) })
		const input = screen.getByRole("combobox")
		fireEvent.change(input, { target: { value: 'NAME>"m"' } })
		fireEvent.keyDown(input, { key: "Enter" })
		await act(async () => { await Promise.resolve() })
		expect(screen.getByRole("region", { name: "Minibuffer" })).toHaveAttribute("aria-busy", "true")
		fireEvent.keyDown(input, { key: "g", ctrlKey: true })
		expect(mounted.commands.session).toBeNull()
		act(() => mounted.commands.open(orgSparseTreeBufferCommand, 0))
		act(() => expect(mounted.commands.session!.onAccept("todo")).toEqual({ ok: true }))
		const accepted = mounted.view.state.field(orgSparseTreeField)
		await act(async () => { pending.resolve(collationSnapshot); await pending.promise })
		expect(mounted.view.state.field(orgSparseTreeField)).toBe(accepted)
		expect(accepted!.plan?.matchedHeadingStarts).toEqual([0])
		expect(mounted.view.contentDOM.textContent).not.toContain("last body")
		expect(mounted.runtime.source).toBe(source)
		expect(undoDepth(mounted.runtime.state)).toBe(0)
	})

	it("retires on a batched Source edit/real-undo ABA and leaves the replacement host untouched", async () => {
		const pending = Promise.withResolvers<typeof collationSnapshot>()
		native.invoke.mockReturnValueOnce(pending.promise)
		const mounted = mountSource()
		act(() => mounted.commands.open(orgSparseTreeBufferCommand, 0))
		let acceptance!: OrgMinibufferAcceptResult | Promise<OrgMinibufferAcceptResult>
		act(() => { acceptance = mounted.commands.session!.onAccept('NAME>"m"') })
		await act(async () => { await Promise.resolve() })
		const from = editorOffsetFromSource(source, source.indexOf("first body"), "\r\n")
		act(() => {
			mounted.view.dispatch({ changes: { from, insert: "edited " } })
			fireEvent.keyDown(mounted.view.contentDOM, { key: "z", ctrlKey: true })
		})
		expect(mounted.runtime.source).toBe(source)
		expect(mounted.runtime.revision).toBe(2)
		expect(undoDepth(mounted.runtime.state)).toBe(0)
		expect(redoDepth(mounted.runtime.state)).toBe(1)
		expect(mounted.commands.session).toBeNull()
		act(() => mounted.commands.open(orgSparseTreeBufferCommand, 0))
		const replacement = mounted.commands.session!, input = screen.getByRole("combobox")
		await act(async () => { pending.resolve(collationSnapshot); expect(await acceptance).toMatchObject({ ok: false }) })
		expect(mounted.commands.session).toBe(replacement)
		expect(document.activeElement).toBe(input)
		expect(mounted.view.state.field(orgSparseTreeField)).toBeNull()
		act(() => expect(replacement.onAccept("todo")).toEqual({ ok: true }))
		expect(mounted.view.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([0])
		expect(redoDepth(mounted.runtime.state)).toBe(1)
	})

	it.each(["root", "grant", "workspace session", "Source window", "behavior ABA"] as const)(
		"rejects held native completion after %s retirement", async (drift) => {
			const pending = Promise.withResolvers<typeof collationSnapshot>()
			native.invoke.mockReturnValueOnce(pending.promise)
			const mounted = mountSource(source, true)
			act(() => mounted.commands.open(orgSparseTreeBufferCommand, 0))
			let acceptance!: OrgMinibufferAcceptResult | Promise<OrgMinibufferAcceptResult>
			act(() => { acceptance = mounted.commands.session!.onAccept('NAME>"m"') })
			await act(async () => { await Promise.resolve() })
			if (drift === "behavior ABA") {
				act(() => {
					useSettings.setState({ orgBehaviorConfigurationJson: JSON.stringify(DEFAULT_ORG_BEHAVIOR_CONFIGURATION) })
					useSettings.setState({ orgBehaviorConfigurationJson: "" })
				})
			} else if (drift === "Source window") {
				mounted.targetRef.current = mounted.peerRef.current
				mounted.rendered.rerender(<mounted.Host current={mounted.controller} />)
			} else {
				const current = { ...mounted.controller,
					workspace: { ...mounted.controller.workspace!,
						rootPath: drift === "root" ? "/other" : "/workspace",
						capabilityToken: drift === "grant" ? "grant-two" : "grant-one" },
					workspaceSessionId: drift === "workspace session" ? "G2" : "G1",
				}
				mounted.rendered.rerender(<mounted.Host current={current} />)
				mounted.rendered.rerender(<mounted.Host current={mounted.controller} />)
			}
			expect(mounted.commands.session).toBeNull()
			await act(async () => { pending.resolve(collationSnapshot); expect(await acceptance).toMatchObject({ ok: false }) })
			expect(mounted.view.state.field(orgSparseTreeField)).toBeNull()
			expect(mounted.peerView!.state.field(orgSparseTreeField)).toBeNull()
			expect(mounted.runtime.source).toBe(source)
			expect(mounted.runtime.revision).toBe(0)
			expect(mounted.onCommit).not.toHaveBeenCalled()
		},
	)

	it.each(["CLOCKSUM", "CLOCKSUM_T"])("captures %s before native string ordering and changes presentation only", async (property) => {
		const clock = Promise.withResolvers<typeof clockSnapshot>(), collation = Promise.withResolvers<typeof collationSnapshot>()
		native.invoke.mockReturnValueOnce(clock.promise).mockReturnValueOnce(collation.promise)
		const mounted = mountSource(clockSource)
		act(() => mounted.commands.open(orgSparseTreeBufferCommand, 0))
		let acceptance!: OrgMinibufferAcceptResult | Promise<OrgMinibufferAcceptResult>
		act(() => { acceptance = mounted.commands.session!.onAccept(`${property}>"1:30"`) })
		expect(acceptance).toBeInstanceOf(Promise)
		await act(async () => { await Promise.resolve() })
		expect(native.invoke).toHaveBeenCalledTimes(1)
		expect(mounted.view.state.field(orgSparseTreeField)).toBeNull()
		await act(async () => { clock.resolve(clockSnapshot); await clock.promise })
		expect(native.invoke).toHaveBeenCalledTimes(2)
		expect(mounted.view.state.field(orgSparseTreeField)).toBeNull()
		await act(async () => { collation.resolve(collationSnapshot); expect(await acceptance).toEqual({ ok: true }) })
		expect(mounted.view.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([clockSource.indexOf("* DONE Last")])
		expect(mounted.view.contentDOM.textContent).not.toContain("first body")
		expect(mounted.runtime.source).toBe(clockSource)
		expect(mounted.runtime.revision).toBe(0)
		expect(undoDepth(mounted.runtime.state)).toBe(0)
		expect(mounted.onCommit).not.toHaveBeenCalled()
	})

	it("cancels a held clock snapshot before it can request collation or change Source presentation", async () => {
		const clock = Promise.withResolvers<typeof clockSnapshot>()
		native.invoke.mockReturnValueOnce(clock.promise)
		const mounted = mountSource(clockSource)
		act(() => mounted.commands.open(orgSparseTreeBufferCommand, 0))
		const session = mounted.commands.session!
		let acceptance!: OrgMinibufferAcceptResult | Promise<OrgMinibufferAcceptResult>
		act(() => { acceptance = session.onAccept('CLOCKSUM>"1:30"') })
		await act(async () => { await Promise.resolve() })
		expect(native.invoke).toHaveBeenCalledTimes(1)
		act(() => session.onCancel())
		await act(async () => { clock.resolve(clockSnapshot); expect(await acceptance).toMatchObject({ ok: false }) })
		expect(native.invoke).toHaveBeenCalledTimes(1)
		expect(mounted.view.state.field(orgSparseTreeField)).toBeNull()
		expect(mounted.commands.session).toBeNull()
		expect(mounted.runtime.source).toBe(clockSource)
		expect(mounted.runtime.revision).toBe(0)
		expect(undoDepth(mounted.runtime.state)).toBe(0)
	})

	it("preserves typed conflicting clock context, refuses its view, then accepts a corrected exact snapshot without collation", async () => {
		const conflict = { ...clockSnapshot, calendarEpochMs: [36_000_000, 39_600_000, 36_060_000, 43_200_000] }
		native.invoke.mockResolvedValue(conflict)
		const query = parseOrgSparseTreeQuery('CLOCKSUM="1:00"')!
		const captured = prepareOrgSparseTreeContext(clockSource, query, "/workspace/note.org")
		await expect(captured).rejects.toBeInstanceOf(OrgSparseTreeContextRequiredError)
		await expect(captured).rejects.toMatchObject({ context: "clock" })
		const mounted = mountSource(clockSource)
		act(() => mounted.commands.open(orgSparseTreeBufferCommand, 0))
		const session = mounted.commands.session!
		await act(async () => { expect(await session.onAccept('CLOCKSUM="1:00"')).toMatchObject({ ok: false }) })
		expect(mounted.commands.session).toBe(session)
		expect(mounted.view.state.field(orgSparseTreeField)).toBeNull()
		expect(mounted.runtime.revision).toBe(0)
		native.invoke.mockReset().mockResolvedValueOnce(clockSnapshot)
		await act(async () => { expect(await session.onAccept('CLOCKSUM="1:00"')).toEqual({ ok: true }) })
		expect(native.invoke).toHaveBeenCalledTimes(1)
		expect(mounted.view.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([0])
		expect(mounted.view.contentDOM.textContent).not.toContain("last body")
		expect(mounted.runtime.source).toBe(clockSource)
		expect(undoDepth(mounted.runtime.state)).toBe(0)
	})
})
