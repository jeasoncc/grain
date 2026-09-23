import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { type OrgFileRepository, orgFileRepository } from "@/io/file/org-file.repository"
import { appendOrgTodoCapture } from "@/pipes/org/org-text.pipe"
import type {
	CaptureOrgTodoInput,
	CreateOrgDirectoryInput,
	DeleteOrgDocumentInput,
	MoveOrgDocumentInput,
	OpenOrgDocumentInput,
	OrgCaptureValidationError,
	OrgDocumentInterface,
	OrgDocumentWriteResultInterface,
	OrgFileError,
	OrgTodoCaptureResultInterface,
	OrgWorkspaceInterface,
	WriteOrgDocumentInput,
} from "@/types/org"

export type OrgWorkspaceFlowError = OrgFileError
export type OrgTodoCaptureFlowError = OrgFileError | OrgCaptureValidationError

const captureValidationError = (message: string): OrgCaptureValidationError => ({
	message,
	type: "ORG_CAPTURE_VALIDATION_ERROR",
})

const isRelativeOrgPath = (relativePath: string): boolean => {
	const segments = relativePath.split("/")
	return (
		relativePath === relativePath.trim() &&
		!relativePath.startsWith("/") &&
		!relativePath.includes("\\") &&
		/\.org$/.test(relativePath) &&
		segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..")
	)
}

const newOrgDocumentSource = (relativePath: string): string => {
	const filename = relativePath.split("/").at(-1) ?? relativePath
	return `#+title: ${filename.replace(/\.org$/i, "")}\n\n`
}

/** Capture a TODO through revision-checked repository reads and writes only. */
export const captureOrgTodoFlow = (
	input: CaptureOrgTodoInput,
	repository: OrgFileRepository = orgFileRepository,
): TE.TaskEither<OrgTodoCaptureFlowError, OrgTodoCaptureResultInterface> => {
	if (!input.title.trim()) {
		return TE.left(captureValidationError("Org capture title must not be blank."))
	}
	if (!isRelativeOrgPath(input.relativePath)) {
		return TE.left(captureValidationError("Org capture target must be a relative .org path."))
	}
	return pipe(
		repository.scanWorkspace(input.workspaceRoot),
		TE.chain((snapshot) => {
			const exists = snapshot.documents.some(
				(document) => document.relativePath === input.relativePath,
			)
			return exists
				? repository.readDocument(input)
				: TE.right<OrgFileError, OrgDocumentInterface>({
						content: newOrgDocumentSource(input.relativePath),
						relativePath: input.relativePath,
						revision: "<missing>",
					})
		}),
		TE.chain((document) => {
			const content = appendOrgTodoCapture(document.content, input.title)
			return pipe(
				repository.writeDocument({
					content,
					expectedRevision: document.revision,
					relativePath: input.relativePath,
					workspaceRoot: input.workspaceRoot,
				}),
				TE.map((written) => ({ ...written, content })),
			)
		}),
	)
}

/** Scan a known filesystem path without reading or changing application state. */
export const scanOrgWorkspaceFlow = (
	rootPath: string,
	repository: OrgFileRepository = orgFileRepository,
): TE.TaskEither<OrgFileError, OrgWorkspaceInterface> =>
	pipe(
		repository.scanWorkspace(rootPath),
		TE.map((snapshot) => ({ ...snapshot, rootPath })),
	)

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

/** Delete an Org document with revision conflict protection. */
export const deleteOrgDocumentFlow = (
	input: DeleteOrgDocumentInput,
	repository: OrgFileRepository = orgFileRepository,
): TE.TaskEither<OrgFileError, void> => repository.deleteDocument(input)

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
