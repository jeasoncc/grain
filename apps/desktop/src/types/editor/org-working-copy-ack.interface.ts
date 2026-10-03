import type { OrgDocumentInterface, OrgDocumentEntryInterface } from "@/types/org"

/** Captured disk authority and live working source; ownership is checked by the caller. */
export interface OrgWorkingCopyAckContext {
	readonly expectedDocument: OrgDocumentInterface
	readonly currentDocument: OrgDocumentInterface | null | undefined
	readonly workingSource: string
	readonly capturedSource: string
	readonly receipt: OrgDocumentEntryInterface
}

export type OrgWorkingCopyAckPlan =
	| {
			readonly kind: "ack"
			readonly document: OrgDocumentInterface
			readonly workingSource: string
			readonly isDirty: boolean
	  }
	| {
			readonly kind: "rejected"
			readonly reason:
				| "missing-baseline"
				| "path-drift"
				| "revision-drift"
				| "content-drift"
				| "receipt-path"
				| "receipt-revision"
	  }
