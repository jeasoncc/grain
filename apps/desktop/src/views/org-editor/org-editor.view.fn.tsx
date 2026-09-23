import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { foldGutter, foldKeymap, foldService } from "@codemirror/language"
import { Annotation, Compartment, EditorState, type Range, Transaction } from "@codemirror/state"
import {
	Decoration,
	type DecorationSet,
	EditorView,
	keymap,
	ViewPlugin,
	type ViewUpdate,
} from "@codemirror/view"
import { memo, useEffect, useRef } from "react"
import {
	changeOrgHeadingLevelAt,
	cycleOrgTodoAt,
	moveOrgSubtreeAt,
	type OrgTextEdit,
	orgFileLinkAt,
	orgLinkTargetAt,
	toggleOrgCheckboxAt,
} from "@/pipes/org"
import type { OrgEditorProps } from "./org-editor.types"
import { orgHeadingFoldRange } from "./org-fold.pipe"

const externalValueUpdate = Annotation.define<boolean>()

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
	const source = view.state.doc.toString()
	const edit = createEdit(source, sourceOffsetFromEditor(view, view.state.selection.main.head))
	if (!edit) {
		return false
	}
	view.dispatch({
		changes: {
			from: editorOffsetFromSource(source, edit.from, view.state.lineBreak),
			insert: edit.insert.replace(/\r\n|\r|\n/g, view.state.lineBreak),
			to: editorOffsetFromSource(source, edit.to, view.state.lineBreak),
		},
		scrollIntoView: true,
		selection: {
			anchor: editorOffsetFromSource(source, edit.cursor, view.state.lineBreak),
		},
	})
	return true
}

const decorationsForLine = (line: {
	readonly from: number
	readonly text: string
}): readonly Range<Decoration>[] => {
	const ranges: Range<Decoration>[] = []
	const heading = /^(\*+)\s+(?:(TODO|DONE)\s+)?/.exec(line.text)
	if (heading) {
		const level = Math.min(heading[1].length, 6)
		ranges.push(
			Decoration.line({ class: `cm-org-heading cm-org-heading-${level}` }).range(line.from),
		)
		if (heading[2]) {
			const keywordFrom = line.from + heading[1].length + 1
			ranges.push(
				Decoration.mark({ class: `cm-org-keyword cm-org-${heading[2].toLowerCase()}` }).range(
					keywordFrom,
					keywordFrom + heading[2].length,
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
	const tags = /\s(:[\p{L}\p{N}_@#%:]+:)\s*$/u.exec(line.text)
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
	let position = from
	while (position <= to) {
		const line = view.state.doc.lineAt(position)
		ranges.push(...decorationsForLine(line))
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
	".cm-content": {
		minHeight: "100%",
		padding: "1.25rem",
	},
	".cm-focused": {
		outline: "none",
	},
	".cm-org-directive, .cm-org-property": {
		color: "var(--muted-foreground)",
	},
	".cm-org-done": { color: "var(--muted-foreground)" },
	".cm-org-heading": {
		fontWeight: "600",
	},
	".cm-org-heading-1": { fontSize: "1.35em" },
	".cm-org-heading-2": { fontSize: "1.2em" },
	".cm-org-heading-3": { fontSize: "1.1em" },
	".cm-org-keyword": {
		borderRadius: "0.2rem",
		fontWeight: "700",
		padding: "0 0.2rem",
	},
	".cm-org-tags": { color: "var(--primary)" },
	".cm-org-todo": { color: "var(--destructive)" },
	".cm-scroller": {
		fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
		lineHeight: "1.5rem",
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
	value,
	onChange,
	onSave,
	documentPath,
	onOpenFileLink,
	onOpenOrgLink,
	onRefileSubtree,
	onArchiveSubtree,
	onCursorChange,
	revealTarget,
	readOnly = false,
	ariaLabel = "Org document editor",
}: OrgEditorProps) {
	const hostRef = useRef<HTMLDivElement>(null)
	const viewRef = useRef<EditorView | null>(null)
	const onChangeRef = useRef(onChange)
	const onSaveRef = useRef(onSave)
	const onOpenFileLinkRef = useRef(onOpenFileLink)
	const onOpenOrgLinkRef = useRef(onOpenOrgLink)
	const onRefileSubtreeRef = useRef(onRefileSubtree)
	const onArchiveSubtreeRef = useRef(onArchiveSubtree)
	const onCursorChangeRef = useRef(onCursorChange)
	const documentPathRef = useRef(documentPath)
	const initialValueRef = useRef(value)
	const initialReadOnlyRef = useRef(readOnly)
	const initialAriaLabelRef = useRef(ariaLabel)
	const readOnlyCompartmentRef = useRef(new Compartment())
	const accessibilityCompartmentRef = useRef(new Compartment())
	const lineSeparatorCompartmentRef = useRef(new Compartment())

	onChangeRef.current = onChange
	onSaveRef.current = onSave
	onOpenFileLinkRef.current = onOpenFileLink
	onOpenOrgLinkRef.current = onOpenOrgLink
	onRefileSubtreeRef.current = onRefileSubtree
	onArchiveSubtreeRef.current = onArchiveSubtree
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
		const view = new EditorView({
			parent: host,
			state: EditorState.create({
				doc: initialValueRef.current,
				extensions: [
					history(),
					lineSeparatorCompartment.of(
						EditorState.lineSeparator.of(lineSeparatorFor(initialValueRef.current)),
					),
					orgHighlightPlugin,
					orgHeadingFolding,
					foldGutter(),
					EditorView.lineWrapping,
					EditorView.domEventHandlers({
						// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: modifier, position, typed-link, and compatibility checks form one event transaction.
						mousedown: (event, editor) => {
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
							const content = editor.state.doc.toString()
							const orgTarget = orgLinkTargetAt(content, position, documentPathRef.current)
							if (orgTarget && onOpenOrgLinkRef.current) {
								event.preventDefault()
								onOpenOrgLinkRef.current(orgTarget)
								return true
							}
							const fileTarget = orgFileLinkAt(content, position, documentPathRef.current)
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
							key: "Alt-ArrowLeft",
							run: (editor) =>
								applyOrgEdit(editor, (content, cursor) =>
									changeOrgHeadingLevelAt(content, cursor, -1),
								),
						},
						{
							key: "Alt-ArrowRight",
							run: (editor) =>
								applyOrgEdit(editor, (content, cursor) =>
									changeOrgHeadingLevelAt(content, cursor, 1),
								),
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
				],
			}),
		})

		onCursorChangeRef.current?.(sourceOffsetFromEditor(view, view.state.selection.main.head))
		viewRef.current = view
		return () => {
			viewRef.current = null
			view.destroy()
		}
	}, [])

	useEffect(() => {
		const view = viewRef.current
		if (!view || view.state.sliceDoc() === value) {
			return
		}

		// Reconfigure first so CodeMirror parses the replacement with its own separator policy.
		// Combining this effect with the change would parse using the previous policy.
		view.dispatch({
			effects: lineSeparatorCompartmentRef.current.reconfigure(
				EditorState.lineSeparator.of(lineSeparatorFor(value)),
			),
		})
		view.dispatch({
			annotations: [externalValueUpdate.of(true), Transaction.addToHistory.of(false)],
			changes: { from: 0, insert: value, to: view.state.doc.length },
		})
	}, [value])

	useEffect(() => {
		const view = viewRef.current
		if (!view || !revealTarget) {
			return
		}
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
