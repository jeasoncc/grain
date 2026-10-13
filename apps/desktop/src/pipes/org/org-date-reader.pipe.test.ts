import { describe, expect, it } from "vitest"
import { advanceOrgRepeatingTimestamp, formatOrgTimestamp, isOrgCalendarISO, readOrgDate, readOrgPlanningDate, readOrgStoredTimestamp, shiftOrgCalendarDate, shiftOrgLocalDateTime } from "./org-date-reader.pipe"

const context = { today: "2006-06-13", now: "23:45", defaultDate: "2006-06-20", defaultTime: "10:30" }
describe("explicit local Org calendar grammar", () => {
	it.each([
		["3-2-5", "2003-02-05"], ["2/5/3", "2003-02-05"],
		["14", "2006-06-14"], ["12", "2006-07-12"], ["2/5", "2007-02-05"],
		["fri", "2006-06-16"], ["sep 15", "2006-09-15"], ["feb 15", "2007-02-15"],
		["sep 12 9", "2009-09-12"], ["w4", "2006-01-23"],
		["2012 w4 fri", "2012-01-27"], ["2012-w04-5", "2012-01-27"],
		["today", "2006-06-13"], ["明天", "2006-06-14"], ["昨天", "2006-06-12"],
		["+0", "2006-06-13"], [".", "2006-06-13"], ["+4", "2006-06-17"],
		["+2w", "2006-06-27"], ["++5", "2006-06-25"], ["--2d", "2006-06-18"],
		["+2tue", "2006-06-27"], ["next monday", "2006-06-19"], ["-Tue", "2006-06-06"],
		["+1m", "2006-07-13"], ["+1y", "2007-06-13"],
	])("reads %s", (input, date) => expect(readOrgDate(input, context)).toEqual({ kind: "date", date }))
	it.each(["0001-01-01", "0099-02-28", "2000-02-29", "9999-12-31"])("reads absolute %s without clock", (date) => expect(readOrgDate(date)).toEqual({ kind: "date", date }))
	it.each([
		["12:45", "<2006-06-20 12:45>"], ["22 sept 0:34", "<2006-09-22 00:34>"],
		["2006-06-20 h30", "<2006-06-20 00:30>"],
		["11am-1:15pm", "<2006-06-20 11:00-13:15>"], ["11h-13h15", "<2006-06-20 11:00-13:15>"],
		["11am--1:15pm", "<2006-06-20 11:00-13:15>"], ["11am+2:15", "<2006-06-20 11:00-13:15>"],
		["11:00+2", "<2006-06-20 11:00-13:00>"], ["11am+2", "<2006-06-20 11:00-13:00>"],
		["11:00+0", "<2006-06-20 11:00-11:00>"], ["11:45+2", "<2006-06-20 11:45-13:45>"],
		["11:45+2:15", "<2006-06-20 11:45-14:00>"],
		["11:00+2 ++1w/2w --2d", "<2006-06-20 11:00-13:00 ++1w/2w --2d>"],
		["+2h", "<2006-06-14 01:45>"], ["++2h", "<2006-06-20 12:30>"],
		["2006-06-20 10:00-11:00 ++1w -3d", "<2006-06-20 10:00-11:00 ++1w -3d>"],
		["<2006-06-20 Tue 10:00 .+1m --2d>--<2006-06-22 Thu 11:00>", "<2006-06-20 10:00 .+1m --2d>--<2006-06-22 11:00>"],
		["<2006-06-20 Tue 08:00-10:30 .+1m --2d>--<2006-06-22 Thu 11:00>", "<2006-06-20 08:00-10:30 .+1m --2d>--<2006-06-22 11:00>"],
		["2006-06-20--2006-06-22", "<2006-06-20>--<2006-06-22>"],
		["2006-06-20 +1w/2w -0d", "<2006-06-20 +1w/2w -0d>"],
	])("applies full %s intent", (input, expected) => {
		const result = readOrgDate(input, context)
		if (result.kind === "error") throw new Error(result.message)
		expect(formatOrgTimestamp(result.timestamp ?? { date: result.date })).toBe(expected)
	})
	it("keeps both range clocks when changing either endpoint", () => {
		const result = readOrgDate("<2006-06-20 08:00-10:30>--<2006-06-22 11:00>")
		if (result.kind === "error" || !result.timestamp) throw new Error("Expected rich timestamp")
		expect(formatOrgTimestamp({ ...result.timestamp, endTime: "10:45" })).toBe("<2006-06-20 08:00-10:45>--<2006-06-22 11:00>")
		expect(formatOrgTimestamp({ ...result.timestamp, endDateTime: "12:00" })).toBe("<2006-06-20 08:00-10:30>--<2006-06-22 12:00>")
		expect(formatOrgTimestamp({ ...result.timestamp, endDate: undefined, endDateTime: undefined })).toBe("<2006-06-20 08:00-10:30>")
	})
	it.each(["11:00+", "11:00+-2", "11:00+2:", "11:00+2:60", "11:00+2:3", "23:00+1", "23:00+2", "11:00+999999999999999999999"])("rejects invalid or overnight duration %s", (input) => {
		expect(readOrgDate(input, context).kind).toBe("error")
	})
	it("uses the supplied default/today date for a whole-hour duration without an ambient clock", () => {
		expect(readOrgDate("11:00+2", context)).toEqual({ kind: "date", date: context.defaultDate, timestamp: { date: context.defaultDate, time: "11:00", endTime: "13:00" } })
		expect(readOrgDate("11:00+2", { today: context.today })).toMatchObject({ kind: "date", date: context.today })
		expect(readOrgDate("11:00+2")).toMatchObject({ kind: "error", requiresContext: true })
	})
	it.each(["0000-01-01", "1900-02-29", "2026-04-31", "tomorrow evening", "2026-01-01T00:00:00Z", "+999999999999999999999999w", "x".repeat(513), "25:00", "10:60", "2006-06-20 +1w +2d", "2006-06-20 -2d +1w", "2006-06-20 +1h", "<2006-06-20]", "<2006-06-20>--<2006-06-19>", "2012-w54-5", "2021-w53-1", "februaryish 1"])("rejects %s without discarding input", (input) => expect(readOrgDate(input, context).kind).toBe("error"))
	it("requires explicit local authority and never coerces objects", () => {
		expect(readOrgDate("today").kind).toBe("error")
		expect(readOrgDate("+2h", { today: "2026-01-01" }).kind).toBe("error")
		expect(readOrgDate("today", { today: "no" }).kind).toBe("error")
		expect(readOrgDate({ toString() { throw new Error("coercion") } }).kind).toBe("error")
		expect(isOrgCalendarISO(null)).toBe(false)
	})
	it("uses local Gregorian arithmetic across leap/month/year bounds", () => {
		expect(shiftOrgCalendarDate("2024-01-31", 1, "m")).toBe("2024-02-29")
		expect(shiftOrgCalendarDate("2024-02-29", 1, "y")).toBe("2025-02-28")
		expect(shiftOrgCalendarDate("1900-02-28", 1, "d")).toBe("1900-03-01")
		expect(shiftOrgCalendarDate("0001-01-01", -1, "d")).toBeNull()
		expect(shiftOrgCalendarDate("9999-12-31", 1, "d")).toBeNull()
		expect(shiftOrgLocalDateTime("2026-03-08", "23:30", 2, "h")).toEqual({ date: "2026-03-09", time: "01:30" })
	})
	it("normalizes timestamp month/year overflow without changing navigation clamping", () => {
		expect(readOrgDate("++1m", { today: "2026-10-10", defaultDate: "2024-01-31" })).toEqual({ kind: "date", date: "2024-03-02" })
		expect(readOrgDate("++1y", { today: "2026-10-10", defaultDate: "2024-02-29" })).toEqual({ kind: "date", date: "2025-03-01" })
		expect(readOrgDate("++1m", { today: "2026-10-10", defaultDate: "9999-12-31" }).kind).toBe("error")
		expect(shiftOrgLocalDateTime("2024-01-31", "12:00", 1, "m")).toEqual({ date: "2024-03-02", time: "12:00" })
	})
	it("supports named GNU prompt forms with an explicit moving-year pivot", () => {
		const supplied = { today: "2026-10-10", defaultDate: "2027-12-20" }
		expect(readOrgDate("1.6.2026", supplied)).toEqual({ kind: "date", date: "2026-06-01" })
		expect(readOrgDate("97-2-5", supplied)).toEqual({ kind: "date", date: "1997-02-05" })
		expect(readOrgDate("56-2-5", supplied)).toEqual({ kind: "date", date: "2056-02-05" })
		expect(readOrgDate("57-2-5", supplied)).toEqual({ kind: "date", date: "1957-02-05" })
		expect(readOrgDate("6-1", supplied)).toEqual({ kind: "date", date: "2027-06-01" })
		expect(readOrgDate("97-2-5")).toMatchObject({ kind: "error", requiresContext: true })
	})
	it("keeps prompt policy explicit and reports forced years rather than rewriting Source", () => {
		const supplied = { today: "2026-10-10", now: "04:20", defaultDate: "2027-12-20" }
		expect(readOrgDate("14", supplied)).toEqual({ kind: "date", date: "2026-10-14" })
		expect(readOrgDate("14", { ...supplied, policy: { preferFuture: false, forceCompatibleYears: false } })).toEqual({ kind: "date", date: "2027-12-14" })
		expect(readOrgDate("00:01", { ...supplied, defaultDate: supplied.today, policy: { preferFuture: "time", forceCompatibleYears: false } })).toMatchObject({ kind: "date", date: "2026-10-11", timestamp: { time: "00:01" } })
		expect(readOrgDate("00:01", { ...supplied, policy: { preferFuture: "time", forceCompatibleYears: false } })).toMatchObject({ kind: "date", date: "2027-12-20" })
		expect(readOrgDate("2040-02-29", { ...supplied, policy: { preferFuture: true, forceCompatibleYears: true } })).toEqual({ kind: "date", date: "2037-03-01", forcedYear: { requested: 2040, actual: 2037 } })
		expect(readOrgStoredTimestamp("<2040-02-29 Wed>")).toMatchObject({ kind: "date", date: "2040-02-29" })
		expect(readOrgDate("<2040-01-01>--<2050-01-02>", { ...supplied, policy: { preferFuture: true, forceCompatibleYears: true } })).toMatchObject({ kind: "date", forcedYear: { requested: 2040, actual: 2037 }, endForcedYear: { requested: 2050, actual: 2037 } })
	})
	it.each(["<tomorrow>", "<1.6.2026>", "<97-2-5>", "<2026-10-10 h30>", "<2026-10-10 8pm>", "<2026-10-10 11:00+2>", "<2026-10-10 11:00+2:00>", "<2026-10-10 opaque>"])("does not reinterpret stored %s with prompt defaults", (input) => {
		expect(readOrgStoredTimestamp(input).kind).toBe("error")
	})
	it("shares omitted-versus-removed intent with planning consumers", () => {
		const previous = readOrgStoredTimestamp("<2006-06-20 Tue 08:00-10:30 +1w/2w --2d>--<2006-06-22 Thu 11:00>")
		if (previous.kind !== "date" || !previous.timestamp) throw new Error("Expected stored default")
		const omitted = readOrgPlanningDate("09:00", context, previous.timestamp)
		if (omitted.kind !== "date" || !omitted.timestamp) throw new Error("Expected merged prompt")
		expect(formatOrgTimestamp(omitted.timestamp)).toBe("<2006-06-20 09:00-10:30 +1w/2w --2d>--<2006-06-22 11:00>")
		const removed = readOrgPlanningDate("<2006-06-20 09:00>", context, previous.timestamp)
		if (removed.kind !== "date" || !removed.timestamp) throw new Error("Expected explicit projection")
		expect(formatOrgTimestamp(removed.timestamp)).toBe("<2006-06-20 09:00>")
	})
	it("round trips endpoint cookies independently", () => {
		const input = "<2026-09-30 +1w/2w -3d>--<2026-10-31 ++1m/2m --2d>"
		const parsed = readOrgStoredTimestamp(input)
		if (parsed.kind !== "date" || !parsed.timestamp) throw new Error("Expected endpoint controls")
		expect(formatOrgTimestamp(parsed.timestamp)).toBe(input)
	})
})

