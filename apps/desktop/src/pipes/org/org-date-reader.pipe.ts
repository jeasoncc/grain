/** Pure local calendar authority. Callers supply today/now and the existing stamp default.
 * Grammar follows https://orgmode.org/manual/The-date_002ftime-prompt.html and
 * https://orgmode.org/manual/Repeated-tasks.html; no Date, timezone or hidden clock.
 */
export interface OrgDateReaderPolicy {
	readonly preferFuture: boolean | "time"
	readonly forceCompatibleYears: boolean
}
export const DEFAULT_ORG_DATE_READER_POLICY: OrgDateReaderPolicy = Object.freeze({ preferFuture: true, forceCompatibleYears: false })
export interface OrgDateContext {
	readonly today: string
	readonly now?: string
	readonly defaultDate?: string
	readonly defaultTime?: string
	readonly policy?: OrgDateReaderPolicy
	/** Accepted operation boundary owns the immutable local log stamp and optional literal note. */
	readonly logStamp?: string
	readonly note?: string
}
export type OrgCalendarUnit = "h" | "d" | "w" | "m" | "y"
export interface OrgRepeater {
	readonly mode: "+" | "++" | ".+"
	readonly value: number
	readonly unit: OrgCalendarUnit
	readonly maximum?: { readonly value: number; readonly unit: OrgCalendarUnit }
}
export interface OrgTimestampValue {
	readonly date: string
	readonly time?: string
	readonly endTime?: string
	readonly endDate?: string
	/** Clock on the second date endpoint, independent of the first day's time range. */
	readonly endDateTime?: string
	readonly endRepeater?: OrgRepeater
	readonly endWarning?: OrgTimestampValue["warning"]
	readonly repeater?: OrgRepeater
	readonly warning?: { readonly mode: "-" | "--"; readonly value: number; readonly unit: OrgCalendarUnit }
}
export type OrgDateResult =
	| { readonly kind: "date"; readonly date: string; readonly timestamp?: OrgTimestampValue; readonly forcedYear?: { readonly requested: number; readonly actual: number }; readonly endForcedYear?: { readonly requested: number; readonly actual: number } }
	| { readonly kind: "error"; readonly message: string; readonly requiresContext?: true }
