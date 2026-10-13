import { history, historyField, redo, redoDepth, undo, undoDepth } from "@codemirror/commands"
import { foldCode, foldedRanges } from "@codemirror/language"
import { EditorSelection, EditorState, StateEffect } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { render } from "@/test/application-providers"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createOrgBufferRuntime } from "@/flows/org-editor-runtime"
import type { OrgEditorCommandTarget, OrgEditorSessionSnapshot } from "./org-editor.types"
import { OrgEditor } from "./org-editor.view.fn"
import { orgSparseTreeField } from "./org-sparse-tree.extension"
import { createApplicationCommandRegistry } from "@/flows/application-command-registry"
import { createTrustedCompiledExtension } from "@/flows/application/trusted-compiled-extension"
import { createOrgNativeChildProjection } from "@/flows/org-native-window/org-native-editor-projection"
import { encodeOrgNativeSelection, type OrgNativeProjection } from "@/flows/org-native-window/org-native-window-protocol"
import { useSettings } from "@/hooks/use-settings"

const viewFor = (name = "primary") => {
	const view = EditorView.findFromDOM(screen.getByRole("textbox", { name }))
	if (!view) {
		throw new Error("Missing real editor view")
	}
	return view
}
const key = (view: EditorView, key: string, shiftKey = false) =>
	fireEvent.keyDown(view.contentDOM, {
		ctrlKey: true,
		key: shiftKey ? key.toUpperCase() : key,
		keyCode: key.toUpperCase().charCodeAt(0),
		shiftKey,
	})
const makeRuntime = (source: string) => {
	const onCommit = vi.fn()
	const onError = vi.fn()
	return {
		onCommit,
		onError,
		runtime: createOrgBufferRuntime({
			canCommit: () => true,
			key: { bufferId: "buffer", workspaceSessionId: "session" },
			onCommit,
			onError,
			source,
		}),
	}
}
const foldCount = (view: EditorView) => {
	let count = 0
	foldedRanges(view.state).between(0, view.state.doc.length, () => {
		count++
	})
	return count
}

