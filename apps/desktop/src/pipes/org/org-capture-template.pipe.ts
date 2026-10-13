import * as E from "fp-ts/Either"
import type {
	OrgCaptureConfiguration,
	OrgCapturePrompt,
	OrgCaptureTarget,
	OrgCaptureTemplate,
	OrgCaptureTemplateContext,
	OrgCaptureTemplateTarget,
	OrgCaptureValidationError,
	OrgPreparedCaptureTemplate,
} from "@/types/editor/org-capture.interface"
import {
	isOrgCaptureEntryType,
	validateOrgCaptureDraftShape,
	validateOrgCaptureTarget,
} from "./org-capture.pipe"
import { scanOrgBracketLinks, escapeOrgLinkTarget } from "./org-link-syntax.pipe"

const invalid = (message: string): OrgCaptureValidationError => ({
	type: "ORG_CAPTURE_VALIDATION_ERROR",
	message,
})

/** Only plain data properties are read; a source/target getter is not a template. */
const dataFields = (value: unknown): Record<string, unknown> | null => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return null
	const prototype: unknown = Object.getPrototypeOf(value)
	if (prototype !== Object.prototype && prototype !== null) return null
	const descriptors = Object.getOwnPropertyDescriptors(value)
	const fields: Record<string, unknown> = Object.create(null)
	for (const key of Reflect.ownKeys(descriptors)) {
		if (typeof key !== "string") return null
		const descriptor = descriptors[key]
		if (!("value" in descriptor)) return null
		fields[key] = descriptor.value
	}
	return fields
}

const templateTarget = (
	value: unknown,
): E.Either<OrgCaptureValidationError, OrgCaptureTemplateTarget> => {
	const fields = dataFields(value)
	if (!fields) return E.left(invalid("Capture template target must contain declarative data properties."))
	if ("date" in fields) return E.left(invalid("A template datetree date is frozen when Capture starts; do not configure date."))
	if ("headingPath" in fields) {
		const headings = fields.headingPath
		if (!Array.isArray(headings)) return E.left(invalid("Capture headingPath must be an array of titles."))
		const copy: string[] = []
		for (let index = 0; index < headings.length; index++) {
			const descriptor = Object.getOwnPropertyDescriptor(headings, index)
			if (!descriptor || !("value" in descriptor) || typeof descriptor.value !== "string")
				return E.left(invalid("Capture headingPath must contain plain string titles."))
			copy.push(descriptor.value)
		}
		fields.headingPath = copy
	}
	const result = validateOrgCaptureTarget(fields.kind === "datetree" ? { ...fields, date: "2000-01-01" } : fields)
	if (E.isLeft(result)) return result
	if (result.right.kind !== "datetree") return result
	const { date: _date, ...target } = result.right
	return E.right(Object.freeze(target))
}

type DateDirective = "Y" | "y" | "m" | "d" | "e" | "H" | "I" | "M" | "S" |
	"a" | "A" | "b" | "B" | "p" | "F" | "R" | "T" | "%"
type DatePart = Readonly<{ kind: "text"; value: string } | { kind: "directive"; value: DateDirective }>
type TemplateToken = Readonly<
	| { kind: "text"; value: string }
	| { kind: "cursor" }
	| { kind: "answer"; index: number }
	| { kind: "region" }
	| { kind: "context"; name: "a" | "l" | "L" | "f" | "F" }
	| { kind: "timestamp"; name: "t" | "T" | "u" | "U" }
	| { kind: "date"; parts: readonly DatePart[] }
>
interface ParsedTemplate {
	readonly template: OrgCaptureTemplate
	readonly prompts: readonly OrgCapturePrompt[]
	readonly tokens: readonly TemplateToken[]
}

const parseDateFormat = (format: string): E.Either<OrgCaptureValidationError, readonly DatePart[]> => {
	if (!format || /[\r\n]/.test(format)) return E.left(invalid("Capture %<FORMAT> requires a nonempty single-line format."))
	const parts: DatePart[] = []
	let start = 0
	for (let index = 0; index < format.length; index++) {
		if (format[index] !== "%") continue
		if (index > start) parts.push(Object.freeze({ kind: "text", value: format.slice(start, index) }))
		const directive = format[++index]
		if (!directive || !"YymdeHIMSaAbBpFRT%".includes(directive))
			return E.left(invalid(`Unsupported Capture time directive %${directive ?? ""}; supported: %Y %y %m %d %e %H %I %M %S %a %A %b %B %p %F %R %T %%.`))
		parts.push(Object.freeze({ kind: "directive", value: directive as DateDirective }))
		start = index + 1
	}
	if (start < format.length) parts.push(Object.freeze({ kind: "text", value: format.slice(start) }))
	return E.right(Object.freeze(parts))
}

