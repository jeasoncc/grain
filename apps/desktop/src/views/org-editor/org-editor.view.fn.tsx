import { useOrgModalMinibuffer } from "@/hooks/use-org-modal-minibuffer"
import { orgTableCommandDefinitions } from "@/flows/org-command/org-table.command"
import { planOrgTableEdit, planOrgTableNavigation } from "@/pipes/org/org-table.pipe"
import { structuralOrgSourceLines } from "@/pipes/org/org-text.pipe"
import type { OrgNativeEditorProjectionHandle } from "@/flows/org-native-window/org-native-editor-projection.types"
import { orgCompositionHistory } from "@/flows/org-editor-runtime/org-composition-history"
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
	Facet,
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
	type KeyBinding,
    drawSelection,
} from "@codemirror/view"
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react"
import * as E from "fp-ts/Either"
import { claimOrgInputEvent, isOrgRepeatedKeyEvent, orgInputIsProtected, retainOrgInputKeys, resolveOrgInput } from "@/flows/org-command/org-prefix-keymap"
import { dispatchOrgCommand, isOrgCommandId, type OrgCommandEditorContext, type OrgCommandId } from "@/flows/org-command/org-workspace-command"
import { getOrgInputConfiguration, useOrgInputConfiguration, type OrgInputConfigurationSnapshot } from "@/hooks/use-org-input-configuration"
import { createOrgModalAdapter, type OrgModalAdapter } from "@/flows/org-modal"
import { useSettings } from "@/hooks/use-settings"
import { parseOrgBehaviorConfiguration } from "@/pipes/org/org-behavior-configuration.pipe"
import { extractOrgSubtreeAt } from "@/pipes/org/org-subtree-refile.pipe"
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
	type OrgTextEditBatch,
	orgFileLinkAt,
	orgLinkTargetAt,
	parseOrgTodoKeywords,
	planOrgTodoTransition,
	toggleOrgCheckboxAt,
} from "@/pipes/org"
import { orgSparseTreeSpecialPropertyRequest, parseOrgSparseTreeQuery } from "@/pipes/org/org-sparse-tree.pipe"
import { prepareOrgSparseTreeContext } from "@/flows/org-command/org-sparse-tree-context"
import type { OrgPrefixSession } from "@/types/editor/org-keymap.interface"
import type { OrgEditorCommandTarget, OrgEditorProps } from "./org-editor.types"
import { createOrgHeadingFoldLookup } from "./org-fold.pipe"
import { editorOffsetFromSource } from "./org-source-offset.pipe"
import { safeOrgSparseBoundaryChange } from "./org-sparse-boundary.pipe"
import {
	allowOrgSparseTreeSourceTransaction,
	clearOrgSparseTree,
	createOrgSparseBatchController,
	createOrgSparseHistoryController,
	orgSparseTreeField,
	orgSparseTreeNativeContextRefresh,
	setOrgSparseTree,
} from "./org-sparse-tree.extension"
import { OrgTodoNote } from "./org-todo-note.view.fn"
import {
	allowOrgRemarkNoteSourceTransaction,
	createOrgRemarkExtension,
	orgRemarkNoteRangeField,
	setOrgRemarkNoteRange,
	setOrgRemarkSnapshot,
} from "./org-remark.extension"


const orgInputConfiguration = Facet.define<OrgInputConfigurationSnapshot, OrgInputConfigurationSnapshot | null>({
	combine: (values) => values[values.length - 1] ?? null,
})
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

