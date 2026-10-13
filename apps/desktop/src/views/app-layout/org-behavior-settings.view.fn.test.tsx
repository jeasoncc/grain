import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useSettings } from "@/hooks/use-settings"
import { DEFAULT_ORG_BEHAVIOR_CONFIGURATION } from "@/pipes/org/org-behavior-configuration.pipe"
import { OrgBehaviorSettings } from "./org-behavior-settings.view.fn"

const configured = JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION, refile: { files: ["work.org"], maxDepth: 2, includeRoot: false, match: "+work-boss" } })
beforeEach(() => { useSettings.setState({ orgBehaviorConfigurationJson: "" }) })
afterEach(() => { cleanup(); vi.restoreAllMocks(); useSettings.setState({ orgBehaviorConfigurationJson: "" }) })

describe("Org behavior settings", () => {
	it("saves only validated closed JSON through transactional persisted settings", () => {
		render(<OrgBehaviorSettings />)
		fireEvent.change(screen.getByRole("textbox", { name: "Org behavior configuration JSON" }), { target: { value: configured } })
		expect(useSettings.getState().orgBehaviorConfigurationJson).toBe("")
		fireEvent.click(screen.getByRole("button", { name: "Save Org behavior configuration" }))
		expect(useSettings.getState().orgBehaviorConfigurationJson).toBe(configured)
		expect(JSON.parse(localStorage.getItem("grain-settings") ?? "null")).toMatchObject({ state: { orgBehaviorConfigurationJson: configured } })
	})
	it.each(["{broken", configured.replace('"work.org"', '"../secret.org"')])("leaves saved behavior unchanged when an override is invalid", (invalid) => {
		useSettings.setState({ orgBehaviorConfigurationJson: configured })
		render(<OrgBehaviorSettings />)
		fireEvent.change(screen.getByRole("textbox"), { target: { value: invalid } })
		expect(screen.getByRole("button", { name: "Save Org behavior configuration" })).toBeDisabled()
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true")
		expect(screen.getByRole("alert")).toBeInTheDocument()
		expect(useSettings.getState().orgBehaviorConfigurationJson).toBe(configured)
	})
	it("keeps saved behavior and persisted bytes unchanged on storage failure", () => {
		useSettings.setState({ orgBehaviorConfigurationJson: configured })
		const previous = localStorage.getItem("grain-settings")
		vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("storage denied") })
		render(<OrgBehaviorSettings />)
		fireEvent.click(screen.getByRole("button", { name: "Restore Org behavior defaults" }))
		expect(screen.getByRole("alert")).toBeInTheDocument()
		expect(useSettings.getState().orgBehaviorConfigurationJson).toBe(configured)
		expect(localStorage.getItem("grain-settings")).toBe(previous)
	})
	it("loads editable defaults without saving, then restores the actual blank default explicitly", () => {
		useSettings.setState({ orgBehaviorConfigurationJson: configured })
		render(<OrgBehaviorSettings />)
		fireEvent.click(screen.getByRole("button", { name: "Load default Org behavior JSON for editing" }))
		expect(useSettings.getState().orgBehaviorConfigurationJson).toBe(configured)
		expect(JSON.parse(screen.getByRole<HTMLTextAreaElement>("textbox").value)).toEqual(DEFAULT_ORG_BEHAVIOR_CONFIGURATION)
		fireEvent.click(screen.getByRole("button", { name: "Restore Org behavior defaults" }))
		expect(useSettings.getState().orgBehaviorConfigurationJson).toBe("")
	})
	it("presents explicit reader and logging defaults without changing saved behavior", () => {
		render(<OrgBehaviorSettings />)
		expect(screen.getByText(/Compatible years forces prompt years/)).toBeInTheDocument()
		expect(screen.getByText(/repeat logging defaults to time/)).toBeInTheDocument()
		expect(useSettings.getState().orgBehaviorConfigurationJson).toBe("")
	})
})
