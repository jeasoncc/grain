import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useSettings } from "@/hooks/use-settings"
import { clearOrgCaptureDrafts, hasOrgCaptureDrafts } from "@/io/storage/org-capture-draft.storage"
import { OrgCaptureSettings } from "./org-capture-settings.view.fn"

vi.mock("@/io/storage/org-capture-draft.storage", () => ({
	hasOrgCaptureDrafts: vi.fn(),
	clearOrgCaptureDrafts: vi.fn(),
}))

const enabledJson = JSON.stringify({
	version: 1,
	templates: [{
		id: "note", label: "Note", entryType: "entry",
		target: { kind: "file", relativePath: "inbox.org" }, source: "* %?",
	}],
	draftRecovery: true,
})
const disabledJson = enabledJson.replace('"draftRecovery":true', '"draftRecovery":false')
const confirmationDialog = () => screen.getByRole("dialog", { name: "Turn off Capture recovery?" })
const confirmDeletion = () => fireEvent.click(within(confirmationDialog()).getByRole("button", { name: "Delete saved drafts and turn off recovery" }))

beforeEach(() => {
	vi.clearAllMocks()
	useSettings.setState({ orgCaptureConfigurationJson: "" })
	vi.mocked(hasOrgCaptureDrafts).mockReturnValue(E.right(false))
	vi.mocked(clearOrgCaptureDrafts).mockReturnValue(E.right(undefined))
})
afterEach(() => {
	cleanup()
	vi.restoreAllMocks()
})

