import type {
	OrgCaptureValidationError,
	OrgDocumentInterface,
} from "@/types/org"

/** Declarative data only; no functions, external-file includes, shell or Lisp. */
export type OrgCaptureEntryType = "entry" | "plain" | "item" | "checkitem" | "table-line"

interface OrgCaptureFileTarget {
	readonly kind: "file"
	readonly relativePath: string
}
interface OrgCaptureHeadingTarget {
	readonly kind: "heading"
	readonly relativePath: string
	readonly headingPath: readonly string[]
}
interface OrgCaptureDatetreeTarget {
	readonly kind: "datetree"
	readonly relativePath: string
	readonly headingPath?: readonly string[]
	/** Frozen local capture date, not the later finish/recovery date. */
	readonly date: string
}
export type OrgCaptureTarget =
	| OrgCaptureFileTarget
	| OrgCaptureHeadingTarget
	| OrgCaptureDatetreeTarget
export type OrgCaptureTemplateTarget =
	| OrgCaptureFileTarget
	| OrgCaptureHeadingTarget
	| Omit<OrgCaptureDatetreeTarget, "date">

export interface OrgCaptureTemplate {
	readonly id: string
	readonly label: string
	readonly entryType: OrgCaptureEntryType
	readonly target: OrgCaptureTemplateTarget
	readonly source: string
}
export interface OrgCaptureConfiguration {
	readonly version: 1
	readonly templates: readonly OrgCaptureTemplate[]
	/** Explicit opt-in; plaintext local scratch recovery, never a file authority. */
	readonly draftRecovery: boolean
}
export interface OrgCapturePrompt {
	readonly label: string
	readonly initialInput: string
	readonly candidates: readonly string[]
}
export interface OrgCaptureTemplateContext {
	readonly date: Date
	readonly region: string
	/** A discontiguous Source selection must not be silently collapsed by %i. */
	readonly regionUnavailableReason?: string
	readonly annotation: string
	readonly sourceRelativePath?: string
	readonly sourceAbsolutePath?: string
}
export interface OrgPreparedCaptureTemplate {
	readonly id: string
	readonly label: string
	readonly entryType: OrgCaptureEntryType
	readonly target: OrgCaptureTarget
	readonly initialSource: string
	/** UTF-16 raw-source caret after expansion. */
	readonly initialCursor: number
}
export interface OrgCaptureRequest {
	readonly entryType: OrgCaptureEntryType
	readonly entrySource: string
	readonly target: OrgCaptureTarget
	/** Explicit preview confirmation; changed targets reject before publication. */
	readonly expectedRevision?: string
}
export interface CaptureOrgEntryInput extends OrgCaptureRequest {
	readonly workspaceRoot: string
	readonly capabilityToken?: string
}
export interface OrgCaptureTargetPreview {
	readonly headingPath: readonly string[]
	readonly line: number
	readonly createdHeadings: readonly string[]
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
