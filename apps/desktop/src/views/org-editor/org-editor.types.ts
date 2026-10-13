import type { OrgNativeEditorProjection } from "@/flows/org-native-window/org-native-editor-projection.types"
import type { OrgSparseClockAdapter } from "@/flows/org-command/org-sparse-tree-context"
import type { OrgCommandEditorContext, OrgCommandId } from "@/flows/org-command/org-workspace-command"
import type { EditorState } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import type { OrgBufferViewPayload } from "@/flows/org-command/org-buffer-command"
import type { OrgTodoNoteRequest, OrgTodoNoteResult } from "@/flows/org-command/org-todo-note"
import type { OrgBufferRuntime } from "@/flows/org-editor-runtime"
import type { OrgRemarkSnapshot } from "@/flows/org-editor-runtime/org-remark-tracker"
import type { OrgRemarkNoteRange } from "./org-remark.extension"
import type { OrgLinkClickTarget, OrgTextEdit, OrgTextEditBatch } from "@/pipes/org"
import type { OrgPrefixSession, OrgKeymapScope } from "@/types/editor/org-keymap.interface"

/** Exact raw UTF-16 selection, including directional/caret metadata. No runtime/grant escapes. */
export interface OrgSourceSelectionRange {
	readonly anchor: number
	readonly head: number
	readonly assoc: number
	readonly bidiLevel: number | null
	readonly goalColumn: number | undefined
	readonly undirectional: boolean
}
export interface OrgSourceSnapshot {
	readonly content: string
	readonly relativePath: string
	readonly windowId: string
	readonly revision: number
	/** Issued input-configuration identity; equal JSON after an ABA is a new generation. */
	readonly configurationGeneration: object
	readonly readOnly: boolean
	readonly cursor: number
	readonly selection: {
		readonly ranges: readonly OrgSourceSelectionRange[]
		readonly mainIndex: number
	}
}
export interface OrgCapturedSourceTransform {
	readonly snapshot: OrgSourceSnapshot
	readonly isCurrent: () => boolean
	/** Default maps every captured range. Cursor-moving pure commands explicitly use "cursor". */
	readonly apply: (batch: OrgTextEditBatch, selection?: "preserve" | "cursor") => Promise<boolean>
}

/** Buffer-local transaction boundary; never performs filesystem IO. */
export interface OrgEditorCommandTarget {
	readonly getCommandContext: () => OrgCommandEditorContext
	/** Observes source transactions even when an edit/undo ABA is React-batched away. */
	readonly subscribeCommandContext?: (listener: () => void) => () => void
	/** Exact mounted owner/configuration/revision capture; native completion awaits canonical ACK. */
	readonly captureSourceTransform?: () => OrgCapturedSourceTransform | null
	/** Executes against this exact mounted window; stale targets fail closed. */
	readonly executeCommand: (id: OrgCommandId) => boolean
	/** Captures source revision and selection for a delayed palette/toolbar invocation. */
	readonly captureCommand: (id: OrgCommandId) => (() => boolean | Promise<boolean>) | null
	/** History-free cancellation restoration bound to the original source/window. */
	readonly captureFocus: () => (() => boolean) | null
	readonly applyEdit: (expectedSource: string, edit: OrgTextEdit) => boolean
	readonly applyEdits?: (expectedSource: string, batch: OrgTextEditBatch, selection?: "cursor" | "preserve") => boolean
	/** Capture exact Root/window authority before clocks, prompts or other effect boundaries. */
	readonly captureLoggingNote?: () => ((
		expectedSource: string,
		label: string,
		execute: (note: string, isCurrent: () => boolean) => OrgTodoNoteResult | Promise<OrgTodoNoteResult>,
		successMessage?: string,
	) => boolean) | null
	/** Window-local presentation only; never modifies source or buffer history. */
	readonly applyView?: (expectedSource: string, operation: OrgBufferViewPayload) => boolean
	readonly restoreFocus: () => void
	/** Raw-source ranges excluding folds and window-local hidden text. */
	readonly getVisibleSourceRanges?: () => readonly { readonly from: number; readonly to: number }[]
	/** Selection/scroll only; source bytes and undo remain unchanged. */
	readonly revealSourcePosition?: (expectedSource: string, position: number) => boolean
}

export interface OrgEditorRevealTarget {
	readonly line: number
	readonly requestId: number
}

