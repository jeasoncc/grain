import * as E from "fp-ts/Either"
import { isSafeRelativeOrgPath } from "./org-subtree-refile.pipe"
import { orgMatchRegExp, parseOrgSparseTreeMatchQuery, type OrgMatchRegExp } from "./org-sparse-tree-query.pipe"
import { DEFAULT_ORG_DATE_READER_POLICY, type OrgDateReaderPolicy } from "./org-date-reader.pipe"

export interface OrgInheritanceConfiguration {
	/** Boolean, exact-name allowlist, or declarative GNU/Emacs regular expression. */
	readonly tags: boolean | readonly string[] | string
	readonly tagExclusions: readonly string[]
	readonly properties: boolean | readonly string[] | string
	readonly propertyExclusions: readonly string[]
}
export interface OrgLoggingPreferences {
	readonly done: "none" | "time" | "note"
	readonly repeat: "none" | "time" | "note"
	readonly reschedule: "none" | "time" | "note"
	readonly redeadline: "none" | "time" | "note"
	readonly refile: "none" | "time" | "note"
	readonly repeatToState: string | boolean
}
export interface OrgBehaviorConfiguration {
	readonly version: 1
	readonly refile: {
		/** null retains all workspace Org files, including the current file. */
		readonly files: readonly string[] | null
		readonly maxDepth: number | null
		readonly includeRoot: boolean
		/** Standard Org match expression, using the same Sparse Tree parser. */
		readonly match: string | null
	}
	readonly inheritance: OrgInheritanceConfiguration
	readonly dateReader: OrgDateReaderPolicy
	readonly logging: OrgLoggingPreferences
}
export const DEFAULT_ORG_BEHAVIOR_CONFIGURATION: OrgBehaviorConfiguration = Object.freeze({
	version: 1,
	refile: Object.freeze({ files: null, maxDepth: null, includeRoot: true, match: null }),
	inheritance: Object.freeze({ tags: true, tagExclusions: Object.freeze([]), properties: false, propertyExclusions: Object.freeze([]) }),
	dateReader: DEFAULT_ORG_DATE_READER_POLICY,
	logging: Object.freeze({ done: "none", repeat: "time", reschedule: "none", redeadline: "none", refile: "none", repeatToState: false }),
})
export interface OrgBehaviorConfigurationError {
	readonly type: "ORG_BEHAVIOR_CONFIGURATION_ERROR"
	readonly message: string
}
const object = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value)
const closed = (value: Record<string, unknown>, fields: readonly string[]) =>
	Object.keys(value).length === fields.length && Object.keys(value).every((key) => fields.includes(key))
const names = (value: unknown): value is string[] => Array.isArray(value) &&
	value.every((name) => typeof name === "string" && name.length > 0 && !/[\s:]/.test(name)) && new Set(value).size === value.length
const policy = (value: unknown): value is boolean | string[] | string => {
	if (typeof value === "boolean" || names(value)) return true
	if (typeof value !== "string" || !value || value.length > 8192) return false
	try { orgMatchRegExp(value) } catch { return false }
	return true
}

