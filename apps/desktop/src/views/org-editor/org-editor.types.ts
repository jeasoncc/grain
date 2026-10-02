import type { EditorState } from "@codemirror/state"
import type { OrgBufferRuntime } from "@/flows/org-editor-runtime"
import type { OrgLinkClickTarget, OrgTextEdit } from "@/pipes/org"
import type { OrgPrefixSession } from "@/types/editor/org-keymap.interface"

/** Buffer-local transaction boundary; never performs filesystem IO. */
export interface OrgEditorCommandTarget {
	readonly applyEdit: (expectedSource: string, edit: OrgTextEdit) => boolean
	readonly restoreFocus: () => void
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

export interface OrgEditorProps {
	/** Mount-scoped controller-owned runtime; omitted for local scratch editors. */
	readonly runtime?: OrgBufferRuntime | null
	readonly windowId?: string
	/** Mount-scoped caller-owned opaque buffer/capability identity, not a document path. */
	readonly sessionKey?: string
	readonly sessionCache?: Map<string, OrgEditorSessionSnapshot>
	/** Initial UTF-16 source caret for a new scratch buffer; cache selection takes priority. */
	readonly initialCursor?: number
	/** Raw Org document text. No parsing or serialization is performed. */
	readonly value: string
	readonly onChange: (value: string) => void
	readonly onSave: () => void
	readonly onCommandTarget?: (target: OrgEditorCommandTarget | null) => void
	readonly onPrefixChange?: (prefix: OrgPrefixSession | null) => void
	readonly prefixContextKey?: string
	/** Null/default waits for the next key; a finite millisecond value enables expiry. */
	readonly prefixTimeoutMs?: number | null
	readonly documentPath?: string
	readonly onOpenFileLink?: (relativePath: string) => void
	readonly onOpenOrgLink?: (target: OrgLinkClickTarget) => void
	readonly onRefileSubtree?: (cursor: number) => void
	readonly onArchiveSubtree?: (cursor: number) => void
	readonly onEditTags?: (cursor: number) => void
	readonly onSchedule?: (cursor: number) => void
	readonly onDeadline?: (cursor: number) => void
	readonly onSetProperty?: (cursor: number) => void
	readonly onCursorChange?: (cursor: number) => void
	readonly revealTarget?: OrgEditorRevealTarget | null
	readonly readOnly?: boolean
	readonly ariaLabel?: string
}
