import { invoke } from "@tauri-apps/api/core"
import * as TE from "fp-ts/TaskEither"
import { decodeLegacyRecoveryBundle } from "@/pipes/migration/migration.plan.fn"
import type {
	CreateOrgDirectoryInput,
	DeleteOrgDocumentInput,
	MoveOrgDocumentInput,
	OpenOrgDocumentInput,
	OrgDerivedIndexInput,
	OrgDerivedIndexStats,
	OrgDocumentInterface,
	OrgDocumentWriteResultInterface,
	OrgFileError,
	OrgFileOperation,
	OrgMigrationRecoveryBundleInterface,
	OrgMigrationVerificationResultInterface,
	OrgMigrationWriteResultInterface,
	OrgOriginalRecoveryEntryInterface,
	OrgWorkspaceInterface,
	OrgWorkspaceScanInterface,
	OrgWorkspaceWatchToken,
	VerifyOrgMigrationInput,
	WriteOrgDocumentInput,
	WriteOrgMigrationInput,
} from "@/types/org"

export const ORG_FILE_COMMANDS = {
	clearDerivedIndex: "clear_org_derived_index",
	createDirectory: "create_org_directory",
	delete: "delete_org_document",
	getDerivedIndexStats: "get_org_derived_index_stats",
	move: "move_org_document",
	openDefault: "open_default_org_workspace",
	read: "read_org_document",
	readMigrationRecovery: "read_org_migration_recovery_bundle",
	release: "release_org_workspace",
	reopenDefault: "reopen_default_org_workspace",
	replaceDerivedIndex: "replace_org_derived_index",
	scan: "scan_org_workspace",
	select: "select_org_workspace",
	unwatch: "unwatch_org_workspace",
	verifyMigration: "verify_org_migration",
	watch: "watch_org_workspace",
	write: "write_org_document",
	writeMigration: "write_org_migration",
} as const

export type InvokeCommand = <Result>(
	command: string,
	payload?: Record<string, unknown>,
) => Promise<Result>

export interface OrgFileRepository {
	readonly clearDerivedIndex: (
		workspaceRoot: string,
		capabilityToken?: string,
	) => TE.TaskEither<OrgFileError, OrgDerivedIndexStats>
	readonly getDerivedIndexStats: (
		workspaceRoot: string,
		capabilityToken?: string,
	) => TE.TaskEither<OrgFileError, OrgDerivedIndexStats>
	readonly replaceDerivedIndex: (
		workspaceRoot: string,
		payload: OrgDerivedIndexInput,
		capabilityToken?: string,
	) => TE.TaskEither<OrgFileError, OrgDerivedIndexStats>
	readonly createDirectory: (input: CreateOrgDirectoryInput) => TE.TaskEither<OrgFileError, void>
	readonly deleteDocument: (input: DeleteOrgDocumentInput) => TE.TaskEither<OrgFileError, OrgOriginalRecoveryEntryInterface>
	readonly moveDocument: (
		input: MoveOrgDocumentInput,
	) => TE.TaskEither<OrgFileError, OrgDocumentWriteResultInterface>
	readonly openDefaultWorkspace: () => TE.TaskEither<OrgFileError, OrgWorkspaceInterface>
	readonly reopenDefaultWorkspace: () => TE.TaskEither<OrgFileError, OrgWorkspaceInterface | null>
	readonly selectWorkspace: () => TE.TaskEither<OrgFileError, OrgWorkspaceInterface | null>
	readonly releaseWorkspace: (
		workspaceRoot: string,
		capabilityToken?: string,
	) => TE.TaskEither<OrgFileError, void>
	readonly scanWorkspace: (
		workspaceRoot: string,
		capabilityToken?: string,
	) => TE.TaskEither<OrgFileError, OrgWorkspaceScanInterface>
	readonly watchWorkspace: (
		workspaceRoot: string,
		capabilityToken?: string,
	) => TE.TaskEither<OrgFileError, OrgWorkspaceWatchToken>
	readonly unwatchWorkspace: (
		token: OrgWorkspaceWatchToken,
		workspaceRoot?: string,
		capabilityToken?: string,
	) => TE.TaskEither<OrgFileError, void>
	readonly readDocument: (
		input: OpenOrgDocumentInput,
	) => TE.TaskEither<OrgFileError, OrgDocumentInterface>
	readonly readMigrationRecovery: (
		workspaceRoot: string,
		manifestRelativePath: string,
		capabilityToken?: string,
	) => TE.TaskEither<OrgFileError, OrgMigrationRecoveryBundleInterface>
	readonly writeDocument: (
		document: WriteOrgDocumentInput,
	) => TE.TaskEither<OrgFileError, OrgDocumentWriteResultInterface>
	readonly writeMigration: (
		input: WriteOrgMigrationInput,
	) => TE.TaskEither<OrgFileError, OrgMigrationWriteResultInterface>
	readonly verifyMigration: (
		input: VerifyOrgMigrationInput,
	) => TE.TaskEither<OrgFileError, OrgMigrationVerificationResultInterface>
}