/** Blank preserves existing behavior. Invalid overrides fail closed, never silently default. */
export const parseOrgBehaviorConfiguration = (raw: string): E.Either<OrgBehaviorConfigurationError, OrgBehaviorConfiguration> => {
	const invalid = (message: string) => E.left<OrgBehaviorConfigurationError, OrgBehaviorConfiguration>({ type: "ORG_BEHAVIOR_CONFIGURATION_ERROR", message })
	if (typeof raw !== "string") return invalid("Org behavior configuration must be JSON text.")
	if (!raw.trim()) return E.right(DEFAULT_ORG_BEHAVIOR_CONFIGURATION)
	let value: unknown
	try { value = JSON.parse(raw) } catch (error) {
		return invalid(`Org behavior configuration must be valid JSON: ${error instanceof Error ? error.message : "invalid JSON"}`)
	}
	if (!object(value) || value.version !== 1 || !Object.hasOwn(value, "refile") || !Object.hasOwn(value, "inheritance") || Object.keys(value).some((key) => !["version", "refile", "inheritance", "dateReader", "logging"].includes(key)))
		return invalid("Org behavior configuration requires version (1), refile, and inheritance; only dateReader and logging are optional.")
	const dateReader = Object.hasOwn(value, "dateReader") ? value.dateReader : DEFAULT_ORG_BEHAVIOR_CONFIGURATION.dateReader
	if (!object(dateReader) || !closed(dateReader, ["preferFuture", "forceCompatibleYears"]) ||
		dateReader.preferFuture !== true && dateReader.preferFuture !== false && dateReader.preferFuture !== "time" || typeof dateReader.forceCompatibleYears !== "boolean")
		return invalid("Date reader requires preferFuture (true, false, or \"time\") and forceCompatibleYears (boolean).")
	const logging = Object.hasOwn(value, "logging") ? value.logging : DEFAULT_ORG_BEHAVIOR_CONFIGURATION.logging
	if (!object(logging) || !closed(logging, ["done", "repeat", "reschedule", "redeadline", "refile", "repeatToState"]) ||
		!["done", "repeat", "reschedule", "redeadline", "refile"].every((key) => logging[key] === "none" || logging[key] === "time" || logging[key] === "note") ||
		typeof logging.repeatToState !== "boolean" && (typeof logging.repeatToState !== "string" || !logging.repeatToState || logging.repeatToState.length > 256 || /[\s\u0000-\u001f\u007f]/.test(logging.repeatToState)))
		return invalid("Logging requires done/repeat/reschedule/redeadline/refile (none, time, or note) and repeatToState (boolean or a bounded single keyword).")
	const refile = value.refile
	if (!object(refile) || !closed(refile, ["files", "maxDepth", "includeRoot", "match"]))
		return invalid("Refile requires exactly files, maxDepth, includeRoot, and match.")
	if (refile.files !== null && (!Array.isArray(refile.files) || !refile.files.every((path) => typeof path === "string" && isSafeRelativeOrgPath(path)) || new Set(refile.files).size !== refile.files.length))
		return invalid("Refile files must be null (workspace files) or unique safe relative .org paths.")
	if (refile.maxDepth !== null && (typeof refile.maxDepth !== "number" || !Number.isSafeInteger(refile.maxDepth) || refile.maxDepth < 1))
		return invalid("Refile maxDepth must be null or a positive safe integer.")
	if (typeof refile.includeRoot !== "boolean") return invalid("Refile includeRoot must be true or false.")
	if (refile.match !== null && (typeof refile.match !== "string" || !parseOrgSparseTreeMatchQuery(refile.match, true)))
		return invalid("Refile match must be null or a valid Org match expression.")
	const inheritance = value.inheritance
	if (!object(inheritance) || !closed(inheritance, ["tags", "tagExclusions", "properties", "propertyExclusions"]) || !policy(inheritance.tags) || !names(inheritance.tagExclusions) || !policy(inheritance.properties) || !names(inheritance.propertyExclusions))
		return invalid("Inheritance requires tags/properties (boolean, unique name arrays, or supported GNU regexp strings) and tagExclusions/propertyExclusions (unique name arrays).")
	if (Array.isArray(inheritance.properties) && new Set(inheritance.properties.map((name) => name.toUpperCase())).size !== inheritance.properties.length ||
		new Set(inheritance.propertyExclusions.map((name) => name.toUpperCase())).size !== inheritance.propertyExclusions.length)
		return invalid("Property inheritance/exclusion names must be unique ignoring case.")
	return E.right(Object.freeze({
		version: 1,
		dateReader: Object.freeze({ preferFuture: dateReader.preferFuture, forceCompatibleYears: dateReader.forceCompatibleYears }),
		logging: Object.freeze({
			done: logging.done as OrgLoggingPreferences["done"], repeat: logging.repeat as OrgLoggingPreferences["repeat"],
			reschedule: logging.reschedule as OrgLoggingPreferences["reschedule"], redeadline: logging.redeadline as OrgLoggingPreferences["redeadline"],
			refile: logging.refile as OrgLoggingPreferences["refile"], repeatToState: logging.repeatToState as string | boolean,
		}),
		refile: Object.freeze({ files: refile.files === null ? null : Object.freeze([...(refile.files as string[])]), maxDepth: refile.maxDepth as number | null, includeRoot: refile.includeRoot, match: refile.match as string | null }),
		inheritance: Object.freeze({
			tags: Array.isArray(inheritance.tags) ? Object.freeze([...inheritance.tags]) : inheritance.tags as boolean | string,
			tagExclusions: Object.freeze([...inheritance.tagExclusions]),
			properties: Array.isArray(inheritance.properties) ? Object.freeze(inheritance.properties.map((name) => name.toUpperCase())) : inheritance.properties as boolean | string,
			propertyExclusions: Object.freeze(inheritance.propertyExclusions.map((name) => name.toUpperCase())),
		}),
	}))
}

const inheritanceRegexps = new Map<string, OrgMatchRegExp>()
export const orgInheritsName = (policy: OrgInheritanceConfiguration["tags"], exclusions: readonly string[], name: string, kind: "tag" | "property" = "tag"): boolean => {
	// Installed GNU org-remove-uninherited-tags ignores exclusions for list
	// policies. Property exclusions are an explicit Grain declarative extension.
	if (exclusions.includes(name) && (kind === "property" || !Array.isArray(policy))) return false
	if (typeof policy === "string") {
		let regexp = inheritanceRegexps.get(policy)
		if (!regexp) {
			regexp = orgMatchRegExp(policy)
			if (inheritanceRegexps.size >= 128) inheritanceRegexps.clear()
			inheritanceRegexps.set(policy, regexp)
		}
		return regexp.test(name)
	}
	return policy === true || Array.isArray(policy) && policy.includes(name)
}
