import * as E from "fp-ts/Either"
import type {
	OrgCaptureConfiguration,
	OrgCaptureTemplate,
	OrgCaptureValidationError,
} from "@/types/editor/org-capture.interface"
import {
	DEFAULT_ORG_CAPTURE_CONFIGURATION,
	validateOrgCaptureTemplate,
} from "./org-capture-template.pipe"

/** Blank settings retain the defaults; a broken override never falls back silently. */
export const parseOrgCaptureConfiguration = (
	raw: string,
): E.Either<OrgCaptureValidationError, OrgCaptureConfiguration> => {
	const invalid = (message: string): E.Either<OrgCaptureValidationError, never> => E.left({
		type: "ORG_CAPTURE_VALIDATION_ERROR",
		message,
	})
	if (typeof raw !== "string") return invalid("Capture configuration must be JSON text.")
	if (!raw.trim()) return E.right(DEFAULT_ORG_CAPTURE_CONFIGURATION)
	let parsed: unknown
	try {
		parsed = JSON.parse(raw)
	} catch (error) {
		return invalid(`Capture configuration must be valid JSON: ${error instanceof Error ? error.message : "invalid JSON"}`)
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
		return invalid("Capture configuration must be a JSON object.")
	const fields = parsed as Record<string, unknown>
	const allowed = ["version", "templates", "draftRecovery"]
	if (Object.keys(fields).some((key) => !allowed.includes(key)))
		return invalid("Capture configuration only accepts version, templates, and draftRecovery fields.")
	if (fields.version !== 1)
		return invalid("Capture configuration version must be 1.")
	if (!Array.isArray(fields.templates))
		return invalid("Capture configuration templates must be an array.")
	if (typeof fields.draftRecovery !== "boolean")
		return invalid("Capture configuration draftRecovery must be true or false (plaintext recovery is opt-in).")
	const templates: OrgCaptureTemplate[] = []
	const ids = new Set<string>()
	for (const [index, value] of fields.templates.entries()) {
		const template = validateOrgCaptureTemplate(value)
		if (E.isLeft(template)) return invalid(`Capture template ${index + 1}: ${template.left.message}`)
		if (ids.has(template.right.id))
			return invalid(`Capture template IDs must be unique; duplicate ID "${template.right.id}".`)
		ids.add(template.right.id)
		templates.push(template.right)
	}
	return E.right(Object.freeze({
		version: 1,
		templates: Object.freeze(templates),
		draftRecovery: fields.draftRecovery,
	}))
}
