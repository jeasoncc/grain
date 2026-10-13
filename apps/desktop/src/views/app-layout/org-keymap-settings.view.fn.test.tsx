import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useSettings } from "@/hooks/use-settings"
import { OrgKeymapSettings } from "./org-keymap-settings.view.fn"

const configuration = '{"version":1,"bindings":[{"scope":"org-source","key":"A-t","command":"tags"}]}'
beforeEach(() => { useSettings.setState({ orgKeymapConfigurationJson: "" }) })
afterEach(() => { cleanup(); vi.restoreAllMocks(); useSettings.setState({ orgKeymapConfigurationJson: "" }) })

describe("OrgKeymapSettings", () => {
	it("keeps edits as a draft and publishes only a validated persisted save", () => {
		render(<OrgKeymapSettings />)
		fireEvent.change(screen.getByRole("textbox"), { target: { value: configuration } })
		expect(useSettings.getState().orgKeymapConfigurationJson).toBe("")
		fireEvent.click(screen.getByRole("button", { name: "Save keymaps" }))
		expect(useSettings.getState().orgKeymapConfigurationJson).toBe(configuration)
		expect(JSON.parse(localStorage.getItem("grain-settings") ?? "null")).toMatchObject({ state: { orgKeymapConfigurationJson: configuration } })
	})
	it("makes an invalid saved override discoverable and requires correction", () => {
		useSettings.setState({ orgKeymapConfigurationJson: '{"version":2}' })
		render(<OrgKeymapSettings />)
		expect(screen.getAllByRole("alert").length).toBeGreaterThan(0)
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true")
		expect(screen.getByRole("button", { name: "Save keymaps" })).toBeDisabled()
		fireEvent.change(screen.getByRole("textbox"), { target: { value: configuration } })
		expect(screen.getByRole("button", { name: "Save keymaps" })).toBeEnabled()
		expect(screen.getByRole("alert")).toHaveTextContent("Saved keymap configuration is unavailable")
		expect(useSettings.getState().orgKeymapConfigurationJson).toBe('{"version":2}')
		fireEvent.click(screen.getByRole("button", { name: "Restore defaults" }))
		expect(useSettings.getState().orgKeymapConfigurationJson).toBe("")
		expect(screen.queryByRole("alert")).not.toBeInTheDocument()
	})
	it("restores prior in-memory authority when persistence rejects the write", () => {
		useSettings.setState({ orgKeymapConfigurationJson: configuration })
		vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("settings storage denied") })
		render(<OrgKeymapSettings />)
		const next = configuration.replace('"tags"', '"todo"')
		fireEvent.change(screen.getByRole("textbox"), { target: { value: next } })
		fireEvent.click(screen.getByRole("button", { name: "Save keymaps" }))
		expect(useSettings.getState().orgKeymapConfigurationJson).toBe(configuration)
		expect(screen.getByRole("alert")).toHaveTextContent("settings storage denied")
		expect(screen.queryByRole("status")).not.toBeInTheDocument()
	})
})
