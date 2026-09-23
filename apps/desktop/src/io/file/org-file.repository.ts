import { invoke } from "@tauri-apps/api/core"
import * as TE from "fp-ts/TaskEither"
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
	) => TE.TaskEither<OrgFileError, OrgDerivedIndexStats>
	readonly getDerivedIndexStats: (
		workspaceRoot: string,
	) => TE.TaskEither<OrgFileError, OrgDerivedIndexStats>
	readonly replaceDerivedIndex: (
		workspaceRoot: string,
		payload: OrgDerivedIndexInput,
	) => TE.TaskEither<OrgFileError, OrgDerivedIndexStats>
	readonly createDirectory: (input: CreateOrgDirectoryInput) => TE.TaskEither<OrgFileError, void>
	readonly deleteDocument: (input: DeleteOrgDocumentInput) => TE.TaskEither<OrgFileError, void>
	readonly moveDocument: (
		input: MoveOrgDocumentInput,
	) => TE.TaskEither<OrgFileError, OrgDocumentWriteResultInterface>
	readonly openDefaultWorkspace: () => TE.TaskEither<OrgFileError, OrgWorkspaceInterface>
	readonly reopenDefaultWorkspace: () => TE.TaskEither<OrgFileError, OrgWorkspaceInterface | null>
	readonly selectWorkspace: () => TE.TaskEither<OrgFileError, OrgWorkspaceInterface | null>
	readonly releaseWorkspace: (workspaceRoot: string) => TE.TaskEither<OrgFileError, void>
	readonly scanWorkspace: (
		workspaceRoot: string,
	) => TE.TaskEither<OrgFileError, OrgWorkspaceScanInterface>
	readonly watchWorkspace: (
		workspaceRoot: string,
	) => TE.TaskEither<OrgFileError, OrgWorkspaceWatchToken>
	readonly unwatchWorkspace: (token: OrgWorkspaceWatchToken) => TE.TaskEither<OrgFileError, void>
	readonly readDocument: (
		input: OpenOrgDocumentInput,
	) => TE.TaskEither<OrgFileError, OrgDocumentInterface>
	readonly readMigrationRecovery: (
		workspaceRoot: string,
		manifestRelativePath: string,
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

/** Creates a repository whose only side effect is the supplied Tauri command invoker. */
export const createOrgFileRepository = (
	invokeCommand: InvokeCommand = invoke,
): OrgFileRepository => ({
	clearDerivedIndex: (workspaceRoot) =>
		invokeTask<OrgDerivedIndexStats>(
			invokeCommand,
			"clearDerivedIndex",
			ORG_FILE_COMMANDS.clearDerivedIndex,
			{
				workspaceRoot,
			},
		),
	createDirectory: ({ workspaceRoot, relativePath }) =>
		invokeTask<void>(invokeCommand, "createDirectory", ORG_FILE_COMMANDS.createDirectory, {
			relativePath,
			workspaceRoot,
		}),
	deleteDocument: ({ workspaceRoot, relativePath, expectedRevision }) =>
		invokeTask<void>(invokeCommand, "delete", ORG_FILE_COMMANDS.delete, {
			expectedRevision,
			relativePath,
			workspaceRoot,
		}),
	getDerivedIndexStats: (workspaceRoot) =>
		invokeTask<OrgDerivedIndexStats>(
			invokeCommand,
			"getDerivedIndexStats",
			ORG_FILE_COMMANDS.getDerivedIndexStats,
			{ workspaceRoot },
		),
	moveDocument: ({
		workspaceRoot,
		sourceRelativePath,
		targetRelativePath,
		expectedSourceRevision,
	}) =>
		invokeTask<OrgDocumentWriteResultInterface>(invokeCommand, "move", ORG_FILE_COMMANDS.move, {
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
	readDocument: ({ workspaceRoot, relativePath }) =>
		invokeTask<OrgDocumentInterface>(invokeCommand, "read", ORG_FILE_COMMANDS.read, {
			relativePath,
			workspaceRoot,
		}),
	readMigrationRecovery: (workspaceRoot, manifestRelativePath) =>
		invokeTask<OrgMigrationRecoveryBundleInterface>(
			invokeCommand,
			"readMigrationRecovery",
			ORG_FILE_COMMANDS.readMigrationRecovery,
			{ manifestRelativePath, workspaceRoot },
		),
	releaseWorkspace: (workspaceRoot) =>
		invokeTask<void>(invokeCommand, "release", ORG_FILE_COMMANDS.release, { workspaceRoot }),
	reopenDefaultWorkspace: () =>
		invokeTask<OrgWorkspaceInterface | null>(
			invokeCommand,
			"reopenDefaultWorkspace",
			ORG_FILE_COMMANDS.reopenDefault,
			{},
		),
	replaceDerivedIndex: (workspaceRoot, payload) =>
		invokeTask<OrgDerivedIndexStats>(
			invokeCommand,
			"replaceDerivedIndex",
			ORG_FILE_COMMANDS.replaceDerivedIndex,
			{
				payload,
				workspaceRoot,
			},
		),
	scanWorkspace: (workspaceRoot) =>
		invokeTask<OrgWorkspaceScanInterface>(invokeCommand, "scan", ORG_FILE_COMMANDS.scan, {
			workspaceRoot,
		}),
	selectWorkspace: () =>
		invokeTask<OrgWorkspaceInterface | null>(invokeCommand, "select", ORG_FILE_COMMANDS.select, {}),
	unwatchWorkspace: (token) =>
		invokeTask<void>(invokeCommand, "unwatch", ORG_FILE_COMMANDS.unwatch, { token }),
	verifyMigration: ({ workspaceRoot, verificationPath, expectedArtifacts }) =>
		invokeTask<OrgMigrationVerificationResultInterface>(
			invokeCommand,
			"verifyMigration",
			ORG_FILE_COMMANDS.verifyMigration,
			{ expectedArtifacts, verificationPath, workspaceRoot },
		),
	watchWorkspace: (workspaceRoot) =>
		invokeTask<OrgWorkspaceWatchToken>(invokeCommand, "watch", ORG_FILE_COMMANDS.watch, {
			workspaceRoot,
		}),
	writeDocument: ({ workspaceRoot, relativePath, content, expectedRevision }) =>
		invokeTask<OrgDocumentWriteResultInterface>(invokeCommand, "write", ORG_FILE_COMMANDS.write, {
			content,
			expectedRevision,
			relativePath,
			workspaceRoot,
		}),
	writeMigration: ({ workspaceRoot, directories, artifacts }) =>
		invokeTask<OrgMigrationWriteResultInterface>(
			invokeCommand,
			"writeMigration",
			ORG_FILE_COMMANDS.writeMigration,
			{ artifacts, directories, workspaceRoot },
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
