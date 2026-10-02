import * as E from "fp-ts/Either"
import type {
	CaptureOrgEntryInput,
	OrgCaptureTemplate,
	OrgCaptureValidationError,
} from "@/types/editor/org-capture.interface"
import { appendOrgSubtree, isSafeRelativeOrgPath } from "./org-subtree-refile.pipe"
import { orgBlockRanges } from "./org-text.pipe"

export const BUILTIN_ORG_CAPTURE_TEMPLATES: readonly OrgCaptureTemplate[] = Object.freeze([
	Object.freeze({
		id: "todo",
		label: "Todo",
		targetRelativePath: "inbox.org",
		initialSource: "* TODO ",
		initialCursor: 7,
	}),
	Object.freeze({
		id: "note",
		label: "Note",
		targetRelativePath: "inbox.org",
		initialSource: "* ",
		initialCursor: 2,
	}),
])

const invalid = (message: string): OrgCaptureValidationError => ({
	type: "ORG_CAPTURE_VALIDATION_ERROR",
	message,
})

export const isOrgCaptureTargetPath = (path: string): boolean =>
	typeof path === "string" && isSafeRelativeOrgPath(path) && !/[\x00-\x1f\x7f:]/.test(path)

/** Validates literal data, never interpolates or invokes template contents. Date is caller-owned. */
export const prepareOrgCaptureTemplate = (
	template: OrgCaptureTemplate,
	date?: Date,
): E.Either<OrgCaptureValidationError, OrgCaptureTemplate> => {
	if (!template || typeof template.id !== "string" || !/^[a-z][a-z0-9_-]*$/.test(template.id))
		return E.left(invalid("Capture template ID is invalid."))
	if (typeof template.label !== "string" || !template.label.trim())
		return E.left(invalid("Capture template label must not be blank."))
	if (!isOrgCaptureTargetPath(template.targetRelativePath))
		return E.left(invalid("Capture template target must be a safe relative .org path."))
	if (
		typeof template.initialSource !== "string" ||
		!Number.isInteger(template.initialCursor) ||
		template.initialCursor < 0 ||
		template.initialCursor > template.initialSource.length
	)
		return E.left(invalid("Capture template source or cursor is invalid."))
	if (
		date !== undefined &&
		(!(date instanceof Date) || !Number.isFinite(Date.prototype.getTime.call(date)))
	)
		return E.left(invalid("Capture date must be valid when supplied."))
	return E.right({
		id: template.id,
		label: template.label,
		targetRelativePath: template.targetRelativePath,
		initialSource: template.initialSource,
		initialCursor: template.initialCursor,
	})
}

/** The first nonblank line must be a meaningful level-one heading. Source stays verbatim. */
export const validateOrgCaptureEntry = (
	entrySource: string,
): E.Either<OrgCaptureValidationError, string> => {
	if (typeof entrySource !== "string")
		return E.left(invalid("Capture entry source must be a string."))
	const firstLine = entrySource.split(/\r\n|\r|\n/).find((line) => line.trim().length > 0) ?? ""
	const heading = /^\*[ \t]+(.+)$/.exec(firstLine)
	const title = heading?.[1].replace(/^(?:TODO|DONE)(?:[ \t]+|$)/, "").trim() ?? ""
	if (!title || !/[^\s\x00-\x1f\x7f]/u.test(title))
		return E.left(invalid("Capture entry must start with a level-one heading with a title."))
	return E.right(entrySource)
}

export const validateOrgCaptureInput = (
	input: CaptureOrgEntryInput,
): E.Either<OrgCaptureValidationError, CaptureOrgEntryInput> => {
	if (
		!input ||
		typeof input.workspaceRoot !== "string" ||
		!input.workspaceRoot.trim() ||
		/[\x00-\x1f\x7f]/.test(input.workspaceRoot)
	)
		return E.left(invalid("Capture workspace root is invalid."))
	if (
		input.capabilityToken !== undefined &&
		(typeof input.capabilityToken !== "string" || !input.capabilityToken)
	)
		return E.left(invalid("Capture capability token is invalid."))
	if (!isOrgCaptureTargetPath(input.relativePath))
		return E.left(invalid("Capture target must be a safe relative .org path."))
	const entry = validateOrgCaptureEntry(input.entrySource)
	return E.isLeft(entry) ? entry : E.right(input)
}

/** Existing source and raw entry are never normalized; only a required separator is inserted. */
export const appendOrgCaptureEntry = (
	existingSource: string,
	entrySource: string,
): E.Either<OrgCaptureValidationError, string> => {
	const entry = validateOrgCaptureEntry(entrySource)
	if (E.isLeft(entry)) return entry
	if (orgBlockRanges(existingSource).some((block) => !block.closed))
		return E.left(invalid("Capture target has an unclosed Org block; no entry was appended."))
	return E.right(appendOrgSubtree(existingSource, entrySource))
}

export const newOrgCaptureDocumentSource = (
	relativePath: string,
	entrySource: string,
): E.Either<OrgCaptureValidationError, string> => {
	if (!isOrgCaptureTargetPath(relativePath))
		return E.left(invalid("Capture target must be a safe relative .org path."))
	const filename = relativePath.split("/").at(-1) ?? relativePath
	return appendOrgCaptureEntry(`#+title: ${filename.slice(0, -4)}\n\n`, entrySource)
}