const orgHeadingFolding = () => {
	// Retain only the current immutable document, not an index for every history state.
	let document: EditorState["doc"] | null = null
	let lookup: ReturnType<typeof createOrgHeadingFoldLookup> | null = null
	return foldService.of((state, lineStart) => {
		if (!lookup || document !== state.doc) {
			document = state.doc
			lookup = createOrgHeadingFoldLookup(document.toString())
		}
		return lookup(lineStart)
	})
}

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
		padding: "1.75rem clamp(1rem, 4%, 2rem) 5rem",
		width: "100%",
	},
	".cm-gutters": {
		backgroundColor: "var(--background)",
		borderRight: "1px solid color-mix(in srgb, var(--border) 60%, transparent)",
		color: "var(--muted-foreground)",
	},
	".cm-activeLineGutter": {
		backgroundColor: "color-mix(in srgb, var(--muted) 35%, transparent)",
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

type ModalSourceOrigin = { readonly isCurrent: () => boolean; readonly restore: () => void }

/**
 * A controlled CodeMirror editor for raw Org text.
 *
 * This deliberately installs no Markdown, HTML, or rich-text extension. The
 * document passed to onChange is exactly CodeMirror's plain string document.
 */
export const OrgEditor = memo(function OrgEditor({
	runtime,
	nativeProjection,
	windowId,
	sessionKey,
	sessionCache,
	initialCursor = 0,
	value,
	onChange,
	onSave,
	captureSave,
	todoClock = () => formatOrgLocalTimestamp(new Date()),
	onTodoRejected,
	onTodoNoteRequest,
	getTodoNotePermit,
	onCommandTarget,
	onCommand,
	onPrefixChange,
	prefixContextKey,
	prefixTimeoutMs,
	inputAdapter,
	inputScope = "org-source",
	onInputCommand,
	documentPath,
	documentFilename = null,
	captureClockContext,
	onOpenFileLink,
	onOpenOrgLink,
	onRefileSubtree,
	onArchiveSubtree,
	onEditTags,
	onSchedule,
	onDeadline,
	onSetProperty,
	onSparseTree,
	onClearSparseTree,
	onCursorChange,
	revealTarget,
	remarkSnapshot,
	visibleSourceRange,
	readOnly = false,
	getEditPermission,
	ariaLabel = "Org document editor",
}: OrgEditorProps) {
	const inputConfiguration = useOrgInputConfiguration()
	useLayoutEffect(() => retainOrgInputKeys(window), [])
	const inputConfigurationRef = useRef(inputConfiguration)
	const inputGenerationChanged = inputConfigurationRef.current.generation !== inputConfiguration.generation
	inputConfigurationRef.current = inputConfiguration
	const inputAdapterRef = useRef(inputAdapter)
	inputAdapterRef.current = inputAdapter
	const modalAdapterRef = useRef<OrgModalAdapter | null>(null)
	const modalBindingRef = useRef<{ owner: object; generation: object } | null>(null)
	const onInputCommandRef = useRef(onInputCommand)
	onInputCommandRef.current = onInputCommand
	const inputScopeRef = useRef(inputScope)
	const inputScopeChanged = inputScopeRef.current !== inputScope
	inputScopeRef.current = inputScope
	const initialRuntimeRef = useRef(runtime ?? null)
	const initialNativeProjectionRef = useRef(nativeProjection)
	const nativeProjectionHandleRef = useRef<OrgNativeEditorProjectionHandle | null>(null)
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
	const editPermissionRef = useRef(getEditPermission)
	const onSaveRef = useRef(onSave)
	const captureSaveRef = useRef(captureSave)
	captureSaveRef.current = captureSave
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
	const commandContextListenersRef = useRef(new Set<() => void>())
	const sparseContextIdentityRef = useRef({})
	const sparseContextOwnerRef = useRef<object | null>(null)
	const noteContextRef = useRef({
		documentPath,
		documentFilename,
		prefixContextKey,
		readOnly,
		runtime,
		sessionKey,
		windowId,
	})
	const commandOwnerRef = useRef<object>(noteContextRef.current)
	const todoClockRef = useRef(todoClock)
	const onTodoRejectedRef = useRef(onTodoRejected)
	const commandTargetRef = useRef<OrgEditorCommandTarget | null>(null)
	const onCommandTargetRef = useRef(onCommandTarget)
	const onCommandRef = useRef(onCommand)
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
	const onClearSparseTreeRef = useRef(onClearSparseTree)
	const onCursorChangeRef = useRef(onCursorChange)
	const documentPathRef = useRef(documentPath)
	const documentFilenameRef = useRef(documentFilename)
	const captureClockContextRef = useRef(captureClockContext)
	captureClockContextRef.current = captureClockContext
	const initialSessionRef = useRef({ sessionCache, sessionKey })
	const initialValueRef = useRef(value)
	const initialReadOnlyRef = useRef(readOnly)
	const initialAriaLabelRef = useRef(ariaLabel)
	const readOnlyCompartmentRef = useRef(new Compartment())
	const accessibilityCompartmentRef = useRef(new Compartment())
	const inputCompartmentRef = useRef(new Compartment())
	const modalCompartmentRef = useRef(new Compartment())
	const lineSeparatorCompartmentRef = useRef(new Compartment())

	const modalHost = useOrgModalMinibuffer({
		capture: () => {
			const editor = viewRef.current
			const target = commandTargetRef.current
			const policy = getOrgInputConfiguration()
			if (!editor || !target || policy.configuration?.modalEngine !== "vim" || inputScopeRef.current !== "org-source") return null
			const context = target.getCommandContext()
			const permit = getTodoNotePermitRef.current?.() ?? (() => !initialRuntimeRef.current)
			if (!context.available || !permit()) return null
			const handle = runtimeHandleRef.current
			const nativeHandle = nativeProjectionHandleRef.current
			const restore = target.captureFocus()
			const isCurrent = () => {
				if (viewRef.current !== editor || commandTargetRef.current !== target || !permit() ||
					runtimeHandleRef.current !== handle || nativeProjectionHandleRef.current !== nativeHandle ||
					getOrgInputConfiguration().generation !== policy.generation) return false
				const current = target.getCommandContext()
				return current.available && current.ownership === context.ownership && current.revision === context.revision && current.content === context.content
			}
			return { isCurrent, restore: () => { if (isCurrent()) restore?.() } } satisfies ModalSourceOrigin
		},
		isCurrent: (lease) => (lease as ModalSourceOrigin).isCurrent(),
		restore: (lease) => (lease as ModalSourceOrigin).restore(),
	})
	onChangeRef.current = onChange
	editPermissionRef.current = getEditPermission
	onSaveRef.current = onSave
	todoClockRef.current = todoClock
	onTodoRejectedRef.current = onTodoRejected
	onTodoNoteRequestRef.current = onTodoNoteRequest
	getTodoNotePermitRef.current = getTodoNotePermit
	const previousNoteContext = noteContextRef.current
	const commandOwnerChanged =
		previousNoteContext.runtime !== runtime ||
		previousNoteContext.windowId !== windowId ||
		previousNoteContext.sessionKey !== sessionKey ||
		previousNoteContext.documentPath !== documentPath ||
		previousNoteContext.documentFilename !== documentFilename ||
		previousNoteContext.prefixContextKey !== prefixContextKey
	if (
		commandOwnerChanged ||
		previousNoteContext.readOnly !== readOnly
	) {
		noteContextRef.current = {
			documentPath,
			documentFilename,
			prefixContextKey,
			readOnly,
			runtime,
			sessionKey,
			windowId,
		}
		if (commandOwnerChanged) commandOwnerRef.current = noteContextRef.current
	}
	if (inputGenerationChanged || inputScopeChanged) commandOwnerRef.current = {}
	onCommandTargetRef.current = onCommandTarget
	onCommandRef.current = onCommand
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
	onClearSparseTreeRef.current = onClearSparseTree
	onCursorChangeRef.current = onCursorChange
	documentPathRef.current = documentPath
	documentFilenameRef.current = documentFilename

	// Capture the viewport before React removes the scroll container from the DOM.
	useLayoutEffect(() => {
		const host = hostRef.current
		if (!host) {
			return
		}

		const bufferRuntime = initialRuntimeRef.current
		const projection = initialNativeProjectionRef.current
		const readOnlyCompartment = readOnlyCompartmentRef.current
		const accessibilityCompartment = accessibilityCompartmentRef.current
		const lineSeparatorCompartment = lineSeparatorCompartmentRef.current
		const effectRegistry = createOrgWindowEffectRegistry(
			[readOnlyCompartment, accessibilityCompartment, inputCompartmentRef.current, modalCompartmentRef.current],
			[setOrgSparseTree, clearOrgSparseTree, setOrgRemarkSnapshot, setOrgRemarkNoteRange],
		)
		effectRegistryRef.current = effectRegistry
		const knownWindowEffect = (effect: StateEffect<unknown>) =>
			effectRegistry.knownEffect(effect) || (modalAdapterRef.current?.ownsEffect(effect) ?? false)
		const applyOrgEdit = (view: EditorView, edit: OrgEditFactory) =>
			applySourceEdit(view, edit, bufferRuntime !== null || projection !== undefined)
		const batchController = createOrgSparseBatchController(() => viewRef.current)
		const captureLoggingNote: NonNullable<OrgEditorCommandTarget["captureLoggingNote"]> = () => {
			const editor = viewRef.current
			const target = commandTargetRef.current
			const context = noteContextRef.current
			const owner = commandOwnerRef.current
			const generation = getOrgInputConfiguration().generation
			const behavior = useSettings.getState().orgBehaviorConfigurationJson
			const handle = runtimeHandleRef.current
			const nativeHandle = nativeProjectionHandleRef.current
			const revision = bufferRuntime?.revision ?? localRevisionRef.current
			const permit = getTodoNotePermitRef.current?.() ?? (() => !bufferRuntime)
			if (!editor || !target || noteRequestRef.current || editor.state.readOnly || !permit() || (projection && !nativeHandle?.isCurrent())) return null
			const capturedSource = editor.state.sliceDoc()
			const scopeIsCurrent = () => permit() && viewRef.current === editor && commandTargetRef.current === target &&
				runtimeHandleRef.current === handle && noteContextRef.current === context && commandOwnerRef.current === owner &&
				getOrgInputConfiguration().generation === generation && useSettings.getState().orgBehaviorConfigurationJson === behavior &&
				!editor.state.readOnly && editor.state.sliceDoc() === capturedSource &&
				(!bufferRuntime || !bufferRuntime.closed && !!handle && bufferRuntime.source === capturedSource) &&
				(!projection || nativeProjectionHandleRef.current === nativeHandle && !!nativeHandle && nativeHandle.isCurrent()) &&
				(bufferRuntime?.revision ?? localRevisionRef.current) === revision
			return (source, label, execute, successMessage) => {
				if (source !== capturedSource || noteRequestRef.current || !scopeIsCurrent()) return false
				let active = true
				let pending = false
				const listeners = new Set<() => void>()
				const isCurrent = () => active && noteRequestRef.current === request && scopeIsCurrent()
				const validate = (): OrgTodoNoteResult => isCurrent() && !pending
					? { kind: "ready" } : { kind: "rejected", reason: "stale-note-request" }
				const request: OrgTodoNoteRequest = {
					label,
					successMessage: successMessage ?? "Org change accepted in the working copy. Save to write the file.",
					validate,
					subscribeValidation: (listener) => {
						listeners.add(listener)
						commandContextListenersRef.current.add(listener)
						return () => { listeners.delete(listener); commandContextListenersRef.current.delete(listener) }
					},
					abort: () => {
						active = false
						if (noteRequestRef.current === request) noteRequestRef.current = null
						for (const listener of listeners) listener()
					},
					execute: (note) => {
						const valid = validate()
						if (valid.kind !== "ready") return valid
						pending = true
						const settle = (result: OrgTodoNoteResult) => {
							pending = false
							if (result.kind === "applied" || result.kind === "aborted") request.abort()
							return result
						}
						try {
							const result = execute(note, isCurrent)
							return "then" in result ? result.then(settle, (cause) => settle({ kind: "rejected", reason: cause instanceof Error ? cause.message : String(cause) })) : settle(result)
						} catch (cause) {
							return settle({ kind: "rejected", reason: cause instanceof Error ? cause.message : String(cause) })
						}
					},
				}
				noteRequestRef.current = request
				noteRequestIdRef.current++
				setTodoMessage(null)
				if (onTodoNoteRequestRef.current) onTodoNoteRequestRef.current(request)
				else {
					localNoteOwnerRef.current = { request, editor, target }
					setTodoNote(request)
				}
				return active
			}
		}
		const transitionTodo = (editor: EditorView): boolean => {
			if (editor.state.readOnly || noteRequestRef.current) return true
			const source = editor.state.sliceDoc()
			const revision = bufferRuntime?.revision ?? localRevisionRef.current
			const cursor = sourceOffsetFromEditor(editor, editor.state.selection.main.head)
			const configurationIdentity = sparseContextIdentityRef.current
			const configuration = parseOrgBehaviorConfiguration(useSettings.getState().orgBehaviorConfigurationJson)
			if (E.isLeft(configuration)) {
				setTodoMessage(configuration.left.message)
				onTodoRejectedRef.current?.("invalid-configuration")
				return true
			}
			const loggingOptions = { logging: configuration.right.logging, inheritance: configuration.right.inheritance }
			const collectLoggingNote = captureLoggingNote()
			const rootPermit = getTodoNotePermitRef.current?.() ?? (() => !bufferRuntime)
			let stamp: string
			try {
				stamp = todoClockRef.current()
			} catch {
				setTodoMessage("Invalid local TODO timestamp.")
				onTodoRejectedRef.current?.("invalid-timestamp")
				return true
			}
			if (!rootPermit() || viewRef.current !== editor || sparseContextIdentityRef.current !== configurationIdentity || (bufferRuntime?.revision ?? localRevisionRef.current) !== revision) {
				setTodoMessage("The originating Source authority changed before the TODO transition.")
				return true
			}
			const plan = planOrgTodoTransition(source, cursor, stamp, undefined, loggingOptions)
			if (plan.kind === "needs-note") {
				const accepted = collectLoggingNote?.(source, "TODO note", (note, isCurrent) => {
					const perform = (): OrgTodoNoteResult => {
						if (!isCurrent()) return { kind: "rejected", reason: "stale-note-request" }
						const finished = planOrgTodoTransition(source, cursor, plan.request.stamp, note, loggingOptions)
						if (finished.kind !== "edit") return { kind: "rejected", reason: finished.kind === "rejected" ? finished.reason : finished.kind }
						let nextSource = source
						for (const edit of [...finished.edits].sort((a, b) => b.from - a.from)) {
							const insert = bufferRuntime || projection ? edit.insert : edit.insert.replace(/\r\n|\r|\n/g, editor.state.lineBreak)
							nextSource = nextSource.slice(0, edit.from) + insert + nextSource.slice(edit.to)
						}
						let applied = false
						try {
							applied = commandTargetRef.current?.applyEdits?.(source, {
								changes: finished.edits, cursor: finished.edits[0].cursor,
								requiredVisibleRanges: finished.edits.map(({ from, to }) => ({ from, to })),
							}, "preserve") ?? false
						} catch { /* A publication callback may throw after canonical acceptance. */ }
						applied ||= (bufferRuntime?.source ?? editor.state.sliceDoc()) === nextSource &&
							(bufferRuntime?.revision ?? localRevisionRef.current) > revision
						return applied ? { kind: "applied" } : { kind: "rejected", reason: "commit-refused" }
					}
					if (!projection) return perform()
					let result: OrgTodoNoteResult = { kind: "rejected", reason: "commit-refused" }
					return projection.captureSubmission(() => {
						result = perform()
						return result.kind === "applied"
					}).then((outcome) => outcome.kind === "success" ? result : { kind: "rejected", reason: outcome.message })
				}) ?? false
				if (!accepted) setTodoMessage("Cannot collect a note from this Source window.")
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
				}, "preserve")
				if (!applied) {
					setTodoMessage("TODO change was refused; reveal the affected text and retry.")
					onTodoRejectedRef.current?.("commit-refused")
				}
			}
			return true
		}
		const standaloneHistory = createOrgSparseHistoryController(
			() => viewRef.current,
			knownWindowEffect,
		)
		const routeHistory = (isRedo: boolean) => {
			if (viewRef.current?.state.readOnly) {
				return true
			}
			if (projection) {
				void nativeProjectionHandleRef.current?.requestHistory(isRedo ? "redo" : "undo")
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
		let commandSourceDoc: EditorState["doc"] | null = null
		let commandSourceSeparator: string | null = null
		let commandSource = ""
		let commandContextState: EditorState | null = null
		let commandContext: OrgCommandEditorContext | null = null
		const getCommandContext = () => {
			const editor = viewRef.current
			const state = editor?.state ?? null
			const readOnly = !state || state.readOnly || (!bufferRuntime && !projection && editPermissionRef.current?.() === false)
			const ownership = commandOwnerRef.current
			const revision = bufferRuntime?.revision ?? localRevisionRef.current
			const available = Boolean(editor && state?.facet(orgInputConfiguration)?.generation === getOrgInputConfiguration().generation &&
				(!bufferRuntime || (!bufferRuntime.closed && runtimeHandleRef.current)) &&
				(!projection || nativeProjectionHandleRef.current?.isCurrent()))
			const windowId = windowIdRef.current
			const relativePath = documentPathRef.current ?? ""
			if (commandContext && commandContextState === state && commandContext.ownership === ownership &&
				commandContext.revision === revision && commandContext.available === available &&
				commandContext.readOnly === readOnly &&
				commandContext.windowId === windowId && commandContext.relativePath === relativePath) return commandContext
			if (commandSourceDoc !== state?.doc || commandSourceSeparator !== state?.lineBreak) {
				commandSourceDoc = state?.doc ?? null
				commandSourceSeparator = state?.lineBreak ?? null
				commandSource = state
					? bufferRuntime?.state.doc === state.doc && bufferRuntime.state.lineBreak === state.lineBreak
						? bufferRuntime.source : state.sliceDoc()
					: ""
			}
			commandContextState = state
			commandContext = Object.freeze({
				ownership, revision, available, content: commandSource,
				cursor: editor ? sourceOffsetFromEditor(editor, editor.state.selection.main.head) : 0,
				selectionFrom: editor ? sourceOffsetFromEditor(editor, editor.state.selection.main.from) : 0,
				selectionTo: editor ? sourceOffsetFromEditor(editor, editor.state.selection.main.to) : 0,
				selectionRangeCount: editor?.state.selection.ranges.length ?? 0,
				windowId, readOnly, relativePath,
			})
			return commandContext
		}
		const executeCommand = (id: OrgCommandId): boolean => dispatchOrgCommand(id, {
			getContext: () => ({
				hasWorkspace: true, hasDocument: true, isDirty: id === "save", isBusy: false,
				sidebarVisible: false, inspectorVisible: false, editor: getCommandContext(),
				blockedReason: noteRequestRef.current ? "A TODO note is awaiting input" : null,
			}),
			onRejected: (_id, reason) => setTodoMessage(reason),
			execute: (command) => {
				const editor = viewRef.current
				if (!editor) return false
				const cursor = sourceOffsetFromEditor(editor, editor.state.selection.main.head)
				const tableCommand = orgTableCommandDefinitions.find((definition) => definition.id === command)
				if (tableCommand) {
					const source = editor.state.sliceDoc()
					const plan = planOrgTableEdit(source, cursor, tableCommand.operation)
					if (plan.kind === "rejected") { setTodoMessage(plan.message); return false }
					return plan.kind === "unchanged" || (commandTargetRef.current?.applyEdits?.(source, plan.batch) ?? false)
				}
				switch (command) {
					case "todo": return transitionTodo(editor)
					case "checkbox": return applyOrgEdit(editor, toggleOrgCheckboxAt)
					case "heading-promote": return applyOrgEdit(editor, (content, position) => changeOrgHeadingLevelAt(content, position, -1))
					case "heading-demote": return applyOrgEdit(editor, (content, position) => changeOrgHeadingLevelAt(content, position, 1))
					case "subtree-up": return applyOrgEdit(editor, (content, position) => moveOrgSubtreeAt(content, position, -1))
					case "subtree-down": return applyOrgEdit(editor, (content, position) => moveOrgSubtreeAt(content, position, 1))
					case "insert-item": return insertOrgMetaItem(editor)
					case "timestamp-active":
					case "timestamp-inactive":
						return applyOrgEdit(editor, (content, position) => insertOrgTimestampAt(content, position, localDate(), command === "timestamp-active"))
					case "link": {
						const path = documentPathRef.current
						if (!path) return false
						const content = editor.state.sliceDoc()
						const target = orgLinkTargetAt(content, cursor, path)
						if (target && onOpenOrgLinkRef.current) { onOpenOrgLinkRef.current(target, cursor); return true }
						const file = orgFileLinkAt(content, cursor, path)
						if (!file || !onOpenFileLinkRef.current) return false
						onOpenFileLinkRef.current(file)
						return true
					}
					case "save": onSaveRef.current(); return true
					case "narrow-to-subtree": {
						const subtree = extractOrgSubtreeAt(editor.state.sliceDoc(), cursor)
						if (!subtree) return false
						editor.dispatch({
							annotations: Transaction.addToHistory.of(false),
							effects: effectRegistry.localEffect(setOrgRemarkNoteRange.of({ from: subtree.from, to: subtree.to })),
						})
						return true
					}
					case "widen":
						editor.dispatch({
							annotations: Transaction.addToHistory.of(false),
							effects: effectRegistry.localEffect(setOrgRemarkNoteRange.of(null)),
						})
						return true
					case "toggle-fold": return toggleFold(editor)
					case "fold-all": return foldAll(editor)
					case "unfold-all": return unfoldAll(editor)
					case "cycle-folds":
						return foldedRanges(editor.state).size ? unfoldAll(editor) : foldAll(editor)
					case "clear-sparse-tree":
						if (!onClearSparseTreeRef.current) return false
						onClearSparseTreeRef.current()
						return true
					default: {
						const effects = {
							archive: onArchiveSubtreeRef.current, deadline: onDeadlineRef.current,
							property: onSetPropertyRef.current, refile: onRefileSubtreeRef.current,
							scheduled: onScheduleRef.current, tags: onEditTagsRef.current,
							"sparse-tree": onSparseTreeRef.current,
						}
						const effect = effects[command as keyof typeof effects]
						if (!effect) return false
						effect(cursor)
						return true
					}
				}
			},
		})
		const routeCommand = (id: OrgCommandId) => onCommandRef.current ? onCommandRef.current(id) : executeCommand(id)
		const onWindowBlur = () => { publishPrefix(null); inputAdapterRef.current?.cancel?.(); modalAdapterRef.current?.suspendInput() }
		window.addEventListener("blur", onWindowBlur)
		let lastRoutedKey: KeyboardEvent | null = null
		const fallbackProtected = (editor: EditorView) => editor.composing || Boolean(lastRoutedKey &&
			(lastRoutedKey.isComposing || lastRoutedKey.keyCode === 229 || lastRoutedKey.defaultPrevented ||
				lastRoutedKey.getModifierState("AltGraph") || modalAdapterRef.current?.ownsInput(lastRoutedKey.target) ||
				Boolean((lastRoutedKey.target as Element | null)?.closest?.("[data-org-parameter-session]"))))
		const navigateTable = (event: KeyboardEvent, editor: EditorView): boolean => {
			if (event.ctrlKey || event.metaKey || event.altKey || event.key !== "Tab" && event.key !== "Enter" ||
				event.key === "Enter" && event.shiftKey) return false
			const line = editor.state.doc.lineAt(editor.state.selection.main.head)
			if (!/^[ \t]*\|/.test(line.text)) return false
			const source = editor.state.sliceDoc()
			const from = sourceOffsetFromEditor(editor, line.from)
			if (!structuralOrgSourceLines(source).some((row) => row.from === from)) return false
			if (event.repeat) return true
			if (editor.state.readOnly || editor.state.selection.ranges.length !== 1 || !editor.state.selection.main.empty) return true
			const plan = planOrgTableNavigation(source, sourceOffsetFromEditor(editor, editor.state.selection.main.head),
				event.key === "Enter" ? "next-row" : event.shiftKey ? "previous-field" : "next-field")
			if (plan.kind === "rejected") { setTodoMessage(plan.message); return true }
			if (plan.kind === "unchanged") return true
			const target = commandTargetRef.current
			const visible = target?.getVisibleSourceRanges?.() ?? []
			if ((plan.batch.requiredVisibleRanges ?? []).some((range) =>
				!visible.some((part) => range.from >= part.from && range.to <= part.to))) {
				setTodoMessage("The complete table must be visible for table navigation.")
				return true
			}
			if (!target?.applyEdits?.(source, plan.batch, "cursor")) {
				setTodoMessage("Table navigation was not accepted by the current Source.")
				return true
			}
			if (!plan.batch.changes.length) target.revealSourcePosition?.(source, plan.batch.cursor)
			return true
		}
		// Rebuild every view-bound extension before attaching a cached state. In
		// particular, cached listeners/compartments must never revive old refs.
		const extensions = [
			batchController.extension,
			...(bufferRuntime
				? [bufferRuntime.historyFreeSourceExtensions]
				: projection
					? [projection.historyFreeExtensions]
					: [
							history(),
							lineSeparatorCompartment.of(
								EditorState.lineSeparator.of(lineSeparatorFor(initialValueRef.current)),
							),
						]),
			EditorState.allowMultipleSelections.of(true),
			drawSelection(),
			inputCompartmentRef.current.of(orgInputConfiguration.of(inputConfigurationRef.current)),
			modalCompartmentRef.current.of([]),
			...(bufferRuntime || projection ? [orgCompositionHistory((editor) =>
				viewRef.current === editor && (bufferRuntime
					? !bufferRuntime.closed && runtimeHandleRef.current !== null
					: nativeProjectionHandleRef.current?.isCurrent() === true))] : []),
			orgHighlightPlugin,
			orgSparseTreeField,
			orgSparseTreeNativeContextRefresh({
				isCurrent: (editor) => viewRef.current === editor && getCommandContext().available === true,
				contextIdentity: () => {
					if (sparseContextOwnerRef.current !== commandOwnerRef.current) {
						sparseContextOwnerRef.current = commandOwnerRef.current
						sparseContextIdentityRef.current = {}
					}
					return sparseContextIdentityRef.current
				},
				source: () => getCommandContext().content,
				read: (source, query, signal) => prepareOrgSparseTreeContext(source, query, documentFilenameRef.current, signal,
					captureClockContextRef.current?.(source, documentFilenameRef.current)),
				issue: (effect) => effectRegistry.localEffect(effect),
			}),
			createOrgRemarkExtension(knownWindowEffect),
			orgHeadingFolding(),
			foldGutter(),
			EditorView.lineWrapping,
			EditorView.domEventHandlers({
				beforeinput: (event) => {
					if (
						(!bufferRuntime && !projection) ||
						(event.inputType !== "historyUndo" && event.inputType !== "historyRedo")
					) {
						return false
					}
					event.preventDefault()
					publishPrefix(null)
					return routeHistory(event.inputType === "historyRedo")
				},
				blur: (event) => {
					publishPrefix(null)
					inputAdapterRef.current?.cancel?.()
					if (!modalAdapterRef.current?.ownsInput(event.relatedTarget)) modalAdapterRef.current?.suspendInput()
					return false
				},
				compositionstart: () => {
					publishPrefix(null)
					inputAdapterRef.current?.cancel?.()
					return false
				},
				keydown: (event, editor) => {
					if (!claimOrgInputEvent(event)) return false
					const input = {
						altKey: event.altKey, altGraphKey: event.getModifierState("AltGraph"),
						ctrlKey: event.ctrlKey, defaultPrevented: event.defaultPrevented,
						isComposing: event.isComposing, key: event.key, keyCode: event.keyCode,
						metaKey: event.metaKey, repeat: isOrgRepeatedKeyEvent(event), shiftKey: event.shiftKey,
						isParameterInput: Boolean((event.target as Element | null)?.closest?.("[data-org-parameter-session]")),
					}
					lastRoutedKey = event
					const policy = editor.state.facet(orgInputConfiguration)
					if (orgInputIsProtected(input) || editor.composing) {
						const guarded = resolveOrgInput({ configuration: policy?.generation === getOrgInputConfiguration().generation ? policy.configuration : null,
							scope: inputScopeRef.current, current: null, input: { ...input, isComposing: input.isComposing || editor.composing },
							now: Date.now(), nextId: prefixId + 1, selectionEmpty: editor.state.selection.ranges.every((range) => range.empty),
							owner: commandOwnerRef.current, generation: getOrgInputConfiguration().generation })
						publishPrefix(null)
						if (guarded.consumed) event.preventDefault()
						return guarded.consumed
					}
					if (inputAdapterRef.current?.ownedMinibufferKey?.(event, editor) || modalAdapterRef.current?.ownedMinibufferKey(event)) {
						publishPrefix(null)
						return true
					}
					if (modalAdapterRef.current?.ownsInput(event.target)) {
						publishPrefix(null)
						return false
					}
					if (!policy || policy.generation !== getOrgInputConfiguration().generation) {
						publishPrefix(null)
						return false
					}
					const routed = resolveOrgInput({
						configuration: policy.configuration, scope: inputScopeRef.current, current: prefix, input,
						now: Date.now(), selectionEmpty: editor.state.selection.ranges.every((range) => range.empty),
						nextId: prefixId + 1, timeoutMs: prefixTimeoutRef.current,
						owner: commandOwnerRef.current, generation: policy.generation,
					})
					if (routed.session && routed.session !== prefix) prefixId = routed.session.id
					publishPrefix(routed.session)
					if (!routed.consumed) {
						if (inputAdapterRef.current?.modalKey?.(event, editor) || modalAdapterRef.current?.modalKey(event)) return true
						if ((!routed.protected || input.repeat && !orgInputIsProtected(input)) && navigateTable(event, editor)) {
							event.preventDefault()
							return true
						}
						return false
					}
					const command = routed.commandId
					event.preventDefault()
					if (command) {
						const handled = isOrgCommandId(command) ? routeCommand(command) : onInputCommandRef.current?.(command) ?? false
						if (!handled) setTodoMessage(`Input command "${command}" is unavailable in this window.`)
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
						onOpenOrgLinkRef.current(orgTarget, sourcePosition)
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
			keymap.of(([
				...(bufferRuntime || projection
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
						if (fallbackProtected(editor)) return false
						const line = editor.state.doc.lineAt(editor.state.selection.main.head)
						if (/^\*+\s/.test(line.text)) {
							routeCommand("toggle-fold")
							return true
						}
						return indentMore(editor)
					},
				},
				{
					key: "Shift-Tab",
					preventDefault: true,
					run: (editor) => !fallbackProtected(editor) && routeCommand("cycle-folds"),
				},
				// Org shortcuts are routed above, before CodeMirror's default keymap.
				{
					key: "Enter",
					run: (editor) => !fallbackProtected(editor) && continueOrgList(editor),
				},
				...foldKeymap,
				...defaultKeymap,
			] satisfies readonly KeyBinding[]).map((binding: KeyBinding): KeyBinding => ({
				...binding,
				// Conditional prevention must follow input ownership, not a static
				// keymap flag that also swallows IME/AltGraph/native reader events.
				preventDefault: false,
				run: (editor) => !fallbackProtected(editor) && ((binding.run?.(editor) ?? false) || binding.preventDefault === true),
				shift: binding.shift ? (editor) => !fallbackProtected(editor) && (binding.shift!(editor) || binding.preventDefault === true) : undefined,
			}))),
			...(bufferRuntime || projection
				? [standaloneHistory.presentationExtension]
				: [standaloneHistory.extension]),
			readOnlyCompartment.of([
				EditorState.readOnly.of(initialReadOnlyRef.current),
				EditorView.editable.of(!initialReadOnlyRef.current),
			]),
			accessibilityCompartment.of(
				EditorView.contentAttributes.of({
					"aria-label": initialAriaLabelRef.current,
					"aria-multiline": "true",
					tabindex: "0",
				}),
			),
			EditorView.updateListener.of((update) => {
				if (update.docChanged) {
					publishPrefix(null)
					localRevisionRef.current++
					for (const listener of commandContextListenersRef.current) listener()
				}
				const isExternalUpdate = update.transactions.some(
					(transaction) => transaction.annotation(externalValueUpdate) === true,
				)
				if (!bufferRuntime && !projection && update.docChanged && !isExternalUpdate) {
					onChangeRef.current?.(update.state.sliceDoc())
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
			state: state.update({ effects: effectRegistry.localEffect(clearOrgSparseTree.of(null)) })
				.state,
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
				: projection
					? {
							dispatchTransactions: (transactions: readonly Transaction[]) => {
								nativeProjectionHandleRef.current?.dispatchTransactions(transactions)
							},
						}
					: {
							dispatchTransactions: (transactions: readonly Transaction[], localView: EditorView) => {
								if (transactions.some((tr) => !allowOrgRemarkNoteSourceTransaction(tr))) return
								if (editPermissionRef.current?.() === false && transactions.some((tr) =>
									!tr.annotation(externalValueUpdate) && (tr.docChanged || tr.startState.lineBreak !== tr.state.lineBreak))) return
								standaloneHistory.dispatch(transactions, localView)
							},
						}),
		})
		const cancelForeignConsumedKey = (event: KeyboardEvent) => {
			// A higher-priority CM/DOM owner may consume a key without running our handler.
			if (event.defaultPrevented && lastRoutedKey !== event) publishPrefix(null)
			lastRoutedKey = null
		}
		view.contentDOM.addEventListener("keydown", cancelForeignConsumedKey)
		if (bufferRuntime) {
			runtimeHandleRef.current = bufferRuntime.attachWindow({
				knownLocalEffects: [EditorView.announce],
				knownReconfigure: knownWindowEffect,
				preflightSourceTransaction: (tr) =>
					allowOrgSparseTreeSourceTransaction(tr, knownWindowEffect) &&
					allowOrgRemarkNoteSourceTransaction(tr),
				view,
				readViewport: () => ({ scrollTop: view.scrollDOM.scrollTop, scrollLeft: view.scrollDOM.scrollLeft }),
				windowId: windowIdRef.current,
			})
		}
		if (projection) {
			nativeProjectionHandleRef.current = projection.attach(
				view,
				(effect) => effect.is(EditorView.announce) || knownWindowEffect(effect),
				(tr) => allowOrgSparseTreeSourceTransaction(tr, knownWindowEffect) &&
					allowOrgRemarkNoteSourceTransaction(tr),
			)
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
		const mountScrollTop = view.scrollDOM.scrollTop
		const mountScrollLeft = view.scrollDOM.scrollLeft
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
			captureLoggingNote,
			subscribeCommandContext: (listener) => {
				commandContextListenersRef.current.add(listener)
				return () => { commandContextListenersRef.current.delete(listener) }
			},
			getCommandContext: () => {
				const context = getCommandContext()
				return viewRef.current === view ? context : { ...context, available: false }
			},
			captureSourceTransform: () => {
				const context = commandTarget.getCommandContext()
				if (!context.available || !context.windowId) return null
				const selection = view.state.selection
				const ownership = commandOwnerRef.current
				const handle = runtimeHandleRef.current
				const nativeHandle = nativeProjectionHandleRef.current
				const configurationGeneration = getOrgInputConfiguration().generation
				const behaviorGeneration = sparseContextIdentityRef.current
				const snapshot = Object.freeze({
					content: context.content, relativePath: context.relativePath, windowId: context.windowId,
					revision: context.revision, configurationGeneration, readOnly: context.readOnly, cursor: context.cursor,
					selection: Object.freeze({
						mainIndex: selection.mainIndex,
						ranges: Object.freeze(selection.ranges.map((range) => Object.freeze({
							anchor: sourceOffsetFromEditor(view, range.anchor), head: sourceOffsetFromEditor(view, range.head),
							assoc: range.assoc, bidiLevel: range.bidiLevel, goalColumn: range.goalColumn,
							undirectional: range.undirectional,
						}))),
					}),
				})
				const isCurrent = () => viewRef.current === view &&
					commandOwnerRef.current === ownership && runtimeHandleRef.current === handle &&
					nativeProjectionHandleRef.current === nativeHandle &&
					getOrgInputConfiguration().generation === configurationGeneration &&
					sparseContextIdentityRef.current === behaviorGeneration &&
					(bufferRuntime?.revision ?? localRevisionRef.current) === snapshot.revision &&
					getCommandContext().available && getCommandContext().content === snapshot.content &&
					(!bufferRuntime || bufferRuntime.source === snapshot.content)
				let submitted = false
				return Object.freeze({
					snapshot, isCurrent,
					apply: async (batch: OrgTextEditBatch, policy: "preserve" | "cursor" = "preserve") => {
						if (submitted || !isCurrent() || view.state.readOnly || !view.state.selection.eq(selection, true) ||
							view.state.selection.ranges.some((range, index) => range.bidiLevel !== selection.ranges[index].bidiLevel ||
								range.goalColumn !== selection.ranges[index].goalColumn || range.undirectional !== selection.ranges[index].undirectional)) return false
						submitted = true
						const run = () => {
							if (!isCurrent() || view.state.readOnly) return false
							try { return commandTarget.applyEdits?.(snapshot.content, batch, policy) ?? false }
							catch (error) {
								// Native optimistic state is never canonical acceptance.
								if (projection || !bufferRuntime) throw error
								let expected = snapshot.content
								for (const change of [...batch.changes].sort((a, b) => b.from - a.from))
									expected = expected.slice(0, change.from) + change.insert + expected.slice(change.to)
								return viewRef.current === view && runtimeHandleRef.current === handle &&
									!bufferRuntime.closed && bufferRuntime.revision > snapshot.revision && bufferRuntime.source === expected
							}
						}
						return projection ? (await projection.captureSubmission(run)).kind === "success" : run()
					},
				})
			},
			getVisibleSourceRanges: () => {
				if (viewRef.current !== view) return []
				const hidden: { from: number; to: number }[] = []
				foldedRanges(view.state).between(0, view.state.doc.length, (from, to) => { hidden.push({ from, to }) })
				hidden.push(...(view.state.field(orgSparseTreeField)?.hiddenRanges ?? []))
				hidden.push(...(view.state.field(orgRemarkNoteRangeField)?.hiddenRanges ?? []))
				hidden.sort((first, second) => first.from - second.from)
				const ranges: { from: number; to: number }[] = []
				let position = 0
				for (const range of hidden) {
					if (range.from > position) ranges.push({
						from: sourceOffsetFromEditor(view, position),
						to: sourceOffsetFromEditor(view, range.from) - 1,
					})
					position = Math.max(position, range.to)
				}
				ranges.push({ from: sourceOffsetFromEditor(view, position), to: view.state.sliceDoc().length })
				return ranges
			},
			revealSourcePosition: (expectedSource, position) => {
				if (viewRef.current !== view || !getCommandContext().available || view.state.sliceDoc() !== expectedSource ||
					!Number.isInteger(position) || position < 0 || position > expectedSource.length ||
					(expectedSource[position - 1] === "\r" && expectedSource[position] === "\n")) return false
				const offset = editorOffsetFromSource(expectedSource, position, view.state.lineBreak)
				view.dispatch({
					annotations: Transaction.addToHistory.of(false),
					selection: { anchor: offset },
					effects: effectRegistry.scrollIntoView(offset, { y: "center" }),
				})
				return view.state.selection.main.head === offset
			},
			executeCommand: (id) => viewRef.current === view ? executeCommand(id) : false,
			captureCommand: (id) => {
				if (viewRef.current !== view || !getCommandContext().available) return null
				const source = view.state.sliceDoc()
				const selection = view.state.selection
				const revision = bufferRuntime?.revision ?? localRevisionRef.current
				const ownership = commandOwnerRef.current
				const configurationGeneration = getOrgInputConfiguration().generation
				const behaviorGeneration = sparseContextIdentityRef.current
				const handle = runtimeHandleRef.current
				const nativeHandle = nativeProjectionHandleRef.current
				const save = id === "save" ? captureSaveRef.current?.() ?? null : null
				const run = () => {
					if (
						viewRef.current !== view ||
						!getCommandContext().available ||
						getOrgInputConfiguration().generation !== configurationGeneration ||
						sparseContextIdentityRef.current !== behaviorGeneration ||
						commandOwnerRef.current !== ownership ||
						runtimeHandleRef.current !== handle ||
						nativeProjectionHandleRef.current !== nativeHandle ||
						view.state.sliceDoc() !== source ||
						!view.state.selection.eq(selection) ||
						(bufferRuntime?.revision ?? localRevisionRef.current) !== revision
					) return false
					if (id === "save") return save ? save() : false
					return projection
						? projection.captureSubmission(() => executeCommand(id)).then((outcome) => outcome.kind === "success")
						: executeCommand(id)
				}
				return run
			},
			captureFocus: () => {
				if (viewRef.current !== view || !getCommandContext().available) return null
				const source = view.state.sliceDoc()
				const revision = bufferRuntime?.revision ?? localRevisionRef.current
				const selection = view.state.selection
				const { scrollTop, scrollLeft } = view.scrollDOM
				const scrollSnapshot = effectRegistry.scrollSnapshot(view)
				const ownership = commandOwnerRef.current
				const configurationGeneration = getOrgInputConfiguration().generation
				const handle = runtimeHandleRef.current
				return () => {
					if (
						viewRef.current !== view || !getCommandContext().available ||
						getOrgInputConfiguration().generation !== configurationGeneration ||
						commandOwnerRef.current !== ownership ||
						runtimeHandleRef.current !== handle ||
						view.state.sliceDoc() !== source ||
						(bufferRuntime?.revision ?? localRevisionRef.current) !== revision
					) return false
					cancelScrollRestore()
					view.focus()
					view.dispatch({
						annotations: Transaction.addToHistory.of(false),
						effects: scrollSnapshot,
						...(!view.state.selection.eq(selection) ? { selection } : {}),
					})
					view.scrollDOM.scrollTop = scrollTop
					view.scrollDOM.scrollLeft = scrollLeft
					return true
				}
			},
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
				const insert = bufferRuntime || projection
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
			applyEdits: (expectedSource, batch, selectionPolicy = "cursor") => {
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
					insert: bufferRuntime || projection
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
				if (selectionPolicy === "cursor" && !validOffset(nextSource, batch.cursor)) return false
				const editorChanges = normalized.map(({ from, to, insert }) => ({
					from: editorOffsetFromSource(expectedSource, from, view.state.lineBreak),
					insert,
					to: editorOffsetFromSource(expectedSource, to, view.state.lineBreak),
				}))
				const nextSelection = selectionPolicy === "preserve"
					? view.state.selection.map(view.state.changes(editorChanges))
					: EditorSelection.single(editorOffsetFromSource(nextSource, batch.cursor, view.state.lineBreak))
				return batchController.run(() => {
					view.dispatch({
						annotations: isolateHistory.of("full"),
						changes: editorChanges,
						scrollIntoView: true,
						selection: nextSelection,
					})
					return (
						view.state.sliceDoc() === nextSource &&
						view.state.selection.eq(nextSelection, true)
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
				const behavior = parseOrgBehaviorConfiguration(useSettings.getState().orgBehaviorConfigurationJson)
				if (E.isLeft(behavior)) return false
				const query = parseOrgSparseTreeQuery(operation.query, behavior.right.inheritance)
				if (!query) {
					return false
				}
				view.dispatch({
					annotations: Transaction.addToHistory.of(false),
					effects: effectRegistry.localEffect(
						setOrgSparseTree.of({
							query,
							nativeContext: operation.nativeContext,
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
		const unsubscribeConfiguration = useSettings.subscribe((current, previous) => {
			if (current.orgBehaviorConfigurationJson === previous.orgBehaviorConfigurationJson &&
				current.orgKeymapConfigurationJson === previous.orgKeymapConfigurationJson) return
			// Observe every transition, including equal-JSON configuration ABAs.
			sparseContextIdentityRef.current = {}
			noteRequestRef.current?.abort()
			const sparse = view.state.field(orgSparseTreeField)
			if (sparse?.contextStatus === "pending") {
				view.dispatch({
					annotations: Transaction.addToHistory.of(false),
					effects: effectRegistry.localEffect(clearOrgSparseTree.of(null)),
				})
			}
		})
		return () => {
			unsubscribeConfiguration()
			inputAdapterRef.current?.cancel?.()
			modalAdapterRef.current?.destroy()
			modalAdapterRef.current = null
			modalBindingRef.current = null
			noteRequestRef.current?.abort()
			commandTargetRef.current = null
			// An unmeasured, untouched mount still owns the cached viewport.
			// Preserve newer DOM scroll intent instead of replaying an old bookmark.
			const pendingScrollRestore =
				scrollFrame !== null &&
				view.scrollDOM.scrollTop === mountScrollTop &&
				view.scrollDOM.scrollLeft === mountScrollLeft
					? snapshot
					: undefined
			cancelScrollRestore()
			cancelScrollRestoreRef.current = () => {}
			for (const event of ["scroll", "wheel", "touchstart", "pointerdown", "keydown"]) {
				view.scrollDOM.removeEventListener(event, cancelScrollRestore)
			}
			if (key !== undefined && cache) {
				cache.set(key, {
					...snapshot,
					runtimeOwner: bufferRuntime ?? undefined,
					scrollLeft: pendingScrollRestore?.scrollLeft ?? view.scrollDOM.scrollLeft,
					scrollTop: pendingScrollRestore?.scrollTop ?? view.scrollDOM.scrollTop,
					source: bufferRuntime?.source ?? view.state.sliceDoc(),
					state: bufferRuntime?.state ?? view.state,
					windowState: bufferRuntime ? view.state : undefined,
				})
			}
			window.removeEventListener("blur", onWindowBlur)
			view.contentDOM.removeEventListener("keydown", cancelForeignConsumedKey)
			publishPrefix(null)
			if (prefixTimer !== null) {
				clearTimeout(prefixTimer)
			}
			clearPrefixRef.current = () => {}
			onCommandTargetRef.current?.(null)
			viewRef.current = null
			runtimeHandleRef.current?.detach()
			runtimeHandleRef.current = null
			nativeProjectionHandleRef.current?.detach()
			nativeProjectionHandleRef.current = null
			view.destroy()
		}
	}, [])

	useLayoutEffect(() => {
		clearPrefixRef.current()
		inputAdapter?.cancel?.()
		const view = viewRef.current
		if (view) {
			const owner = commandOwnerRef.current
			const generation = inputConfiguration.generation
			const enabled = inputScope === "org-source" && inputConfiguration.configuration?.modalEngine === "vim"
			const binding = modalBindingRef.current
			const replace = !binding || binding.owner !== owner || binding.generation !== generation || !enabled
			let modal = modalAdapterRef.current
			if (replace) {
				modal?.destroy()
				modal = enabled && (initialRuntimeRef.current || initialNativeProjectionRef.current)
					? createOrgModalAdapter({
						...modalHost,
						captureSave: () => captureSaveRef.current?.() ?? null,
						isCurrent: () => viewRef.current === view && commandOwnerRef.current === owner &&
							getOrgInputConfiguration().generation === generation &&
							view.state.facet(orgInputConfiguration)?.generation === generation &&
							(!initialRuntimeRef.current || !initialRuntimeRef.current.closed && !!runtimeHandleRef.current) &&
							(!initialNativeProjectionRef.current || (nativeProjectionHandleRef.current?.isCurrent() ?? false)),
						requestHistory: (operation) => nativeProjectionHandleRef.current
							? nativeProjectionHandleRef.current.requestHistory(operation)
							: runtimeHandleRef.current?.[operation]() ?? false,
						reportError: setTodoMessage,
					}) : null
				modalAdapterRef.current = modal
				modalBindingRef.current = modal ? { owner, generation } : null
				if (enabled && !modal) setTodoMessage("Vim requires an owned Org Source buffer/window.")
			} else modal?.suspendInput()
			const effects = [effectRegistryRef.current.reconfigure(inputCompartmentRef.current, orgInputConfiguration.of(inputConfiguration))]
			if (replace) effects.push(effectRegistryRef.current.reconfigure(modalCompartmentRef.current, modal?.extensions ?? []))
			view.dispatch({ effects })
		}
		for (const listener of commandContextListenersRef.current) listener()
		return () => { inputAdapter?.cancel?.() }
	}, [inputConfiguration, inputAdapter, inputScope, documentPath, prefixContextKey, readOnly, prefixTimeoutMs])

	useEffect(() => {
		const view = viewRef.current
		if (initialRuntimeRef.current || initialNativeProjectionRef.current || !view || view.state.sliceDoc() === value) {
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

	useLayoutEffect(() => {
		const view = viewRef.current, sparse = view?.state.field(orgSparseTreeField, false)
		if (!view || !sparse) return
		const request = orgSparseTreeSpecialPropertyRequest(view.state.sliceDoc(), sparse.query)
		if (!request.properties.includes("FILE")) return
		// Filename changes are readonly metadata changes even when Source is identical.
		// Retire an in-flight/ready FILE column without relocating any current range.
		const specialProperties = new Map(sparse.nativeContext?.specialProperties)
		specialProperties.delete("FILE")
		view.dispatch({
			annotations: Transaction.addToHistory.of(false),
			effects: effectRegistryRef.current.localEffect(setOrgSparseTree.of({
				query: sparse.query, restoreSelection: sparse.restoreSelection,
				nativeContext: { compareStrings: sparse.nativeContext?.compareStrings, specialProperties },
			})),
		})
	}, [documentFilename])

	useLayoutEffect(() => {
		const view = viewRef.current
		if (!view || (remarkSnapshot && view.state.sliceDoc() !== remarkSnapshot.source)) return
		view.dispatch({
			annotations: Transaction.addToHistory.of(false),
			effects: effectRegistryRef.current.localEffect(setOrgRemarkSnapshot.of(remarkSnapshot ?? null)),
		})
	}, [remarkSnapshot])

	useLayoutEffect(() => {
		const view = viewRef.current
		if (!view) return
		view.dispatch({
			annotations: Transaction.addToHistory.of(false),
			effects: effectRegistryRef.current.localEffect(setOrgRemarkNoteRange.of(visibleSourceRange ?? null)),
		})
	}, [visibleSourceRange?.from, visibleSourceRange?.to])

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
					tabindex: "0",
				}),
			),
		})
	}, [ariaLabel])

	return (
		<div className="flex h-full min-h-0 w-full flex-col">
			{inputConfiguration.error && (
				<div role="alert" className="shrink-0 px-3 py-1 text-sm">
					Saved keymap configuration is invalid: {inputConfiguration.error} Repair it in Settings → Editor → Org input keymaps.
				</div>
			)}
			{todoMessage && (
				<div role="status" aria-label="Org command feedback" className="shrink-0 px-3 py-1 text-sm">
					{todoMessage}
				</div>
			)}
			{todoNote && (
				<OrgTodoNote
					key={noteRequestIdRef.current}
					request={todoNote}
					closeFence={prefixContextKey}
					origin={(() => {
						const owner = localNoteOwnerRef.current
						return {
							isLive: () => !!owner && owner.request === todoNote && viewRef.current === owner.editor && commandTargetRef.current === owner.target,
							restore: () => { owner?.target?.restoreFocus() },
						}
					})()}
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
