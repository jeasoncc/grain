import type {
	OrgCaptureValidationError,
	OrgDocumentInterface,
	OpenOrgDocumentInput,
} from "@/types/org"

/** Literal, declarative data only. Cursor offsets are UTF-16 source offsets. */
export interface OrgCaptureTemplate {
	readonly id: string
	readonly label: string
	readonly targetRelativePath: string
	readonly initialSource: string
	readonly initialCursor: number
}

export interface CaptureOrgEntryInput extends OpenOrgDocumentInput {
	readonly entrySource: string
}

export type OrgCaptureEntryResult = OrgDocumentInterface

export interface OrgCaptureRejectedError {
	readonly type: "ORG_CAPTURE_REJECTED_ERROR"
	readonly phase: "validation" | "scan" | "read" | "preparation"
	readonly noWrite: true
	readonly message: string
	readonly cause: unknown
}

export interface OrgCaptureUncertainWriteError {
	readonly type: "ORG_CAPTURE_UNCERTAIN_WRITE_ERROR"
	readonly targetRelativePath: string
	readonly message: string
	readonly cause: unknown
}

export type OrgCaptureEntryFlowError = OrgCaptureRejectedError | OrgCaptureUncertainWriteError
export type { OrgCaptureValidationError }
