import * as E from "fp-ts/Either"
import type {
	CaptureOrgEntryInput,
	OrgCaptureEntryType,
	OrgCaptureTarget,
	OrgCaptureValidationError,
} from "@/types/editor/org-capture.interface"
import { isSafeRelativeOrgPath } from "./org-subtree-refile.pipe"
import { isOrgCalendarISO } from "./org-date-reader.pipe"


const invalid = (message: string): OrgCaptureValidationError => ({
	type: "ORG_CAPTURE_VALIDATION_ERROR",
	message,
})

export const isOrgCaptureTargetPath = (path: string): boolean =>
	typeof path === "string" && isSafeRelativeOrgPath(path) && !/[\x00-\x1f\x7f:]/.test(path)

export const isOrgCaptureEntryType = (value: unknown): value is OrgCaptureEntryType =>
	value === "entry" || value === "plain" || value === "item" || value === "checkitem" || value === "table-line"

/** Untrusted configuration/recovery data cannot acquire a different destination. */
export const validateOrgCaptureTarget = (target: unknown): E.Either<OrgCaptureValidationError, OrgCaptureTarget> => {
	if (typeof target !== "object" || target === null || Array.isArray(target))
		return E.left(invalid("Capture target must be declarative data."))
	const fields = target as Record<string, unknown>
	if (typeof fields.relativePath !== "string" || !isOrgCaptureTargetPath(fields.relativePath))
		return E.left(invalid("Capture target must be a safe relative .org path."))
	const path = fields.relativePath
	const allowed = fields.kind === "file" ? ["kind", "relativePath"] :
		fields.kind === "heading" ? ["kind", "relativePath", "headingPath"] :
		fields.kind === "datetree" ? ["kind", "relativePath", "headingPath", "date"] : []
	if (!allowed.length || Object.keys(fields).some((key) => !allowed.includes(key)))
		return E.left(invalid("Capture target kind or fields are unsupported."))
	if (fields.kind === "file") return E.right(Object.freeze({ kind: "file", relativePath: path }))
	const headings = fields.headingPath
	if (
		(fields.kind === "heading" || headings !== undefined) &&
		(!Array.isArray(headings) || (fields.kind === "heading" && !headings.length) ||
			headings.some((heading: unknown) => typeof heading !== "string" || !heading.trim() || /[\r\n\x00-\x1f\x7f]/.test(heading)))
	) return E.left(invalid("Capture heading path must contain nonblank single-line titles."))
	const headingPath = Array.isArray(headings) ? Object.freeze([...headings] as string[]) : undefined
	if (fields.kind === "heading")
		return E.right(Object.freeze({ kind: "heading", relativePath: path, headingPath: headingPath! }))
	if (!isOrgCalendarISO(fields.date))
		return E.left(invalid("Capture datetree requires a real frozen local ISO date."))
	return E.right(Object.freeze({
		kind: "datetree", relativePath: path, date: fields.date,
		...(headingPath ? { headingPath } : {}),
	}))
}


const validateCaptureEntry = (
	entrySource: string,
	requireMeaningful: boolean,
): E.Either<OrgCaptureValidationError, string> => {
	if (typeof entrySource !== "string")
		return E.left(invalid("Capture entry source must be a string."))
	const firstLine = entrySource.split(/\r\n|\r|\n/).find((line) => line.trim().length > 0) ?? ""
	const heading = /^\*[ \t]+(.*)$/.exec(firstLine)
	if (!heading) return E.left(invalid("Capture entry must start with a level-one heading."))
	if (requireMeaningful) {
		const title = heading[1].replace(/^(?:TODO|DONE)(?:[ \t]+|$)/, "").trim()
		if (!title || !/[^\s\x00-\x1f\x7f]/u.test(title))
			return E.left(invalid("Capture entry must start with a level-one heading with a title."))
	}
	return E.right(entrySource)
}

const validateCaptureSource = (
	source: string,
	entryType: OrgCaptureEntryType,
	requireMeaningful: boolean,
): E.Either<OrgCaptureValidationError, string> => {
	if (!isOrgCaptureEntryType(entryType)) return E.left(invalid("Capture entry type is unsupported."))
	if (entryType === "entry") return validateCaptureEntry(source, requireMeaningful)
	if (typeof source !== "string" || (requireMeaningful && !/[^\s\x00-\x1f\x7f]/u.test(source)))
		return E.left(invalid("Capture source must contain meaningful text."))
	if (entryType === "plain") return E.right(source)
	const lines = source.split(/\r\n|\r|\n/).filter((line) => line.trim())
	const first = lines[0] ?? ""
	if (entryType === "table-line")
		return lines.length > 0 && lines.every((line) => /^[ \t]*\|.*\|[ \t]*$/.test(line)) &&
			(!requireMeaningful || lines.some((line) => /[^\s|+\-\x00-\x1f\x7f]/u.test(line)))
			? E.right(source) : E.left(invalid("Capture table-line source must contain a meaningful Org table row."))
	const item = /^(?:[ \t]*(?:[-+]|[0-9]+[.)]|[a-zA-Z][.)])|[ \t]+\*)[ \t]+(.*)$/.exec(first)
	const checkbox = entryType === "checkitem" ? /^\[(?: |X|-)\](?:[ \t]+(.*))?$/.exec(item?.[1] ?? "") : null
	const text = entryType === "checkitem" ? checkbox ? checkbox[1] ?? "" : undefined : item?.[1]
	return text !== undefined && (!requireMeaningful || /[^\s\x00-\x1f\x7f]/u.test(text))
		? E.right(source) : E.left(invalid("Capture list source must start with a meaningful item of its declared type."))
}

/** Zero-width cursors may leave an editable title/cell empty, never alter the declared structure. */
export const validateOrgCaptureDraftShape = (source: string, entryType: OrgCaptureEntryType) =>
	validateCaptureSource(source, entryType, false)

/** Finish requires actual meaningful content; template tokens are already literal. */
export const validateOrgCaptureSource = (source: string, entryType: OrgCaptureEntryType) =>
	validateCaptureSource(source, entryType, true)

export const validateOrgCaptureEntry = (entrySource: string) =>
	validateCaptureEntry(entrySource, true)

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
	const target = validateOrgCaptureTarget(input.target)
	if (E.isLeft(target)) return target
	if (input.expectedRevision !== undefined &&
		(typeof input.expectedRevision !== "string" || !input.expectedRevision.trim()))
		return E.left(invalid("Capture preview revision is invalid."))
	const entry = validateOrgCaptureSource(input.entrySource, input.entryType)
	return E.isLeft(entry) ? entry : E.right({
		workspaceRoot: input.workspaceRoot,
		...(input.capabilityToken === undefined ? {} : { capabilityToken: input.capabilityToken }),
		entryType: input.entryType,
		entrySource: entry.right,
		target: target.right,
		...(input.expectedRevision === undefined ? {} : { expectedRevision: input.expectedRevision }),
	})
}


export const orgCaptureDocumentHeader = (
	relativePath: string,
): E.Either<OrgCaptureValidationError, string> => {
	if (!isOrgCaptureTargetPath(relativePath))
		return E.left(invalid("Capture target must be a safe relative .org path."))
	const title = relativePath.slice(relativePath.lastIndexOf("/") + 1, -4)
	return E.right(`#+title: ${title}\n\n`)
}
