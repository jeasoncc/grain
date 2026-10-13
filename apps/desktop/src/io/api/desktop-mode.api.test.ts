import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
// Fresh imports intentionally exercise process-start module initialization for browser/native modes.

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock("@tauri-apps/api/core", () => ({ invoke }))
vi.mock("@/io/log/logger.api", () => ({ info: vi.fn(), error: vi.fn() }))

const markNative = () => Object.defineProperty(window, "__TAURI_INTERNALS__", {
	configurable: true,
	value: {},
})

beforeEach(() => {
	vi.resetModules()
	invoke.mockReset()
	Reflect.deleteProperty(window, "__TAURI_INTERNALS__")
	Reflect.deleteProperty(window, "__TAURI__")
})
afterEach(() => {
	Reflect.deleteProperty(window, "__TAURI_INTERNALS__")
	vi.unstubAllGlobals()
})

describe("immutable native desktop authority", () => {
	it("keeps the browser Org-only and refuses historical HTTP queries", async () => {
		const fetch = vi.fn()
		vi.stubGlobal("fetch", fetch)
		const { getDesktopMode } = await import("./desktop-mode.api")
		const { api } = await import("./client.api")
		expect(await getDesktopMode()()).toEqual({ _tag: "Right", right: "org" })
		expect((await api.getWorkspaces()())._tag).toBe("Left")
		expect(fetch).not.toHaveBeenCalled()
		expect(invoke).not.toHaveBeenCalled()
	})

	it.each(["org", "unexpected"])("does not grant legacy access for native mode %s", async (mode) => {
		markNative()
		invoke.mockResolvedValue(mode)
		const { api } = await import("./client.api")
		expect((await api.getWorkspaces()())._tag).toBe("Left")
		expect(invoke.mock.calls.map(([command]) => command)).toEqual(["get_desktop_mode"])
	})

	it("preserves native failure and never executes historical queries", async () => {
		markNative()
		invoke.mockRejectedValue(new Error("native unavailable"))
		const { getDesktopMode } = await import("./desktop-mode.api")
		const { api } = await import("./client.api")
		const result = await getDesktopMode()()
		expect(result._tag).toBe("Left")
		if (result._tag === "Left") expect(result.left.message).toContain("native unavailable")
		expect((await api.getWorkspaces()())._tag).toBe("Left")
		expect(invoke.mock.calls.map(([command]) => command)).toEqual(["get_desktop_mode"])
	})

	it("allows historical reads only after explicit native legacy authorization", async () => {
		markNative()
		invoke.mockImplementation(async (command) => {
			if (command === "get_desktop_mode") return "legacy"
			if (command === "get_workspaces") return []
			throw new Error(`Unexpected command ${command}`)
		})
		const { api } = await import("./client.api")
		expect(await api.getWorkspaces()()).toEqual({ _tag: "Right", right: [] })
		expect(invoke.mock.calls.map(([command]) => command)).toEqual([
			"get_desktop_mode", "get_workspaces",
		])
	})
})