/** One scan. Inserted strings are never part of this token stream. */
const parseTemplate = (value: unknown): E.Either<OrgCaptureValidationError, ParsedTemplate> => {
	const fields = dataFields(value)
	if (!fields || Object.keys(fields).some((key) => !["id", "label", "entryType", "target", "source"].includes(key)))
		return E.left(invalid("Capture template must contain only id, label, entryType, target and source data fields."))
	if (typeof fields.id !== "string" || !/^[a-z][a-z0-9_-]*$/.test(fields.id))
		return E.left(invalid("Capture template id must start with a lowercase letter and contain only lowercase letters, digits, _ or -."))
	if (typeof fields.label !== "string" || !fields.label.trim() || /[\x00-\x1f\x7f]/.test(fields.label))
		return E.left(invalid("Capture template label must be a nonblank single-line string."))
	if (!isOrgCaptureEntryType(fields.entryType)) return E.left(invalid("Capture template entryType is unsupported."))
	if (typeof fields.source !== "string" || !fields.source.trim())
		return E.left(invalid("Capture template source must be a nonblank string; functions and external template sources are unsupported."))
	const target = templateTarget(fields.target)
	if (E.isLeft(target)) return target
	const source = fields.source
	const tokens: TemplateToken[] = []
	const prompts: OrgCapturePrompt[] = []
	let text = ""
	const push = (token: TemplateToken) => {
		if (text) {
			tokens.push(Object.freeze({ kind: "text", value: text }))
			text = ""
		}
		tokens.push(Object.freeze(token))
	}
	for (let index = 0; index < source.length; index++) {
		const char = source[index]
		if (char === "\\" && source[index + 1] === "%") {
			text += "%"
			index++
			continue
		}
		if (char !== "%") {
			text += char
			continue
		}
		const name = source[++index]
		if (name === "?") push({ kind: "cursor" })
		else if (name === "i") push({ kind: "region" })
		else if (name === "a" || name === "l" || name === "L" || name === "f" || name === "F") push({ kind: "context", name })
		else if (name === "t" || name === "T" || name === "u" || name === "U") push({ kind: "timestamp", name })
		else if (name === "<") {
			const end = source.indexOf(">", index + 1)
			if (end < 0) return E.left(invalid("Unclosed Capture %<FORMAT> token."))
			const parts = parseDateFormat(source.slice(index + 1, end))
			if (E.isLeft(parts)) return parts
			push({ kind: "date", parts: parts.right })
			index = end
		} else if (name === "^" && source[index + 1] === "{") {
			const end = source.indexOf("}", index + 2)
			if (end < 0) return E.left(invalid("Unclosed Capture %^{prompt} token."))
			const body = source.slice(index + 2, end)
			if (/[{}\r\n\x00-\x1f\x7f]/.test(body)) return E.left(invalid("Capture prompt fields must be single-line strings without braces."))
			const [label, initialInput = "", ...candidates] = body.split("|")
			if (!label.trim()) return E.left(invalid("Capture prompt label must not be blank."))
			if (source[end + 1] && "pgGtTuUCL".includes(source[end + 1]))
				return E.left(invalid(`Unsupported Capture interactive prompt postfix ${source[end + 1]}; only plain %^{prompt|default|candidates...} is supported.`))
			push({ kind: "answer", index: prompts.length })
			prompts.push(Object.freeze({ label, initialInput, candidates: Object.freeze(candidates) }))
			index = end
		} else if (name === "\\") {
			const digits = /^[1-9][0-9]*/.exec(source.slice(index + 1))?.[0]
			if (!digits) return E.left(invalid("Capture prompt references use %\\1 through %\\N; interactive/all-prompt references are unsupported."))
			const number = Number(digits)
			if (!Number.isSafeInteger(number)) return E.left(invalid("Capture prompt reference is out of range."))
			push({ kind: "answer", index: number - 1 })
			index += digits.length
		} else if (name === "(" || name === "[") {
			return E.left(invalid(name === "(" ? "Executable Capture %(sexp) templates are unsupported; no Lisp or shell is evaluated." : "Capture %[file] includes are unsupported; templates must be inline declarative strings."))
		} else return E.left(invalid(`Unsupported Capture token %${name ?? ""}; escape a literal percent with \\%.`))
	}
	if (text) tokens.push(Object.freeze({ kind: "text", value: text }))
	if (tokens.some((token) => token.kind === "answer" && token.index >= prompts.length))
		return E.left(invalid("Capture prompt reference must name a declared plain prompt (numbered from 1)."))
	// An editable placeholder may supply the title/item later, but the declared type
	// must already have its Org structure. Finish validates the actual edited source.
	const shape = tokens.map((token) => token.kind === "text" ? token.value : token.kind === "cursor" ? "" : "capture").join("")
	const validShape = validateOrgCaptureDraftShape(shape, fields.entryType)
	if (E.isLeft(validShape)) return validShape
	const template: OrgCaptureTemplate = Object.freeze({
		id: fields.id,
		label: fields.label,
		entryType: fields.entryType,
		target: target.right,
		source,
	})
	return E.right({ template, prompts: Object.freeze(prompts), tokens: Object.freeze(tokens) })
}

