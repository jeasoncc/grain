import { afterEach, describe, expect, it, vi } from "vitest"
import { createDebouncedOrgWorkspaceRefresh, matchesOrgWorkspaceWatch } from "./org-workspace-watch"

describe("Org workspace watch helpers", () => {
	afterEach(() => vi.useRealTimers())

	it("matches events by both workspace root and watch token", () => {
		const event = { paths: ["notes.org"], token: "watch-1", workspaceRoot: "/notes" }

		expect(matchesOrgWorkspaceWatch(event, "/notes", "watch-1")).toBe(true)
		expect(matchesOrgWorkspaceWatch(event, "/other", "watch-1")).toBe(false)
		expect(matchesOrgWorkspaceWatch(event, "/notes", "watch-2")).toBe(false)
	})

	it("debounces bursts and can cancel a pending refresh", () => {
		vi.useFakeTimers()
		const refresh = vi.fn()
		const debounced = createDebouncedOrgWorkspaceRefresh(refresh, 100)

		debounced.schedule()
		vi.advanceTimersByTime(50)
		debounced.schedule()
		vi.advanceTimersByTime(99)
		expect(refresh).not.toHaveBeenCalled()
		vi.advanceTimersByTime(1)
		expect(refresh).toHaveBeenCalledOnce()

		debounced.schedule()
		debounced.cancel()
		vi.advanceTimersByTime(100)
		expect(refresh).toHaveBeenCalledOnce()
	})
})
