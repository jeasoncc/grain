import {
	defaultKeymap,
	history,
	historyField,
	indentMore,
	isolateHistory,
	redoDepth,
	undoDepth,
} from "@codemirror/commands"
import {
	foldAll,
	foldEffect,
	foldedRanges,
	foldGutter,
	foldKeymap,
	foldService,
	toggleFold,
	unfoldAll,
} from "@codemirror/language"
import {
	Annotation,
	Compartment,
	EditorSelection,
	EditorState,
	type Range,
	StateEffect,
	Transaction,
} from "@codemirror/state"
import {
	Decoration,
	type DecorationSet,
	EditorView,
	keymap,
	ViewPlugin,
	type ViewUpdate,
} from "@codemirror/view"
import { memo, useEffect, useRef, useState } from "react"
import { resolveOrgPrefixKey } from "@/flows/org-command/org-prefix-keymap"
import type { OrgTodoNoteRequest, OrgTodoNoteResult } from "@/flows/org-command/org-todo-note"
import {
	createOrgWindowEffectRegistry,
	type OrgBufferWindowHandle,
} from "@/flows/org-editor-runtime"
import {
	changeOrgHeadingLevelAt,
	formatOrgLocalTimestamp,
	insertOrgTimestampAt,
	moveOrgSubtreeAt,
	type OrgTextEdit,
	orgFileLinkAt,
	orgLinkTargetAt,
	parseOrgTodoKeywords,
	planOrgTodoTransition,
	toggleOrgCheckboxAt,
} from "@/pipes/org"
import { parseOrgSparseTreeQuery } from "@/pipes/org/org-sparse-tree.pipe"
import type { OrgPrefixSession } from "@/types/editor/org-keymap.interface"
import type { OrgEditorCommandTarget, OrgEditorProps } from "./org-editor.types"
import { orgHeadingFoldRange } from "./org-fold.pipe"
import { editorOffsetFromSource } from "./org-source-offset.pipe"
import { safeOrgSparseBoundaryChange } from "./org-sparse-boundary.pipe"
import {
	allowOrgSparseTreeSourceTransaction,
	clearOrgSparseTree,
	createOrgSparseBatchController,
	createOrgSparseHistoryController,
	orgSparseTreeField,
	setOrgSparseTree,
} from "./org-sparse-tree.extension"
import { OrgTodoNote } from "./org-todo-note.view.fn"

let nextWindowId = 0

const externalValueUpdate = Annotation.define<boolean>()

const localDate = (): string => {
	const now = new Date()
	const year = now.getFullYear()
	const month = String(now.getMonth() + 1).padStart(2, "0")
	const day = String(now.getDate()).padStart(2, "0")
	return `${year}-${month}-${day}`
}

const lineSeparatorFor = (content: string): string => {
	if (content.includes("\r\n")) {
		return "\r\n"
	}
	return content.includes("\r") ? "\r" : "\n"
}

type OrgEditFactory = (content: string, cursor: number) => OrgTextEdit | null

const sourceOffsetFromEditor = (view: EditorView, position: number): number => {
	const line = view.state.doc.lineAt(position)
	return position + (line.number - 1) * (view.state.lineBreak.length - 1)
}

const applySourceEdit = (view: EditorView, createEdit: OrgEditFactory, exact = false): boolean => {
	if (view.state.readOnly) {
		return false
	}
	const source = view.state.sliceDoc()
	const edit = createEdit(source, sourceOffsetFromEditor(view, view.state.selection.main.head))
	if (!edit) {
		return false
	}
	const normalizedInsert = exact
		? edit.insert
		: edit.insert.replace(/\r\n|\r|\n/g, view.state.lineBreak)
	const nextSource = source.slice(0, edit.from) + normalizedInsert + source.slice(edit.to)
	view.dispatch({
		changes: {
			from: editorOffsetFromSource(source, edit.from, view.state.lineBreak),
			insert: normalizedInsert,
			to: editorOffsetFromSource(source, edit.to, view.state.lineBreak),
		},
		scrollIntoView: true,
		selection: {
			anchor: editorOffsetFromSource(nextSource, edit.cursor, view.state.lineBreak),
		},
	})
	return view.state.sliceDoc() === nextSource
}

const orgListItem = (
	text: string,
): { readonly content: string; readonly prefix: string } | null => {
	const item = /^(\s*)(?:(- |\+ |\* )|(\d+)([.)])\s+)(\[[ X-]\]\s+)?(.*)$/i.exec(text)
	if (!item || (item[2] === "* " && item[1].length === 0)) {
		return null
	}
	const marker = item[2] ?? `${Number(item[3]) + 1}${item[4]} `
	return {
		content: item[6] ?? "",
		prefix: `${item[1]}${marker}${item[5] ? "[ ] " : ""}`,
	}
}

const insertOrgMetaItem = (view: EditorView): boolean => {
	if (view.state.readOnly) {
		return false
	}
	const head = view.state.selection.main.head
	const line = view.state.doc.lineAt(head)
	const heading = /^(\*+)\s+/.exec(line.text)
	const item = orgListItem(line.text)
	const prefix = heading ? `${heading[1]} ` : (item?.prefix ?? null)
	if (!prefix) {
		return false
	}
	const insert = `${view.state.lineBreak}${prefix}`
	view.dispatch({
		changes: { from: line.to, insert },
		scrollIntoView: true,
		selection: { anchor: line.to + 1 + prefix.length },
	})
	return true
}

const continueOrgList = (view: EditorView): boolean => {
	if (view.state.readOnly || !view.state.selection.main.empty) {
		return false
	}
	const head = view.state.selection.main.head
	const line = view.state.doc.lineAt(head)
	if (head !== line.to) {
		return false
	}
	const item = orgListItem(line.text)
	if (!item) {
		return false
	}
	if (!item.content.trim()) {
		view.dispatch({
			changes: { from: line.from, insert: "", to: line.to },
			selection: { anchor: line.from },
		})
		return true
	}
	const prefix = item.prefix
	const insert = `${view.state.lineBreak}${prefix}`
	view.dispatch({
		changes: { from: head, insert },
		scrollIntoView: true,
		selection: { anchor: head + 1 + prefix.length },
	})
	return true
}

