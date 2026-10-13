import { EditorState, Prec, Transaction, type EditorSelection, type Extension, type Text } from "@codemirror/state"
import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view"
import { orgSemanticHistory } from "./org-buffer-runtime.helpers"

/** Browser composition lifecycle, shared by default/Vim and attached/detached Source.
 * Only real CM input transactions are tagged. This never owns or writes Source. */
export function orgCompositionHistory(isCurrent: (view: EditorView) => boolean): Extension {
	let view: EditorView | null = null
	let session: { readonly doc: Text; readonly selection: EditorSelection; readonly group: string; ended: boolean } | null = null
	let timer: ReturnType<typeof setTimeout> | undefined
	const clearTimer = () => { clearTimeout(timer); timer = undefined }
	const begin = (state: EditorState) => {
		clearTimer()
		session = { doc: state.doc, selection: state.selection, group: `composition:${crypto.randomUUID()}`, ended: false }
	}
	const settle = (startingNext = false) => {
		clearTimer()
		if (!view || !session || !isCurrent(view)) return
		if (view.composing && !startingNext) { schedule(); return }
		const completed = session
		session = null
		view.dispatch({
			// Comparison only: the view snapshot is never a Source writer. Exact
			// cancellation cursor is sent through the normal fenced native queue.
			...(completed.doc.eq(view.state.doc) ? { selection: completed.selection } : {}),
			annotations: [Transaction.addToHistory.of(false), orgSemanticHistory.of({
				selection: completed.selection, group: completed.group, composition: "end",
			})],
		})
	}
	// CM categorizes post-compositionend DOM mutations as compose for 50ms.
	// Let its observer flush those mutations before closing the canonical event.
	const schedule = () => { clearTimer(); timer = setTimeout(settle, 50) }
	return [
		ViewPlugin.fromClass(class {
			constructor(editor: EditorView) { view = editor }
			update(update: ViewUpdate) {
				if (!session) return
				if (update.transactions.some(transaction => transaction.docChanged &&
					transaction.annotation(orgSemanticHistory)?.group !== session!.group)) {
					// A peer/controller/history mutation ends this input ownership. The
					// runtime seals its checkpoint BEFORE accepting that other mutation.
					clearTimer(); session = null
				} else if (session.ended ? update.docChanged : !update.view.composing) {
					// CM's end cleanup and selection/presentation-only updates must
					// not keep postponing settlement after the final input mutation.
					session.ended = true
					schedule()
				}
			}
			destroy() { clearTimer(); session = null; view = null }
		}),
		EditorState.transactionExtender.of(transaction => {
			if (!view || !isCurrent(view) || transaction.annotation(Transaction.addToHistory) === false ||
				!transaction.docChanged || !transaction.isUserEvent("input.type.compose")) return null
			// The Vim shim also labels programmatic commands as compose.start.
			// Native DOM lifecycle or CM's composing state must own the input.
			if (!session) {
				if (!view.composing) return null
				begin(transaction.startState)
			}
			return { annotations: orgSemanticHistory.of({ selection: session!.selection,
				group: session!.group, composition: "update" }) }
		}),
		Prec.highest(EditorView.domEventHandlers({
			// Seal an ended lifecycle before Vim snapshots the next one. CM can
			// still label the intervening accepted ASCII as compose for 50ms.
			compositionstart(_event, editor) {
				if (isCurrent(editor)) {
					if (session?.ended) settle(true)
					begin(editor.state)
				}
				return false
			},
			keydown(event, editor) {
				if (session?.ended && !event.isComposing && event.keyCode !== 229 && isCurrent(editor)) settle()
				return false
			},
			compositionend() { if (session) { session.ended = true; schedule() }; return false },
			blur() { if (session) { session.ended = true; schedule() }; return false },
		})),
	]
}
