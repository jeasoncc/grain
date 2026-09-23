import type { OrgLinkClickTarget } from "@/pipes/org"

export interface OrgEditorRevealTarget {
	readonly line: number
	readonly requestId: number
}

export interface OrgEditorProps {
	/** Raw Org document text. No parsing or serialization is performed. */
	readonly value: string
	readonly onChange: (value: string) => void
	readonly onSave: () => void
	readonly documentPath?: string
	readonly onOpenFileLink?: (relativePath: string) => void
	readonly onOpenOrgLink?: (target: OrgLinkClickTarget) => void
	readonly onRefileSubtree?: (cursor: number) => void
	readonly onArchiveSubtree?: (cursor: number) => void
	readonly onCursorChange?: (cursor: number) => void
	readonly revealTarget?: OrgEditorRevealTarget | null
	readonly readOnly?: boolean
	readonly ariaLabel?: string
}