describe("Org Capture settings", () => {
	it("saves validated JSON through the existing persisted settings and makes the new selector available", () => {
		render(<OrgCaptureSettings />)
		fireEvent.change(screen.getByRole("textbox", { name: "Capture configuration JSON" }), { target: { value: disabledJson } })
		fireEvent.click(screen.getByRole("button", { name: "Save Capture configuration" }))
		expect(useSettings.getState().orgCaptureConfigurationJson).toBe(disabledJson)
		const persisted: unknown = JSON.parse(localStorage.getItem("grain-settings") ?? "null")
		expect(persisted).toMatchObject({ state: { orgCaptureConfigurationJson: disabledJson } })
		expect(screen.getByRole("status")).toBeInTheDocument()
	})

	it.each([
		"{broken",
		enabledJson.replace('"version":1', '"version":2'),
		enabledJson.replace('"inbox.org"', '"../secret.org"'),
		enabledJson.replace('"* %?"', '"* %(evil)"'),
	])("surfaces configuration errors without changing saved permission or templates", (invalidJson) => {
		useSettings.setState({ orgCaptureConfigurationJson: enabledJson })
		render(<OrgCaptureSettings />)
		fireEvent.change(screen.getByRole("textbox", { name: "Capture configuration JSON" }), { target: { value: invalidJson } })
		expect(screen.getByRole("alert")).toBeInTheDocument()
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true")
		expect(screen.getByRole("button", { name: "Save Capture configuration" })).toBeDisabled()
		fireEvent.click(screen.getByRole("button", { name: "Save Capture configuration" }))
		expect(useSettings.getState().orgCaptureConfigurationJson).toBe(enabledJson)
		expect(hasOrgCaptureDrafts).not.toHaveBeenCalled()
		expect(clearOrgCaptureDrafts).not.toHaveBeenCalled()
	})

	it("offers editable default JSON without silently saving or enabling plaintext recovery", () => {
		render(<OrgCaptureSettings />)
		fireEvent.click(screen.getByRole("button", { name: "Load default JSON for editing" }))
		expect(useSettings.getState().orgCaptureConfigurationJson).toBe("")
		const editor = screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Capture configuration JSON" })
		expect(JSON.parse(editor.value)).toMatchObject({ version: 1, draftRecovery: false })
		expect(hasOrgCaptureDrafts).not.toHaveBeenCalled()
	})

	it("only enables plaintext recovery after explicitly saving true, without accessing draft bodies", () => {
		render(<OrgCaptureSettings />)
		fireEvent.change(screen.getByRole("textbox"), { target: { value: enabledJson } })
		expect(useSettings.getState().orgCaptureConfigurationJson).toBe("")
		fireEvent.click(screen.getByRole("button", { name: "Save Capture configuration" }))
		expect(useSettings.getState().orgCaptureConfigurationJson).toBe(enabledJson)
		expect(hasOrgCaptureDrafts).not.toHaveBeenCalled()
		expect(clearOrgCaptureDrafts).not.toHaveBeenCalled()
	})

	it.each(["save disabled configuration", "restore defaults"])("preserves permission and saved drafts when deletion is cancelled: %s", (action) => {
		useSettings.setState({ orgCaptureConfigurationJson: enabledJson })
		vi.mocked(hasOrgCaptureDrafts).mockReturnValue(E.right(true))
		// Native Tauri polyfills return a Promise even though lib.dom types confirm as boolean.
		vi.spyOn(window, "confirm").mockImplementation(() => Promise.resolve(false) as unknown as boolean)
		render(<OrgCaptureSettings />)
		if (action === "save disabled configuration") {
			fireEvent.change(screen.getByRole("textbox"), { target: { value: disabledJson } })
			fireEvent.click(screen.getByRole("button", { name: "Save Capture configuration" }))
		} else {
			fireEvent.click(screen.getByRole("button", { name: "Restore Capture defaults" }))
		}
		expect(clearOrgCaptureDrafts).not.toHaveBeenCalled()
		expect(useSettings.getState().orgCaptureConfigurationJson).toBe(enabledJson)
		fireEvent.click(within(confirmationDialog()).getByRole("button", { name: "Cancel" }))
		expect(clearOrgCaptureDrafts).not.toHaveBeenCalled()
		expect(useSettings.getState().orgCaptureConfigurationJson).toBe(enabledJson)
	})

	it("deletes saved drafts only after confirmation and before committing disabled permission", () => {
		useSettings.setState({ orgCaptureConfigurationJson: enabledJson })
		vi.mocked(hasOrgCaptureDrafts).mockReturnValue(E.right(true))
		vi.mocked(clearOrgCaptureDrafts).mockImplementation(() => {
			expect(useSettings.getState().orgCaptureConfigurationJson).toBe(enabledJson)
			return E.right(undefined)
		})
		render(<OrgCaptureSettings />)
		fireEvent.change(screen.getByRole("textbox"), { target: { value: disabledJson } })
		fireEvent.click(screen.getByRole("button", { name: "Save Capture configuration" }))
		expect(clearOrgCaptureDrafts).not.toHaveBeenCalled()
		expect(useSettings.getState().orgCaptureConfigurationJson).toBe(enabledJson)
		confirmDeletion()
		expect(clearOrgCaptureDrafts).toHaveBeenCalledOnce()
		expect(useSettings.getState().orgCaptureConfigurationJson).toBe(disabledJson)
	})

	it.each(["key check", "delete"])("shows storage failure without revoking recovery permission: %s", (failure) => {
		useSettings.setState({ orgCaptureConfigurationJson: enabledJson })
		if (failure === "key check") {
			vi.mocked(hasOrgCaptureDrafts).mockReturnValue(E.left(new Error("storage unavailable")))
		} else {
			vi.mocked(hasOrgCaptureDrafts).mockReturnValue(E.right(true))
			vi.mocked(clearOrgCaptureDrafts).mockReturnValue(E.left(new Error("storage unavailable")))
		}
		render(<OrgCaptureSettings />)
		fireEvent.click(screen.getByRole("button", { name: "Restore Capture defaults" }))
		if (failure === "delete") confirmDeletion()
		expect(screen.getByRole("alert")).toHaveTextContent("storage unavailable")
		expect(useSettings.getState().orgCaptureConfigurationJson).toBe(enabledJson)
		if (failure === "key check") {
			expect(clearOrgCaptureDrafts).not.toHaveBeenCalled()
		}
	})

	it("requires deletion of stale saved records even if the current configuration is memory-only", () => {
		vi.mocked(hasOrgCaptureDrafts).mockReturnValue(E.right(true))
		render(<OrgCaptureSettings />)
		fireEvent.change(screen.getByRole("textbox"), { target: { value: disabledJson } })
		fireEvent.click(screen.getByRole("button", { name: "Save Capture configuration" }))
		fireEvent.click(within(confirmationDialog()).getByRole("button", { name: "Cancel" }))
		expect(clearOrgCaptureDrafts).not.toHaveBeenCalled()
		expect(useSettings.getState().orgCaptureConfigurationJson).toBe("")
	})

	it.each(["enable", "disable"])("preserves saved permission and shows errors when settings persistence fails: %s", (action) => {
		const previous = action === "enable" ? disabledJson : enabledJson
		const next = action === "enable" ? enabledJson : disabledJson
		useSettings.setState({ orgCaptureConfigurationJson: previous })
		vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("settings storage denied") })
		render(<OrgCaptureSettings />)
		fireEvent.change(screen.getByRole("textbox"), { target: { value: next } })
		fireEvent.click(screen.getByRole("button", { name: "Save Capture configuration" }))
		expect(screen.getByRole("alert")).toHaveTextContent("settings storage denied")
		expect(useSettings.getState().orgCaptureConfigurationJson).toBe(previous)
		const persisted: unknown = JSON.parse(localStorage.getItem("grain-settings") ?? "null")
		expect(persisted).toMatchObject({ state: { orgCaptureConfigurationJson: previous } })
	})

	it("restores memory-only builtins once confirmed saved drafts are removed", () => {
		useSettings.setState({ orgCaptureConfigurationJson: enabledJson })
		vi.mocked(hasOrgCaptureDrafts).mockReturnValue(E.right(true))
		render(<OrgCaptureSettings />)
		fireEvent.click(screen.getByRole("button", { name: "Restore Capture defaults" }))
		expect(useSettings.getState().orgCaptureConfigurationJson).toBe(enabledJson)
		confirmDeletion()
		expect(clearOrgCaptureDrafts).toHaveBeenCalledOnce()
		expect(useSettings.getState().orgCaptureConfigurationJson).toBe("")
	})

	it("rejects a stale deletion confirmation after another actor changes the saved configuration", () => {
		useSettings.setState({ orgCaptureConfigurationJson: enabledJson })
		vi.mocked(hasOrgCaptureDrafts).mockReturnValue(E.right(true))
		render(<OrgCaptureSettings />)
		fireEvent.change(screen.getByRole("textbox"), { target: { value: disabledJson } })
		fireEvent.click(screen.getByRole("button", { name: "Save Capture configuration" }))
		const external = JSON.stringify({ version: 1, templates: [], draftRecovery: true })
		act(() => useSettings.setState({ orgCaptureConfigurationJson: external }))
		confirmDeletion()
		expect(clearOrgCaptureDrafts).not.toHaveBeenCalled()
		expect(useSettings.getState().orgCaptureConfigurationJson).toBe(external)
		expect(screen.getByRole("alert")).toBeInTheDocument()
	})
})
