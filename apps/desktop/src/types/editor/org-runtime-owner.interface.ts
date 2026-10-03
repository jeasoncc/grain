/** A synchronous snapshot of commit authority, not editor or filesystem state. */
export interface OrgRuntimeCommitContext {
	readonly mounted: boolean
	readonly closeReady: boolean
	readonly grantMatches: boolean
	readonly sessionMatches: boolean
	readonly isActiveOwner: boolean
	readonly previous: string
	readonly next: string
	readonly activeSource: string
	readonly parkedSource?: string
	readonly authorizedInstallation?: {
		readonly bufferId: string
		readonly expected: string
		readonly next: string
	}
	readonly runtimeBufferId: string
	readonly loading: boolean
	readonly mutationInProgress: boolean
	readonly ordinarySaveInFlight: boolean
}

export type OrgRuntimeCommitRejection =
	| "unmounted"
	| "close-not-ready"
	| "wrong-grant"
	| "wrong-session"
	| "inactive-owner"
	| "stale-source"
	| "loading"
	| "mutation-in-progress"

export type OrgRuntimeCommitDecision =
	| {
			readonly kind: "accepted"
			readonly destination: "active" | "parked"
			readonly reason: "edit" | "installation"
	  }
	| {
			readonly kind: "rejected"
			readonly reason: OrgRuntimeCommitRejection
			readonly message: string
	  }
