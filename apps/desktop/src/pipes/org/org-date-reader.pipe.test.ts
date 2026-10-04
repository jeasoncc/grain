import { describe, expect, it } from "vitest"
import { readOrgDate, isOrgCalendarISO } from "./org-date-reader.pipe"

describe("bounded explicit calendar date reader", () => {
	it.each([
		["today", "2026-09-30", "2026-09-30"],
		["TOMORROW", "2026-12-31", "2027-01-01"],
		["昨天", "2024-03-01", "2024-02-29"],
		["明天", "1900-02-28", "1900-03-01"],
		["今天", "0001-01-01", "0001-01-01"],
		["+3d", "2026-01-30", "2026-02-02"],
		["-2W", "2026-01-01", "2025-12-18"],
		["next mon", "2026-09-28", "2026-10-05"],
		["NEXT TUE", "2026-09-28", "2026-09-29"],
		["+36600d", "2000-01-01", "2100-03-17"],
	])("%s from %s", (input, today, date) =>
		expect(readOrgDate(input, { today })).toEqual({ kind: "date", date }))
	it.each([
		"0001-01-01",
		"0099-02-28",
		"2000-02-29",
		"9999-12-31",
	])("ISO without clock %s", (date) => expect(readOrgDate(date)).toEqual({ kind: "date", date }))
	it.each([
		"0000-01-01",
		"1900-02-29",
		"2026-04-31",
		"2026-1-01",
		"tomorrow evening",
		"+1m",
		"next monday",
		"2026-01-01T00:00:00Z",
		"+36601d",
		"+999999999999999999999999w",
		"x".repeat(129),
	])("rejects %s", (input) =>
		expect(readOrgDate(input, { today: "2026-01-01" }).kind).toBe("error"))
	it("requires explicit today and never coerces objects", () => {
		expect(readOrgDate("today").kind).toBe("error")
		expect(readOrgDate("today", { today: "no" }).kind).toBe("error")
		expect(
			readOrgDate({
				toString() {
					throw new Error("coercion")
				},
			}).kind,
		).toBe("error")
		expect(isOrgCalendarISO(null)).toBe(false)
	})
	it("enforces year bounds", () => {
		expect(readOrgDate("yesterday", { today: "0001-01-01" }).kind).toBe("error")
		expect(readOrgDate("tomorrow", { today: "9999-12-31" }).kind).toBe("error")
	})
	it("ignores timezone and DST", () => {
		const before = process.env.TZ
		try {
			for (const tz of ["UTC", "America/New_York", "Asia/Shanghai", "Pacific/Apia"]) {
				process.env.TZ = tz
				expect(readOrgDate("+1d", { today: "2026-03-08" })).toEqual({
					kind: "date",
					date: "2026-03-09",
				})
				expect(readOrgDate("+1d", { today: "2026-11-01" })).toEqual({
					kind: "date",
					date: "2026-11-02",
				})
			}
		} finally {
			if (before === undefined) delete process.env.TZ
			else process.env.TZ = before
		}
	})
})