const errorMessage = (cause: unknown): string => {
	if (cause instanceof Error) {
		return cause.message
	}
	if (typeof cause === "object" && cause !== null && "message" in cause && typeof cause.message === "string") {
		return cause.message
	}
	return typeof cause === "string" ? cause : String(cause)
}

const mapCommandError = (
	operation: OrgFileOperation,
	command: string,
	cause: unknown,
): OrgFileError => ({
	cause,
	command,
	message: `${command} failed: ${errorMessage(cause)}`,
	operation,
	type: "ORG_FILE_ERROR",
})

/** Only this typed native read envelope proves absence; text/scan omission never does. */
export const isAuthorizedOrgPathAbsent = (error: OrgFileError, relativePath: string): boolean => {
	const cause = error.cause
	return error.type === "ORG_FILE_ERROR" && error.operation === "read" &&
		error.command === ORG_FILE_COMMANDS.read && typeof cause === "object" && cause !== null &&
		"kind" in cause && cause.kind === "document-path-absent" &&
		"relativePath" in cause && cause.relativePath === relativePath &&
		"authorizedObservation" in cause && cause.authorizedObservation === true
}

const invokeTask = <Result>(
	invokeCommand: InvokeCommand,
	operation: OrgFileOperation,
	command: string,
	payload: Record<string, unknown>,
): TE.TaskEither<OrgFileError, Result> =>
	TE.tryCatch(
		() => invokeCommand<Result>(command, payload),
		(cause) => mapCommandError(operation, command, cause),
	)

// Omit absent grants for legacy fixtures; native commands enforce approval.
const capabilityPayload = (capabilityToken?: string): Record<string, unknown> =>
	capabilityToken === undefined ? {} : { capabilityToken }

