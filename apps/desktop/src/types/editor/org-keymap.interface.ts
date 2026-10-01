export type OrgPrefixCommandId =
	| "todo"
	| "checkbox"
	| "link"
	| "tags"
	| "scheduled"
	| "deadline"
	| "property"
	| "timestamp-active"
	| "timestamp-inactive"
	| "refile"
	| "archive"

export type OrgPrefixBinding = {
	readonly keyLabel: string
	readonly label: string
} & (
	| { readonly commandId: OrgPrefixCommandId; readonly prefixLabel?: never }
	| { readonly prefixLabel: string; readonly commandId?: never }
)

export interface OrgPrefixSession {
	readonly id: number
	readonly label: string
	readonly expiresAt: number | null
	readonly bindings: readonly OrgPrefixBinding[]
}

/** Structural keyboard input; no DOM dependency is required. */
export interface OrgPrefixKeyInput {
	readonly key: string
	readonly ctrlKey: boolean
	readonly metaKey: boolean
	readonly altKey: boolean
	readonly shiftKey: boolean
	readonly isComposing: boolean
	readonly keyCode: number
	readonly defaultPrevented: boolean
}

export interface OrgPrefixKeyResult {
	readonly session: OrgPrefixSession | null
	readonly commandId: OrgPrefixCommandId | null
	readonly consumed: boolean
}
