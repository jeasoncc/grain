import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useEffect } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { OrgKeymapScope } from "@/types/editor/org-keymap.interface"
import { useSettings } from "./use-settings"
import { useOrgScopedInput } from "./use-org-scoped-input"

function Route({ scope, execute, active = true }: { scope: OrgKeymapScope; execute: (id: string) => boolean; active?: boolean }) {
	const input = useOrgScopedInput({ scope, owner: execute, active, execute, onUnavailable: () => {}, acceptsEvent: () => true })
	useEffect(() => {
		const listener = (event: KeyboardEvent) => { input.handleKeyDown(event) }
		window.addEventListener("keydown", listener)
		return () => window.removeEventListener("keydown", listener)
	}, [input.handleKeyDown])
	return null
}
function Tool({ execute }: { execute: (id: string) => boolean }) {
	const input = useOrgScopedInput({ scope: "org-remark", owner: execute, execute, onUnavailable: () => {} })
	return <input aria-label="Tool text" onKeyDown={(event) => input.handleKeyDown(event.nativeEvent, { isParameterInput: false })} />
}

beforeEach(() => useSettings.setState({ orgKeymapConfigurationJson: "" }))
afterEach(() => { cleanup(); useSettings.setState({ orgKeymapConfigurationJson: "" }) })
describe("scoped DOM input arbitration", () => {
	it.each([false, true])("selects workspace before application independently of listener mount order (%s)", (reverse) => {
		useSettings.setState({ orgKeymapConfigurationJson: JSON.stringify({ version: 1, bindings: [
			{ scope: "application", key: "A-s", command: "refresh" },
			{ scope: "workspace", key: "A-s", command: "save" },
		] }) })
		const application = vi.fn(() => true)
		const workspace = vi.fn(() => true)
		const routes = [<Route key="app" scope="application" execute={application} />, <Route key="workspace" scope="workspace" execute={workspace} />]
		const app = render(<>{reverse ? [...routes].reverse() : routes}<button>Control</button></>)
		fireEvent.keyDown(screen.getByRole("button"), { key: "s", altKey: true })
		expect(workspace).toHaveBeenCalledExactlyOnceWith("save")
		expect(application).not.toHaveBeenCalled()
		app.rerender(<><Route scope="application" execute={application} /><button>Control</button></>)
		fireEvent.keyDown(screen.getByRole("button"), { key: "s", altKey: true })
		expect(application).toHaveBeenCalledExactlyOnceWith("refresh")
	})

	it("preserves native text fallback while a tool null binding blocks inherited commands", () => {
		useSettings.setState({ orgKeymapConfigurationJson: JSON.stringify({ version: 1, bindings: [
			{ scope: "workspace", key: "x", command: "save" },
			{ scope: "org-remark", key: "x", command: null },
		] }) })
		const execute = vi.fn(() => true)
		render(<><Route scope="workspace" execute={execute} /><Tool execute={execute} /></>)
		const input = screen.getByRole("textbox")
		const event = new KeyboardEvent("keydown", { key: "x", bubbles: true, cancelable: true })
		act(() => { expect(input.dispatchEvent(event)).toBe(true) })
		expect(event.defaultPrevented).toBe(false)
		fireEvent.change(input, { target: { value: "x" } })
		expect(input).toHaveValue("x")
		expect(execute).not.toHaveBeenCalled()
	})

	it("retires a tool prefix on configuration ABA before the suffix can invoke a producer", () => {
		const raw = JSON.stringify({ version: 1, leaders: [{ scope: "org-remark", key: "C-l", map: "notes" }],
			transients: [{ id: "notes", label: "Notes", scope: "org-remark", timeoutMs: null, bindings: [{ key: "s", command: "org-remark.save" }] }] })
		useSettings.setState({ orgKeymapConfigurationJson: raw })
		const execute = vi.fn(() => true)
		render(<Tool execute={execute} />)
		const input = screen.getByRole("textbox")
		fireEvent.keyDown(input, { key: "l", ctrlKey: true })
		act(() => { useSettings.setState({ orgKeymapConfigurationJson: "" }); useSettings.setState({ orgKeymapConfigurationJson: raw }) })
		fireEvent.keyDown(input, { key: "s" })
		expect(execute).not.toHaveBeenCalled()
	})
})
