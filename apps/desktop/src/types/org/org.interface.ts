/** A lightweight Org document discovered while scanning a workspace. */
export interface OrgDocumentEntryInterface {
	readonly relativePath: string
	readonly revision: string
}

/** A filesystem scan result containing both files and real directories. */
export interface OrgWorkspaceScanInterface {
	readonly documents: readonly OrgDocumentEntryInterface[]
	readonly directories: readonly string[]
}

/** A selected filesystem workspace and its discovered Org tree. */
export interface OrgWorkspaceInterface extends OrgWorkspaceScanInterface {
	readonly rootPath: string
}

/** Filesystem invalidation emitted for one active Org workspace watch. */
export interface OrgWorkspaceChangedEventInterface {
	readonly workspaceRoot: string
	readonly token: string
	readonly paths: readonly string[]
}

export type OrgWorkspaceWatchToken = string

export interface OrgTreeDirectoryInterface {
	readonly type: "directory"
	readonly name: string
	readonly relativePath: string
	readonly children: readonly OrgTreeEntryInterface[]
}

export interface OrgTreeDocumentInterface extends OrgDocumentEntryInterface {
	readonly type: "document"
	readonly name: string
}

export type OrgTreeEntryInterface = OrgTreeDirectoryInterface | OrgTreeDocumentInterface

/** An opened Org document. Content is kept verbatim at the IO boundary. */
export interface OrgDocumentInterface extends OrgDocumentEntryInterface {
	readonly content: string
}

export interface OpenOrgDocumentInput {
	readonly workspaceRoot: string
	readonly relativePath: string
}

/** Input accepted when persisting an Org document. */
export interface WriteOrgDocumentInput extends OpenOrgDocumentInput {
	readonly content: string
	readonly expectedRevision: string
}

export interface CaptureOrgTodoInput extends OpenOrgDocumentInput {
	readonly title: string
}

export type OrgTodoCaptureResultInterface = OrgDocumentInterface

export interface OrgCaptureValidationError {
	readonly type: "ORG_CAPTURE_VALIDATION_ERROR"
	readonly message: string
}

export interface CreateOrgDirectoryInput {
	readonly workspaceRoot: string
	readonly relativePath: string
}

export interface MoveOrgDocumentInput {
	readonly workspaceRoot: string
	readonly sourceRelativePath: string
	readonly targetRelativePath: string
	readonly expectedSourceRevision: string
}

export interface DeleteOrgDocumentInput extends OpenOrgDocumentInput {
	readonly expectedRevision: string
}

/** One file in an atomic legacy-migration write batch. */
export interface OrgMigrationArtifactInterface {
	readonly relativePath: string
	readonly content: string
}

/** Input for installing a complete migration plan below an approved Org workspace. */
export interface WriteOrgMigrationInput {
	readonly workspaceRoot: string
	readonly directories: readonly string[]
	readonly artifacts: readonly OrgMigrationArtifactInterface[]
}

export interface OrgMigrationArtifactSummaryInterface {
	readonly relativePath: string
	readonly byteLength: number
	readonly revision: string
}

export interface OrgMigrationRecoveryBackupInterface {
	readonly path: string
	readonly contentId: string
	readonly contentType: "lexical" | "excalidraw" | "text"
	readonly nodeId: string
	readonly version: string
	readonly createdAt: string
	readonly updatedAt: string
	readonly content: string
}

export interface OrgMigrationRecoveryBundleInterface {
	readonly manifest: string
	readonly rawBackups: readonly OrgMigrationRecoveryBackupInterface[]
	readonly recoverySql: string | null
}

export interface OrgMigrationWriteResultInterface {
	readonly writtenPaths: readonly string[]
	readonly verificationPath: string
	readonly artifacts: readonly OrgMigrationArtifactSummaryInterface[]
}

export interface VerifyOrgMigrationInput {
	readonly workspaceRoot: string
	readonly verificationPath: string
	readonly expectedArtifacts: readonly OrgMigrationArtifactSummaryInterface[]
}

export interface OrgMigrationVerificationMismatchInterface {
	readonly relativePath: string
	readonly expectedByteLength: number
	readonly actualByteLength: number | null
	readonly expectedRevision: string
	readonly actualRevision: string | null
}

export interface OrgMigrationVerificationResultInterface {
	readonly checkedCount: number
	readonly mismatches: readonly OrgMigrationVerificationMismatchInterface[]
}

export type OrgDocumentWriteResultInterface = OrgDocumentEntryInterface

/** Disposable search/index rows derived exclusively from revision-checked Org reads. */
export interface OrgIndexDocumentInput {
	readonly relativePath: string
	readonly revision: string
	readonly title: string | null
}

export interface OrgIndexHeadingInput {
	readonly relativePath: string
	readonly line: number
	readonly level: number
	readonly title: string
	readonly todoKeyword: string | null
	readonly orgId: string | null
	readonly customId: string | null
}

export interface OrgIndexLinkInput {
	readonly sourceRelativePath: string
	readonly line: number
	readonly column: number
	readonly targetKind: "file" | "id" | "custom-id"
	readonly targetRelativePath: string | null
	readonly targetValue: string | null
	readonly label: string
}

export interface OrgIndexAgendaInput {
	readonly relativePath: string
	readonly line: number
	readonly column: number
	readonly kind: "deadline" | "scheduled" | "timestamp"
	readonly date: string
	readonly heading: string | null
	readonly todoKeyword: string | null
}

export interface OrgDerivedIndexInput {
	readonly documents: readonly OrgIndexDocumentInput[]
	readonly headings: readonly OrgIndexHeadingInput[]
	readonly links: readonly OrgIndexLinkInput[]
	readonly agenda: readonly OrgIndexAgendaInput[]
}

export interface OrgDerivedIndexStats {
	readonly documentCount: number
	readonly headingCount: number
	readonly linkCount: number
	readonly agendaCount: number
}

export type OrgFileOperation =
	| "openDefaultWorkspace"
	| "reopenDefaultWorkspace"
	| "select"
	| "scan"
	| "watch"
	| "unwatch"
	| "read"
	| "release"
	| "write"
	| "writeMigration"
	| "verifyMigration"
	| "readMigrationRecovery"
	| "replaceDerivedIndex"
	| "clearDerivedIndex"
	| "getDerivedIndexStats"
	| "createDirectory"
	| "move"
	| "delete"

/** A command-specific failure raised by the Org filesystem boundary. */
export interface OrgFileError {
	readonly type: "ORG_FILE_ERROR"
	readonly operation: OrgFileOperation
	readonly command: string
	readonly message: string
	readonly cause: unknown
}
