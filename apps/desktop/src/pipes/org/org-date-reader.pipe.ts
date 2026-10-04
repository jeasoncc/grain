/** Bounded date reader, not the full Org calendar/repeater/time/range grammar.
 * All calendar authority is explicit ISO input; no clock, Date, timezone or IO.
 */
export interface OrgDateContext {
	readonly today: string
}
export type OrgDateResult =
	| { readonly kind: "date"; readonly date: string }
	| { readonly kind: "error"; readonly message: string }
const error = (
	message = "Enter a real calendar date: YYYY-MM-DD, today/tomorrow/yesterday, +3d/-2w, or next mon (今天/明天/昨天).",
): OrgDateResult => ({ kind: "error", message })
const leap = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
const monthDays = (year: number, month: number) =>
	[31, leap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0
export const isOrgCalendarISO = (input: unknown): input is string => {
	if (typeof input !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(input)) return false
	const year = Number(input.slice(0, 4)),
		month = Number(input.slice(5, 7)),
		day = Number(input.slice(8, 10))
	return (
		year >= 1 &&
		year <= 9999 &&
		month >= 1 &&
		month <= 12 &&
		day >= 1 &&
		day <= monthDays(year, month)
	)
}
const yearStart = (year: number) => {
	const y = year - 1
	return 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)
}
const ordinal = (iso: string) => {
	const y = Number(iso.slice(0, 4)),
		m = Number(iso.slice(5, 7))
	let n = yearStart(y) + Number(iso.slice(8, 10)) - 1
	for (let month = 1; month < m; month++) n += monthDays(y, month)
	return n
}
const fromOrdinal = (n: number): string => {
	let low = 1,
		high = 10000
	while (high - low > 1) {
		const mid = Math.floor((low + high) / 2)
		if (yearStart(mid) <= n) low = mid
		else high = mid
	}
	let day = n - yearStart(low),
		month = 1
	while (day >= monthDays(low, month)) {
		day -= monthDays(low, month)
		month++
	}
	return `${String(low).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day + 1).padStart(2, "0")}`
}
export const readOrgDate = (input: unknown, context?: OrgDateContext): OrgDateResult => {
	if (typeof input !== "string" || input.length > 128)
		return error("Date input must be text of at most 128 UTF-16 units.")
	const text = input.trim().toLowerCase()
	if (isOrgCalendarISO(text)) return { kind: "date", date: text }
	const aliases: Record<string, number> = {
		today: 0,
		tomorrow: 1,
		yesterday: -1,
		今天: 0,
		明天: 1,
		昨天: -1,
	}
	let offset: number
	if (Object.hasOwn(aliases, text)) offset = aliases[text]
	else {
		const delta = /^([+-][0-9]+)([dw])$/.exec(text)
		const next = /^next (mon|tue|wed|thu|fri|sat|sun)$/.exec(text)
		if (delta) {
			offset = Number(delta[1]) * (delta[2] === "w" ? 7 : 1)
			if (!Number.isSafeInteger(offset) || Math.abs(offset) > 36600)
				return error("Date offset must be an integer within 36600 days.")
		} else if (next) {
			if (!isOrgCalendarISO(context?.today))
				return error("Relative dates require an explicit valid local today (YYYY-MM-DD).")
			const weekday = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].indexOf(next[1])
			offset = (weekday - (ordinal(context.today) % 7) + 7) % 7 || 7
		} else return error()
	}
	if (!isOrgCalendarISO(context?.today))
		return error("Relative dates require an explicit valid local today (YYYY-MM-DD).")
	const n = ordinal(context.today) + offset
	if (n < 0 || n >= yearStart(10000)) return error("Date must remain within years 0001–9999.")
	return { kind: "date", date: fromOrdinal(n) }
}