const decorationsForLine = (
	line: { readonly from: number; readonly text: string },
	todoKeywords: ReadonlySet<string>,
	doneKeywords: ReadonlySet<string>,
): readonly Range<Decoration>[] => {
	const ranges: Range<Decoration>[] = []
	const candidate = /^(\*+)(\s+)(\S+)(?:\s+|$)/.exec(line.text)
	const keyword = candidate?.[3]
	const heading = /^(\*+)\s+/.exec(line.text)
	if (heading) {
		const level = Math.min(heading[1].length, 6)
		ranges.push(
			Decoration.line({ class: `cm-org-heading cm-org-heading-${level}` }).range(line.from),
		)
		if (keyword && (todoKeywords.has(keyword) || doneKeywords.has(keyword))) {
			const keywordFrom = line.from + candidate[1].length + candidate[2].length
			const stateClass = doneKeywords.has(keyword) ? "cm-org-done" : "cm-org-todo"
			ranges.push(
				Decoration.mark({ class: `cm-org-keyword ${stateClass}` }).range(
					keywordFrom,
					keywordFrom + keyword.length,
				),
			)
		}
	}
	const directive = /^#\+[A-Za-z0-9_]+:/.exec(line.text)
	if (directive) {
		ranges.push(
			Decoration.mark({ class: "cm-org-directive" }).range(
				line.from,
				line.from + directive[0].length,
			),
		)
	}
	const property = /^\s*:[A-Za-z0-9_@#%]+:/.exec(line.text)
	if (property) {
		ranges.push(
			Decoration.mark({ class: "cm-org-property" }).range(
				line.from,
				line.from + property[0].length,
			),
		)
	}
	const tags = /\s(:[^\s:]+(?::[^\s:]+)*:)\s*$/u.exec(line.text)
	if (tags?.index !== undefined) {
		const tagFrom = line.from + tags.index + tags[0].indexOf(":")
		ranges.push(Decoration.mark({ class: "cm-org-tags" }).range(tagFrom, tagFrom + tags[1].length))
	}
	return ranges
}

const decorationsForVisibleRange = (
	view: EditorView,
	from: number,
	to: number,
): readonly Range<Decoration>[] => {
	const ranges: Range<Decoration>[] = []
	const keywords = parseOrgTodoKeywords(view.state.sliceDoc())
	const todoKeywords = new Set(keywords.todo)
	const doneKeywords = new Set(keywords.done)
	let position = from
	while (position <= to) {
		const line = view.state.doc.lineAt(position)
		ranges.push(...decorationsForLine(line, todoKeywords, doneKeywords))
		if (line.to >= to) {
			break
		}
		position = line.to + 1
	}
	return ranges
}

const orgDecorations = (view: EditorView): DecorationSet =>
	Decoration.set(
		view.visibleRanges.flatMap((visible) =>
			decorationsForVisibleRange(view, visible.from, visible.to),
		),
		true,
	)

const orgHeadingFolding = foldService.of((state, lineStart) =>
	orgHeadingFoldRange(state.doc.toString(), lineStart),
)

const orgHighlightPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet

		constructor(view: EditorView) {
			this.decorations = orgDecorations(view)
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged) {
				this.decorations = orgDecorations(update.view)
			}
		}
	},
	{ decorations: (plugin) => plugin.decorations },
)

const editorTheme = EditorView.theme({
	".cm-activeLine": {
		backgroundColor: "color-mix(in srgb, var(--muted) 35%, transparent)",
	},
	".cm-content": {
		boxSizing: "border-box",
		margin: "0 auto",
		maxWidth: "820px",
		minHeight: "100%",
		padding: "2rem 2rem 6rem",
		width: "calc(100% - 2rem)",
	},
	".cm-org-directive, .cm-org-property": {
		color: "var(--muted-foreground)",
	},
	".cm-org-done": { color: "var(--muted-foreground)" },
	".cm-org-heading": {
		fontWeight: "600",
	},
	".cm-org-heading-1": { fontSize: "1.4em", fontWeight: "650" },
	".cm-org-heading-2": { fontSize: "1.22em", fontWeight: "650" },
	".cm-org-heading-3": { fontSize: "1.1em", fontWeight: "600" },
	".cm-org-keyword": {
		borderRadius: "0.2rem",
		fontWeight: "700",
		padding: "0 0.2rem",
	},
	".cm-org-sparse-match": {
		backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
	},
	".cm-org-tags": { color: "var(--primary)" },
	".cm-org-todo": { color: "var(--destructive)" },
	".cm-scroller": {
		fontFamily:
			"var(--font-editor, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)",
		fontSize: "var(--editor-font-size, 15px)",
		lineHeight: "var(--editor-line-height, 1.6)",
		overflow: "auto",
	},
	"&": {
		height: "100%",
		width: "100%",
	},
	"&.cm-focused": {
		outline: "none",
	},
})

/**
 * A controlled CodeMirror editor for raw Org text.
 *
 * This deliberately installs no Markdown, HTML, or rich-text extension. The
 * document passed to onChange is exactly CodeMirror's plain string document.
 */
