import { SearchQuery, search, setSearchQuery } from "@codemirror/search"
import { ChangeSet, EditorSelection, EditorState, Transaction, type Extension, type StateEffect, type Text } from "@codemirror/state"
import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view"
import { CodeMirror, type InsertModeChanges, type Pos, type Vim } from "@replit/codemirror-vim"
import { initVim } from "@replit/codemirror-vim-core"
import { orgSemanticHistory } from "@/flows/org-editor-runtime"
import { minimalTextChange } from "@/flows/org-editor-runtime/org-buffer-runtime.helpers"
import type { OrgMinibufferAcceptResult } from "@/types/editor/minibuffer.interface"

export interface OrgModalPrompt {
	readonly prompt: string
	readonly initialInput: string
	readonly selectValueOnOpen: boolean
	/** Installs ownership before React publication can focus the root input. */
	readonly onOpen: (handle: OrgModalPromptHandle) => void
	readonly onInput: (event: Event, input: HTMLInputElement) => void
	readonly onKeyDown: (event: KeyboardEvent, input: HTMLInputElement) => boolean
	readonly onKeyUp: (event: KeyboardEvent, input: HTMLInputElement) => void
	readonly onAccept: (value: string) => OrgMinibufferAcceptResult | Promise<OrgMinibufferAcceptResult>
	readonly onCancel: () => void
	readonly onClose: (host: HTMLElement) => void
}
export interface OrgModalPromptHandle {
	readonly close: () => void
	readonly setValue: (value: string) => void
	readonly ownsInput: (target: EventTarget | null) => boolean
}
export interface OrgModalPromptPorts {
	/** One application registry in this JS realm; not a process-global Vim override. */
	readonly runtimeScope: object
	readonly openPrompt: (prompt: OrgModalPrompt) => OrgModalPromptHandle | null
	readonly echo: (result: { readonly ok: boolean; readonly message: string }) => () => void
	readonly mode: (mode: string) => void
}
export interface OrgModalPorts extends OrgModalPromptPorts {
	/** Exact window, canonical incarnation and grant lease, not a path comparison. */
	readonly isCurrent: () => boolean
	readonly requestHistory: (operation: "undo" | "redo") => boolean | Promise<boolean>
	/** Captures the acknowledged canonical save operation before any async boundary. */
	readonly captureSave: () => (() => boolean | Promise<boolean>) | null
	readonly reportError?: (message: string) => void
}
export interface OrgModalAdapter {
	readonly extensions: Extension
	modalKey(event: KeyboardEvent): boolean
	ownedMinibufferKey(event: KeyboardEvent): boolean
	ownsInput(target: EventTarget | null): boolean
	cancel(): boolean
	/** Retires a focus-lost key stream without changing established mode or Source selection. */
	suspendInput(): boolean
	ownsEffect(effect: StateEffect<unknown>): boolean
	/** Await acknowledged counted history; useful for command hosts and regression tests. */
	whenIdle(): Promise<void>
	destroy(): void
}

