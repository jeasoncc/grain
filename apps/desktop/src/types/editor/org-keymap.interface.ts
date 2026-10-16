export type OrgPrefixBinding = {
	readonly keyLabel: string
	readonly label: string
} & (
	| { readonly commandId: string; readonly prefixLabel?: never }
	| { readonly prefixLabel: string; readonly commandId?: never }
)

export interface OrgPrefixSession {
	readonly id: number
	readonly label: string
	readonly expiresAt: number | null
	readonly bindings: readonly OrgPrefixBinding[]
	/** Window and configuration incarnation; leased sessions cannot cross either boundary. */
	readonly owner?: object
	readonly generation?: object
	readonly mapId?: string
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
	readonly repeat?: boolean
	readonly altGraphKey?: boolean
	readonly isParameterInput?: boolean
}


export type OrgKeymapScope = "application" | "workspace" | "file-tree" | "org-source" | "org-capture" | "org-roam" | "org-agenda" | "org-todo-note" | "org-remark"
export type OrgInputCommand = string
export interface OrgScopedBinding {
	readonly scope: OrgKeymapScope
	readonly key: string
	readonly command: OrgInputCommand | null
	readonly map?: string
}
export interface OrgTransientMap {
	readonly id: string
	readonly label: string
	readonly scope: OrgKeymapScope
	readonly timeoutMs: number | null
	readonly bindings: readonly OrgPrefixBinding[]
}
export interface OrgKeymapConfiguration {
	readonly version: 1
	/** Explicit opt-in; ordinary Source editing remains the default. */
	readonly modalEngine: "vim" | null
	readonly bindings: readonly OrgScopedBinding[]
	readonly maps: Readonly<Record<string, OrgTransientMap>>
}
export interface OrgInputResolution {
	readonly session: OrgPrefixSession | null
	readonly commandId: OrgInputCommand | null
	readonly consumed: boolean
	/** IME, already-consumed, repeat, AltGraph or owned parameter input: do not run lower command layers. */
	readonly protected: boolean
}
