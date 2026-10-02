import {
	defaultKeymap,
	history,
	historyKeymap,
	indentMore,
	isolateHistory,
} from "@codemirror/commands"
import {
	foldAll,
	foldGutter,
	foldKeymap,
	foldedRanges,
	foldService,
	toggleFold,
	unfoldAll,
} from "@codemirror/language"
import {
	Annotation,
	Compartment,
	EditorState,
	EditorSelection,
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
import { memo, useEffect, useRef } from "react"
import { resolveOrgPrefixKey } from "@/flows/org-command/org-prefix-keymap"
import type { OrgPrefixSession } from "@/types/editor/org-keymap.interface"
import {
	changeOrgHeadingLevelAt,
	cycleOrgTodoAt,
	insertOrgTimestampAt,
	moveOrgSubtreeAt,
	parseOrgTodoKeywords,
	type OrgTextEdit,
	orgFileLinkAt,
	orgLinkTargetAt,
	toggleOrgCheckboxAt,
} from "@/pipes/org"
import type { OrgEditorProps } from "./org-editor.types"
import { orgHeadingFoldRange } from "./org-fold.pipe"

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

const editorOffsetFromSource = (source: string, position: number, lineBreak: string): number => {
	if (lineBreak.length === 1) {
		return position
	}
	const completeBreaks = source.slice(0, position).match(/\r\n/g)?.length ?? 0
	return position - completeBreaks * (lineBreak.length - 1)
}

const applyOrgEdit = (view: EditorView, createEdit: OrgEditFactory): boolean => {
	if (view.state.readOnly) {
		return false
	}
	const source = view.state.sliceDoc()
	const edit = createEdit(source, sourceOffsetFromEditor(view, view.state.selection.main.head))
	if (!edit) {
		return false
	}
	const normalizedInsert = edit.insert.replace(/\r\n|\r|\n/g, view.state.lineBreak)
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
	return true
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
		selection: { anchor: line.to + 1 + prefix.length },
		scrollIntoView: true,
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
		selection: { anchor: head + 1 + prefix.length },
		scrollIntoView: true,
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
	"&.cm-focused": {
		outline: "none",
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
})

/**
 * A controlled CodeMirror editor for raw Org text.
 *
 * This deliberately installs no Markdown, HTML, or rich-text extension. The
 * document passed to onChange is exactly CodeMirror's plain string document.
 */
export const OrgEditor = memo(function OrgEditor({
	sessionKey,
	sessionCache,
	initialCursor = 0,
	value,
	onChange,
	onSave,
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
	onCursorChange,
	revealTarget,
	readOnly = false,
	ariaLabel = "Org document editor",
}: OrgEditorProps) {
	const initialCursorRef = useRef(
		Number.isInteger(initialCursor) ? Math.max(0, Math.min(value.length, initialCursor)) : 0,
	)
	const hostRef = useRef<HTMLDivElement>(null)
	const viewRef = useRef<EditorView | null>(null)
	const cancelScrollRestoreRef = useRef<() => void>(() => {})
	const onChangeRef = useRef(onChange)
	const onSaveRef = useRef(onSave)
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
	const onCursorChangeRef = useRef(onCursorChange)
	const documentPathRef = useRef(documentPath)
	const initialSessionRef = useRef({ sessionKey, sessionCache })
	const initialValueRef = useRef(value)
	const initialReadOnlyRef = useRef(readOnly)
	const initialAriaLabelRef = useRef(ariaLabel)
	const readOnlyCompartmentRef = useRef(new Compartment())
	const accessibilityCompartmentRef = useRef(new Compartment())
	const lineSeparatorCompartmentRef = useRef(new Compartment())

	onChangeRef.current = onChange
	onSaveRef.current = onSave
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
	onCursorChangeRef.current = onCursorChange
	documentPathRef.current = documentPath

	useEffect(() => {
		const host = hostRef.current
		if (!host) {
			return
		}

		const readOnlyCompartment = readOnlyCompartmentRef.current
		const accessibilityCompartment = accessibilityCompartmentRef.current
		const lineSeparatorCompartment = lineSeparatorCompartmentRef.current
		let prefix: OrgPrefixSession | null = null
		let prefixId = 0
		let prefixTimer: ReturnType<typeof setTimeout> | null = null
		const publishPrefix = (next: OrgPrefixSession | null) => {
			if (prefix === next) return
			if (prefixTimer !== null) clearTimeout(prefixTimer)
			prefixTimer = null
			prefix = next
			onPrefixChangeRef.current?.(next)
			if (next && next.expiresAt !== null)
				prefixTimer = setTimeout(
					() => {
						if (prefix === next) publishPrefix(null)
					},
					Math.max(0, next.expiresAt - Date.now()),
				)
		}
		clearPrefixRef.current = () => publishPrefix(null)
		const onWindowBlur = () => publishPrefix(null)
		window.addEventListener("blur", onWindowBlur)
		// Rebuild every view-bound extension before attaching a cached state. In
		// particular, cached listeners/compartments must never revive old refs.
		const extensions = [
			history(),
			lineSeparatorCompartment.of(
				EditorState.lineSeparator.of(lineSeparatorFor(initialValueRef.current)),
			),
			orgHighlightPlugin,
			orgHeadingFolding,
			foldGutter(),
			EditorView.lineWrapping,
			EditorView.domEventHandlers({
				keydown: (event, editor) => {
					const routed = resolveOrgPrefixKey(
						prefix,
						{
							key: event.key,
							ctrlKey: event.ctrlKey,
							metaKey: event.metaKey,
							altKey: event.altKey,
							shiftKey: event.shiftKey,
							isComposing: event.isComposing,
							keyCode: event.keyCode,
							defaultPrevented: event.defaultPrevented,
						},
						Date.now(),
						editor.state.selection.main.empty,
						prefixId + 1,
						prefixTimeoutRef.current,
					)
					if (routed.session && routed.session !== prefix) prefixId = routed.session.id
					publishPrefix(routed.session)
					if (!routed.consumed) return false
					event.preventDefault()
					const command = routed.commandId
					if (!command) return true
					const cursor = sourceOffsetFromEditor(editor, editor.state.selection.main.head)
					if (command === "todo") applyOrgEdit(editor, cycleOrgTodoAt)
					else if (command === "checkbox") applyOrgEdit(editor, toggleOrgCheckboxAt)
					else if (command === "link") {
						if (!documentPathRef.current) return true
						const content = editor.state.sliceDoc()
						const orgTarget = orgLinkTargetAt(content, cursor, documentPathRef.current)
						if (orgTarget && onOpenOrgLinkRef.current) onOpenOrgLinkRef.current(orgTarget)
						else {
							const fileTarget = orgFileLinkAt(content, cursor, documentPathRef.current)
							if (fileTarget) onOpenFileLinkRef.current?.(fileTarget)
						}
					} else if (command === "timestamp-active" || command === "timestamp-inactive") {
						applyOrgEdit(editor, (content, position) =>
							insertOrgTimestampAt(content, position, localDate(), command === "timestamp-active"),
						)
					} else if (!editor.state.readOnly) {
						const callbacks = {
							tags: onEditTagsRef.current,
							scheduled: onScheduleRef.current,
							deadline: onDeadlineRef.current,
							property: onSetPropertyRef.current,
							refile: onRefileSubtreeRef.current,
							archive: onArchiveSubtreeRef.current,
						}
						callbacks[command]?.(cursor)
					}
					return true
				},
				blur: () => {
					publishPrefix(null)
					return false
				},
				compositionstart: () => {
					publishPrefix(null)
					return false
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
						if (hasFoldedRange) unfoldAll(editor)
						else foldAll(editor)
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
					run: (editor) => applyOrgEdit(editor, cycleOrgTodoAt),
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
				...historyKeymap,
			]),
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
				const isExternalUpdate = update.transactions.some(
					(transaction) => transaction.annotation(externalValueUpdate) === true,
				)
				if (update.docChanged && !isExternalUpdate) {
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
		const source = initialValueRef.current
		const oldSource = cached?.state.sliceDoc()
		// The caller scopes this cache key to a registered grant + logical buffer
		// and prunes old grants. Incoming source remains the only writer: a parked
		// state may project an append, never an unknown replacement or new policy.
		const snapshot =
			cached &&
			oldSource !== undefined &&
			cached.state.lineBreak === lineSeparatorFor(oldSource) &&
			lineSeparatorFor(oldSource) === lineSeparatorFor(source) &&
			source.startsWith(oldSource)
				? cached
				: undefined
		let restoredState = snapshot?.state
		if (restoredState && oldSource !== undefined && oldSource !== source) {
			const changes = restoredState.changes({
				from: restoredState.doc.length,
				insert: source.slice(oldSource.length),
			})
			restoredState = restoredState.update({
				annotations: [externalValueUpdate.of(true), Transaction.addToHistory.of(false)],
				changes,
				selection: restoredState.selection.map(changes, -1),
			}).state
		}
		const state = restoredState
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
		const view = new EditorView({ parent: host, state })
		let scrollFrame: number | null = null
		const cancelScrollRestore = () => {
			if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame)
			scrollFrame = null
		}
		cancelScrollRestoreRef.current = cancelScrollRestore
		for (const event of ["scroll", "wheel", "touchstart", "pointerdown", "keydown"]) {
			view.scrollDOM.addEventListener(event, cancelScrollRestore, { passive: true })
		}
		if (snapshot) {
			scrollFrame = window.requestAnimationFrame(() => {
				scrollFrame = null
				if (viewRef.current !== view) return
				view.scrollDOM.scrollTop = snapshot.scrollTop
				view.scrollDOM.scrollLeft = snapshot.scrollLeft
			})
		}

		onCursorChangeRef.current?.(sourceOffsetFromEditor(view, view.state.selection.main.head))
		viewRef.current = view
		onCommandTargetRef.current?.({
			applyEdit: (expectedSource, edit) => {
				if (
					viewRef.current !== view ||
					view.state.readOnly ||
					view.state.sliceDoc() !== expectedSource
				)
					return false
				if (
					!Number.isInteger(edit.from) ||
					!Number.isInteger(edit.to) ||
					!Number.isInteger(edit.cursor) ||
					edit.from < 0 ||
					edit.to < edit.from ||
					edit.to > expectedSource.length
				)
					return false
				const insert = edit.insert.replace(/\r\n|\r|\n/g, view.state.lineBreak)
				const nextSource =
					expectedSource.slice(0, edit.from) + insert + expectedSource.slice(edit.to)
				if (edit.cursor < 0 || edit.cursor > nextSource.length) return false
				view.dispatch({
					annotations: isolateHistory.of("full"),
					changes: {
						from: editorOffsetFromSource(expectedSource, edit.from, view.state.lineBreak),
						to: editorOffsetFromSource(expectedSource, edit.to, view.state.lineBreak),
						insert,
					},
					selection: {
						anchor: editorOffsetFromSource(nextSource, edit.cursor, view.state.lineBreak),
					},
					scrollIntoView: true,
				})
				return true
			},
			restoreFocus: () => {
				if (viewRef.current === view) view.focus()
			},
		})
		return () => {
			cancelScrollRestore()
			cancelScrollRestoreRef.current = () => {}
			for (const event of ["scroll", "wheel", "touchstart", "pointerdown", "keydown"]) {
				view.scrollDOM.removeEventListener(event, cancelScrollRestore)
			}
			if (key !== undefined && cache) {
				cache.set(key, {
					state: view.state,
					scrollTop: view.scrollDOM.scrollTop,
					scrollLeft: view.scrollDOM.scrollLeft,
				})
			}
			window.removeEventListener("blur", onWindowBlur)
			publishPrefix(null)
			if (prefixTimer !== null) clearTimeout(prefixTimer)
			clearPrefixRef.current = () => {}
			onCommandTargetRef.current?.(null)
			viewRef.current = null
			view.destroy()
		}
	}, [])

	useEffect(() => {
		clearPrefixRef.current()
	}, [documentPath, prefixContextKey, readOnly, prefixTimeoutMs])

	useEffect(() => {
		const view = viewRef.current
		if (!view || view.state.sliceDoc() === value) {
			return
		}

		clearPrefixRef.current()
		cancelScrollRestoreRef.current()
		const before = view.state.sliceDoc()
		const separator = lineSeparatorFor(value)
		const annotations = [externalValueUpdate.of(true), Transaction.addToHistory.of(false)]
		if (lineSeparatorFor(before) === separator) {
			let from = 0
			while (from < before.length && from < value.length && before[from] === value[from]) from++
			// A CodeMirror position cannot address the middle of a CRLF separator.
			if (
				separator === "\r\n" &&
				(before.slice(from - 1, from + 1) === "\r\n" || value.slice(from - 1, from + 1) === "\r\n")
			)
				from--
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
				to: editorOffsetFromSource(before, to, separator),
				insert: value.slice(from, nextTo),
			})
			view.dispatch({ annotations, changes, selection: view.state.selection.map(changes, -1) })
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
			view.dispatch({
				annotations,
				changes,
				selection: EditorSelection.create(
					ranges.map((range) =>
						EditorSelection.range(position(range.anchor), position(range.head)),
					),
					selection.mainIndex,
				),
			})
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
			effects: readOnlyCompartmentRef.current.reconfigure([
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
			effects: accessibilityCompartmentRef.current.reconfigure(
				EditorView.contentAttributes.of({
					"aria-label": ariaLabel,
					"aria-multiline": "true",
				}),
			),
		})
	}, [ariaLabel])

	return <div ref={hostRef} className="h-full min-h-0 w-full" />
})