type WindowCommands = { history: (operation: "undo" | "redo", count?: number) => void; save: () => void }
const windows = new WeakMap<object, WindowCommands>()
const inputOwners = new WeakMap<object, () => boolean>()
const inputListeners = new WeakMap<object, Map<Function, Function>>()
class ApplicationCodeMirror extends CodeMirror {
	static on(emitter: object, type: string, listener: Function) {
		if (type === "keydown" && inputOwners.has(emitter)) {
			let listeners = inputListeners.get(emitter)
			if (!listeners) inputListeners.set(emitter, listeners = new Map())
			const guarded = (event: KeyboardEvent) => {
				// Upstream records insert-mode Backspace/Delete directly from this
				// DOM listener. Preedit editing is not committed Vim input.
				if (!event.isComposing && inputOwners.get(emitter)?.()) listener(event)
			}
			listeners.set(listener, guarded)
			super.on(emitter, type, guarded)
		} else super.on(emitter, type, listener)
	}
	static off(emitter: object, type: string, listener: Function) {
		const guarded = type === "keydown" ? inputListeners.get(emitter)?.get(listener) : undefined
		super.off(emitter, type, guarded ?? listener)
		if (guarded) inputListeners.get(emitter)?.delete(listener)
	}
	static commands = {
		...CodeMirror.commands,
		undo: (cm: CodeMirror) => windows.get(cm)?.history("undo"),
		redo: (cm: CodeMirror) => windows.get(cm)?.history("redo"),
		save: (cm: CodeMirror) => windows.get(cm)?.save(),
	}
}
const runtimes = new WeakMap<object, { engine: Vim; dot: Record<string, unknown> }>()
function applicationRuntime(scope: object) {
	let runtime = runtimes.get(scope)
	if (!runtime) {
		const engine = initVim(ApplicationCodeMirror)
		engine.defineAction("undo", (cm, args) => windows.get(cm)?.history("undo", args.repeat))
		engine.defineAction("redo", (cm, args) => windows.get(cm)?.history("redo", args.repeat))
		engine.defineEx("write", "w", (cm, params) => {
			if (params.argString?.trim() || params.line !== undefined || params.lineEnd !== undefined)
				throw new Error(":write supports only saving the captured Source; file/range effects are unavailable")
			windows.get(cm)?.save()
		})
		const unsupportedEffects: Record<string, string> = {
			edit: "e", read: "r", quit: "q", qall: "qa", wq: "wq", xit: "x",
			split: "sp", vsplit: "vs", new: "new", vnew: "vne", tabedit: "tabe",
			buffer: "b", bnext: "bn", bprevious: "bp", bdelete: "bd", saveas: "sav", file: "f", wall: "wa",
		}
		for (const [name, prefix] of Object.entries(unsupportedEffects)) {
			engine.defineEx(name, prefix, () => { throw new Error(`:${prefix} file/window effects are unavailable; use application Source commands`) })
		}
		runtime = { engine, dot: {} }
		runtimes.set(scope, runtime)
	}
	return runtime
}