/** Creates a repository whose only side effect is the supplied Tauri command invoker. */
export const createOrgFileRepository = (
	invokeCommand: InvokeCommand = invoke,
): OrgFileRepository => ({
	clearDerivedIndex: (workspaceRoot, capabilityToken) =>
		invokeTask<OrgDerivedIndexStats>(
			invokeCommand,
			"clearDerivedIndex",
			ORG_FILE_COMMANDS.clearDerivedIndex,
			{
				...capabilityPayload(capabilityToken),
				workspaceRoot,
			},
		),
	createDirectory: ({ workspaceRoot, relativePath, capabilityToken }) =>
		invokeTask<void>(invokeCommand, "createDirectory", ORG_FILE_COMMANDS.createDirectory, {
			...capabilityPayload(capabilityToken),
			relativePath,
			workspaceRoot,
		}),
	deleteDocument: ({ workspaceRoot, relativePath, expectedRevision, capabilityToken }) =>
		invokeTask<OrgOriginalRecoveryEntryInterface>(invokeCommand, "delete", ORG_FILE_COMMANDS.delete, {
			...capabilityPayload(capabilityToken),
			expectedRevision,
			relativePath,
			workspaceRoot,
		}),
	getDerivedIndexStats: (workspaceRoot, capabilityToken) =>
		invokeTask<OrgDerivedIndexStats>(
			invokeCommand,
			"getDerivedIndexStats",
			ORG_FILE_COMMANDS.getDerivedIndexStats,
			{ ...capabilityPayload(capabilityToken), workspaceRoot },
		),
	moveDocument: ({
		workspaceRoot,
		sourceRelativePath,
		targetRelativePath,
		expectedSourceRevision,
		capabilityToken,
	}) =>
		invokeTask<OrgDocumentWriteResultInterface>(invokeCommand, "move", ORG_FILE_COMMANDS.move, {
			...capabilityPayload(capabilityToken),
			expectedSourceRevision,
			sourceRelativePath,
			targetRelativePath,
			workspaceRoot,
		}),
	openDefaultWorkspace: () =>
		invokeTask<OrgWorkspaceInterface>(
			invokeCommand,
			"openDefaultWorkspace",
			ORG_FILE_COMMANDS.openDefault,
			{},
		),
	readDocument: ({ workspaceRoot, relativePath, capabilityToken }) =>
		invokeTask<OrgDocumentInterface>(invokeCommand, "read", ORG_FILE_COMMANDS.read, {
			...capabilityPayload(capabilityToken),
			relativePath,
			workspaceRoot,
		}),
	readMigrationRecovery: (workspaceRoot, manifestRelativePath, capabilityToken) =>
		TE.tryCatch(
			async () => decodeLegacyRecoveryBundle(await invokeCommand<unknown>(
				ORG_FILE_COMMANDS.readMigrationRecovery,
				{ ...capabilityPayload(capabilityToken), manifestRelativePath, workspaceRoot },
			)),
			(cause) => mapCommandError("readMigrationRecovery", ORG_FILE_COMMANDS.readMigrationRecovery, cause),
		),
	releaseWorkspace: (workspaceRoot, capabilityToken) =>
		capabilityToken
			? invokeTask<void>(invokeCommand, "release", ORG_FILE_COMMANDS.release, {
					capabilityToken,
					workspaceRoot,
				})
			: TE.left(
					mapCommandError(
						"release",
						ORG_FILE_COMMANDS.release,
						"Missing workspace capability token",
					),
				),
	reopenDefaultWorkspace: () =>
		invokeTask<OrgWorkspaceInterface | null>(
			invokeCommand,
			"reopenDefaultWorkspace",
			ORG_FILE_COMMANDS.reopenDefault,
			{},
		),
	replaceDerivedIndex: (workspaceRoot, payload, capabilityToken) =>
		invokeTask<OrgDerivedIndexStats>(
			invokeCommand,
			"replaceDerivedIndex",
			ORG_FILE_COMMANDS.replaceDerivedIndex,
			{
				...capabilityPayload(capabilityToken),
				payload,
				workspaceRoot,
			},
		),
	scanWorkspace: (workspaceRoot, capabilityToken) =>
		invokeTask<OrgWorkspaceScanInterface>(invokeCommand, "scan", ORG_FILE_COMMANDS.scan, {
			...capabilityPayload(capabilityToken),
			workspaceRoot,
		}),
	selectWorkspace: () =>
		invokeTask<OrgWorkspaceInterface | null>(invokeCommand, "select", ORG_FILE_COMMANDS.select, {}),
	unwatchWorkspace: (token, workspaceRoot, capabilityToken) =>
		invokeTask<void>(invokeCommand, "unwatch", ORG_FILE_COMMANDS.unwatch, {
			...capabilityPayload(capabilityToken),
			...(workspaceRoot === undefined ? {} : { workspaceRoot }),
			token,
		}),
	verifyMigration: ({ workspaceRoot, verificationPath, expectedArtifacts, capabilityToken }) =>
		invokeTask<OrgMigrationVerificationResultInterface>(
			invokeCommand,
			"verifyMigration",
			ORG_FILE_COMMANDS.verifyMigration,
			{ ...capabilityPayload(capabilityToken), expectedArtifacts, verificationPath, workspaceRoot },
		),
	watchWorkspace: (workspaceRoot, capabilityToken) =>
		invokeTask<OrgWorkspaceWatchToken>(invokeCommand, "watch", ORG_FILE_COMMANDS.watch, {
			...capabilityPayload(capabilityToken),
			workspaceRoot,
		}),
	writeDocument: ({ workspaceRoot, relativePath, content, expectedRevision, capabilityToken }) =>
		invokeTask<OrgDocumentWriteResultInterface>(invokeCommand, "write", ORG_FILE_COMMANDS.write, {
			...capabilityPayload(capabilityToken),
			content,
			expectedRevision,
			relativePath,
			workspaceRoot,
		}),
	writeMigration: ({ workspaceRoot, directories, artifacts, capabilityToken }) =>
		invokeTask<OrgMigrationWriteResultInterface>(
			invokeCommand,
			"writeMigration",
			ORG_FILE_COMMANDS.writeMigration,
			{ ...capabilityPayload(capabilityToken), artifacts, directories, workspaceRoot },
		),
})

export const orgFileRepository = createOrgFileRepository()

export const clearOrgDerivedIndex = orgFileRepository.clearDerivedIndex
export const getOrgDerivedIndexStats = orgFileRepository.getDerivedIndexStats
export const replaceOrgDerivedIndex = orgFileRepository.replaceDerivedIndex
export const createOrgDirectory = orgFileRepository.createDirectory
export const deleteOrgDocument = orgFileRepository.deleteDocument
export const moveOrgDocument = orgFileRepository.moveDocument
export const openDefaultOrgWorkspace = orgFileRepository.openDefaultWorkspace
export const reopenDefaultOrgWorkspace = orgFileRepository.reopenDefaultWorkspace
export const selectOrgWorkspace = orgFileRepository.selectWorkspace
export const scanOrgWorkspace = orgFileRepository.scanWorkspace
export const watchOrgWorkspace = orgFileRepository.watchWorkspace
export const unwatchOrgWorkspace = orgFileRepository.unwatchWorkspace
export const readOrgDocument = orgFileRepository.readDocument
export const readOrgMigrationRecovery = orgFileRepository.readMigrationRecovery
export const releaseOrgWorkspace = orgFileRepository.releaseWorkspace
export const verifyOrgMigration = orgFileRepository.verifyMigration
export const writeOrgDocument = orgFileRepository.writeDocument
export const writeOrgMigration = orgFileRepository.writeMigration
