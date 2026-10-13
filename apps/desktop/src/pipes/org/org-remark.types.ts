import type { OrgTextEdit } from "./org-text.pipe"

export interface OrgRemarkMark {
	readonly id: string
	/** Raw UTF-16 source offsets. Range ends are exclusive; lines are zero-width BOL anchors. */
	readonly from: number
	readonly to: number
	readonly label: string
	readonly kind: "range" | "line"
	readonly originalText: string
	readonly line: number
}

export interface OrgRemarkEntry extends OrgRemarkMark {
	readonly heading: string
	readonly entryFrom: number
	readonly entryTo: number
	readonly bodyFrom: number
	readonly hasNotes: boolean
	readonly notesPath: string
	/** False when saved coordinates no longer agree with the original excerpt. No relocation is guessed. */
	readonly resolved: boolean
}

export interface OrgRemarkRejection {
	readonly kind: "rejected"
	readonly message: string
}

export type OrgRemarkAction =
	| {
			readonly type: "add"
			readonly id: string
			readonly from: number
			readonly to: number
			readonly kind: "range" | "line"
			readonly label?: string
	  }
	| { readonly type: "change"; readonly id: string; readonly label: string; readonly from: number; readonly to: number }
	| { readonly type: "remove"; readonly id: string }
	| { readonly type: "delete"; readonly id: string; readonly deleteNotes?: boolean }
	| { readonly type: "sync"; readonly marks: readonly OrgRemarkMark[] }

export type OrgRemarkMutationPlan =
	| {
			readonly kind: "ready"
			readonly previous: string
			readonly next: string
			/** Sorted, non-overlapping replacements in previous raw sidecar coordinates. */
			readonly edits: readonly OrgTextEdit[]
			readonly notesPath: string
	  }
	| {
			readonly kind: "confirmation-required"
			readonly id: string
			readonly hasNotes: true
			readonly message: string
	  }
	| OrgRemarkRejection

export type OrgRemarkParseResult =
	| {
			readonly kind: "ready"
			readonly entries: readonly OrgRemarkEntry[]
			readonly marks: readonly OrgRemarkMark[]
			readonly diagnostics: readonly { readonly id: string; readonly message: string }[]
	  }
	| OrgRemarkRejection

export interface OrgRemarkCoordinateCodec {
	readonly kind: "ready"
	readonly decoded: string
	readonly newline: "\n" | "\r\n"
	/** Decoded Emacs character positions are one-based, including the EOF boundary. */
	readonly rawToEmacs: (raw: number) => number | null
	readonly emacsToRaw: (position: number) => number | null
	readonly lineAt: (raw: number) => { readonly from: number; readonly to: number; readonly line: number } | null
	readonly excerpt: (from: number, to: number) => string | null
}