describe("raw recurring timestamp advancement", () => {
	it.each([
		["<2024-01-31 Wed +1m -3d>", "[2024-03-01 Fri 12:00]", "<2024-03-02 Sat +1m -3d>"],
		["<2026-09-01 Tue ++1w>", "[2026-09-30 Wed 12:00]", "<2026-10-06 Tue ++1w>"],
		["<2026-09-30 Wed 20:00 ++1d>", "[2026-09-30 Wed 12:00]", "<2026-10-01 Thu 20:00 ++1d>"],
		["<2026-09-29 Tue 20:00 ++1d>", "[2026-09-30 Wed 12:00]", "<2026-10-01 Thu 20:00 ++1d>"],
		["<2026-09-01 Tue 08:30 .+1m>", "[2026-09-30 Wed 12:00]", "<2026-10-30 Fri 08:30 .+1m>"],
		["<2026-09-01 08:30 Tue .+1h>", "[2026-09-30 Wed 23:30]", "<2026-10-01 00:30 Thu .+1h>"],
		["<2026-09-30\t周三 10:30-11:30  +1w --2d>--<2026-10-02 Fri 11:30>", "[2026-09-30 Wed 12:00]", "<2026-10-07\t周三 10:30-11:30  +1w>--<2026-10-02 Fri 11:30>"],
		["<2024-02-29 Thu +1y>", "[2026-10-10 Sat 04:17]", "<2025-03-01 Sat +1y>"],
		["<2026-09-30 Wed>--<2026-10-31 Sat +1w>", "[2026-10-10 Sat 04:17]", "<2026-09-30 Wed>--<2026-11-07 Sat +1w>"],
		["<2026-10-10 Sat 23:59 ++1d>", "[2026-10-10 Sat 04:17]", "<2026-10-11 Sun 23:59 ++1d>"],
		["<2026-10-09 Fri 23:59 ++1d>", "[2026-10-10 Sat 04:17]", "<2026-10-11 Sun 23:59 ++1d>"],
		["<2026-08-31 Mon ++1m/2m --2d>", "[2026-10-10 Sat 04:24]", "<2026-11-01 Sun ++1m/2m>"],
		["<2024-02-29 Thu ++1y>", "[2026-10-10 Sat 04:24]", "<2027-03-01 Mon ++1y>"],
		["<2026-09-30 Wed +1w>--<2026-10-31 Sat +1m --2d>", "[2026-10-10 Sat 04:24]", "<2026-10-07 Wed +1w>--<2026-12-01 Tue +1m>"],
	])("preserves non-date bytes for %s", (raw, completion, timestamp) => expect(advanceOrgRepeatingTimestamp(raw, completion)).toEqual({ kind: "repeat", timestamp }))
	it("ignores inactive/no repeater and refuses overflow or missing hourly clock", () => {
		expect(advanceOrgRepeatingTimestamp("[2026-09-30 +1w]", "[2026-09-30 Wed 12:00]")).toEqual({ kind: "none" })
		expect(advanceOrgRepeatingTimestamp("<2026-09-30>", "[2026-09-30 Wed 12:00]")).toEqual({ kind: "none" })
		expect(advanceOrgRepeatingTimestamp("<9999-12-31 +1d>", "[2026-09-30 Wed 12:00]").kind).toBe("rejected")
		expect(advanceOrgRepeatingTimestamp("<2026-09-30 +1h>", "[2026-09-30 Wed 12:00]").kind).toBe("rejected")
		expect(advanceOrgRepeatingTimestamp("<2026-09-30 Wed 8pm +1h>", "[2026-09-30 Wed 12:00]").kind).toBe("rejected")
		expect(advanceOrgRepeatingTimestamp("<2026-09-30 Wed +0w>", "[2026-09-30 Wed 12:00]")).toEqual({ kind: "none" })
		expect(advanceOrgRepeatingTimestamp("<2026-09-30 Wed +0h>", "[2026-09-30 Wed 12:00]")).toEqual({ kind: "none" })
		expect(advanceOrgRepeatingTimestamp("<2026-09-30 Wed ++0w>", "[2026-09-30 Wed 12:00]")).toEqual({ kind: "none" })
		expect(advanceOrgRepeatingTimestamp("<2026-09-30 Wed .+0w>", "[2026-09-30 Wed 12:00]")).toEqual({ kind: "none" })
		expect(advanceOrgRepeatingTimestamp("<2026-09-30 Wed +1w unknown>", "[2026-09-30 Wed 12:00]").kind).toBe("rejected")
		expect(advanceOrgRepeatingTimestamp("<0001-01-01 Mon .+1m>", "[9999-12-31 Fri 12:00]").kind).toBe("rejected")
	})
})