describe("OrgEditor runtime projection", () => {
	afterEach(() => {
		cleanup()
		useSettings.setState({ orgKeymapConfigurationJson: "" })
		vi.restoreAllMocks()
	})

	it("routes repeated modal keys through the production resolver without losing canonical operator history", async () => {
		useSettings.setState({ orgKeymapConfigurationJson: '{"version":1,"modalEngine":"vim"}' })
		const source = "alpha beta gamma\n* TODO 中文 😀\n"
		const { runtime } = makeRuntime(source)
		render(<OrgEditor runtime={runtime} value={source} windowId="primary" ariaLabel="primary" onSave={() => {}} />)
		const view = viewFor()
		const modalKey = (key: string) => fireEvent.keyDown(view.contentDOM, {
			key, keyCode: key.toUpperCase().charCodeAt(0), repeat: true,
		})
		act(() => { modalKey("d"); modalKey("w") })
		expect(runtime.source).toBe("beta gamma\n* TODO 中文 😀\n")
		expect(undoDepth(runtime.state)).toBe(1)
		act(() => { modalKey("l"); modalKey("l") })
		expect(view.state.selection.main.head).toBe(2)
		act(() => modalKey("u"))
		await waitFor(() => expect(runtime.source).toBe(source))
		expect(undoDepth(runtime.state)).toBe(0)
	})

	it("preserves a visual region across a temporary readonly lock and deletes that region after unlock in one undo", async () => {
		useSettings.setState({ orgKeymapConfigurationJson: '{"version":1,"modalEngine":"vim"}' })
		const source = "alpha beta\n"
		const { runtime } = makeRuntime(source)
		const editor = (readOnly: boolean) => <OrgEditor runtime={runtime} value={source} windowId="primary" ariaLabel="primary" readOnly={readOnly} onSave={() => {}} />
		const mounted = render(editor(false))
		const view = viewFor()
		const modalKey = (key: string) => fireEvent.keyDown(view.contentDOM, { key, keyCode: key.toUpperCase().charCodeAt(0) })
		act(() => { modalKey("v"); modalKey("e") })
		const selection = view.state.selection
		expect(view.state.sliceDoc(selection.main.from, selection.main.to)).toBe("alpha")
		mounted.rerender(editor(true))
		expect(view.state.readOnly).toBe(true)
		expect(view.contentDOM).toHaveAttribute("data-modal-mode", "visual")
		expect(view.state.selection.eq(selection, true)).toBe(true)
		mounted.rerender(editor(false))
		expect(view.state.selection.eq(selection, true)).toBe(true)
		expect(runtime.source).toBe(source)
		act(() => modalKey("d"))
		expect(runtime.source).toBe(" beta\n")
		expect(undoDepth(runtime.state)).toBe(1)
		act(() => modalKey("u"))
		await waitFor(() => expect(runtime.source).toBe(source))
	})

	it("keeps the shared mode display owned by the real current Vim Source after incarnation retirement", async () => {
		useSettings.setState({ orgKeymapConfigurationJson: '{"version":1,"modalEngine":"vim"}' })
		const first = makeRuntime("first Source\n").runtime
		const second = makeRuntime("second Source\n").runtime
		const mounted = render(<OrgEditor key="first" runtime={first} value={first.source} windowId="primary" ariaLabel="primary" getTodoNotePermit={() => () => true} onSave={() => {}} />)
		const modeKey = (view: EditorView, key: string) => fireEvent.keyDown(view.contentDOM, { key, keyCode: key === "Escape" ? 27 : key.toUpperCase().charCodeAt(0) })
		act(() => { modeKey(viewFor(), "i"); modeKey(viewFor(), "Escape") })
		await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/NORMAL/))
		mounted.rerender(<OrgEditor key="second" runtime={second} value={second.source} windowId="primary" ariaLabel="primary" getTodoNotePermit={() => () => true} onSave={() => {}} />)
		const current = viewFor()
		act(() => modeKey(current, "i"))
		expect(current.contentDOM.getAttribute("data-modal-mode")).toBe("insert")
		await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/INSERT/))
		act(() => modeKey(current, "Escape"))
		expect(current.contentDOM.getAttribute("data-modal-mode")).toBe("normal")
		await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/NORMAL/))
		expect([first.source, second.source]).toEqual(["first Source\n", "second Source\n"])
		expect([undoDepth(first.state), undoDepth(second.state)]).toEqual([0, 0])
	})

	it("captures immutable full raw selections, maps every range and preserves unknown mixed-EOL Source in one canonical undo", async () => {
		const source = "* 😀\r\n#+UNKNOWN: x\nlone\rbody\r\nTail 🧪\r\n"
		const { runtime } = makeRuntime(source)
		let target: OrgEditorCommandTarget | null = null
		render(<OrgEditor runtime={runtime} value={source} windowId="primary" documentPath="a.org" ariaLabel="primary" onSave={() => {}} onCommandTarget={(value) => { target = value }} />)
		const view = viewFor()
		const selection = EditorSelection.create([
			EditorSelection.cursor(4, 1, 2, 9),
			EditorSelection.range(16, 8, 11, 1, -1),
			EditorSelection.undirectionalRange(22, 27),
		], 1)
		act(() => view.dispatch({ selection }))
		const owner = createTrustedCompiledExtension({ commands: createApplicationCommandRegistry(), captureSource: () => target!.captureSourceTransform!() })
		const captured = owner.captureSource()!
		expect(captured.snapshot.content).toBe(source)
		expect(captured.snapshot.selection).toEqual({ mainIndex: 1, ranges: [
			{ anchor: 4, head: 4, assoc: 1, bidiLevel: 2, goalColumn: 9, undirectional: false },
			{ anchor: 17, head: 9, assoc: -1, bidiLevel: 1, goalColumn: 11, undirectional: false },
			{ anchor: 23, head: 28, assoc: 0, bidiLevel: 0, goalColumn: undefined, undirectional: true },
		] })
		expect(Object.isFrozen(captured.snapshot.selection.ranges[1])).toBe(true)
		const insert = "#+UNKNOWN_TWO: 🦉\r\n"
		const expectedSelection = selection.map(view.state.changes({ from: 0, insert }))
		await act(async () => {
			expect(await captured.apply({ changes: [{ from: 0, to: 0, insert }], cursor: 0 })).toBe(true)
		})
		expect(runtime.source).toBe(insert + source)
		expect(view.state.selection.eq(expectedSelection, true)).toBe(true)
		expect(view.state.selection.ranges.map((range) => ({ bidi: range.bidiLevel, goal: range.goalColumn, undirectional: range.undirectional })))
			.toEqual(expectedSelection.ranges.map((range) => ({ bidi: range.bidiLevel, goal: range.goalColumn, undirectional: range.undirectional })))
		expect(view.state.selection.ranges).toHaveLength(3)
		expect(undoDepth(runtime.state)).toBe(1)
		act(() => key(view, "z"))
		expect(runtime.source).toBe(source)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(captured.isCurrent()).toBe(false)
		await act(async () => { expect(await captured.apply({ changes: [{ from: 0, to: 0, insert: "stale" }], cursor: 0 })).toBe(false) })
		const retired = owner.captureSource()!
		await owner.unload()
		await act(async () => { expect(await retired.apply({ changes: [{ from: 0, to: 0, insert: "retired" }], cursor: 0 })).toBe(false) })
		expect(runtime.source).toBe(source)
		expect(runtime.closed).toBe(false)
	})

	it("rejects an unused asynchronous capture after edit/undo ABA even though Source bytes match again", async () => {
		const { runtime } = makeRuntime("same 😀\r\n")
		let target: OrgEditorCommandTarget | null = null
		render(<OrgEditor runtime={runtime} value={runtime.source} ariaLabel="primary" onSave={() => {}} onCommandTarget={(value) => { target = value }} />)
		const captured = target!.captureSourceTransform!()!
		act(() => { viewFor().dispatch({ changes: { from: 0, insert: "temporary" } }); key(viewFor(), "z") })
		expect(runtime.source).toBe(captured.snapshot.content)
		expect(captured.isCurrent()).toBe(false)
		await act(async () => { expect(await captured.apply({ changes: [{ from: 0, to: 0, insert: "must not apply" }], cursor: 0 })).toBe(false) })
		expect(runtime.source).toBe("same 😀\r\n")
	})

	it("does not call a native optimistic dispatch canonical transform success before its ACK", async () => {
		const source = "native 😀\r\n"
		const state = EditorState.create({ doc: source, extensions: EditorState.lineSeparator.of("\r\n") })
		const bootstrap = { windowId: "capture-native", binding: "capture-native-binding" }
		const initial: Extract<OrgNativeProjection, { kind: "initial" }> = { kind: "initial", binding: bootstrap.binding, generation: 1,
			nextRequestId: 2, bufferId: "capture", path: "a.org", filename: "/approved/a.org", source, separator: "\r\n", revision: 0, sequence: 0,
			selection: encodeOrgNativeSelection(state.selection), folds: [], scrollTop: 0, scrollLeft: 0, readOnly: false }
		const sent = Promise.withResolvers<number>()
		const projection = createOrgNativeChildProjection(bootstrap, initial, async (requestId) => { sent.resolve(requestId) })
		let target: OrgEditorCommandTarget | null = null
		render(<OrgEditor nativeProjection={projection} value={source} ariaLabel="primary" onSave={() => {}} onCommandTarget={(value) => { target = value }} />)
		const captured = target!.captureSourceTransform!()!
		let settled = false
		let outcome: Promise<boolean>
		await act(async () => {
			outcome = captured.apply({ changes: [{ from: 0, to: 0, insert: "optimistic " }], cursor: 0 }).then((value) => { settled = true; return value })
			await sent.promise
		})
		expect(viewFor().state.sliceDoc()).toBe("optimistic " + source)
		expect(settled).toBe(false)
		await act(async () => {
			projection.receive({ kind: "rejected", binding: bootstrap.binding, generation: 1, requestId: await sent.promise, message: "Canonical owner refused", accepted: false })
			expect(await outcome!).toBe(false)
		})
		expect(projection.retainDraft()).toBe("optimistic " + source)
		projection.retire()
	})
	it("drains an accepted transform on contributor unload without reporting canonical acceptance as rejection", async () => {
		const source = "* TODO Accepted 中文 😀\r\n"
		const { runtime } = makeRuntime(source)
		let target: OrgEditorCommandTarget | null = null
		render(<OrgEditor runtime={runtime} value={source} ariaLabel="primary" onSave={() => {}} onCommandTarget={(value) => { target = value }} />)
		const transform = target!.captureSourceTransform!()!
		const committed = Promise.withResolvers<void>()
		const acknowledgement = Promise.withResolvers<void>()
		const owner = createTrustedCompiledExtension({
			commands: createApplicationCommandRegistry(),
			captureSource: () => ({
				snapshot: transform.snapshot,
				isCurrent: transform.isCurrent,
				apply: async (batch, selection) => {
					const accepted = await transform.apply(batch, selection)
					committed.resolve()
					await acknowledgement.promise
					return accepted
				},
			}),
		})
		const captured = owner.captureSource()!
		let applying: Promise<boolean>
		await act(async () => {
			applying = captured.apply({ changes: [{ from: source.length, to: source.length, insert: "accepted\r\n" }], cursor: 0 })
			await committed.promise
		})
		expect(runtime.source).toBe(source + "accepted\r\n")
		let drained = false
		const unloading = owner.unload().then((result) => { drained = result; return result })
		await Promise.resolve()
		expect(drained).toBe(false)
		expect(owner.captureSource()).toBeNull()
		acknowledgement.resolve()
		expect(await applying!).toBe(true)
		expect(await unloading).toBe(true)
		expect(runtime.source).toBe(source + "accepted\r\n")
		expect(runtime.closed).toBe(false)
		act(() => key(viewFor(), "z"))
		expect(runtime.source).toBe(source)
	})

	it("routes two-window typing/paste/history once and retains independent folds, selection, and fresh UI callbacks", () => {
		const { runtime, onCommit } = makeRuntime("* Heading\nbody\n* Next\n")
		const onChange = vi.fn(),
			oldSave = vi.fn(),
			save = vi.fn()
		const pair = (readOnly: boolean, onSave: () => void, label = "primary") => (
			<>
				<OrgEditor
					runtime={runtime}
					windowId="primary"
					value="stale echo"
					onChange={onChange}
					onSave={onSave}
					readOnly={readOnly}
					ariaLabel={label}
				/>
				<OrgEditor
					runtime={runtime}
					windowId="secondary"
					value="also stale"
					onChange={onChange}
					onSave={onSave}
					ariaLabel="secondary"
				/>
			</>
		)
		const mounted = render(pair(false, oldSave))
		const a = viewFor(),
			b = viewFor("secondary")
		expect(a.state.field(historyField, false)).toBeUndefined()
		expect(b.state.field(historyField, false)).toBeUndefined()
		act(() => {
			a.dispatch({ selection: { anchor: 0 } })
			foldCode(a)
			b.dispatch({ selection: { anchor: b.state.doc.length } })
			a.dispatch({ changes: { from: a.state.doc.length, insert: "a" }, userEvent: "input.type" })
			a.dispatch({ changes: { from: a.state.doc.length, insert: "b" }, userEvent: "input.type" })
		})
		expect(undoDepth(runtime.state)).toBe(1)
		expect(foldCount(a)).toBe(1)
		expect(foldCount(b)).toBe(0)
		expect(a.state.selection.main.head).not.toBe(b.state.selection.main.head)
		expect(onChange).not.toHaveBeenCalled()
		expect(onCommit).toHaveBeenCalledTimes(2)
		act(() => key(b, "z"))
		expect(runtime.source).toBe("* Heading\nbody\n* Next\n")
		act(() => key(a, "z", true))
		expect(runtime.source.endsWith("ab")).toBe(true)
		act(() =>
			b.dispatch({
				changes: { from: b.state.doc.length, insert: "paste\0😀" },
				userEvent: "input.paste",
			}),
		)
		expect(undoDepth(runtime.state)).toBe(2)
		act(() =>
			fireEvent(
				b.contentDOM,
				new InputEvent("beforeinput", {
					bubbles: true,
					cancelable: true,
					inputType: "historyUndo",
				}),
			),
		)
		expect(runtime.source.endsWith("ab")).toBe(true)
		act(() => key(a, "y"))
		expect(runtime.source.endsWith("paste\0😀")).toBe(true)
		mounted.rerender(pair(true, save, "updated label"))
		expect(viewFor("updated label")).toBe(a)
		expect(a.state.readOnly).toBe(true)
		const source = runtime.source
		act(() => key(a, "z"))
		expect(runtime.source).toBe(source)
		act(() => key(a, "s"))
		expect(save).toHaveBeenCalledOnce()
		expect(oldSave).not.toHaveBeenCalled()
		act(() => runtime.applyControllerSource(runtime.source, "* CRLF\r\ntext\r\n"))
		expect(a.state.lineBreak).toBe("\r\n")
		expect(b.state.sliceDoc()).toBe(runtime.source)
		mounted.rerender(pair(false, save))
		expect(a.state.lineBreak).toBe(runtime.state.lineBreak)
		expect(a.state.field(historyField, false)).toBeUndefined()
		expect(runtime.source).toBe("* CRLF\r\ntext\r\n")
		mounted.unmount()
		expect(runtime.closed).toBe(false)
	})

	it.each([
		"abc\n",
		"abc\r\n",
		"abc\r",
		"abc\r\nLF\nlone\r\0😀",
	])("keeps exact raw source and EOF metadata edits: %j", (source) => {
		const { runtime, onCommit } = makeRuntime(source)
		const onChange = vi.fn()
		let target: OrgEditorCommandTarget | null = null
		render(
			<OrgEditor
				runtime={runtime}
				windowId="primary"
				value="old"
				onChange={onChange}
				onSave={vi.fn()}
				ariaLabel="primary"
				onCommandTarget={(next) => {
					target = next
				}}
			/>,
		)
		const view = viewFor()
		const insert = "😀\0\n\r\r\n"
		act(() => {
			expect(target!.applyEdit("old", { cursor: 0, from: 0, insert, to: 0 })).toBe(false)
			expect(
				target!.applyEdit(source, {
					cursor: source.length + insert.length,
					from: source.length,
					insert,
					to: source.length,
				}),
			).toBe(true)
		})
		expect(runtime.source).toBe(source + insert)
		expect(view.state.sliceDoc()).toBe(source + insert)
		expect(view.state.selection.main.head).toBe(view.state.doc.length)
		expect(onCommit).toHaveBeenCalledOnce()
		expect(onChange).not.toHaveBeenCalled()
		expect(undoDepth(runtime.state)).toBe(1)
		act(() => key(view, "z"))
		expect(runtime.source).toBe(source)
		act(() => key(view, "y"))
		expect(runtime.source).toBe(source + insert)
	})

	it.each([
		"\n",
		"\r\n",
		"\r",
	])("applies source-coordinate batches atomically with %j", (separator) => {
		const source = `* TODO One${separator}body${separator}* TODO Two${separator}`
		const { runtime, onCommit } = makeRuntime(source)
		let target: OrgEditorCommandTarget | null = null
		const mounted = render(
			<OrgEditor
				runtime={runtime}
				value={source}
				onChange={vi.fn()}
				onSave={vi.fn()}
				ariaLabel="primary"
				onCommandTarget={(next) => {
					target = next
				}}
			/>,
		)
		const second = source.indexOf("Two")
		const batch = {
			changes: [
				{ from: second, insert: "Second", to: second + 3 },
				{ from: 7, insert: "First", to: 10 },
			],
			cursor: source.length + 5,
		}
		act(() => {
			expect(target!.applyEdits!("stale", batch)).toBe(false)
			expect(target!.applyEdits!(source, { ...batch, cursor: -1 })).toBe(false)
			expect(
				target!.applyEdits!(source, {
					...batch,
					changes: [
						{ from: 0, insert: "x", to: 3 },
						{ from: 2, insert: "y", to: 4 },
					],
				}),
			).toBe(false)
			if (separator === "\r\n")
				expect(
					target!.applyEdits!(source, {
						changes: [
							{ from: source.indexOf("\r") + 1, insert: "x", to: source.indexOf("\r") + 1 },
						],
						cursor: 0,
					}),
				).toBe(false)
			expect(target!.applyEdits!(source, batch)).toBe(true)
		})
		expect(runtime.source).toBe(source.replace("One", "First").replace("Two", "Second"))
		expect(viewFor().state.selection.main.head).toBe(viewFor().state.doc.length)
		expect(onCommit).toHaveBeenCalledOnce()
		expect(undoDepth(runtime.state)).toBe(1)
		act(() => key(viewFor(), "z"))
		expect(runtime.source).toBe(source)
		const stale = target!
		mounted.rerender(
			<OrgEditor
				runtime={runtime}
				value={source}
				onChange={vi.fn()}
				onSave={vi.fn()}
				readOnly
				ariaLabel="primary"
				onCommandTarget={(next) => {
					target = next
				}}
			/>,
		)
		expect(target!.applyEdits!(source, batch)).toBe(false)
		mounted.unmount()
		expect(target).toBeNull()
		expect(stale.applyEdits!(source, batch)).toBe(false)
	})

	it("recomputes inherited boolean BODY visibility after sibling tag edits and canonical undo", async () => {
		const source =
			"* Parent :work:\nparent BODY\n** TODO Child\nchild BODY\n* TODO Other :other:\nother BODY\n"
		const { runtime, onCommit } = makeRuntime(source)
		let target: OrgEditorCommandTarget | null = null
		render(
			<>
				<OrgEditor
					runtime={runtime}
					value={source}
					onChange={vi.fn()}
					onSave={vi.fn()}
					ariaLabel="primary"
					onCommandTarget={(next) => {
						target = next
					}}
				/>
				<OrgEditor
					runtime={runtime}
					value={source}
					onChange={vi.fn()}
					onSave={vi.fn()}
					ariaLabel="secondary"
				/>
			</>,
		)
		const a = viewFor(),
			b = viewFor("secondary")
		act(() => {
			a.dispatch({ selection: { anchor: source.indexOf("* TODO Other") } })
			expect(
				target!.applyView!(source, {
					kind: "sparse-tree",
					query: "match: (itag:work AND todo:TODO) OR tag:other",
				}),
			).toBe(true)
		})
		expect(a.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([
			source.indexOf("** TODO Child"),
			source.indexOf("* TODO Other"),
		])
		act(() =>
			b.dispatch({
				changes: { from: source.indexOf("work"), insert: "away", to: source.indexOf("work") + 4 },
			}),
		)
		expect(a.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([
			source.indexOf("* TODO Other"),
		])
		await waitFor(() => expect(a.contentDOM.textContent).not.toContain("child BODY"))
		expect(a.contentDOM.textContent).not.toContain("parent BODY")
		expect(a.contentDOM.textContent).toContain("other BODY")
		expect(b.contentDOM.textContent).toContain("child BODY")
		expect(b.state.field(orgSparseTreeField)).toBeNull()
		expect(undoDepth(runtime.state)).toBe(1)
		expect(onCommit).toHaveBeenCalledOnce()
		act(() => key(b, "z"))
		expect(runtime.source).toBe(source)
		await waitFor(() => expect(a.contentDOM.textContent).toContain("child BODY"))
		expect(a.state.field(orgSparseTreeField)!.plan?.allVisible).toBe(true)
		expect(redoDepth(runtime.state)).toBe(1)
	})

	it("checks sparse batch dependencies and privately permits separator reinsertion only", () => {
		const source = "* TODO Visible\nbody\n* Hidden\nsecret\n* TODO Last\n"
		const { runtime, onCommit } = makeRuntime(source)
		let target: OrgEditorCommandTarget | null = null
		render(
			<OrgEditor
				runtime={runtime}
				value={source}
				onChange={vi.fn()}
				onSave={vi.fn()}
				ariaLabel="primary"
				onCommandTarget={(next) => {
					target = next
				}}
			/>,
		)
		const start = source.indexOf("* Hidden")
		act(() => {
			expect(target!.applyView!(source, { kind: "sparse-tree", query: "todo" })).toBe(true)
			const batch = { changes: [{ from: 7, insert: "Changed", to: 14 }], cursor: 7 }
			expect(
				target!.applyEdits!(source, {
					...batch,
					requiredVisibleRanges: [{ from: start, to: start + 2 }],
				}),
			).toBe(false)
			expect(
				target!.applyEdits!(source, {
					...batch,
					changes: [...batch.changes, { from: start + 2, insert: "X", to: start + 3 }],
				}),
			).toBe(false)
			// A direct/filter:false transaction cannot acquire the private batch authority.
			expect(() =>
				viewFor().dispatch({
					changes: { from: start - 1, insert: "\nnew\n", to: start },
					filter: false,
				}),
			).toThrow()
			expect(runtime.source).toBe(source)
			expect(
				target!.applyEdits!(source, {
					changes: [{ from: start - 1, insert: "new\n", to: start }],
					cursor: 0,
				}),
			).toBe(false)
			expect(
				target!.applyEdits!(source, {
					changes: [{ from: start - 1, insert: "\nnew\n", to: start }],
					cursor: start + 1,
					requiredVisibleRanges: [{ from: start - 1, to: start }],
				}),
			).toBe(true)
		})
		expect(runtime.source).toBe(source.slice(0, start) + "new\n" + source.slice(start))
		expect(onCommit).toHaveBeenCalledOnce()
		act(() => key(viewFor(), "z"))
		expect(runtime.source).toBe(source)
	})

	it("imports both legacy history branches once, parks canonical history separately, and never adopts stale cache over live history", () => {
		const cache = new Map<string, OrgEditorSessionSnapshot>()
		const props = {
			ariaLabel: "primary",
			onChange: vi.fn(),
			onSave: vi.fn(),
			sessionCache: cache,
			sessionKey: "buffer",
			value: "* Heading\nbody\n",
		}
		let mounted = render(<OrgEditor {...props} />)
		const local = viewFor()
		act(() => {
			local.dispatch({
				changes: { from: local.state.doc.length, insert: "x" },
				userEvent: "input.type",
			})
			local.dispatch({
				changes: { from: local.state.doc.length, insert: "y" },
				userEvent: "input.paste",
			})
			undo(local)
			local.dispatch({ selection: { anchor: 0 } })
			foldCode(local)
		})
		const source = local.state.sliceDoc()
		mounted.unmount()
		const legacy = cache.get("buffer")!
		expect(undoDepth(legacy.state)).toBe(1)
		expect(redoDepth(legacy.state)).toBe(1)
		const { runtime } = makeRuntime(source)
		mounted = render(<OrgEditor {...props} value={source} runtime={runtime} windowId="primary" />)
		const first = viewFor()
		expect(undoDepth(runtime.state)).toBe(1)
		expect(redoDepth(runtime.state)).toBe(1)
		expect(first.state.field(historyField, false)).toBeUndefined()
		expect(foldCount(first)).toBe(1)
		act(() => {
			key(first, "y")
			first.dispatch({ selection: { anchor: 3 } })
		})
		mounted.unmount()
		const parked = cache.get("buffer")!
		expect(parked.state).toBe(runtime.state)
		expect(parked.windowState?.selection.main.head).toBe(3)
		expect(parked.windowState?.field(historyField, false)).toBeUndefined()
		// A same-source stale snapshot with different history must not replace the runtime.
		cache.set("stale", {
			scrollLeft: 0,
			scrollTop: 0,
			state: EditorState.create({ doc: runtime.source, extensions: history() }),
		})
		mounted = render(
			<OrgEditor
				{...props}
				sessionKey="stale"
				value={runtime.source}
				runtime={runtime}
				windowId="primary"
			/>,
		)
		expect(undoDepth(runtime.state)).toBe(2)
		mounted.unmount()
		mounted = render(
			<OrgEditor {...props} value={runtime.source} runtime={runtime} windowId="primary" />,
		)
		expect(viewFor().state.selection.main.head).toBe(3)
		act(() => key(viewFor(), "z"))
		expect(runtime.source).toBe(source)
		mounted.unmount()
		// Legacy local editor can resume canonical parked history without duplicating owners.
		mounted = render(<OrgEditor {...props} value={runtime.source} />)
		expect(redoDepth(viewFor().state)).toBe(1)
		act(() => redo(viewFor()))
		expect(viewFor().state.sliceDoc()).toBe(`${source}y`)
	})

	it("parks separate primary/secondary window state while scratch retains its own history owner", () => {
		const { runtime, onCommit } = makeRuntime("* Heading\nbody\n* Next\n")
		const cache = new Map<string, OrgEditorSessionSnapshot>()
		const props = { onChange: vi.fn(), onSave: vi.fn(), sessionCache: cache, value: runtime.source }
		const windows = () => (
			<>
				<OrgEditor
					{...props}
					runtime={runtime}
					windowId="primary"
					sessionKey="buffer"
					ariaLabel="primary"
				/>
				<OrgEditor
					{...props}
					runtime={runtime}
					windowId="secondary"
					sessionKey="buffer:window:secondary"
					ariaLabel="secondary"
				/>
				<OrgEditor {...props} sessionKey="scratch" ariaLabel="scratch" />
			</>
		)
		let mounted = render(windows())
		const a = viewFor(),
			b = viewFor("secondary"),
			scratch = viewFor("scratch")
		act(() => {
			a.dispatch({ selection: { anchor: 0 } })
			foldCode(a)
			b.dispatch({ selection: { anchor: b.state.doc.length } })
			scratch.dispatch({ changes: { from: scratch.state.doc.length, insert: "scratch" } })
		})
		a.scrollDOM.scrollTop = 44
		b.scrollDOM.scrollTop = 99
		expect(undoDepth(scratch.state)).toBe(1)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(onCommit).not.toHaveBeenCalled()
		mounted.unmount()
		expect(cache.get("buffer")?.scrollTop).toBe(44)
		expect(cache.get("buffer:window:secondary")?.scrollTop).toBe(99)
		mounted = render(windows())
		expect(viewFor().state.selection.main.head).toBe(0)
		expect(viewFor("secondary").state.selection.main.head).toBe(runtime.state.doc.length)
		expect(foldCount(viewFor())).toBe(1)
		expect(foldCount(viewFor("secondary"))).toBe(0)
		mounted.unmount()
		expect(runtime.closed).toBe(false)
	})

	it("migrates a legacy append without executing cached filters or extenders", () => {
		const filter = vi.fn(() => [])
		const extender = vi.fn(() => null)
		let legacy = EditorState.create({ doc: "old", extensions: history() })
		legacy = legacy.update({ changes: { from: 3, insert: " edit" } }).state
		legacy = legacy.update({
			effects: StateEffect.appendConfig.of([
				EditorState.transactionFilter.of(filter),
				EditorState.transactionExtender.of(extender),
			]),
		}).state
		filter.mockClear()
		extender.mockClear()
		const cache = new Map<string, OrgEditorSessionSnapshot>([
			[
				"buffer",
				{
					scrollLeft: 0,
					scrollTop: 0,
					state: legacy,
				},
			],
		])
		const { runtime, onCommit } = makeRuntime("old edit appended")
		render(
			<OrgEditor
				runtime={runtime}
				sessionKey="buffer"
				sessionCache={cache}
				value={runtime.source}
				ariaLabel="primary"
				onChange={vi.fn()}
				onSave={vi.fn()}
			/>,
		)
		expect(filter).not.toHaveBeenCalled()
		expect(extender).not.toHaveBeenCalled()
		expect(onCommit).not.toHaveBeenCalled()
		expect(undoDepth(runtime.state)).toBe(1)
		expect(viewFor().state.sliceDoc()).toBe("old edit appended")
		act(() => key(viewFor(), "z"))
		expect(runtime.source).toBe("old appended")
	})

	it("rejects and reports unknown effects atomically rather than silently falling back", () => {
		const { runtime, onCommit } = makeRuntime("text")
		render(
			<OrgEditor
				runtime={runtime}
				value="text"
				onChange={vi.fn()}
				onSave={vi.fn()}
				ariaLabel="primary"
			/>,
		)
		const unknown = StateEffect.define<boolean>()
		expect(() =>
			viewFor().dispatch({ changes: { from: 0, insert: "bad" }, effects: unknown.of(true) }),
		).toThrow("Unregistered window effect")
		expect(runtime.source).toBe("text")
		expect(onCommit).not.toHaveBeenCalled()
	})
})
