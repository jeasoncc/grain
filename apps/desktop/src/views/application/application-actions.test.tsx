import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApplicationActions } from "./application-actions"
import { ApplicationCommandProvider } from "./application-command-provider"

const { navigate, setMode, theme } = vi.hoisted(() => ({ navigate: vi.fn(), setMode: vi.fn(), theme: { isDark: true } }))
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }))
vi.mock("@/hooks/use-theme", () => ({ useTheme: () => ({ isDark: theme.isDark, setMode }) }))
afterEach(cleanup)
beforeEach(() => { vi.clearAllMocks(); theme.isDark = true })

const execute = async (query: string) => {
	fireEvent.keyDown(window, { key: "x", altKey: true })
	fireEvent.change(screen.getByRole("combobox"), { target: { value: query } })
	await act(async () => { fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" }) })
}

describe("actual application actions outside Org", () => {
	it("navigates to real settings and workspace routes from the global host", async () => {
		render(<ApplicationCommandProvider><ApplicationActions /></ApplicationCommandProvider>)
		await execute("Open Editor settings")
		expect(navigate).toHaveBeenLastCalledWith({ to: "/settings/editor" })
		await execute("Open Org workspace")
		expect(navigate).toHaveBeenLastCalledWith({ to: "/org" })
	})
	it("uses the actual effective mode and updates the live command label", async () => {
		const mounted = render(<ApplicationCommandProvider><ApplicationActions /></ApplicationCommandProvider>)
		await execute("Switch to Light Theme")
		expect(setMode).toHaveBeenLastCalledWith("light")
		theme.isDark = false
		mounted.rerender(<ApplicationCommandProvider><ApplicationActions /></ApplicationCommandProvider>)
		await execute("Switch to Dark Theme")
		expect(setMode).toHaveBeenLastCalledWith("dark")
	})
})