const error = (message = "Enter a valid Org calendar date, time, range, repeater or warning."): OrgDateResult => ({ kind: "error", message })
const leap = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
export const orgCalendarMonthDays = (year: number, month: number) =>
	[31, leap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0
export const isOrgCalendarISO = (input: unknown): input is string => {
	if (typeof input !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(input)) return false
	const year = Number(input.slice(0, 4)), month = Number(input.slice(5, 7)), day = Number(input.slice(8, 10))
	return year >= 1 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= orgCalendarMonthDays(year, month)
}
const yearStart = (year: number) => {
	const y = year - 1
	return 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)
}
const ordinal = (iso: string) => {
	const y = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7))
	let n = yearStart(y) + Number(iso.slice(8, 10)) - 1
	for (let month = 1; month < m; month++) n += orgCalendarMonthDays(y, month)
	return n
}
const iso = (year: number, month: number, day: number) => `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
const fromOrdinal = (n: number): string | null => {
	if (!Number.isSafeInteger(n) || n < 0 || n >= yearStart(10000)) return null
	let low = 1, high = 10000
	while (high - low > 1) {
		const mid = Math.floor((low + high) / 2)
		if (yearStart(mid) <= n) low = mid
		else high = mid
	}
	let day = n - yearStart(low), month = 1
	while (day >= orgCalendarMonthDays(low, month)) { day -= orgCalendarMonthDays(low, month); month++ }
	return iso(low, month, day + 1)
}
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const
export const orgCalendarWeekday = (date: string): string => isOrgCalendarISO(date) ? weekdays[ordinal(date) % 7] : ""
export const shiftOrgCalendarDate = (date: string, amount: number, unit: Exclude<OrgCalendarUnit, "h">): string | null => {
	if (!isOrgCalendarISO(date) || !Number.isSafeInteger(amount)) return null
	if (unit === "d" || unit === "w") return fromOrdinal(ordinal(date) + amount * (unit === "w" ? 7 : 1))
	const total = Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1 + amount * (unit === "y" ? 12 : 1)
	const year = Math.floor(total / 12), month = (total % 12) + 1
	if (year < 1 || year > 9999) return null
	return iso(year, month, Math.min(Number(date.slice(8, 10)), orgCalendarMonthDays(year, month)))
}
/** Org timestamp arithmetic normalizes overflowing days; calendar navigation clamps instead. */
const shiftTimestampDate = (date: string, amount: number, unit: Exclude<OrgCalendarUnit, "h">): string | null => {
	if (!isOrgCalendarISO(date) || !Number.isSafeInteger(amount)) return null
	if (unit === "d" || unit === "w") return shiftOrgCalendarDate(date, amount, unit)
	const total = Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1 + amount * (unit === "y" ? 12 : 1)
	if (!Number.isSafeInteger(total)) return null
	const year = Math.floor(total / 12), month = total - year * 12 + 1
	if (year < 1 || year > 9999) return null
	return fromOrdinal(ordinal(iso(year, month, 1)) + Number(date.slice(8, 10)) - 1)
}
const validTime = (time: unknown): time is string => typeof time === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
const formatTime = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`
export const shiftOrgLocalDateTime = (date: string, time: string, amount: number, unit: OrgCalendarUnit): { date: string; time: string } | null => {
	if (!isOrgCalendarISO(date) || !validTime(time) || !Number.isSafeInteger(amount)) return null
	if (unit !== "h") { const shifted = shiftTimestampDate(date, amount, unit); return shifted ? { date: shifted, time } : null }
	const total = minutes(time) + amount * 60, shifted = fromOrdinal(ordinal(date) + Math.floor(total / 1440))
	return shifted ? { date: shifted, time: formatTime(((total % 1440) + 1440) % 1440) } : null
}
const clockToken = "(?:h\\d{2}|\\d{1,2}(?::\\d{2}|h\\d{0,2})(?:am|pm)?|\\d{1,2}(?:am|pm))"
const parseClock = (text: string): string | null => {
	const minuteOnly = /^h([0-5]\d)$/i.exec(text)
	if (minuteOnly) return formatTime(Number(minuteOnly[1]))
	const m = /^(\d{1,2})(?:(?::|h)(\d{0,2}))?(am|pm)?$/i.exec(text)
	if (!m) return null
	let hour = Number(m[1]); const minute = Number(m[2] || "0")
	if (minute > 59 || (m[3] ? hour < 1 || hour > 12 : hour > 23)) return null
	if (m[3]) hour = hour % 12 + (m[3].toLowerCase() === "pm" ? 12 : 0)
	return formatTime(hour * 60 + minute)
}
const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
const expandYear = (value: string, context?: OrgDateContext): number | null => {
	const year = Number(value)
	if (year >= 100 || value.length >= 3 && !context?.policy?.forceCompatibleYears || year === 0 && value.length >= 3) return year
	if (!isOrgCalendarISO(context?.today)) return null
	const current = Number(context.today.slice(0, 4))
	// GNU's moving pivot accepts years through current year + 30.
	const century = Math.floor((current + 30) / 100) * 100
	return century + year > current + 30 ? century + year - 100 : century + year
}
const readCalendar = (text: string, context?: OrgDateContext): { date: string; time?: string } | "needs-context" | null => {
	if (isOrgCalendarISO(text) && !context?.policy?.forceCompatibleYears) return { date: text }
	const absolute = /^(\d{1,4})-(\d{1,2})-(\d{1,2})$/.exec(text)
	const dotted = /^(\d{1,2})\. ?(\d{1,2})\.(?: ?(\d{4}))?$/.exec(text)
	const slash = /^(\d{1,2})[/-](\d{1,2})(?:\/(\d{1,4}))?$/.exec(text)
	const named = /^(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?) +(\d{1,2})|(\d{1,2}) +(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))(?: +(\d{1,4}))?$/.exec(text)
	const explicitYear = absolute?.[1] ?? dotted?.[3] ?? slash?.[3] ?? named?.[5]
	if (explicitYear !== undefined) {
		const year = expandYear(explicitYear, context)
		if (year === null) return "needs-context"
		const date = absolute ? iso(year, Number(absolute[2]), Number(absolute[3]))
			: dotted ? iso(year, Number(dotted[2]), Number(dotted[1]))
			: slash ? iso(year, Number(slash[1]), Number(slash[2]))
			: iso(year, months.indexOf((named![1] ?? named![4]).slice(0, 3)) + 1, Number(named![2] ?? named![3]))
		return isOrgCalendarISO(date) ? { date } : null
	}
	const base = context?.defaultDate ?? context?.today
	const today = context?.today
	const week = /^(?:(\d{4})[ -]?)?w(\d{1,2})(?:[ -](mon|tue|wed|thu|fri|sat|sun|[1-7]))?$/.exec(text)
	if (week) {
		if (Number(week[2]) < 1 || Number(week[2]) > 53) return null
		if (!week[1] && !isOrgCalendarISO(base)) return "needs-context"
		const year = Number(week[1] ?? (isOrgCalendarISO(base) ? base.slice(0, 4) : NaN)), jan4 = iso(year, 1, 4), number = Number(week[2])
		if (!isOrgCalendarISO(jan4)) return null
		const day = week[3] ? (/^[1-7]$/.test(week[3]) ? Number(week[3]) - 1 : weekdays.findIndex((d) => d.toLowerCase() === week[3])) : 0
		const date = fromOrdinal(ordinal(jan4) - ordinal(jan4) % 7 + (number - 1) * 7 + day)
		if (!date || number < 1 || number > 53 || fromOrdinal(ordinal(date) - ordinal(date) % 7 + 3)?.slice(0, 4) !== String(year).padStart(4, "0")) return null
		return { date }
	}
	const aliases: Record<string, number> = { today: 0, tomorrow: 1, yesterday: -1, 今天: 0, 明天: 1, 昨天: -1, ".": 0 }
	const relative = /^([+-]{1,2})(\d+)?(h|d|w|m|y|mon|tue|wed|thu|fri|sat|sun)?$/.exec(text)
	const weekday = /^(next )?(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)$/.exec(text)
	if (!isOrgCalendarISO(today) || !isOrgCalendarISO(base)) {
		if (slash && (Number(slash[1]) < 1 || Number(slash[1]) > 12 || Number(slash[2]) < 1 || Number(slash[2]) > orgCalendarMonthDays(2000, Number(slash[1])))) return null
		if (named && (Number(named[2] ?? named[3]) < 1 || Number(named[2] ?? named[3]) > orgCalendarMonthDays(2000, months.indexOf((named[1] ?? named[4]).slice(0, 3)) + 1))) return null
		if (/^\d{1,2}$/.test(text) && (Number(text) < 1 || Number(text) > 31)) return null
		const contextual = Object.hasOwn(aliases, text) || weekday || slash || dotted || named || /^\d{1,2}$/.test(text) ||
			(relative && (relative[1].length === 1 || relative[1][0] === relative[1][1]) && Number.isSafeInteger(Number(relative[2] ?? 1)))
		return contextual ? "needs-context" : null
	}
	if (Object.hasOwn(aliases, text)) { const date = shiftOrgCalendarDate(today, aliases[text], "d"); return date ? { date } : null }
	if (relative) {
		if (relative[1] !== "+" && relative[1] !== "++" && relative[1] !== "-" && relative[1] !== "--") return null
		const amount = Number(relative[2] ?? 1) * (relative[1][0] === "-" ? -1 : 1), unit = relative[3] ?? "d"
		const anchor = relative[1].length === 2 ? base : today
		if (!Number.isSafeInteger(amount)) return null
		if (unit === "h") {
			const clock = relative[1].length === 2 ? context?.defaultTime ?? context?.now : context?.now
			if (clock === undefined) return "needs-context"
			return shiftOrgLocalDateTime(anchor, clock, amount, "h")
		}
		if (unit.length === 3) {
			const weekday = weekdays.findIndex((day) => day.toLowerCase() === unit), direction = amount < 0 ? -1 : 1
			const distance = ((direction * (weekday - ordinal(anchor) % 7)) % 7 + 7) % 7
			const offset = amount === 0 ? distance : direction * ((distance || 7) + (Math.abs(amount) - 1) * 7)
			const date = shiftOrgCalendarDate(anchor, offset, "d"); return date ? { date } : null
		}
		const date = shiftTimestampDate(anchor, amount, unit as Exclude<OrgCalendarUnit, "h">); return date ? { date } : null
	}
	if (weekday) {
		const offset = (weekdays.findIndex((day) => day.toLowerCase() === weekday[2].slice(0, 3)) - ordinal(today) % 7 + 7) % 7
		const date = shiftOrgCalendarDate(today, offset || (weekday[1] ? 7 : 0), "d"); return date ? { date } : null
	}
	const preferFuture = context?.policy?.preferFuture ?? DEFAULT_ORG_DATE_READER_POLICY.preferFuture
	let year = Number((preferFuture ? today : base).slice(0, 4)), month = Number((preferFuture ? today : base).slice(5, 7)), day: number
	let monthGiven = false
	if (slash) { month = Number(slash[1]); day = Number(slash[2]); monthGiven = true }
	else if (dotted) { month = Number(dotted[2]); day = Number(dotted[1]); monthGiven = true }
	else if (named) { month = months.indexOf((named[1] ?? named[4]).slice(0, 3)) + 1; day = Number(named[2] ?? named[3]); monthGiven = true }
	else if (/^\d{1,2}$/.test(text)) day = Number(text)
	else return null
	if (day < 1 || day > 31 || month < 1 || month > 12) return null
	let date = iso(year, month, day)
	if (preferFuture && date < today) {
		if (monthGiven) year++
		else { month++; if (month > 12) { month = 1; year++ } }
		date = iso(year, month, day)
	}
	return isOrgCalendarISO(date) ? { date } : null
}