export const validateOrgCaptureTemplate = (
	template: unknown,
): E.Either<OrgCaptureValidationError, OrgCaptureTemplate> => {
	try {
		return E.map((parsed: ParsedTemplate) => parsed.template)(parseTemplate(template))
	} catch {
		return E.left(invalid("Capture template must be readable declarative data."))
	}
}

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const
const pad = (number: number): string => String(number).padStart(2, "0")

interface FrozenTime {
	readonly iso: string
	readonly day: string
	readonly time: string
	readonly directives: Readonly<Record<DateDirective, string>>
}
const freezeTime = (date: Date): FrozenTime => {
	// Use intrinsic Date accessors: caller overrides are not formatters/evaluators.
	const year = Date.prototype.getFullYear.call(date)
	const month = Date.prototype.getMonth.call(date)
	const day = Date.prototype.getDate.call(date)
	const weekday = weekdays[Date.prototype.getDay.call(date)]
	const hour = Date.prototype.getHours.call(date)
	const minute = Date.prototype.getMinutes.call(date)
	const second = Date.prototype.getSeconds.call(date)
	const iso = `${String(year).padStart(4, "0")}-${pad(month + 1)}-${pad(day)}`
	const time = `${pad(hour)}:${pad(minute)}`
	return {
		iso,
		day: `${iso} ${weekday.slice(0, 3)}`,
		time,
		directives: {
			Y: String(year).padStart(4, "0"), y: pad(year % 100), m: pad(month + 1), d: pad(day), e: String(day).padStart(2, " "),
			H: pad(hour), I: pad(hour % 12 || 12), M: pad(minute), S: pad(second),
			a: weekday.slice(0, 3), A: weekday, b: months[month].slice(0, 3), B: months[month], p: hour < 12 ? "AM" : "PM",
			F: iso, R: time, T: `${time}:${pad(second)}`, "%": "%",
		},
	}
}

type RenderToken = Extract<TemplateToken, { kind: "text" | "cursor" | "answer" | "region" }>
/** Opaque immutable plan: prompts are public; the parsed stream stays private. */
export interface OrgCaptureTemplatePlan {
	readonly prompts: readonly OrgCapturePrompt[]
}
interface PlanData {
	readonly template: OrgCaptureTemplate
	readonly target: OrgCaptureTarget
	readonly region: string
	readonly tokens: readonly RenderToken[]
}
const plans = new WeakMap<OrgCaptureTemplatePlan, PlanData>()

