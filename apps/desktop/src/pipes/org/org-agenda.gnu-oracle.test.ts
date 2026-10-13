import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import fixture from "./org-agenda.gnu-fixtures.json"
import { readOrgStoredTimestamp } from "./org-date-reader.pipe"
import { closestOrgAgendaRepeat } from "./org-agenda-projection.pipe"

describe("owned GNU Agenda calendar evidence", () => {
	it("preserves genuine monthly overflow, leap-year, hourly and completion-mode occurrence calendars", () => {
		for (const row of fixture.rows) {
			const parsed = readOrgStoredTimestamp(row.stamp)
			if (parsed.kind !== "date" || !parsed.timestamp) throw new Error(`Invalid owned GNU input: ${row.stamp}`)
			expect(closestOrgAgendaRepeat(parsed.timestamp, row.day, "past"), `${row.stamp} ${row.day} past`).toBe(row.past)
			expect(closestOrgAgendaRepeat(parsed.timestamp, row.day, "future"), `${row.stamp} ${row.day} future`).toBe(row.future)
		}
	})
	it("reproduces evidence with installed unmodified GNU calendar functions and no clock emulation", () => {
		const native = spawnSync("emacs", ["--batch", "-Q", "--script", join(dirname(fileURLToPath(import.meta.url)), "org-agenda.gnu-oracle.el")], { encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 })
		expect(native.error, "GNU required, not mocked or skipped").toBeUndefined()
		expect(native.status, native.stderr).toBe(0)
		expect(JSON.parse(native.stdout).rows).toEqual(fixture.rows)
	}, 35_000)
})
