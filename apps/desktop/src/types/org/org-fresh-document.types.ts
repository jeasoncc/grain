export interface OrgFreshDocumentPlan {
	readonly directory: string
	readonly filenameStem: string
	readonly content: string
}

export interface OrgFreshDocumentCreateFailure {
	readonly kind: "rejected" | "uncertain" | "stale"
	readonly message: string
}

export type OrgFreshDocumentOutcome =
	| { readonly kind: "created"; readonly relativePath: string }
	| { readonly kind: "created-unopened"; readonly relativePath: string; readonly message: string }
	| { readonly kind: "no-workspace" | "busy" | "rejected" | "uncertain" | "stale"; readonly message: string }