/** In-memory only: retains document history/selection, never transient UI sessions. */
export interface OrgEditorSessionSnapshot {
	readonly state: EditorState
	readonly source?: string
	/** Memory-only incarnation ownership; absent only for legacy local snapshots. */
	readonly runtimeOwner?: OrgBufferRuntime
	/** History-free window selection/folds; state retains canonical buffer history. */
	readonly windowState?: EditorState
	readonly scrollTop: number
	readonly scrollLeft: number
}

/** Real arbitration seam; adapters must use canonical Source transactions/history, not projection-local undo. */
export interface OrgEditorInputAdapter {
	/** Return true only when this exact window owns and handled the minibuffer event. */
	readonly ownedMinibufferKey?: (event: KeyboardEvent, view: EditorView) => boolean
	/** Runs after transient/mode maps and before CodeMirror fallback. No modal engine is implied. */
	readonly modalKey?: (event: KeyboardEvent, view: EditorView) => boolean
	readonly cancel?: () => void
}

export interface OrgEditorProps {
	/** Mount-scoped controller-owned runtime; omitted for local scratch editors. */
	readonly runtime?: OrgBufferRuntime | null
	/** Native history-free view with truthful asynchronous canonical acceptance. */
	readonly nativeProjection?: OrgNativeEditorProjection
	readonly windowId?: string
	/** Mount-scoped caller-owned opaque buffer/capability identity, not a document path. */
	readonly sessionKey?: string
	readonly sessionCache?: Map<string, OrgEditorSessionSnapshot>
	/** Initial UTF-16 source caret for a new scratch buffer; cache selection takes priority. */
	readonly initialCursor?: number
	/** Raw Org document text. No parsing or serialization is performed. */
	readonly value: string
	/** Standalone source owner only; canonical runtime editors publish through their runtime. */
	readonly onChange?: (value: string) => void
	readonly onSave: () => void
	/** Captures the exact buffer/file owner; completion is the real save acknowledgement. */
	readonly captureSave?: () => (() => boolean | Promise<boolean>) | null
	/** Effect boundary for TODO logging; defaults to the current local time. */
	readonly todoClock?: () => string
	readonly onTodoRejected?: (reason: string) => void
	readonly onTodoNoteRequest?: (request: OrgTodoNoteRequest) => void
	/** Capture Root's exact mounted-window registration, required for runtime TODO notes. */
	readonly getTodoNotePermit?: () => () => boolean
	readonly onCommandTarget?: (target: OrgEditorCommandTarget | null) => void
	/** Workspace commands and editor commands share this current-target authority. */
	readonly onCommand?: (id: OrgCommandId) => boolean
	readonly onPrefixChange?: (prefix: OrgPrefixSession | null) => void
	readonly prefixContextKey?: string
	/** Null/default waits for the next key; a finite millisecond value enables expiry. */
	readonly prefixTimeoutMs?: number | null
	readonly inputAdapter?: OrgEditorInputAdapter
	readonly inputScope?: OrgKeymapScope
	/** Approved application/tool producer. Returning false reports unavailability; no ID-based permission is inferred. */
	readonly onInputCommand?: (id: string) => boolean
	readonly documentPath?: string
	/** Readonly full visiting filename for native FILE matches; null means nonvisiting. No filesystem authority. */
	readonly documentFilename?: string | null
	/** Freeze Root's identified clock epoch before native special-property reads. */
	readonly captureClockContext?: (source: string, filename: string | null) => OrgSparseClockAdapter
	readonly onOpenFileLink?: (relativePath: string) => void
	readonly onOpenOrgLink?: (target: OrgLinkClickTarget, sourcePosition: number) => void
	readonly onRefileSubtree?: (cursor: number) => void
	readonly onArchiveSubtree?: (cursor: number) => void
	readonly onEditTags?: (cursor: number) => void
	readonly onSchedule?: (cursor: number) => void
	readonly onDeadline?: (cursor: number) => void
	readonly onSetProperty?: (cursor: number) => void
	readonly onSparseTree?: (cursor: number) => void
	readonly onClearSparseTree?: () => void
	readonly onCursorChange?: (cursor: number) => void
	readonly revealTarget?: OrgEditorRevealTarget | null
	readonly remarkSnapshot?: OrgRemarkSnapshot | null
	readonly visibleSourceRange?: OrgRemarkNoteRange | null
	readonly readOnly?: boolean
	/** Synchronous caller lease for local scratch edits; canonical/native authority remains runtime-owned. */
	readonly getEditPermission?: () => boolean
	readonly ariaLabel?: string
}
