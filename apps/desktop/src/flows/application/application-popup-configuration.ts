import * as E from "fp-ts/Either"
import type { ApplicationToolLayout } from "./application-tool-registry"

export interface ApplicationPopupSize {
	readonly widthPercent?: number
	readonly heightPercent?: number
}
export interface ApplicationPopupRule {
	readonly id?: string
	readonly prefix?: string
	readonly layout: ApplicationToolLayout
	readonly size?: ApplicationPopupSize
}
export interface ApplicationPopupConfiguration {
	readonly version: 1
	readonly rules: readonly ApplicationPopupRule[]
}
export const APPLICATION_POPUP_PREFIXES = ["babel:", "export:", "file-review:", "remark:"] as const
export const EMPTY_APPLICATION_POPUP_CONFIGURATION: ApplicationPopupConfiguration = Object.freeze({ version: 1, rules: Object.freeze([]) })
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)
const closed = (value: Record<string, unknown>, fields: readonly string[]) => Object.keys(value).every((key) => fields.includes(key))

/** Only placement is configurable. Literal IDs also support explicitly registered compiled tools. */
export function parseApplicationPopupConfiguration(raw: string): E.Either<{ readonly message: string }, ApplicationPopupConfiguration> {
	const invalid = (message: string) => E.left({ message })
	if (typeof raw !== "string") return invalid("Popup configuration must be JSON text.")
	if (!raw.trim()) return E.right(EMPTY_APPLICATION_POPUP_CONFIGURATION)
	let value: unknown
	try { value = JSON.parse(raw) } catch { return invalid("Popup configuration must be valid JSON.") }
	if (!record(value) || !closed(value, ["version", "rules"]) || value.version !== 1 || !Array.isArray(value.rules))
		return invalid("Popup configuration requires only version: 1 and a rules array.")
	if (value.rules.length > 128) return invalid("Popup configuration accepts at most 128 rules.")
	const seen = new Set<string>()
	const rules: ApplicationPopupRule[] = []
	for (const [index, rule] of value.rules.entries()) {
		const error = (message: string) => invalid(`Popup rule ${index + 1}: ${message}`)
		if (!record(rule) || !closed(rule, ["id", "prefix", "layout", "size"])) return error("only id or prefix, layout, and optional size are accepted.")
		if ((Object.hasOwn(rule, "id") ? 1 : 0) + (Object.hasOwn(rule, "prefix") ? 1 : 0) !== 1) return error("provide exactly one id or prefix.")
		if (Object.hasOwn(rule, "id") && (typeof rule.id !== "string" || !rule.id.length || rule.id.length > 512 || rule.id.trim() !== rule.id || /[\u0000-\u001f\u007f*?]/u.test(rule.id)))
			return error("id must be a nonempty literal tool ID of at most 512 characters, without wildcard or control characters.")
		if (Object.hasOwn(rule, "prefix") && !APPLICATION_POPUP_PREFIXES.includes(rule.prefix as typeof APPLICATION_POPUP_PREFIXES[number]))
			return error(`prefix must be one of ${APPLICATION_POPUP_PREFIXES.join(", ")}.`)
		if (!["main", "side", "bottom", "popup"].includes(rule.layout as string)) return error("layout must be main, side, bottom, or popup.")
		const key = `${Object.hasOwn(rule, "id") ? "id" : "prefix"}:${rule.id ?? rule.prefix}`
		if (seen.has(key)) return error("duplicate selectors are not accepted.")
		seen.add(key)
		let size: ApplicationPopupSize | undefined
		if (Object.hasOwn(rule, "size")) {
			if (!record(rule.size) || !closed(rule.size, ["widthPercent", "heightPercent"]) || !Object.keys(rule.size).length) return error("size accepts widthPercent and/or heightPercent only.")
			if (Object.values(rule.size).some((dimension) => typeof dimension !== "number" || !Number.isInteger(dimension) || dimension < 10 || dimension > 90))
				return error("size percentages must be integers from 10 through 90.")
			size = Object.freeze({
				...(Object.hasOwn(rule.size, "widthPercent") ? { widthPercent: rule.size.widthPercent as number } : {}),
				...(Object.hasOwn(rule.size, "heightPercent") ? { heightPercent: rule.size.heightPercent as number } : {}),
			})
		}
		rules.push(Object.freeze({ ...(Object.hasOwn(rule, "id") ? { id: rule.id as string } : { prefix: rule.prefix as string }), layout: rule.layout as ApplicationToolLayout, ...(size ? { size } : {}) }))
	}
	return E.right(Object.freeze({ version: 1, rules: Object.freeze(rules) }))
}

/** Exact selectors win over the bounded, nonoverlapping built-in families. No match retains the producer policy. */
export function resolveApplicationPopupRule(configuration: ApplicationPopupConfiguration, id: string): ApplicationPopupRule | undefined {
	return configuration.rules.find((rule) => rule.id === id) ?? configuration.rules.find((rule) => rule.prefix !== undefined && id.startsWith(rule.prefix) && id.length > rule.prefix.length)
}
