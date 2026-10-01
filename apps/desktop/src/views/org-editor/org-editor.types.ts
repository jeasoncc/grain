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

export interface OrgEditorProps {
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
