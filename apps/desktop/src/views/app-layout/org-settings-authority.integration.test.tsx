import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { render } from "@/test/application-providers"
import { useSettings } from "@/hooks/use-settings"
import { repairOrgConfigurationStorage } from "@/hooks/use-org-input-configuration"
import { getOrgCaptureConfiguration } from "@/hooks/use-org-capture-configuration"
import { getApplicationPopupConfiguration } from "@/hooks/use-application-popup-configuration"
import { OrgCaptureSettings } from "./org-capture-settings.view.fn"
import { ApplicationPopupSettings } from "./application-popup-settings.view.fn"

beforeEach(() => {
	localStorage.clear()
	useSettings.setState({ orgCaptureConfigurationJson: "", applicationPopupConfigurationJson: "" })
	repairOrgConfigurationStorage()
})
afterEach(cleanup)

describe("saved settings remain authority until explicit successful repair", () => {
	it("keeps invalid saved Capture visibly unavailable while a valid default replacement is only drafted", () => {
		useSettings.setState({ orgCaptureConfigurationJson: "{broken" })
		render(<OrgCaptureSettings />)
		fireEvent.click(screen.getByRole("button", { name: "Load default JSON for editing" }))
		expect(screen.getByRole("button", { name: "Save Capture configuration" })).toBeEnabled()
		expect(screen.getByRole("alert")).toHaveTextContent("Saved Capture configuration is unavailable")
		expect(getOrgCaptureConfiguration().configuration).toBeNull()
		expect(useSettings.getState().orgCaptureConfigurationJson).toBe("{broken")
		fireEvent.click(screen.getByRole("button", { name: "Save Capture configuration" }))
		expect(getOrgCaptureConfiguration().configuration).not.toBeNull()
		expect(screen.queryByRole("alert")).toBeNull()
	})

	it("keeps invalid saved tool placement visible while a valid replacement is drafted and repairs only on Save", () => {
		useSettings.setState({ applicationPopupConfigurationJson: "{broken" })
		render(<ApplicationPopupSettings />)
		fireEvent.change(screen.getByRole("textbox"), { target: { value: '{"version":1,"rules":[{"id":"capture","layout":"popup","size":{"widthPercent":70,"heightPercent":60}}]}' } })
		expect(screen.getByRole("button", { name: "Save tool placement" })).toBeEnabled()
		expect(screen.getAllByRole("alert").some(alert => alert.textContent?.includes("Saved popup configuration is invalid"))).toBe(true)
		expect(getApplicationPopupConfiguration().parsed._tag).toBe("Left")
		expect(useSettings.getState().applicationPopupConfigurationJson).toBe("{broken")
		fireEvent.click(screen.getByRole("button", { name: "Save tool placement" }))
		expect(getApplicationPopupConfiguration().parsed._tag).toBe("Right")
		expect(screen.queryByRole("alert")).toBeNull()
	})
})
