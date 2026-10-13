import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { type OrgFileRepository, orgFileRepository } from "@/io/file/org-file.repository"
import type {
	CreateOrgDirectoryInput,
	DeleteOrgDocumentInput,
	MoveOrgDocumentInput,
	OpenOrgDocumentInput,
	OrgDocumentInterface,
	OrgDocumentWriteResultInterface,
	OrgFileError,
	OrgOriginalRecoveryEntryInterface,
	OrgWorkspaceInterface,
	WriteOrgDocumentInput,
} from "@/types/org"
import type { CaptureOrgEntryInput, OrgCaptureEntryFlowError } from "@/types/editor/org-capture.interface"
import { captureOrgEntryFlow, type OrgCaptureFlowOptions } from "./org-capture-entry.flow"

export type OrgWorkspaceFlowError = OrgFileError
export type OrgTodoCaptureFlowError = OrgCaptureEntryFlowError
export interface CaptureOrgTodoFlowInput extends Omit<CaptureOrgEntryInput, "entryType" | "entrySource"> {
	readonly title: string
}

/** The title convenience shares the configured Capture owner fence and single native CAS. */
export const captureOrgTodoFlow = (
	input: CaptureOrgTodoFlowInput,
	options: OrgCaptureFlowOptions,
): TE.TaskEither<OrgTodoCaptureFlowError, OrgDocumentInterface> =>
	captureOrgEntryFlow({
		workspaceRoot: input.workspaceRoot,
		capabilityToken: input.capabilityToken,
		target: input.target,
		expectedRevision: input.expectedRevision,
		entryType: "entry",
		entrySource: `* TODO ${input.title.trim().replace(/\s*[\r\n]+\s*/g, " ")}\n`,
	}, options)

/** Scan a known filesystem path without reading or changing application state. */
export const scanOrgWorkspaceFlow = (
	rootPath: string,
	capabilityTokenOrRepository?: string | OrgFileRepository,
	repository: OrgFileRepository = orgFileRepository,
): TE.TaskEither<OrgFileError, OrgWorkspaceInterface> => {
	const capabilityToken =
		typeof capabilityTokenOrRepository === "string" ? capabilityTokenOrRepository : undefined
	const selectedRepository =
		typeof capabilityTokenOrRepository === "object" ? capabilityTokenOrRepository : repository
	return pipe(
		selectedRepository.scanWorkspace(rootPath, capabilityToken),
		TE.map((snapshot) => ({
			...snapshot,
			rootPath,
			...(capabilityToken === undefined ? {} : { capabilityToken }),
		})),
	)
}

/** Create or open the fixed Documents/Grain workspace at the trusted Tauri boundary. */
export const openDefaultOrgWorkspaceFlow = (
	repository: OrgFileRepository = orgFileRepository,
): TE.TaskEither<OrgWorkspaceFlowError, OrgWorkspaceInterface> => repository.openDefaultWorkspace()

/** Reopen the fixed default workspace without recreating it when the user removed it. */
export const reopenDefaultOrgWorkspaceFlow = (
	repository: OrgFileRepository = orgFileRepository,
): TE.TaskEither<OrgWorkspaceFlowError, OrgWorkspaceInterface | null> =>
	repository.reopenDefaultWorkspace()

/** Select and approve a directory at the trusted Tauri boundary, then scan it. */
export const selectOrgWorkspaceFlow = (
	repository: OrgFileRepository = orgFileRepository,
): TE.TaskEither<OrgWorkspaceFlowError, OrgWorkspaceInterface | null> =>
	repository.selectWorkspace()

/** Create a directory below an approved Org workspace. */
export const createOrgDirectoryFlow = (
	input: CreateOrgDirectoryInput,
	repository: OrgFileRepository = orgFileRepository,
): TE.TaskEither<OrgFileError, void> => repository.createDirectory(input)

/** Move or rename an Org document with revision conflict protection. */
export const moveOrgDocumentFlow = (
	input: MoveOrgDocumentInput,
	repository: OrgFileRepository = orgFileRepository,
): TE.TaskEither<OrgFileError, OrgDocumentWriteResultInterface> => repository.moveDocument(input)

/** Remove an Org pathname with revision checks while retaining its original inode for recovery. */
export const deleteOrgDocumentFlow = (
	input: DeleteOrgDocumentInput,
	repository: OrgFileRepository = orgFileRepository,
): TE.TaskEither<OrgFileError, OrgOriginalRecoveryEntryInterface> => repository.deleteDocument(input)

/** Open an Org document through the injected filesystem repository. */
export const openOrgDocumentFlow = (
	input: OpenOrgDocumentInput,
	repository: OrgFileRepository = orgFileRepository,
): TE.TaskEither<OrgFileError, OrgDocumentInterface> => repository.readDocument(input)

/** Save an Org document and return its new revision after persistence succeeds. */
export const saveOrgDocumentFlow = (
	document: WriteOrgDocumentInput,
	repository: OrgFileRepository = orgFileRepository,
): TE.TaskEither<OrgFileError, OrgDocumentWriteResultInterface> =>
	repository.writeDocument(document)
