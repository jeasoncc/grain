import { describe, expect, it, vi } from "vitest"
import {
	createOrgWorkspaceEventAdapter,
	type ListenToTauriEvent,
	ORG_WORKSPACE_CHANGED_EVENT,
} from "./org-workspace-event.adapter"

const asListenToTauriEvent = (mock: ReturnType<typeof vi.fn>): ListenToTauriEvent =>
	mock as unknown as ListenToTauriEvent

describe("Org workspace event adapter", () => {
	it("subscribes to the Tauri event and unwraps its typed payload", async () => {
		const stop = vi.fn()
		const listenMock = vi.fn().mockResolvedValue(stop)
		const handler = vi.fn()
		const adapter = createOrgWorkspaceEventAdapter(asListenToTauriEvent(listenMock))

		const unsubscribe = await adapter.listen(handler)
		const eventHandler = listenMock.mock.calls[0]?.[1]
		const payload = {
			paths: ["notes.org", "projects/book.org"],
			token: "watch-123",
			workspaceRoot: "/notes",
		}
		eventHandler({ payload })
		unsubscribe()

		expect(listenMock).toHaveBeenCalledWith(ORG_WORKSPACE_CHANGED_EVENT, expect.any(Function))
		expect(handler).toHaveBeenCalledWith(payload)
		expect(stop).toHaveBeenCalledOnce()
	})

	it("passes listener setup failures to the caller", async () => {
		const failure = new Error("event API unavailable")
		const adapter = createOrgWorkspaceEventAdapter(
			asListenToTauriEvent(vi.fn().mockRejectedValue(failure)),
		)

		await expect(adapter.listen(vi.fn())).rejects.toBe(failure)
	})
})