export const planOrgCaptureTemplate = (
	template: unknown,
	context: OrgCaptureTemplateContext,
): E.Either<OrgCaptureValidationError, OrgCaptureTemplatePlan> => {
	try {
		const parsed = parseTemplate(template)
		if (E.isLeft(parsed)) return parsed
		if (!context || !(context.date instanceof Date) || !Number.isFinite(Date.prototype.getTime.call(context.date)) ||
			typeof context.region !== "string" || typeof context.annotation !== "string" ||
			(context.regionUnavailableReason !== undefined && typeof context.regionUnavailableReason !== "string") ||
			(context.sourceRelativePath !== undefined && typeof context.sourceRelativePath !== "string") ||
			(context.sourceAbsolutePath !== undefined && typeof context.sourceAbsolutePath !== "string"))
			return E.left(invalid("Capture context requires a real date and literal region, annotation and optional file names."))
		if (context.regionUnavailableReason && parsed.right.tokens.some((token) => token.kind === "region"))
			return E.left(invalid(context.regionUnavailableReason))
		const time = freezeTime(context.date)
		if (!/^\d{4}-/.test(time.iso) || time.iso.startsWith("0000"))
			return E.left(invalid("Capture date year must be between 1 and 9999."))
		const target = parsed.right.template.target
		const resolvedTarget: OrgCaptureTarget = target.kind === "datetree" ? Object.freeze({ ...target, date: time.iso }) : target
		const annotation = context.annotation === "[[]]" ? "" : context.annotation
		// Transform only the first Org bracket link; other annotation bytes stay literal.
		const link = scanOrgBracketLinks(annotation)[0]
		const linkTarget = link ? escapeOrgLinkTarget(link.target) : ""
		const names = {
			a: annotation,
			l: link ? annotation.slice(0, link.from) + `[[${linkTarget}]]` + annotation.slice(link.to) : annotation,
			L: link ? annotation.slice(0, link.from) + link.target + annotation.slice(link.to) : annotation,
			f: (context.sourceRelativePath ?? context.sourceAbsolutePath ?? "").split(/[\\/]/).at(-1) ?? "",
			F: context.sourceAbsolutePath ?? "",
		}
		const tokens: RenderToken[] = parsed.right.tokens.map((token): RenderToken => {
			if (token.kind === "context") return Object.freeze({ kind: "text", value: names[token.name] })
			if (token.kind === "date") return Object.freeze({
				kind: "text",
				value: token.parts.map((part) => part.kind === "text" ? part.value : time.directives[part.value]).join(""),
			})
			if (token.kind === "timestamp") {
				const inactive = token.name === "u" || token.name === "U"
				const withTime = token.name === "T" || token.name === "U"
				return Object.freeze({ kind: "text", value: `${inactive ? "[" : "<"}${time.day}${withTime ? ` ${time.time}` : ""}${inactive ? "]" : ">"}` })
			}
			return token
		})
		const plan = Object.freeze({ prompts: parsed.right.prompts })
		plans.set(plan, Object.freeze({ template: parsed.right.template, target: resolvedTarget, region: context.region, tokens: Object.freeze(tokens) }))
		return E.right(plan)
	} catch {
		return E.left(invalid("Capture template/context must be readable declarative data with a valid date."))
	}
}

export const renderOrgCaptureTemplate = (
	plan: OrgCaptureTemplatePlan,
	answers: readonly string[],
): E.Either<OrgCaptureValidationError, OrgPreparedCaptureTemplate> => {
	const data = plans.get(plan)
	if (!data) return E.left(invalid("Capture rendering requires an original parsed template plan."))
	if (!Array.isArray(answers) || answers.length !== plan.prompts.length)
		return E.left(invalid("Capture rendering requires exactly one literal string answer for each prompt, in order."))
	for (let index = 0; index < answers.length; index++) {
		const descriptor = Object.getOwnPropertyDescriptor(answers, index)
		if (!descriptor || !("value" in descriptor) || typeof descriptor.value !== "string")
			return E.left(invalid("Capture prompt answers must be plain literal strings."))
	}
	let source = ""
	let cursor: number | undefined
	for (const token of data.tokens) {
		if (token.kind === "cursor") cursor ??= source.length
		else if (token.kind === "text") source += token.value
		else if (token.kind === "answer") source += answers[token.index]
		else {
			const start = Math.max(source.lastIndexOf("\n"), source.lastIndexOf("\r")) + 1
			const prefix = source.slice(start)
			source += data.region.replace(/\r\n|\r|\n/g, (boundary) => boundary + prefix)
		}
	}
	return E.right(Object.freeze({
		id: data.template.id,
		label: data.template.label,
		entryType: data.template.entryType,
		target: data.target,
		initialSource: source,
		initialCursor: cursor ?? source.length,
	}))
}

export const BUILTIN_ORG_CAPTURE_TEMPLATES: readonly OrgCaptureTemplate[] = Object.freeze([
	Object.freeze({ id: "todo", label: "Todo", entryType: "entry", target: Object.freeze({ kind: "file", relativePath: "inbox.org" }), source: "* TODO %?" }),
	Object.freeze({ id: "note", label: "Note", entryType: "entry", target: Object.freeze({ kind: "file", relativePath: "inbox.org" }), source: "* %?" }),
])
export const DEFAULT_ORG_CAPTURE_CONFIGURATION: OrgCaptureConfiguration = Object.freeze({
	version: 1,
	templates: BUILTIN_ORG_CAPTURE_TEMPLATES,
	draftRecovery: false,
})
