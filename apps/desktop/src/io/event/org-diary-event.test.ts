import { describe, expect, it, vi } from "vitest"
import { listenForOrgDiaryCreation, requestOrgDiaryCreation } from "./org-diary-event"

describe("Org diary UI event", () => {
	it("dispatches to active Org workspace listeners and supports cleanup", () => {
		const listener = vi.fn()
		const stop = listenForOrgDiaryCreation(listener)

		requestOrgDiaryCreation()
		expect(listener).toHaveBeenCalledOnce()

		stop()
		requestOrgDiaryCreation()
		expect(listener).toHaveBeenCalledOnce()
	})
})
