import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useSettings } from "@/hooks/use-settings"
import { OrgAgendaSettings } from "./org-agenda-settings.view.fn"

const configured = JSON.stringify({ version: 1, views: [{ id: "pending", name: "Pending work", files: ["work.org"], mode: "todo", todo: "pending", match: "+work", window: null, overdue: false, deadlineWarningDays: null }] })
beforeEach(() => { useSettings.setState({ orgAgendaConfigurationJson: "" }) })
afterEach(() => { cleanup(); vi.restoreAllMocks(); useSettings.setState({ orgAgendaConfigurationJson: "" }) })

describe("Org Agenda settings", () => {
	it("persists only an explicitly saved validated view and leaves unsafe draft scope unsaved", () => {
		render(<OrgAgendaSettings />)
		fireEvent.change(screen.getByRole("textbox"), { target: { value: configured } })
		expect(useSettings.getState().orgAgendaConfigurationJson).toBe("")
		fireEvent.click(screen.getByRole("button", { name: "Save Org Agenda configuration" }))
		expect(useSettings.getState().orgAgendaConfigurationJson).toBe(configured)
		expect(JSON.parse(localStorage.getItem("grain-settings") ?? "null")).toMatchObject({ state: { orgAgendaConfigurationJson: configured } })
		fireEvent.change(screen.getByRole("textbox"), { target: { value: configured.replace("work.org", "../outside.org") } })
		expect(screen.getByRole("button", { name: "Save Org Agenda configuration" })).toBeDisabled()
		expect(screen.getByRole("alert")).toBeInTheDocument()
		expect(useSettings.getState().orgAgendaConfigurationJson).toBe(configured)
	})
	it("keeps the prior saved view and persisted bytes when a real storage write fails", () => {
		useSettings.setState({ orgAgendaConfigurationJson: configured })
		const persisted = localStorage.getItem("grain-settings")
		vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("storage denied") })
		render(<OrgAgendaSettings />)
		fireEvent.click(screen.getByRole("button", { name: "Restore all-date Agenda display" }))
		expect(screen.getByRole("alert")).toBeInTheDocument()
		expect(useSettings.getState().orgAgendaConfigurationJson).toBe(configured)
		expect(localStorage.getItem("grain-settings")).toBe(persisted)
	})
	it("exposes invalid saved configuration rather than silently replacing it with all-date defaults", () => {
		useSettings.setState({ orgAgendaConfigurationJson: "{" })
		render(<OrgAgendaSettings />)
		expect(screen.getByRole("textbox")).toHaveValue("{")
		expect(screen.getAllByRole("alert")).toHaveLength(2)
		expect(screen.getByRole("button", { name: "Save Org Agenda configuration" })).toBeDisabled()
		expect(useSettings.getState().orgAgendaConfigurationJson).toBe("{")
		fireEvent.change(screen.getByRole("textbox"), { target: { value: configured } })
		expect(screen.getByRole("button", { name: "Save Org Agenda configuration" })).toBeEnabled()
		expect(screen.getByRole("alert")).toHaveTextContent("Saved Agenda configuration is unavailable")
		expect(useSettings.getState().orgAgendaConfigurationJson).toBe("{")
	})
})