/** Prompt parsing and stored parsing share primitives, never prompt defaults in Source. */
const parseOrgDate = (input: unknown, context: OrgDateContext | undefined, stored: boolean): OrgDateResult => {
	if (typeof input !== "string" || input.length > 512) return error("Date input must be text of at most 512 UTF-16 units.")
	let text = input.trim().toLowerCase()
	if (stored && !/^(?:[<\[])?\d{4}-\d{2}-\d{2}/.test(text)) return error("Stored timestamps require an absolute Gregorian date.")
	if (context?.policy && (context.policy.preferFuture !== true && context.policy.preferFuture !== false && context.policy.preferFuture !== "time" || typeof context.policy.forceCompatibleYears !== "boolean")) return error("Invalid supplied date reader policy.")
	const bareRange = /^(\d{4}-\d{2}-\d{2}(?:[ \t]+[^<>]*?)?)--(\d{4}-\d{2}-\d{2}(?:[ \t]+[^<>]*)?)$/.exec(text)
	if (bareRange) return parseOrgDate(`<${bareRange[1]}>--<${bareRange[2]}>`, context, stored)
	const wrapped = /^([<\[])([^<>\[\]]+)([>\]])(?:--([<\[])([^<>\[\]]+)([>\]]))?$/.exec(text)
	if (wrapped) {
		if ((wrapped[1] === "<" ? ">" : "]") !== wrapped[3] || (wrapped[4] && (wrapped[4] !== wrapped[1] || wrapped[6] !== wrapped[3]))) return error("Mismatched timestamp delimiters.")
		const first = parseOrgDate(wrapped[2], context, stored)
		if (first.kind === "error") return first
		const value = first.timestamp ?? { date: first.date }
		if (!wrapped[5]) return { ...first, timestamp: value }
		const end = parseOrgDate(wrapped[5], stored ? undefined : { ...context, today: context?.today ?? first.date, defaultDate: first.date, defaultTime: value.time }, stored)
		if (end.kind === "error") return end
		if (end.timestamp?.endDate || end.timestamp?.endTime || `${end.date} ${end.timestamp?.time ?? "00:00"}` < `${first.date} ${value.time ?? "00:00"}`) return error("Invalid or reversed timestamp range.")
		return { ...first, ...(end.forcedYear ? { endForcedYear: end.forcedYear } : {}), timestamp: { ...value, endDate: end.date, endDateTime: end.timestamp?.time, endRepeater: end.timestamp?.repeater, endWarning: end.timestamp?.warning } }
	}
	if (/[<>\[\]]/.test(text)) return error("Malformed timestamp delimiters.")
	let repeater: OrgRepeater | undefined, warning: OrgTimestampValue["warning"]
	const cookies = /(?:^|[ \t])((?:\.\+|\+\+|\+|--|-)(\d+)([hdwmy])(?:\/(\d+)([hdwmy]))?)(?=$|[ \t])/g
	// Leading relative offsets are dates, not repeater cookies.
	const relativePrefix = /^[+-]{1,2}\d+(?:[hdwmy]|mon|tue|wed|thu|fri|sat|sun)?(?=$|[ \t])/.exec(text)
	const cookieFrom = relativePrefix?.[0].length ?? 0
	const remainder = text.slice(cookieFrom)
	let invalidCookie = false
	const withoutCookies = remainder.replace(cookies, (whole, cookie: string, count: string, unit: OrgCalendarUnit, maximum: string | undefined, maximumUnit: OrgCalendarUnit | undefined) => {
		const value = Number(count), mode = cookie.slice(0, cookie.indexOf(count))
		if (!Number.isSafeInteger(value) || value < 0) invalidCookie = true
		if (mode[0] === "-") {
			if (warning || maximum) invalidCookie = true
			warning = { mode: mode as "-" | "--", value, unit }
		} else {
			if (repeater || warning) invalidCookie = true
			repeater = { mode: mode as OrgRepeater["mode"], value, unit, ...(maximum && maximumUnit ? { maximum: { value: Number(maximum), unit: maximumUnit } } : {}) }
			if (maximum && (!Number.isSafeInteger(Number(maximum)) || Number(maximum) < 1)) invalidCookie = true
		}
		return whole.startsWith(" ") || whole.startsWith("\t") ? " " : ""
	})
	if (invalidCookie) return error("Invalid, duplicate or out-of-order repeater/warning cookie.")
	text = (text.slice(0, cookieFrom) + withoutCookies).trim()
	// Stored weekday labels may appear before or after their clock time.
	const weekdayLabel = "(?:mon|tue|wed|thu|fri|sat|sun|(?:周|星期|礼拜)[一二三四五六日天]|[月火水木金土日]曜日)"
	text = text.replace(new RegExp(`^(\\d{4}-\\d{2}-\\d{2})[ \\t]+${weekdayLabel}(?=[ \\t]|$)`, "u"), "$1")
	if (/^\d{4}-\d{2}-\d{2}/.test(text))
		text = text.replace(new RegExp(`[ \\t]+${weekdayLabel}$`, "u"), "")
	let time: string | undefined, endTime: string | undefined
	const timeMatch = new RegExp(`(?:^|[ \\t])(${clockToken})(?:(--?)((${clockToken}))|\\+(\\d+(?::\\d{2})?))?$`, "i").exec(text)
	if (timeMatch) {
		if (stored && (!/^\d{1,2}:\d{2}$/.test(timeMatch[1]) || timeMatch[3] && !/^\d{1,2}:\d{2}$/.test(timeMatch[3]) || timeMatch[5])) return error("Stored timestamps require literal colon clocks, not prompt clock forms.")
		time = parseClock(timeMatch[1]) ?? undefined
		if (!time) return error("Invalid clock time.")
		if (timeMatch[3]) { endTime = parseClock(timeMatch[3]) ?? undefined; if (!endTime) return error("Invalid range end time.") }
		if (timeMatch[5]) {
			const duration = /^(\d+)(?::([0-5]\d))?$/.exec(timeMatch[5])
			if (!duration) return error("Invalid time duration.")
			const total = minutes(time) + Number(duration[1]) * 60 + Number(duration[2] ?? 0)
			if (total >= 1440) return error("Time duration crosses midnight; use a two-date range.")
			endTime = formatTime(total)
		}
		if (endTime && endTime < time) return error("Time range ends before it starts; use a two-date range.")
		text = text.slice(0, timeMatch.index).trim()
	}
	const calendar: { date: string; time?: string } | "needs-context" | null = text ? stored ? isOrgCalendarISO(text) ? { date: text } : null : readCalendar(text, context)
		: stored ? null : isOrgCalendarISO(context?.defaultDate ?? context?.today) ? { date: (context?.defaultDate ?? context?.today)! } : "needs-context"
	if (calendar === "needs-context") return { kind: "error", message: "This date requires explicit local today/default/now context.", requiresContext: true }
	if (!calendar) return error("Invalid date or missing explicit local today/default/now context.")
	time ??= calendar.time
	let date = calendar.date
	if (!stored && !text && time && context?.policy?.preferFuture === "time" && date === context.today) {
		if (!validTime(context.now)) return { kind: "error", message: "Future time preference requires explicit local now.", requiresContext: true }
		if (time < context.now) {
			const next = shiftOrgCalendarDate(date, 1, "d")
			if (!next) return error("Date exceeds Gregorian calendar bounds.")
			date = next
		}
	}
	let forcedYear: { readonly requested: number; readonly actual: number } | undefined
	if (!stored && context?.policy?.forceCompatibleYears) {
		const requested = Number(date.slice(0, 4)), actual = Math.max(1970, Math.min(2037, requested))
		if (requested !== actual) {
			forcedYear = { requested, actual }
			const normalized = fromOrdinal(ordinal(iso(actual, Number(date.slice(5, 7)), 1)) + Number(date.slice(8, 10)) - 1)
			if (!normalized) return error("Forced compatible year exceeds Gregorian bounds.")
			date = normalized
		}
	}
	if (repeater?.unit === "h" && repeater.value !== 0 && !time) return error("Hourly repeaters require a clock time.")
	if (!time && !repeater && !warning) return { kind: "date", date, ...(forcedYear ? { forcedYear } : {}) }
	return { kind: "date", date, timestamp: { date, ...(time ? { time } : {}), ...(endTime ? { endTime } : {}), ...(repeater ? { repeater } : {}), ...(warning ? { warning } : {}) }, ...(forcedYear ? { forcedYear } : {}) }
}
export const readOrgDate = (input: unknown, context?: OrgDateContext): OrgDateResult => parseOrgDate(input, context, false)
export const readOrgStoredTimestamp = (input: unknown): OrgDateResult => parseOrgDate(input, undefined, true)

/** Bare prompt omission inherits existing details; a complete wrapped projection removes them. */
export const readOrgPlanningDate = (input: unknown, context?: OrgDateContext, previous?: OrgTimestampValue): OrgDateResult => {
	const parsed = readOrgDate(input, context)
	if (parsed.kind === "error" || !previous || typeof input !== "string" || /^[<\[]/.test(input.trim())) return parsed
	const entered = parsed.timestamp ?? { date: parsed.date }
	const timestamp = { ...previous, ...entered }
	const validated = readOrgStoredTimestamp(formatOrgTimestamp(timestamp))
	return validated.kind === "error" ? validated : { ...parsed, timestamp }
}
export const formatOrgTimestamp = (value: OrgTimestampValue, active = true): string => {
	const open = active ? "<" : "[", close = active ? ">" : "]"
	const repeater = value.repeater ? ` ${value.repeater.mode}${value.repeater.value}${value.repeater.unit}${value.repeater.maximum ? `/${value.repeater.maximum.value}${value.repeater.maximum.unit}` : ""}` : ""
	const warning = value.warning ? ` ${value.warning.mode}${value.warning.value}${value.warning.unit}` : ""
	const endRepeater = value.endRepeater ? ` ${value.endRepeater.mode}${value.endRepeater.value}${value.endRepeater.unit}${value.endRepeater.maximum ? `/${value.endRepeater.maximum.value}${value.endRepeater.maximum.unit}` : ""}` : ""
	const endWarning = value.endWarning ? ` ${value.endWarning.mode}${value.endWarning.value}${value.endWarning.unit}` : ""
	return `${open}${value.date}${value.time ? ` ${value.time}${value.endTime ? `-${value.endTime}` : ""}` : ""}${repeater}${warning}${close}${value.endDate ? `--${open}${value.endDate}${value.endDateTime ? ` ${value.endDateTime}` : ""}${endRepeater}${endWarning}${close}` : ""}`
}

export const advanceOrgRepeater = (value: OrgTimestampValue & { readonly repeater: OrgRepeater }, context: OrgDateContext): { date: string; time?: string } | null => {
	if (!isOrgCalendarISO(context.today)) return null
	const { repeater } = value
	if (!isOrgCalendarISO(value.date) || !Number.isSafeInteger(repeater.value) || repeater.value < 1) return null
	let date = repeater.mode === ".+" ? context.today : value.date
	let time = repeater.mode === ".+" && repeater.unit === "h" ? context.now : value.time
	if (repeater.unit === "h" && !validTime(time)) return null
	if (repeater.mode === "++" && (repeater.unit === "h" || repeater.unit === "d" || repeater.unit === "w")) {
		if (repeater.unit === "h" && !validTime(context.now)) return null
		const intervalMinutes = repeater.value * (repeater.unit === "h" ? 60 : repeater.unit === "w" ? 10080 : 1440)
		const start = ordinal(value.date) * 1440 + (repeater.unit === "h" ? minutes(value.time!) : 0)
		const completion = ordinal(context.today) * 1440 + (repeater.unit === "h" ? minutes(context.now!) : 0)
		const intervals = Math.max(1, Math.floor((completion - start) / intervalMinutes) + 1)
		const amount = intervals * repeater.value
		if (repeater.unit === "h") return shiftOrgLocalDateTime(value.date, value.time!, amount, "h")
		const shifted = shiftOrgCalendarDate(value.date, amount, repeater.unit)
		return shifted ? { date: shifted, ...(value.time ? { time: value.time } : {}) } : null
	}
	const next = () => {
		if (repeater.unit === "h") { const shifted = shiftOrgLocalDateTime(date, time!, repeater.value, "h"); if (!shifted) return false; date = shifted.date; time = shifted.time }
		else { const shifted = shiftTimestampDate(date, repeater.value, repeater.unit); if (!shifted) return false; date = shifted }
		return true
	}
	if (!next()) return null
	if (repeater.mode === "++") {
		while (date <= context.today) { if (!next()) return null }
	}
	return { date, ...(time ? { time } : {}) }
}

/** Each endpoint owns its cookies. Only known date/weekday/clock/delay spans change. */
export const advanceOrgRepeatingTimestamp = (raw: string, completionStamp: string):
	| { kind: "repeat"; timestamp: string }
	| { kind: "none" }
	| { kind: "rejected"; reason: string } => {
	if (!raw.startsWith("<")) return { kind: "none" }
	const completion = readOrgStoredTimestamp(completionStamp)
	let failure: string | undefined, changed = false
	const timestamp = raw.replace(/<(\d{4}-\d{2}-\d{2})([^<>]*)>/gu, (whole, date: string, body: string) => {
		if (!/(?:^|[ \t])(?:\.\+|\+\+|\+)\d+[hdwmy](?:\/\d+[hdwmy])?(?=$|[ \t])/.test(body)) return whole
		const parsed = readOrgStoredTimestamp(whole)
		if (parsed.kind === "error") { failure = parsed.message; return whole }
		const value = parsed.timestamp
		if (!value?.repeater || value.repeater.value === 0) return whole
		if (completion.kind === "error") { failure = completion.message; return whole }
		const next = advanceOrgRepeater({ ...value, repeater: value.repeater }, { today: completion.date, now: completion.timestamp?.time })
		if (!next) { failure = "Repeating timestamp exceeds calendar bounds or requires an explicit completion time."; return whole }
		if (value.repeater.unit === "h") {
			const firstClock = /\b\d{1,2}:\d{2}\b/.exec(body)
			if (!firstClock || !next.time || !value.time) { failure = "Hourly repetition requires a literal stored colon clock."; return whole }
			const delta = (ordinal(next.date) - ordinal(date)) * 1440 + minutes(next.time) - minutes(value.time)
			body = body.replace(/\b\d{1,2}:\d{2}\b/g, (clock) =>
				formatTime(((minutes(parseClock(clock)!) + delta) % 1440 + 1440) % 1440))
		}
		body = body.replace(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b|(?:周|星期|礼拜)[一二三四五六日天]|[月火水木金土日]曜日/giu, (old) => {
			const index = ordinal(next.date) % 7
			if (/^[A-Za-z]{3}$/.test(old)) return orgCalendarWeekday(next.date)
			if (old.endsWith("曜日")) return ["月", "火", "水", "木", "金", "土", "日"][index] + "曜日"
			return old.replace(/[一二三四五六日天]$/, ["一", "二", "三", "四", "五", "六", "日"][index])
		})
		body = body.replace(/[ \t]--\d+[hdwmy](?=$|[ \t])/g, "")
		const replacement = `<${next.date}${body}>`
		if (readOrgStoredTimestamp(replacement).kind === "error") { failure = "Repeating clock range crosses midnight or exceeds Gregorian bounds."; return whole }
		if (replacement === whole) { failure = "Repeating timestamp did not advance."; return whole }
		changed = true
		return replacement
	})
	return failure ? { kind: "rejected", reason: failure } : changed ? { kind: "repeat", timestamp } : { kind: "none" }
}
