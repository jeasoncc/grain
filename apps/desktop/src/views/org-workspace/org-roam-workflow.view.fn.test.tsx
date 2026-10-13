import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { render } from "@/test/application-providers"
import { useSettings } from "@/hooks/use-settings"
import type { OrgRoamCaptureTool } from "@/hooks/use-org-roam-workflow"
import { OrgRoamWorkflowView } from "./org-roam-workflow.view.fn"

afterEach(() => { cleanup(); useSettings.setState({ orgKeymapConfigurationJson: "" }) })
it("retains an outer-control Roam leader only for its current tool incarnation", () => {
	useSettings.setState({ orgKeymapConfigurationJson: JSON.stringify({ version: 1,
		leaders: [{ scope: "org-roam", key: "C-l", map: "roam-outer" }],
		transients: [{ id: "roam-outer", label: "Roam outer", scope: "org-roam", timeoutMs: null,
			bindings: [{ key: "f", command: "org-roam.finish" }] }],
	}) })
	const firstFinish = vi.fn()
	const secondFinish = vi.fn()
	const tool: OrgRoamCaptureTool = { id: 1, content: "* Note\r\nbody\0😀", title: "Note", relativePath: "note.org",
		pending: false, dirty: false, readOnly: false, origin: null, drain: async () => {}, closeFence: "scope1",
		message: null, bindHost: vi.fn(), onChange: vi.fn(), finish: firstFinish, cancel: vi.fn() }
	const app = render(<OrgRoamWorkflowView tool={tool} />)
	const oldControl = screen.getByRole("button", { name: "Finish" })
	act(() => oldControl.focus())
	fireEvent.keyDown(oldControl, { key: "l", ctrlKey: true })
	app.rerender(<OrgRoamWorkflowView tool={{ ...tool, id: 2, closeFence: "scope2", finish: secondFinish }} />)
	const currentControl = screen.getByRole("button", { name: "Finish" })
	act(() => currentControl.focus())
	fireEvent.keyDown(currentControl, { key: "f" })
	fireEvent.keyDown(oldControl, { key: "f" })
	expect(firstFinish).not.toHaveBeenCalled()
	expect(secondFinish).not.toHaveBeenCalled()
	fireEvent.keyDown(currentControl, { key: "l", ctrlKey: true })
	fireEvent.keyDown(currentControl, { key: "f" })
	expect(secondFinish).toHaveBeenCalledOnce()
	expect(tool.onChange).not.toHaveBeenCalled()
})
