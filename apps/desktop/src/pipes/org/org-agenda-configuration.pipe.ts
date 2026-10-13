import * as E from "fp-ts/Either"
import { isSafeRelativeOrgPath } from "./org-subtree-refile.pipe"
import { isOrgCalendarISO } from "./org-date-reader.pipe"
import { parseOrgSparseTreeQuery } from "./org-sparse-tree.pipe"

export interface OrgAgendaViewConfiguration {
	readonly id: string
	readonly name: string
	readonly files: readonly string[] | null
	readonly mode: "dates" | "todo" | "match"
	readonly todo: "pending" | readonly string[] | null
	readonly match: string | null
	readonly window: { readonly start: string; readonly span: number } | null
	readonly overdue: boolean
	/** null disables warning rows; Source cookies override positive counts; zero disables prewarning. */
	readonly deadlineWarningDays: number | null
}
export interface OrgAgendaConfiguration {
	readonly version: 1
	readonly views: readonly OrgAgendaViewConfiguration[]
}
export interface OrgAgendaConfigurationError {
	readonly type: "ORG_AGENDA_CONFIGURATION_ERROR"
	readonly message: string
}
export const DEFAULT_ORG_AGENDA_CONFIGURATION: OrgAgendaConfiguration = Object.freeze({ version: 1, views: Object.freeze([]) })
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)
const closed = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key))
const safePath = (value: unknown): value is string => typeof value === "string" && isSafeRelativeOrgPath(value) && !/[\u0000-\u001f\u007f:]/u.test(value)
const names = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 256 && value.every(name => typeof name === "string" && name.length > 0 && name.length <= 256 && !/[\s\u0000-\u001f\u007f]/u.test(name)) && new Set(value).size === value.length
/** Closed version-1 grammar: no inferred selected view, file scope, calendar or key. */
export function parseOrgAgendaConfiguration(raw: string): E.Either<OrgAgendaConfigurationError, OrgAgendaConfiguration> {
	const invalid = (message: string) => E.left<OrgAgendaConfigurationError, OrgAgendaConfiguration>({ type: "ORG_AGENDA_CONFIGURATION_ERROR", message })
	if (typeof raw !== "string") return invalid("Agenda configuration must be JSON text.")
	if (!raw.trim()) return E.right(DEFAULT_ORG_AGENDA_CONFIGURATION)
	let value: unknown
	try { value = JSON.parse(raw) } catch (error) { return invalid(`Agenda configuration must be valid JSON: ${error instanceof Error ? error.message : "invalid JSON"}`) }
	if (!object(value) || !closed(value, ["version", "views"]) || value.version !== 1 || !Array.isArray(value.views) || value.views.length > 64)
		return invalid("Agenda configuration requires exactly version (1) and views (at most 64 named views).")
	const views: OrgAgendaViewConfiguration[] = []
	for (const candidate of value.views) {
		if (!object(candidate) || !closed(candidate, ["id", "name", "files", "mode", "todo", "match", "window", "overdue", "deadlineWarningDays"])) return invalid("Each Agenda view requires exactly id, name, files, mode, todo, match, window, overdue, and deadlineWarningDays.")
		if (typeof candidate.id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(candidate.id) || views.some(view => view.id === candidate.id)) return invalid("Agenda view ids must be unique bounded ASCII names.")
		if (typeof candidate.name !== "string" || !candidate.name.trim() || candidate.name.length > 256 || /[\u0000-\u001f\u007f]/u.test(candidate.name)) return invalid("Agenda view names must be nonempty bounded display text.")
		if (candidate.files !== null && (!Array.isArray(candidate.files) || candidate.files.length > 500 || !candidate.files.every(safePath) || new Set(candidate.files).size !== candidate.files.length)) return invalid("Agenda files must be null (workspace files) or unique exact safe relative .org paths; no glob expansion or absolute paths.")
		if (candidate.mode !== "dates" && candidate.mode !== "todo" && candidate.mode !== "match") return invalid("Agenda mode must be dates, todo, or match.")
		if (candidate.todo !== null && candidate.todo !== "pending" && !names(candidate.todo)) return invalid("Agenda todo must be null, pending, or unique exact TODO keywords.")
		if (candidate.match !== null && (typeof candidate.match !== "string" || !parseOrgSparseTreeQuery(candidate.match))) return invalid("Agenda match must be null or an existing Org match expression.")
		if (candidate.mode === "todo" && candidate.todo === null || candidate.mode === "match" && candidate.match === null) return invalid("TODO list views require an explicit todo filter; match list views require an explicit match expression.")
		const window = candidate.window
		if (candidate.mode === "dates") {
			if (!object(window) || !closed(window, ["start", "span"]) || typeof window.start !== "string" || !(isOrgCalendarISO(window.start) || /^today(?:[+-]\d{1,5}d)?$/.test(window.start)) || typeof window.span !== "number" || !Number.isSafeInteger(window.span) || window.span < 1 || window.span > 366) return invalid("Dated views require window {start: an ISO date or today[+/-Nd], span: 1–366 days}.")
		} else if (window !== null) return invalid("List views require window: null; headings never acquire fabricated dates.")
		if (typeof candidate.overdue !== "boolean" || candidate.deadlineWarningDays !== null && (typeof candidate.deadlineWarningDays !== "number" || !Number.isSafeInteger(candidate.deadlineWarningDays) || candidate.deadlineWarningDays < 0 || candidate.deadlineWarningDays > 366)) return invalid("Agenda overdue must be boolean; deadlineWarningDays must be null (disabled) or 0–366.")
		if (candidate.mode !== "dates" && (candidate.overdue || candidate.deadlineWarningDays !== null)) return invalid("List views require overdue: false and deadlineWarningDays: null.")
		views.push(Object.freeze({ id: candidate.id, name: candidate.name, files: candidate.files === null ? null : Object.freeze([...(candidate.files as string[])]), mode: candidate.mode, todo: Array.isArray(candidate.todo) ? Object.freeze([...candidate.todo]) : candidate.todo as "pending" | null, match: candidate.match as string | null, window: window === null ? null : Object.freeze({ start: (window as Record<string, unknown>).start as string, span: (window as Record<string, unknown>).span as number }), overdue: candidate.overdue, deadlineWarningDays: candidate.deadlineWarningDays as number | null }))
	}
	return E.right(Object.freeze({ version: 1, views: Object.freeze(views) }))
}
