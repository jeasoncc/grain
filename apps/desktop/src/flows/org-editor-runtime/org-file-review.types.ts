import type { OrgDocumentInterface } from "@/types/org"

/** Absence is an authorized disk observation, never a synthetic baseline/body. */
export type OrgFileDiskState = OrgDocumentInterface | {
	readonly kind: "missing" | "unavailable"
	readonly relativePath: string
	readonly message: string
	readonly content?: never
	readonly revision?: never
}

/** Only the session owner can issue and consume this exact review object. */
export interface OrgFileReview {
	readonly id: string
	readonly bufferId?: string
	readonly relativePath: string
	readonly workingSource?: string
	readonly baselineRevision?: string
	readonly disk: OrgFileDiskState
}
export type OrgFileReviewChoice = "adopt-disk" | "keep-working" | "acknowledge-missing" | "recreate-missing"
export type OrgFileReviewOutcome =
	| { readonly kind: "ready"; readonly review: OrgFileReview }
	| { readonly kind: "accepted"; readonly manualSaveRequired: boolean }
	| { readonly kind: "rejected"; readonly message: string }