/** Upstream engine state is application-local; selections and effect authority stay per window. */
export function createOrgModalAdapter(ports: OrgModalPorts): OrgModalAdapter {
	let active = true
	let view: EditorView | null = null
	let cm: OwnedCodeMirror | null = null
	let pendingHistory = false
	let pendingSave = false
	let historyTail = Promise.resolve()
	let saveTail: Promise<OrgMinibufferAcceptResult> = Promise.resolve({ ok: true })
	let origin: EditorSelection | null = null
	let group = ""
	let groupSerial = 0
	let operationDepth = 0
	let prompt: { handle: OrgModalPromptHandle | null; close: (value?: string) => void; callback?: Function; options: Record<string, any> } | null = null
	let presentation = 0
	// Notifications are upstream's result channel. Track effect attempts separately:
	// an error after a write/edit/opaque command must never confer retry authority.
	let acceptance: { effect: boolean; notification: OrgMinibufferAcceptResult | null } | null = null
	const issuedEffects = new WeakSet<StateEffect<unknown>>()
	const notifications = new Set<() => void>()
	const live = () => active && view !== null && ports.isCurrent()
	const report = (cause: unknown) => {
		const message = cause instanceof Error ? cause.message : String(cause)
		ports.echo({ ok: false, message })
		ports.reportError?.(message)
	}
	const beginGroup = () => {
		if (!origin && view) {
			origin = view.state.selection
			group = `${crypto.randomUUID()}:${++groupSerial}`
		}
	}
	const issue = (effect: StateEffect<unknown>) => {
		if (!live()) return
		issuedEffects.add(effect)
		view!.dispatch({ effects: effect, annotations: Transaction.addToHistory.of(false) })
	}
	const history = (operation: "undo" | "redo", count = 1) => {
		if (!live() || pendingHistory) return
		if (acceptance) acceptance.effect = true
		pendingHistory = true
		origin = null
		// Upstream restores its multi-selection at operation exit. Apply canonical
		// history afterwards, or that restoration overwrites the exact undo cursor.
		historyTail = Promise.resolve().then(async () => {
			try {
				for (let index = 0; index < count && live(); index++) {
					if (!await ports.requestHistory(operation)) break
				}
			} catch (cause) { if (live()) report(cause) }
			finally { pendingHistory = false }
		})
	}
	const save = () => {
		if (!live()) throw new Error("Modal window lease retired")
		if (pendingSave) throw new Error("A canonical save is already pending")
		const captured = ports.captureSave()
		if (!captured) throw new Error("The captured Source cannot be saved")
		const capturedPrompt = prompt
		const capturedPresentation = presentation
		if (acceptance) acceptance.effect = true
		pendingSave = true
		saveTail = (async () => {
			try {
				if (!await captured()) throw new Error("Canonical Source save was not acknowledged")
				if (live() && prompt === capturedPrompt && presentation === capturedPresentation) ports.echo({ ok: true, message: "Source saved" })
				return { ok: true } as const
			} catch (cause) {
				if (live() && prompt === capturedPrompt && presentation === capturedPresentation) report(cause)
				return { ok: false, message: cause instanceof Error ? cause.message : String(cause) } as const
			}
			finally { pendingSave = false }
		})()
	}
	const runtime = applicationRuntime(ports.runtimeScope)
	const engine = runtime.engine
	let composing: { readonly doc: Text; readonly input: unknown; readonly changes: InsertModeChanges["changes"]; group: string | null } | null = null
	type InsertCheckpoint = { readonly doc: Text; readonly dot: Record<string, unknown>; readonly changes: InsertModeChanges; readonly register: string; input: unknown; ownedChanges: InsertModeChanges["changes"]; cancelled: boolean }
	let insertCheckpoint: InsertCheckpoint | null = null
	let enteringCheckpoint: InsertCheckpoint | null = null
	const checkpoint = () => {
		const state = engine.getVimGlobalState_()
		const changes = state.macroModeState.lastInsertModeChanges
		return { doc: view!.state.doc, dot: { ...runtime.dot }, changes: { ...changes, changes: changes.changes.slice() },
			register: state.registerController.getRegister(".").toString(), input: runtime.dot.lastEditInputState,
			ownedChanges: changes.changes, cancelled: false }
	}
	const takeEnteringCheckpoint = () => {
		const previous = enteringCheckpoint
		enteringCheckpoint = null
		return previous
	}
	const finishInsert = () => {
		if (!insertCheckpoint || cm?.state.vim?.insertMode) return
		const previous = insertCheckpoint
		insertCheckpoint = null
		if (!previous.cancelled || !live() || !previous.doc.eq(view!.state.doc) ||
			previous.input !== runtime.dot.lastEditInputState ||
			previous.ownedChanges !== engine.getVimGlobalState_().macroModeState.lastInsertModeChanges.changes) return
		// A cancelled, otherwise empty insert must not replace the previous dot
		// or "." register. Macro exit has already logged its empty insert event.
		runtime.dot.lastEditInputState = previous.dot.lastEditInputState
		runtime.dot.lastEditActionCommand = previous.dot.lastEditActionCommand
		const state = engine.getVimGlobalState_()
		state.macroModeState.lastInsertModeChanges = previous.changes
		state.registerController.getRegister(".").setText(previous.register)
	}
	class OwnedCodeMirror extends ApplicationCodeMirror {
		getValue() { return this.cm6.state.sliceDoc() }
		private glyphColumn(row: number, column: number, direction: -1 | 1) {
			const text = this.getLine(row)
			const low = text.charCodeAt(column)
			const high = text.charCodeAt(column - 1)
			return low >= 0xdc00 && low <= 0xdfff && high >= 0xd800 && high <= 0xdbff
				? column + direction : column
		}
		getRange(from: Pos, to: Pos) {
			if (from.line !== to.line || from.ch !== to.ch) {
				from.ch = this.glyphColumn(from.line, from.ch, -1)
				to.ch = this.glyphColumn(to.line, to.ch, 1)
			}
			return this.cm6.state.sliceDoc(this.indexFromPos(from), this.indexFromPos(to))
		}
		replaceRange(text: string, from: Pos, to?: Pos, source?: string) {
			if (!to || from.line === to.line && from.ch === to.ch) {
				// Upstream p advances one UTF-16 unit. Advance an insertion boundary
				// out of a real pair, and retain that position for its final cursor.
				from.ch = this.glyphColumn(from.line, from.ch, 1)
				if (to) to.ch = from.ch
			} else {
				// An operator edits complete glyphs, including both boundary units.
				from.ch = this.glyphColumn(from.line, from.ch, -1)
				to.ch = this.glyphColumn(to.line, to.ch, 1)
			}
			super.replaceRange(text, from, to, source)
		}
		setCursor(line: number | Pos, ch?: number) {
			const row = typeof line === "number" ? line : line.line
			let column = typeof line === "number" ? ch ?? 0 : line.ch
			if (!this.state.vim?.insertMode) {
				// Upstream insert exit and put final cursors subtract a UTF-16 unit.
				// The normal cursor belongs at the glyph start, not its low unit.
				column = this.glyphColumn(row, column, -1)
			}
			super.setCursor(row, column)
		}
		execCommand(name: string) {
			if (!live()) return
			if (acceptance && name !== "undo" && name !== "redo") acceptance.effect = true
			if (name === "undo" || name === "redo") history(name)
			else super.execCommand(name)
		}
		setOption(name: string, value: unknown) {
			if (acceptance) acceptance.effect = true
			super.setOption(name, value)
		}
		onVimCommandEffect() {
			if (acceptance) acceptance.effect = true
		}
		operation<T>(fn: () => T, force?: boolean): T {
			if (!live()) throw new Error("Modal window lease retired")
			beginGroup()
			operationDepth++
			try { return super.operation(fn, force) }
			finally { operationDepth-- }
		}
		addOverlay({ query }: { query: RegExp }) {
			const search = new SearchQuery({ search: query.source, regexp: true, caseSensitive: !query.ignoreCase })
			this.cm6Query = search
			issue(setSearchQuery.of(search))
			return search
		}
		removeOverlay() {
			this.cm6Query = new SearchQuery({ search: "" })
			issue(setSearchQuery.of(this.cm6Query))
		}
		scrollIntoView(pos?: Pos, margin?: number) {
			if (!live()) return
			issue(EditorView.scrollIntoView(pos ? this.indexFromPos(pos) : this.cm6.state.selection.main.head, { yMargin: margin }))
		}
		openNotification(template: Node, options: Parameters<CodeMirror["openNotification"]>[1] & { readonly result?: "success" | "error" } = {}) {
			if (!live()) return () => undefined
			const message = template.textContent ?? ""
			const result: OrgMinibufferAcceptResult & { readonly message: string } = options.result === "error" ? { ok: false, message } : { ok: true, message }
			if (acceptance && (acceptance.notification === null || !result.ok)) acceptance.notification = result
			for (const close of notifications) close()
			const clear = ports.echo(result)
			const close = () => { notifications.delete(close); clear() }
			notifications.add(close)
			this.state.closeVimNotification = close
			return close
		}
		openDialog(template: Element, callback: Function | undefined, options: Record<string, any> = {}) {
			prompt?.close()
			if (!live()) return () => undefined
			if (acceptance) acceptance.effect = true
			if (!template.querySelector("input")) return this.openNotification(template)
			const session = {
				handle: null as OrgModalPromptHandle | null, callback, options,
				close: (value?: string) => {
					if (!live() || prompt !== session) return
					if (value !== undefined) session.handle?.setValue(value)
					else { prompt = null; session.handle?.close() }
				},
			}
			prompt = session
			presentation++
			session.handle = ports.openPrompt({
				prompt: template.querySelector("span")?.firstChild?.textContent?.trim() || "Vim:",
				initialInput: options.value ?? "", selectValueOnOpen: options.selectValueOnOpen !== false,
				onOpen: handle => { if (live() && prompt === session) session.handle = handle },
				onInput: (event, input) => {
					if (!live() || prompt !== session) return
					try { options.onInput?.(event, input.value, session.close) }
					catch (cause) { if (live()) report(cause) }
				},
				onKeyDown: (event, input) => prompt === session && handlePromptKey(event, input),
				onKeyUp: (event, input) => {
					if (!live() || prompt !== session || pendingHistory || pendingSave) return
					try { options.onKeyUp?.(event, input.value, session.close) }
					catch (cause) { if (live()) report(cause) }
				},
				onAccept: value => acceptPrompt(session, value),
				onCancel: () => {
					if (!live() || prompt !== session || pendingHistory || pendingSave) return
					// Upstream cancellation resets its own search/input state; never accept an empty command.
					const input = document.activeElement
					if (input instanceof HTMLInputElement && session.handle?.ownsInput(input))
						options.onKeyDown?.(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }), input.value, session.close)
					session.close()
				},
				onClose: host => {
					if (prompt === session) prompt = null
					if (live()) options.onClose?.(host)
				},
			})
			if (!session.handle) { prompt = null; report("The application Vim prompt is unavailable") }
			return session.close
		}
	}
	const acceptPrompt = (session: NonNullable<typeof prompt>, value: string): OrgMinibufferAcceptResult | Promise<OrgMinibufferAcceptResult> => {
		if (!live() || prompt !== session) return { ok: false, message: "This Vim prompt is no longer active." }
		if (acceptance || pendingHistory || pendingSave) return { ok: false, message: "A modal effect is already pending." }
		beginGroup()
		const previousSave = saveTail
		const attempt = { effect: false, notification: null as OrgMinibufferAcceptResult | null }
		acceptance = attempt
		const finish = (result: OrgMinibufferAcceptResult) => {
			// Pre-effect rejection keeps the original handle and exact input. Accepted
			// or uncertain effects retire even on failure: correction is not a retry lease.
			if (prompt === session && (attempt.effect || (result.ok && session.options.closeOnEnter !== false))) session.close()
			if (!cm?.state.vim?.insertMode) origin = null
			return result
		}
		try {
			cm!.operation(() => session.callback?.(value))
			if (saveTail !== previousSave) return saveTail.then(finish)
			return finish(attempt.notification ?? { ok: true })
		} catch (cause) {
			if (live()) report(cause)
			return finish({ ok: false, message: cause instanceof Error ? cause.message : String(cause) })
		} finally { acceptance = null }
	}
	const handlePromptKey = (event: KeyboardEvent, input: HTMLInputElement) => {
		const session = prompt
		if (!live() || !session || !session.handle?.ownsInput(input) || event.defaultPrevented || event.isComposing || event.keyCode === 229 || event.getModifierState("AltGraph")) return false
		if (pendingHistory || pendingSave) { event.preventDefault(); return true }
		if (event.ctrlKey && event.key.toLowerCase() === "g") {
			event.preventDefault()
			session.options.onKeyDown?.(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }), input.value, session.close)
			session.close()
			return true
		}
		try {
			const handled = cm!.operation(() => {
				if (cm!.curOp) cm!.curOp.isVimOp = true
				return session.options.onKeyDown?.(event, input.value, session.close)
			})
			if (handled) event.preventDefault()
		} catch (cause) { if (live()) report(cause); event.preventDefault(); return true }
		if (event.defaultPrevented || prompt !== session) return true
		if (event.key === "Escape") { event.preventDefault(); session.close(); return true }
		// Unconsumed Enter belongs to the shared host's result/error/pending path.
		return false
	}
	const plugin = ViewPlugin.fromClass(class {
		constructor(editor: EditorView) {
			if (view) throw new Error("A modal adapter belongs to exactly one window")
			view = editor; cm = new OwnedCodeMirror(editor)
			inputOwners.set(cm.getInputField(), () => live() && !composing && !editor.composing)
			windows.set(cm, { history, save })
			engine.enterVimMode(cm)
			for (const name of ["lastEditInputState", "lastEditActionCommand"]) {
				Object.defineProperty(cm.state.vim, name, {
					configurable: true, get: () => runtime.dot[name], set: (value: unknown) => {
						// Capture only an upstream edit command, before it resets insert
						// recording. Ordinary motions/prefix keys allocate no snapshot.
						if (name === "lastEditInputState" && live() && !cm?.state.vim?.insertMode) enteringCheckpoint = checkpoint()
						runtime.dot[name] = value
					},
				})
			}
			const modeChanged = () => {
				if (!live() || !cm) return
				const mode = cm.state.vim
				const label = mode?.insertMode ? cm.state.overwrite ? "replace" : "insert" : mode?.visualMode ? mode.visualBlock ? "visual-block" : mode.visualLine ? "visual-line" : "visual" : "normal"
				editor.contentDOM.classList.toggle("grain-org-vim-normal", !mode?.insertMode)
				editor.contentDOM.setAttribute("data-modal-mode", label)
				ports.mode(label)
			}
			cm.on("vim-mode-change", modeChanged)
			modeChanged()
		}
		update(update: ViewUpdate) {
			if (!live() || !cm) { composing = null; insertCheckpoint = null; return }
			let settlement: Text | null = null
			let ownDocumentChange = false
			const wasComposing = composing !== null
			for (const transaction of update.transactions) {
				const semantic = transaction.annotation(orgSemanticHistory)
				if (composing && semantic?.composition === "update" && transaction.docChanged &&
					transaction.annotation(Transaction.addToHistory) !== false &&
					(composing.group === null || composing.group === semantic.group)) {
					composing.group = semantic.group
				} else if (composing && semantic?.composition === "end" &&
					(composing.group === null || composing.group === semantic.group)) {
					// The application shares repeat state. Another window may have
					// started an insert without projecting a mutation into this buffer.
					if (composing.input === runtime.dot.lastEditInputState &&
						composing.changes === engine.getVimGlobalState_().macroModeState.lastInsertModeChanges.changes) settlement = composing.doc
					composing = null
				} else if (transaction.docChanged || transaction.isUserEvent("undo") || transaction.isUserEvent("redo")) {
					settlement = null
					composing = null
					insertCheckpoint = null
				}
			}
			if (update.docChanged) {
				const own = !wasComposing && update.transactions.every(transaction => !transaction.docChanged || transaction.annotation(orgSemanticHistory)?.group === group)
				ownDocumentChange = own
				if (!own) origin = null
				cm.onChange(update)
				// Always map marks, but never record provisional, peer/controller or
				// history changes. Only the owning lifecycle's net settlement records.
				if (!own) cm.curOp = null
			}
			if (settlement && cm.state.vim?.insertMode) {
				if (settlement.eq(update.state.doc)) {
					if (insertCheckpoint) insertCheckpoint.cancelled = true
				} else {
					const net = ChangeSet.of(minimalTextChange(settlement, update.state.doc), settlement.length)
					net.iterChanges((_from, _to, _fromB, _toB, text) => {
						CodeMirror.signal(cm!, "change", cm!, { origin: "+input", text: text.toJSON() })
					})
					// End can be doc/selection-free (including the native child queue).
					// Deliver the matching cursor activity even in that case.
					cm.onSelectionChange()
				}
			}
			if (update.selectionSet && !wasComposing &&
				(!cm.state.vim?.insertMode || operationDepth > 0 ||
					(!update.docChanged || ownDocumentChange) && update.transactions.some(transaction =>
						transaction.selection !== undefined && transaction.annotation(Transaction.addToHistory) !== false))) {
				// Projected peer/controller/history selections map the local caret,
				// but are not insert input. Upstream cursorActivity otherwise marks
				// the recorded insert for reset on the next local character.
				cm.onSelectionChange()
			}
			if (!operationDepth && cm.curOp && !cm.curOp.isVimOp) cm.onBeforeEndOperation()
			const mode = cm.state.vim
			view!.contentDOM.classList.toggle("grain-org-vim-normal", !mode?.insertMode)
			view!.contentDOM.setAttribute("data-modal-mode", mode?.insertMode ? "insert" : mode?.visualMode ? mode.visualBlock ? "visual-block" : mode.visualLine ? "visual-line" : "visual" : "normal")
		}
		destroy() { adapter.destroy() }
	})
	const adapter: OrgModalAdapter = {
		extensions: [
			search(),
			plugin,
			EditorState.transactionExtender.of(transaction => {
				if (!live() || transaction.annotation(Transaction.addToHistory) === false || transaction.isUserEvent("undo") || transaction.isUserEvent("redo")) return null
				if (!transaction.docChanged) return operationDepth ? { annotations: Transaction.addToHistory.of(false) } : null
				// Composition has its own exact pre-input selection and canonical
				// settlement, rather than the surrounding Vim insert-session group.
				if (transaction.annotation(orgSemanticHistory)?.composition !== undefined ||
					(composing || view?.composing) && transaction.isUserEvent("input.type.compose")) return null
				// History policy is not input provenance: controller transactions can
				// legitimately carry addToHistory(true) in a history-free projection.
				// Only this engine operation or a native CM input/delete producer may
				// join the local insert recorder and its semantic undo group.
				if (!operationDepth && !transaction.isUserEvent("input.type") &&
					!transaction.isUserEvent("input.paste") && !transaction.isUserEvent("input.drop") &&
					!transaction.isUserEvent("input.complete") && !transaction.isUserEvent("delete") &&
					!transaction.isUserEvent("move.drop")) return null
				if (acceptance) acceptance.effect = true
				beginGroup()
				return { annotations: orgSemanticHistory.of({ selection: origin!, group }) }
			}),
			EditorView.inputHandler.of(() => pendingHistory || pendingSave || (!live() && active) || (live() && !cm?.state.vim?.insertMode && !view?.composing)),
			EditorView.domEventHandlers({
				compositionstart(event) {
					if (live() && cm) {
						if (!cm.state.vim?.insertMode) adapter.cancel()
						composing = cm.state.vim?.insertMode ? { doc: view!.state.doc, group: null,
							input: runtime.dot.lastEditInputState,
							changes: engine.getVimGlobalState_().macroModeState.lastInsertModeChanges.changes } : null
						CodeMirror.signal(cm, "inputEvent", event)
					}
					return false
				},
				compositionupdate(event) { if (live() && cm) CodeMirror.signal(cm, "inputEvent", event); return false },
				compositionend(event) { if (live() && cm) CodeMirror.signal(cm, "inputEvent", event); return false },
			}),
		],
		modalKey(event) {
			if (!live() || !cm || event.defaultPrevented || event.isComposing || view!.composing || event.keyCode === 229 || event.getModifierState("AltGraph")) return false
			if (pendingHistory || pendingSave) return true
			const key = engine.vimKeyFromEvent(event, cm.state.vim ?? undefined)
			if (!key) return false
			beginGroup()
			enteringCheckpoint = null
			try {
				CodeMirror.signal(cm, "inputEvent", event)
				const handled = cm.operation(() => {
					if (cm!.curOp) cm!.curOp.isVimOp = true
					return engine.multiSelectHandleKey(cm!, key, "user")
				})
				const previous = takeEnteringCheckpoint()
				if (previous && cm.state.vim?.insertMode) {
					previous.input = runtime.dot.lastEditInputState
					previous.ownedChanges = engine.getVimGlobalState_().macroModeState.lastInsertModeChanges.changes
					insertCheckpoint = previous
				}
				finishInsert()
				if (handled) CodeMirror.signal(cm, "vim-keypress", key)
				// Preserve an insert/change group across browser typing and prefix/operator
				// keys, but never carry the preceding motion's cursor into the next edit.
				const state = cm.state.vim
				if (!state?.insertMode && !state?.visualMode && !state?.inputState.operator && !state?.inputState.keyBuffer.length && !state?.inputState.prefixRepeat.length && !state?.inputState.registerName) origin = null
				return !!handled
			} catch (cause) { enteringCheckpoint = null; origin = null; report(cause); return true }
		},
		ownedMinibufferKey(event) {
			return event.target instanceof HTMLInputElement ? handlePromptKey(event, event.target) : false
		},
		ownsInput: target => live() && !!prompt?.handle?.ownsInput(target),
		cancel() {
			if (!live() || !cm) return false
			if (pendingHistory || pendingSave) return true
			if (prompt) {
				const input = document.activeElement
				if (input instanceof HTMLInputElement && prompt.handle?.ownsInput(input)) {
					prompt.options.onKeyDown?.(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }), input.value, prompt.close)
				}
				prompt?.close()
				return true
			}
			cm.operation(() => engine.handleKey(cm!, "<Esc>", "user"))
			finishInsert()
			origin = null
			return true
		},
		suspendInput() {
			if (!live() || !cm?.state.vim) return false
			const oldPrompt = prompt
			prompt = null
			oldPrompt?.handle?.close()
			const mode = cm.state.vim
			// The pinned engine's clearInputState constructs this same upstream
			// class. Reuse its constructor, not a second state shape or a fake key.
			// Its command-done signal is intentionally omitted: CTRL-o listens to
			// that signal to re-enter insert, which is not a focus-loss operation.
			const InputState = mode.inputState.constructor as new () => typeof mode.inputState
			mode.inputState = new InputState()
			mode.expectLiteralNext = false
			enteringCheckpoint = null
			if (!mode.insertMode && !mode.visualMode) origin = null
			// The current insert checkpoint, composition, macro and repeat state
			// belong to this window's edit, not to its transient keyboard focus.
			return true
		},
		ownsEffect: effect => live() && issuedEffects.has(effect),
		whenIdle: async () => { await Promise.all([historyTail, saveTail]) },
		destroy() {
			if (!active) return
			const oldPrompt = prompt
			prompt = null
			active = false
			oldPrompt?.handle?.close()
			for (const close of notifications) close()
			notifications.clear()
			composing = null; insertCheckpoint = null
			if (cm) {
				const input = cm.getInputField()
				windows.delete(cm); engine.leaveVimMode(cm); cm.destroy()
				inputOwners.delete(input); inputListeners.delete(input)
			}
			cm = null; view = null; origin = null
		},
	}
	return adapter
}