export const OrgEditor = memo(function OrgEditor({
	runtime,
	windowId,
	sessionKey,
	sessionCache,
	initialCursor = 0,
	value,
	onChange,
	onSave,
	todoClock = () => formatOrgLocalTimestamp(new Date()),
	onTodoRejected,
	onTodoNoteRequest,
	getTodoNotePermit,
	onCommandTarget,
	onPrefixChange,
	prefixContextKey,
	prefixTimeoutMs = null,
	documentPath,
	onOpenFileLink,
	onOpenOrgLink,
	onRefileSubtree,
	onArchiveSubtree,
	onEditTags,
	onSchedule,
	onDeadline,
	onSetProperty,
	onSparseTree,
	onCursorChange,
	revealTarget,
	readOnly = false,
	ariaLabel = "Org document editor",
}: OrgEditorProps) {
	const initialRuntimeRef = useRef(runtime ?? null)
	const windowIdRef = useRef(windowId ?? `org-editor:${++nextWindowId}`)
	const runtimeHandleRef = useRef<OrgBufferWindowHandle | null>(null)
	const effectRegistryRef = useRef(createOrgWindowEffectRegistry())
	const initialCursorRef = useRef(
		Number.isInteger(initialCursor) ? Math.max(0, Math.min(value.length, initialCursor)) : 0,
	)
	const hostRef = useRef<HTMLDivElement>(null)
	const viewRef = useRef<EditorView | null>(null)
	const cancelScrollRestoreRef = useRef<() => void>(() => {})
	const onChangeRef = useRef(onChange)
	const onSaveRef = useRef(onSave)
	const [todoMessage, setTodoMessage] = useState<string | null>(null)
	const [todoNote, setTodoNote] = useState<OrgTodoNoteRequest | null>(null)
	const onTodoNoteRequestRef = useRef(onTodoNoteRequest)
	const getTodoNotePermitRef = useRef(getTodoNotePermit)
	const noteRequestRef = useRef<OrgTodoNoteRequest | null>(null)
	const noteRequestIdRef = useRef(0)
	const localNoteOwnerRef = useRef<{
		request: OrgTodoNoteRequest
		editor: EditorView
		target: OrgEditorCommandTarget | null
	} | null>(null)
	const localRevisionRef = useRef(0)
	const noteContextRef = useRef({
		documentPath,
		prefixContextKey,
		readOnly,
		runtime,
		sessionKey,
		windowId,
	})
	const todoClockRef = useRef(todoClock)
	const onTodoRejectedRef = useRef(onTodoRejected)
	const commandTargetRef = useRef<OrgEditorCommandTarget | null>(null)
	const onCommandTargetRef = useRef(onCommandTarget)
	const onPrefixChangeRef = useRef(onPrefixChange)
	const prefixTimeoutRef = useRef(prefixTimeoutMs)
	const clearPrefixRef = useRef<() => void>(() => {})
	const onOpenFileLinkRef = useRef(onOpenFileLink)
	const onOpenOrgLinkRef = useRef(onOpenOrgLink)
	const onRefileSubtreeRef = useRef(onRefileSubtree)
	const onArchiveSubtreeRef = useRef(onArchiveSubtree)
	const onEditTagsRef = useRef(onEditTags)
	const onScheduleRef = useRef(onSchedule)
	const onDeadlineRef = useRef(onDeadline)
	const onSetPropertyRef = useRef(onSetProperty)
	const onSparseTreeRef = useRef(onSparseTree)
	const onCursorChangeRef = useRef(onCursorChange)
	const documentPathRef = useRef(documentPath)
	const initialSessionRef = useRef({ sessionCache, sessionKey })
	const initialValueRef = useRef(value)
	const initialReadOnlyRef = useRef(readOnly)
	const initialAriaLabelRef = useRef(ariaLabel)
	const readOnlyCompartmentRef = useRef(new Compartment())
	const accessibilityCompartmentRef = useRef(new Compartment())
	const lineSeparatorCompartmentRef = useRef(new Compartment())

	onChangeRef.current = onChange
	onSaveRef.current = onSave
	todoClockRef.current = todoClock
	onTodoRejectedRef.current = onTodoRejected
	onTodoNoteRequestRef.current = onTodoNoteRequest
	getTodoNotePermitRef.current = getTodoNotePermit
	const previousNoteContext = noteContextRef.current
	if (
		previousNoteContext.runtime !== runtime ||
		previousNoteContext.windowId !== windowId ||
		previousNoteContext.sessionKey !== sessionKey ||
		previousNoteContext.documentPath !== documentPath ||
		previousNoteContext.prefixContextKey !== prefixContextKey ||
		previousNoteContext.readOnly !== readOnly
	) {
		noteContextRef.current = {
			documentPath,
			prefixContextKey,
			readOnly,
			runtime,
			sessionKey,
			windowId,
		}
	}
	onCommandTargetRef.current = onCommandTarget
	onPrefixChangeRef.current = onPrefixChange
	prefixTimeoutRef.current = prefixTimeoutMs
	onOpenFileLinkRef.current = onOpenFileLink
	onOpenOrgLinkRef.current = onOpenOrgLink
	onRefileSubtreeRef.current = onRefileSubtree
	onArchiveSubtreeRef.current = onArchiveSubtree
	onEditTagsRef.current = onEditTags
	onScheduleRef.current = onSchedule
	onDeadlineRef.current = onDeadline
	onSetPropertyRef.current = onSetProperty
	onSparseTreeRef.current = onSparseTree
	onCursorChangeRef.current = onCursorChange
	documentPathRef.current = documentPath

	useEffect(() => {
		const host = hostRef.current
		if (!host) {
			return
		}

		const bufferRuntime = initialRuntimeRef.current
		const readOnlyCompartment = readOnlyCompartmentRef.current
		const accessibilityCompartment = accessibilityCompartmentRef.current
		const lineSeparatorCompartment = lineSeparatorCompartmentRef.current
		const effectRegistry = createOrgWindowEffectRegistry(
			[readOnlyCompartment, accessibilityCompartment],
			[setOrgSparseTree, clearOrgSparseTree],
		)
		effectRegistryRef.current = effectRegistry
		const applyOrgEdit = (view: EditorView, edit: OrgEditFactory) =>
			applySourceEdit(view, edit, bufferRuntime !== null)
		const batchController = createOrgSparseBatchController(() => viewRef.current)
		const transitionTodo = (editor: EditorView): boolean => {
			if (editor.state.readOnly || noteRequestRef.current) return true
			const source = editor.state.sliceDoc()
			const context = noteContextRef.current
			const handle = runtimeHandleRef.current
			const revision = bufferRuntime?.revision ?? localRevisionRef.current
			// Runtime installation (including null-origin normal commits) is not Root authority.
			const permit = getTodoNotePermitRef.current?.() ?? (() => !bufferRuntime)
			const cursor = sourceOffsetFromEditor(editor, editor.state.selection.main.head)
			let stamp: string
			try {
				stamp = todoClockRef.current()
			} catch {
				setTodoMessage("Invalid local TODO timestamp.")
				onTodoRejectedRef.current?.("invalid-timestamp")
				return true
			}
			const plan = planOrgTodoTransition(source, cursor, stamp)
			if (plan.kind === "needs-note") {
				if (
					!permit() ||
					noteContextRef.current !== context ||
					runtimeHandleRef.current !== handle ||
					editor.state.readOnly ||
					editor.state.sliceDoc() !== source ||
					(bufferRuntime && (bufferRuntime.closed || !handle || bufferRuntime.source !== source)) ||
					(bufferRuntime?.revision ?? localRevisionRef.current) !== revision
				) {
					setTodoMessage("Cannot change TODO state: stale-note-request.")
					return true
				}
				const target = commandTargetRef.current
				let active = true
				const validate = (): OrgTodoNoteResult => {
					if (
						!active ||
						!permit() ||
						noteRequestRef.current !== request ||
						viewRef.current !== editor ||
						commandTargetRef.current !== target ||
						runtimeHandleRef.current !== handle ||
						noteContextRef.current !== context ||
						editor.state.readOnly ||
						editor.state.sliceDoc() !== source ||
						(bufferRuntime &&
							(bufferRuntime.closed || !handle || bufferRuntime.source !== source)) ||
						(bufferRuntime?.revision ?? localRevisionRef.current) !== revision
					)
						return { kind: "rejected", reason: "stale-note-request" }
					return { kind: "ready" }
				}
				const request: OrgTodoNoteRequest = {
					abort: () => {
						active = false
						if (noteRequestRef.current === request) noteRequestRef.current = null
					},
					execute: (note) => {
						const validity = validate()
						if (validity.kind === "rejected") return validity
						let finishStamp: string
						try {
							finishStamp = todoClockRef.current()
						} catch {
							return { kind: "rejected", reason: "invalid-timestamp" }
						}
						// The injected clock is an effect boundary and may synchronously revoke authority.
						const afterClock = validate()
						if (afterClock.kind === "rejected") return afterClock
						const finished = planOrgTodoTransition(source, cursor, finishStamp, note)
						if (finished.kind !== "edit")
							return {
								kind: "rejected",
								reason: finished.kind === "rejected" ? finished.reason : finished.kind,
							}
						let nextSource = source
						for (const edit of [...finished.edits].sort((a, b) => b.from - a.from)) {
							const insert = bufferRuntime
								? edit.insert
								: edit.insert.replace(/\r\n|\r|\n/g, editor.state.lineBreak)
							nextSource = nextSource.slice(0, edit.from) + insert + nextSource.slice(edit.to)
						}
						let applied = false
						try {
							applied =
								target?.applyEdits?.(source, {
									changes: finished.edits,
									cursor: finished.edits[0].cursor,
									requiredVisibleRanges: finished.edits.map(({ from, to }) => ({ from, to })),
								}) ?? false
						} catch {
							// Publication callbacks may throw after the canonical commit succeeded.
						}
						applied =
							applied ||
							((bufferRuntime?.source ?? editor.state.sliceDoc()) === nextSource &&
								(bufferRuntime?.revision ?? localRevisionRef.current) > revision)
						if (!applied) return { kind: "rejected", reason: "commit-refused" }
						request.abort()
						return { kind: "applied" }
					},
					validate,
				}
				noteRequestRef.current = request
				noteRequestIdRef.current++
				setTodoMessage(null)
				if (onTodoNoteRequestRef.current) onTodoNoteRequestRef.current(request)
				else {
					localNoteOwnerRef.current = { request, editor, target }
					setTodoNote(request)
				}
				return true
			}
			setTodoMessage(
				plan.kind === "rejected"
					? plan.reason === "needs-note"
						? "This TODO transition requires a note; the state was not changed."
						: `Cannot change TODO state: ${plan.reason}.`
					: null,
			)
			if (plan.kind === "rejected") onTodoRejectedRef.current?.(plan.reason)
			if (plan.kind === "edit") {
				const applied = commandTargetRef.current?.applyEdits?.(source, {
					changes: plan.edits,
					cursor: plan.edits[0].cursor,
					requiredVisibleRanges: plan.edits.map(({ from, to }) => ({ from, to })),
				})
				if (!applied) {
					setTodoMessage("TODO change was refused; reveal the affected text and retry.")
					onTodoRejectedRef.current?.("commit-refused")
				}
			}
			return true
		}
		const standaloneHistory = createOrgSparseHistoryController(
			() => viewRef.current,
			effectRegistry.knownEffect,
		)
		const routeHistory = (isRedo: boolean) => {
			if (viewRef.current?.state.readOnly) {
				return true
			}
			const handle = runtimeHandleRef.current
			if (!handle) {
				throw new Error("Org runtime window is not attached")
			}
			if (isRedo) {
				handle.redo()
			} else {
				handle.undo()
			}
			return true
		}
		let prefix: OrgPrefixSession | null = null
		let prefixId = 0
		let prefixTimer: ReturnType<typeof setTimeout> | null = null
		const publishPrefix = (next: OrgPrefixSession | null) => {
			if (prefix === next) {
				return
			}
			if (prefixTimer !== null) {
				clearTimeout(prefixTimer)
			}
			prefixTimer = null
			prefix = next
			onPrefixChangeRef.current?.(next)
			if (next && next.expiresAt !== null) {
				prefixTimer = setTimeout(
					() => {
						if (prefix === next) {
							publishPrefix(null)
						}
					},
					Math.max(0, next.expiresAt - Date.now()),
				)
			}
		}
		clearPrefixRef.current = () => publishPrefix(null)
		const onWindowBlur = () => publishPrefix(null)
		window.addEventListener("blur", onWindowBlur)
		// Rebuild every view-bound extension before attaching a cached state. In
		// particular, cached listeners/compartments must never revive old refs.
		const extensions = [
			batchController.extension,
			...(bufferRuntime
				? [bufferRuntime.historyFreeSourceExtensions]
				: [
						history(),
						lineSeparatorCompartment.of(
							EditorState.lineSeparator.of(lineSeparatorFor(initialValueRef.current)),
						),
					]),
			EditorState.allowMultipleSelections.of(true),
			orgHighlightPlugin,
			orgSparseTreeField,
			orgHeadingFolding,
			foldGutter(),
			EditorView.lineWrapping,
			EditorView.domEventHandlers({
				beforeinput: (event) => {
					if (
						!bufferRuntime ||
						(event.inputType !== "historyUndo" && event.inputType !== "historyRedo")
					) {
						return false
					}
					event.preventDefault()
					publishPrefix(null)
					return routeHistory(event.inputType === "historyRedo")
				},
				blur: () => {
					publishPrefix(null)
					return false
				},
				compositionstart: () => {
					publishPrefix(null)
					return false
				},
				keydown: (event, editor) => {
					// These guards must also fence the later CodeMirror shortcut keymap.
					const todoShortcut = event.altKey && event.shiftKey && event.key.toLowerCase() === "t"
					if (
						todoShortcut &&
						(event.repeat || event.isComposing || event.keyCode === 229 || event.defaultPrevented)
					)
						return true
					if (event.repeat && (prefix || (event.ctrlKey && event.key.toLowerCase() === "c")))
						return true
					const routed = resolveOrgPrefixKey(
						prefix,
						{
							altKey: event.altKey,
							ctrlKey: event.ctrlKey,
							defaultPrevented: event.defaultPrevented,
							isComposing: event.isComposing,
							key: event.key,
							keyCode: event.keyCode,
							metaKey: event.metaKey,
							shiftKey: event.shiftKey,
						},
						Date.now(),
						editor.state.selection.main.empty,
						prefixId + 1,
						prefixTimeoutRef.current,
					)
					if (routed.session && routed.session !== prefix) {
						prefixId = routed.session.id
					}
					publishPrefix(routed.session)
					if (!routed.consumed) {
						return false
					}
					event.preventDefault()
					const command = routed.commandId
					if (!command) {
						return true
					}
					const cursor = sourceOffsetFromEditor(editor, editor.state.selection.main.head)
					if (command === "todo") {
						if (!event.repeat) transitionTodo(editor)
					} else if (command === "checkbox") {
						applyOrgEdit(editor, toggleOrgCheckboxAt)
					} else if (command === "link") {
						if (!documentPathRef.current) {
							return true
						}
						const content = editor.state.sliceDoc()
						const orgTarget = orgLinkTargetAt(content, cursor, documentPathRef.current)
						if (orgTarget && onOpenOrgLinkRef.current) {
							onOpenOrgLinkRef.current(orgTarget)
						} else {
							const fileTarget = orgFileLinkAt(content, cursor, documentPathRef.current)
							if (fileTarget) {
								onOpenFileLinkRef.current?.(fileTarget)
							}
						}
					} else if (command === "timestamp-active" || command === "timestamp-inactive") {
						applyOrgEdit(editor, (content, position) =>
							insertOrgTimestampAt(content, position, localDate(), command === "timestamp-active"),
						)
					} else if (command === "sparse-tree") {
						onSparseTreeRef.current?.(cursor)
					} else if (!editor.state.readOnly) {
						const callbacks = {
							archive: onArchiveSubtreeRef.current,
							deadline: onDeadlineRef.current,
							property: onSetPropertyRef.current,
							refile: onRefileSubtreeRef.current,
							scheduled: onScheduleRef.current,
							tags: onEditTagsRef.current,
						}
						callbacks[command]?.(cursor)
					}
					return true
				},
				// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: modifier, position, typed-link, and compatibility checks form one event transaction.
				mousedown: (event, editor) => {
					publishPrefix(null)
					if (
						event.button !== 0 ||
						(!event.metaKey && !event.ctrlKey) ||
						!documentPathRef.current
					) {
						return false
					}
					const position = editor.posAtCoords({ x: event.clientX, y: event.clientY })
					if (position === null) {
						return false
					}
					const content = editor.state.sliceDoc()
					const sourcePosition = sourceOffsetFromEditor(editor, position)
					const orgTarget = orgLinkTargetAt(content, sourcePosition, documentPathRef.current)
					if (orgTarget && onOpenOrgLinkRef.current) {
						event.preventDefault()
						onOpenOrgLinkRef.current(orgTarget)
						return true
					}
					const fileTarget = orgFileLinkAt(content, sourcePosition, documentPathRef.current)
					if (!fileTarget || !onOpenFileLinkRef.current) {
						return false
					}
					event.preventDefault()
					onOpenFileLinkRef.current(fileTarget)
					return true
				},
			}),
			keymap.of([
				...(bufferRuntime
					? [
							{ key: "Mod-z", preventDefault: true, run: () => routeHistory(false) },
							{ key: "Mod-Shift-z", preventDefault: true, run: () => routeHistory(true) },
							{ key: "Mod-y", preventDefault: true, run: () => routeHistory(true) },
							{ key: "Ctrl-y", preventDefault: true, run: () => routeHistory(true) },
							{ key: "Ctrl-Shift-z", preventDefault: true, run: () => routeHistory(true) },
							{ key: "Alt-u", preventDefault: true, run: () => routeHistory(true) },
							{ key: "Mod-u", preventDefault: true, run: () => routeHistory(false) },
							{ key: "Mod-Shift-u", preventDefault: true, run: () => routeHistory(true) },
						]
					: []),
				{
					key: "Tab",
					run: (editor) => {
						const line = editor.state.doc.lineAt(editor.state.selection.main.head)
						if (/^\*+\s/.test(line.text)) {
							toggleFold(editor)
							return true
						}
						return indentMore(editor)
					},
				},
				{
					key: "Shift-Tab",
					preventDefault: true,
					run: (editor) => {
						let hasFoldedRange = false
						foldedRanges(editor.state).between(0, editor.state.doc.length, () => {
							hasFoldedRange = true
						})
						if (hasFoldedRange) {
							unfoldAll(editor)
						} else {
							foldAll(editor)
						}
						return true
					},
				},
				{
					key: "Alt-Enter",
					preventDefault: true,
					run: insertOrgMetaItem,
				},
				{
					key: "Enter",
					run: continueOrgList,
				},
				{
					key: "Alt-ArrowLeft",
					run: (editor) =>
						applyOrgEdit(editor, (content, cursor) => changeOrgHeadingLevelAt(content, cursor, -1)),
				},
				{
					key: "Alt-ArrowRight",
					run: (editor) =>
						applyOrgEdit(editor, (content, cursor) => changeOrgHeadingLevelAt(content, cursor, 1)),
				},
				{
					key: "Alt-ArrowUp",
					run: (editor) =>
						applyOrgEdit(editor, (content, cursor) => moveOrgSubtreeAt(content, cursor, -1)),
				},
				{
					key: "Alt-ArrowDown",
					run: (editor) =>
						applyOrgEdit(editor, (content, cursor) => moveOrgSubtreeAt(content, cursor, 1)),
				},
				{
					key: "Alt-Shift-t",
					preventDefault: true,
					run: transitionTodo,
				},
				{
					key: "Mod-Shift-x",
					run: (editor) => applyOrgEdit(editor, toggleOrgCheckboxAt),
				},
				{
					key: "Mod-Shift-r",
					preventDefault: true,
					run: (editor) => {
						if (editor.state.readOnly || !onRefileSubtreeRef.current) {
							return false
						}
						onRefileSubtreeRef.current(
							sourceOffsetFromEditor(editor, editor.state.selection.main.head),
						)
						return true
					},
				},
				{
					key: "Mod-Alt-a",
					preventDefault: true,
					run: (editor) => {
						if (editor.state.readOnly || !onArchiveSubtreeRef.current) {
							return false
						}
						onArchiveSubtreeRef.current(
							sourceOffsetFromEditor(editor, editor.state.selection.main.head),
						)
						return true
					},
				},
				{
					key: "Mod-s",
					preventDefault: true,
					run: () => {
						onSaveRef.current()
						return true
					},
				},
				...foldKeymap,
				...defaultKeymap,
			]),
			...(bufferRuntime ? [] : [standaloneHistory.extension]),
			readOnlyCompartment.of([
				EditorState.readOnly.of(initialReadOnlyRef.current),
				EditorView.editable.of(!initialReadOnlyRef.current),
			]),
			accessibilityCompartment.of(
				EditorView.contentAttributes.of({
					"aria-label": initialAriaLabelRef.current,
					"aria-multiline": "true",
				}),
			),
			EditorView.updateListener.of((update) => {
				if (update.docChanged) localRevisionRef.current++
				const isExternalUpdate = update.transactions.some(
					(transaction) => transaction.annotation(externalValueUpdate) === true,
				)
				if (!bufferRuntime && update.docChanged && !isExternalUpdate) {
					onChangeRef.current(update.state.sliceDoc())
				}
				if (update.selectionSet || update.docChanged) {
					onCursorChangeRef.current?.(
						sourceOffsetFromEditor(update.view, update.state.selection.main.head),
					)
				}
			}),
			editorTheme,
		]
		const { sessionKey: key, sessionCache: cache } = initialSessionRef.current
		const cached = key !== undefined ? cache?.get(key) : undefined
		const source = bufferRuntime?.source ?? initialValueRef.current
		const oldSource = cached?.state.sliceDoc()
		// The caller scopes this cache key to a registered grant + logical buffer
		// and prunes old grants. Incoming source remains the only writer: a parked
		// state may project an append, never an unknown replacement or new policy.
		const snapshot =
			cached &&
			(!bufferRuntime ||
				cached.runtimeOwner === bufferRuntime ||
				(cached.runtimeOwner === undefined && cached.windowState === undefined)) &&
			oldSource !== undefined &&
			cached.state.lineBreak === lineSeparatorFor(oldSource) &&
			lineSeparatorFor(oldSource) === lineSeparatorFor(source) &&
			source.startsWith(oldSource)
				? cached
				: undefined
		let restoredState = snapshot?.state
		if (bufferRuntime && restoredState) {
			// update() executes extenders even with filter:false. Never migrate an
			// append on cached extensions: transfer only public history/source policy.
			const legacyHistory = restoredState.field(historyField, false)
			restoredState = EditorState.create({
				doc: restoredState.doc,
				extensions: [
					EditorState.allowMultipleSelections.of(true),
					EditorState.lineSeparator.of(restoredState.lineBreak),
					...(legacyHistory === undefined ? [] : [historyField.init(() => legacyHistory)]),
				],
				selection: restoredState.selection,
			})
		}
		if (restoredState && oldSource !== undefined && oldSource !== source) {
			const changes = restoredState.changes({
				from: restoredState.doc.length,
				insert: source.slice(oldSource.length),
			})
			restoredState = restoredState.update({
				annotations: [externalValueUpdate.of(true), Transaction.addToHistory.of(false)],
				changes,
				filter: false,
				selection: restoredState.selection.map(changes, -1),
			}).state
		}
		// Only a pristine canonical runtime may import legacy history. Stale parked
		// snapshots must never roll back an existing undo or redo branch.
		if (
			bufferRuntime &&
			bufferRuntime.revision === 0 &&
			restoredState &&
			undoDepth(bufferRuntime.state) === 0 &&
			redoDepth(bufferRuntime.state) === 0
		) {
			bufferRuntime.adoptLegacyState(restoredState)
		}
		const localState = snapshot?.windowState ?? (bufferRuntime ? snapshot?.state : restoredState)
		if (!bufferRuntime && restoredState && snapshot?.windowState) {
			restoredState = restoredState.update({ selection: snapshot.windowState.selection }).state
		}
		const state = bufferRuntime
			? EditorState.create({
					doc: bufferRuntime.state.doc,
					extensions,
					selection:
						localState?.selection ??
						EditorSelection.cursor(
							editorOffsetFromSource(
								bufferRuntime.source,
								Math.min(initialCursorRef.current, bufferRuntime.source.length),
								bufferRuntime.state.lineBreak,
							),
						),
				})
			: restoredState
				? restoredState.update({ effects: StateEffect.reconfigure.of(extensions) }).state
				: EditorState.create({
						doc: initialValueRef.current,
						extensions,
						selection: {
							anchor: editorOffsetFromSource(
								initialValueRef.current,
								initialCursorRef.current,
								lineSeparatorFor(initialValueRef.current),
							),
						},
					})
		const view = new EditorView({
			parent: host,
			// Sparse presentation is transient, never revived from a parked session.
			state: state.update({ effects: clearOrgSparseTree.of(null) }).state,
			...(bufferRuntime
				? {
						dispatchTransactions: (transactions: readonly Transaction[]) => {
							const handle = runtimeHandleRef.current
							if (!handle) {
								throw new Error("Org runtime window is not attached")
							}
							handle.dispatchTransactions(transactions)
						},
					}
				: {
						dispatchTransactions: (transactions: readonly Transaction[], localView: EditorView) => {
							standaloneHistory.dispatch(transactions, localView)
						},
					}),
		})
		if (bufferRuntime) {
			runtimeHandleRef.current = bufferRuntime.attachWindow({
				knownLocalEffects: [EditorView.announce],
				knownReconfigure: effectRegistry.knownEffect,
				preflightSourceTransaction: (tr) =>
					allowOrgSparseTreeSourceTransaction(tr, effectRegistry.knownEffect),
				view,
				windowId: windowIdRef.current,
			})
		}
		if (localState && (bufferRuntime || snapshot?.windowState)) {
			const effects: StateEffect<unknown>[] = []
			foldedRanges(localState).between(0, localState.doc.length, (from, to) => {
				if (to <= view.state.doc.length) {
					effects.push(foldEffect.of({ from, to }))
				}
			})
			if (effects.length) {
				view.dispatch({ effects })
			}
		}
		let scrollFrame: number | null = null
		const cancelScrollRestore = () => {
			if (scrollFrame !== null) {
				window.cancelAnimationFrame(scrollFrame)
			}
			scrollFrame = null
		}
		cancelScrollRestoreRef.current = cancelScrollRestore
		for (const event of ["scroll", "wheel", "touchstart", "pointerdown", "keydown"]) {
			view.scrollDOM.addEventListener(event, cancelScrollRestore, { passive: true })
		}
		if (snapshot) {
			scrollFrame = window.requestAnimationFrame(() => {
				scrollFrame = null
				if (viewRef.current !== view) {
					return
				}
				view.scrollDOM.scrollTop = snapshot.scrollTop
				view.scrollDOM.scrollLeft = snapshot.scrollLeft
			})
		}

		onCursorChangeRef.current?.(sourceOffsetFromEditor(view, view.state.selection.main.head))
		viewRef.current = view
		const commandTarget: OrgEditorCommandTarget = {
			applyEdit: (expectedSource, edit) => {
				if (
					viewRef.current !== view ||
					view.state.readOnly ||
					view.state.sliceDoc() !== expectedSource
				) {
					return false
				}
				if (
					!Number.isInteger(edit.from) ||
					!Number.isInteger(edit.to) ||
					!Number.isInteger(edit.cursor) ||
					edit.from < 0 ||
					edit.to < edit.from ||
					edit.to > expectedSource.length
				) {
					return false
				}
				const insert = bufferRuntime
					? edit.insert
					: edit.insert.replace(/\r\n|\r|\n/g, view.state.lineBreak)
				const nextSource =
					expectedSource.slice(0, edit.from) + insert + expectedSource.slice(edit.to)
				if (edit.cursor < 0 || edit.cursor > nextSource.length) {
					return false
				}
				view.dispatch({
					annotations: isolateHistory.of("full"),
					changes: {
						from: editorOffsetFromSource(expectedSource, edit.from, view.state.lineBreak),
						insert,
						to: editorOffsetFromSource(expectedSource, edit.to, view.state.lineBreak),
					},
					scrollIntoView: true,
					selection: {
						anchor: editorOffsetFromSource(nextSource, edit.cursor, view.state.lineBreak),
					},
				})
				return view.state.sliceDoc() === nextSource
			},
			applyEdits: (expectedSource, batch) => {
				if (
					(bufferRuntime &&
						(bufferRuntime.closed ||
							!runtimeHandleRef.current ||
							bufferRuntime.source !== expectedSource)) ||
					viewRef.current !== view ||
					view.state.readOnly ||
					view.state.sliceDoc() !== expectedSource
				)
					return false
				const validOffset = (source: string, position: number) =>
					Number.isInteger(position) &&
					position >= 0 &&
					position <= source.length &&
					!(source[position - 1] === "\r" && source[position] === "\n")
				const validRange = (range: { readonly from: number; readonly to: number }) =>
					range !== null &&
					typeof range === "object" &&
					validOffset(expectedSource, range.from) &&
					validOffset(expectedSource, range.to) &&
					range.to >= range.from
				if (
					!batch ||
					!Array.isArray(batch.changes) ||
					!batch.changes.every(
						(change) => validRange(change) && typeof change.insert === "string",
					) ||
					(batch.requiredVisibleRanges !== undefined &&
						!Array.isArray(batch.requiredVisibleRanges)) ||
					!(batch.requiredVisibleRanges ?? []).every(validRange)
				)
					return false
				const changes = [...batch.changes].sort((a, b) => a.from - b.from || a.to - b.to)
				if (
					changes.some(
						(change, index) =>
							index > 0 &&
							(change.from < changes[index - 1].to || change.from === changes[index - 1].from),
					)
				)
					return false
				const sparse = view.state.field(orgSparseTreeField)
				if (
					sparse &&
					(batch.requiredVisibleRanges ?? []).some(({ from, to }) => {
						const start = editorOffsetFromSource(expectedSource, from, view.state.lineBreak)
						const end = editorOffsetFromSource(expectedSource, to, view.state.lineBreak)
						return sparse.hiddenRanges.some((hidden) =>
							start === end
								? start >= hidden.from && start < hidden.to
								: start < hidden.to && end > hidden.from,
						)
					})
				)
					return false
				if (!changes.length) return validOffset(expectedSource, batch.cursor)
				const normalized = changes.map((change) => ({
					...change,
					insert: bufferRuntime
						? change.insert
						: change.insert.replace(/\r\n|\r|\n/g, view.state.lineBreak),
				}))
				// Owned subtree deletion and separator replacement must preserve the hidden boundary.
				if (
					sparse &&
					normalized.some(({ from, to, insert }) =>
						sparse.hiddenRanges.some((hidden) => {
							const end = editorOffsetFromSource(expectedSource, to, view.state.lineBreak)
							if (end !== hidden.from || from === to) return false
							return !safeOrgSparseBoundaryChange(expectedSource, from, to, insert)
						}),
					)
				)
					return false
				let nextSource = expectedSource
				for (const change of [...normalized].reverse())
					nextSource =
						nextSource.slice(0, change.from) + change.insert + nextSource.slice(change.to)
				if (!validOffset(nextSource, batch.cursor)) return false
				return batchController.run(() => {
					view.dispatch({
						annotations: isolateHistory.of("full"),
						changes: normalized.map(({ from, to, insert }) => ({
							from: editorOffsetFromSource(expectedSource, from, view.state.lineBreak),
							insert,
							to: editorOffsetFromSource(expectedSource, to, view.state.lineBreak),
						})),
						scrollIntoView: true,
						selection: {
							anchor: editorOffsetFromSource(nextSource, batch.cursor, view.state.lineBreak),
						},
					})
					return (
						view.state.sliceDoc() === nextSource &&
						view.state.selection.main.head ===
							editorOffsetFromSource(nextSource, batch.cursor, view.state.lineBreak)
					)
				})
			},
			applyView: (expectedSource, operation) => {
				if (
					viewRef.current !== view ||
					view.state.sliceDoc() !== expectedSource ||
					operation.kind !== "sparse-tree"
				) {
					return false
				}
				const active = view.state.field(orgSparseTreeField)
				if (operation.query === null) {
					view.dispatch({
						annotations: Transaction.addToHistory.of(false),
						effects: effectRegistry.localEffect(clearOrgSparseTree.of(null)),
						...(active?.restoreSelection
							? { scrollIntoView: true, selection: active.restoreSelection }
							: {}),
					})
					return true
				}
				const query = parseOrgSparseTreeQuery(operation.query)
				if (!query) {
					return false
				}
				view.dispatch({
					annotations: Transaction.addToHistory.of(false),
					effects: effectRegistry.localEffect(
						setOrgSparseTree.of({
							query,
							restoreSelection: active ? active.restoreSelection : view.state.selection,
						}),
					),
				})
				return true
			},
			restoreFocus: () => {
				if (viewRef.current === view) {
					view.focus()
				}
			},
		}
		commandTargetRef.current = commandTarget
		onCommandTargetRef.current?.(commandTarget)
		return () => {
			noteRequestRef.current?.abort()
			commandTargetRef.current = null
			cancelScrollRestore()
			cancelScrollRestoreRef.current = () => {}
			for (const event of ["scroll", "wheel", "touchstart", "pointerdown", "keydown"]) {
				view.scrollDOM.removeEventListener(event, cancelScrollRestore)
			}
			if (key !== undefined && cache) {
				cache.set(key, {
					...snapshot,
					runtimeOwner: bufferRuntime ?? undefined,
					scrollLeft: view.scrollDOM.scrollLeft,
					scrollTop: view.scrollDOM.scrollTop,
					source: bufferRuntime?.source ?? view.state.sliceDoc(),
					state: bufferRuntime?.state ?? view.state,
					windowState: bufferRuntime ? view.state : undefined,
				})
			}
			window.removeEventListener("blur", onWindowBlur)
			publishPrefix(null)
			if (prefixTimer !== null) {
				clearTimeout(prefixTimer)
			}
			clearPrefixRef.current = () => {}
			onCommandTargetRef.current?.(null)
			viewRef.current = null
			runtimeHandleRef.current?.detach()
			runtimeHandleRef.current = null
			view.destroy()
		}
	}, [])

	// biome-ignore lint/correctness/useExhaustiveDependencies: context changes invalidate the window-local prefix session.
	useEffect(() => {
		clearPrefixRef.current()
	}, [documentPath, prefixContextKey, readOnly, prefixTimeoutMs])

	useEffect(() => {
		const view = viewRef.current
		if (initialRuntimeRef.current || !view || view.state.sliceDoc() === value) {
			return
		}

		clearPrefixRef.current()
		cancelScrollRestoreRef.current()
		const before = view.state.sliceDoc()
		const separator = lineSeparatorFor(value)
		const annotations = [externalValueUpdate.of(true), Transaction.addToHistory.of(false)]
		if (lineSeparatorFor(before) === separator) {
			let from = 0
			while (from < before.length && from < value.length && before[from] === value[from]) {
				from++
			}
			// A CodeMirror position cannot address the middle of a CRLF separator.
			if (
				separator === "\r\n" &&
				(before.slice(from - 1, from + 1) === "\r\n" || value.slice(from - 1, from + 1) === "\r\n")
			) {
				from--
			}
			let to = before.length
			let nextTo = value.length
			while (to > from && nextTo > from && before[to - 1] === value[nextTo - 1]) {
				to--
				nextTo--
			}
			if (
				separator === "\r\n" &&
				(before.slice(to - 1, to + 1) === "\r\n" || value.slice(nextTo - 1, nextTo + 1) === "\r\n")
			) {
				to++
				nextTo++
			}
			const changes = view.state.changes({
				from: editorOffsetFromSource(before, from, separator),
				insert: value.slice(from, nextTo),
				to: editorOffsetFromSource(before, to, separator),
			})
			view.update([
				view.state.update({
					annotations,
					changes,
					filter: false,
					selection: view.state.selection.map(changes, -1),
				}),
			])
		} else {
			const selection = view.state.selection
			const ranges = selection.ranges.map((range) => ({
				anchor: sourceOffsetFromEditor(view, range.anchor),
				head: sourceOffsetFromEditor(view, range.head),
			}))
			// Reconfigure first: replacement parsing uses the transaction's starting policy.
			view.dispatch({
				effects: lineSeparatorCompartmentRef.current.reconfigure(
					EditorState.lineSeparator.of(separator),
				),
			})
			const changes = view.state.changes({ from: 0, insert: value, to: view.state.doc.length })
			const position = (raw: number) =>
				Math.min(
					changes.newLength,
					editorOffsetFromSource(value, Math.min(raw, value.length), separator),
				)
			view.update([
				view.state.update({
					annotations,
					changes,
					filter: false,
					selection: EditorSelection.create(
						ranges.map((range) =>
							EditorSelection.range(position(range.anchor), position(range.head)),
						),
						selection.mainIndex,
					),
				}),
			])
		}
	}, [value])

	useEffect(() => {
		const view = viewRef.current
		if (!view || !revealTarget) {
			return
		}
		clearPrefixRef.current()
		cancelScrollRestoreRef.current()
		const lineNumber = Math.max(1, Math.min(revealTarget.line, view.state.doc.lines))
		const line = view.state.doc.line(lineNumber)
		view.dispatch({ scrollIntoView: true, selection: { anchor: line.from } })
		view.focus()
	}, [revealTarget])

	useEffect(() => {
		const view = viewRef.current
		if (!view) {
			return
		}

		view.dispatch({
			effects: effectRegistryRef.current.reconfigure(readOnlyCompartmentRef.current, [
				EditorState.readOnly.of(readOnly),
				EditorView.editable.of(!readOnly),
			]),
		})
	}, [readOnly])

	useEffect(() => {
		const view = viewRef.current
		if (!view) {
			return
		}

		view.dispatch({
			effects: effectRegistryRef.current.reconfigure(
				accessibilityCompartmentRef.current,
				EditorView.contentAttributes.of({
					"aria-label": ariaLabel,
					"aria-multiline": "true",
				}),
			),
		})
	}, [ariaLabel])

	return (
		<div className="flex h-full min-h-0 w-full flex-col">
			{todoMessage && (
				<div role="status" className="shrink-0 px-3 py-1 text-sm">
					{todoMessage}
				</div>
			)}
			{todoNote && (
				<OrgTodoNote
					key={noteRequestIdRef.current}
					request={todoNote}
					onClose={(host) => {
						const owner = localNoteOwnerRef.current
						if (owner?.request !== todoNote) return
						const restore =
							host?.isConnected &&
							host.contains(document.activeElement) &&
							viewRef.current === owner.editor &&
							commandTargetRef.current === owner.target
						localNoteOwnerRef.current = null
						setTodoNote(null)
						if (restore) owner.target?.restoreFocus()
					}}
				/>
			)}
			<div ref={hostRef} className="min-h-0 w-full flex-1" />
		</div>
	)
})
