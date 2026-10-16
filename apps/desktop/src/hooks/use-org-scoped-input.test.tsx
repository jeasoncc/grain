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
function FileTree({ execute }: { execute: (id: string) => boolean }) {
	const input = useOrgScopedInput({ scope: "file-tree", owner: execute, execute, onUnavailable: () => {} })
	return <div role="tree" tabIndex={0} onKeyDown={(event) => input.handleKeyDown(event.nativeEvent)} />
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
	it.each([false, true])("selects an eligible tree route over Source and global scopes (%s)", (reverse) => {
		useSettings.setState({ orgKeymapConfigurationJson: JSON.stringify({ version: 1, bindings: [
			{ scope: "file-tree", key: "F12", command: "refresh" },
			{ scope: "org-source", key: "F12", command: "todo" },
			{ scope: "workspace", key: "F12", command: "save" },
		] }) })
		const tree = vi.fn(() => true)
		const source = vi.fn(() => true)
		const workspace = vi.fn(() => true)
		const routes = [<Route key="tree" scope="file-tree" execute={tree} />, <Route key="source" scope="org-source" execute={source} />, <Route key="workspace" scope="workspace" execute={workspace} />]
		const app = render(<>{reverse ? [...routes].reverse() : routes}<button>Control</button></>)
		fireEvent.keyDown(screen.getByRole("button"), { key: "F12" })
		expect(tree).toHaveBeenCalledExactlyOnceWith("refresh")
		expect(source).not.toHaveBeenCalled()
		expect(workspace).not.toHaveBeenCalled()
		app.rerender(<><Route scope="file-tree" execute={tree} active={false} /><Route scope="org-source" execute={source} /><button>Control</button></>)
		fireEvent.keyDown(screen.getByRole("button"), { key: "F12" })
		expect(source).toHaveBeenCalledExactlyOnceWith("todo")
		expect(tree).toHaveBeenCalledTimes(1)
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
	it("claims default tree navigation but leaves unconfigured letters and former leaders native", () => {
		useSettings.setState({ orgKeymapConfigurationJson: JSON.stringify({ version: 1, bindings: [
			{ scope: "workspace", key: "ArrowDown", command: "save" },
		] }) })
		const tree = vi.fn(() => true)
		const workspace = vi.fn(() => true)
		render(<><Route scope="workspace" execute={workspace} /><FileTree execute={tree} /></>)
		const target = screen.getByRole("tree")
		act(() => { target.focus() })
		for (const key of ["j", "k", "h", "l", "u", "m", "d", "r", "q", "c", "g", "y", "?"]) {
			const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
			act(() => { target.dispatchEvent(event) })
			expect(event.defaultPrevented).toBe(false)
		}
		expect(tree).not.toHaveBeenCalled()
		const event = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })
		act(() => { target.dispatchEvent(event) })
		expect(event.defaultPrevented).toBe(true)
		expect(tree).toHaveBeenCalledExactlyOnceWith("file-tree.next")
		expect(workspace).not.toHaveBeenCalled()
	})
	it.each([
		[{ key: "F2" }, "file-tree.rename"],
		[{ key: "Delete" }, "file-tree.delete"],
		[{ key: "F5" }, "file-tree.refresh"],
		[{ key: "f", ctrlKey: true }, "file-tree.filter"],
		[{ key: "f", metaKey: true }, "file-tree.filter"],
	] as const)("claims standard file actions locally without taking Source or filter text input (%j)", (key, command) => {
		const tree = vi.fn(() => true)
		const source = vi.fn(() => true)
		const workspace = vi.fn(() => true)
		render(<>
			<Route scope="org-source" execute={source} />
			<Route scope="workspace" execute={workspace} />
			<FileTree execute={tree} />
			<input aria-label="Files filter" />
			<textarea aria-label="Source text" />
		</>)
		for (const label of ["Files filter", "Source text"]) {
			const target = screen.getByRole("textbox", { name: label })
			act(() => { target.focus() })
			const event = new KeyboardEvent("keydown", { ...key, bubbles: true, cancelable: true })
			act(() => { target.dispatchEvent(event) })
			expect(event.defaultPrevented).toBe(false)
			fireEvent.keyUp(target, key)
		}
		expect(tree).not.toHaveBeenCalled()
		const target = screen.getByRole("tree")
		act(() => { target.focus() })
		const event = new KeyboardEvent("keydown", { ...key, bubbles: true, cancelable: true })
		act(() => { target.dispatchEvent(event) })
		expect(event.defaultPrevented).toBe(true)
		expect(tree).toHaveBeenCalledExactlyOnceWith(command)
		expect(source).not.toHaveBeenCalled()
		expect(workspace).not.toHaveBeenCalled()
		fireEvent.keyUp(target, key)
	})
	it("lets a focused tree unbind a command without a global listener reclaiming the event", () => {
		useSettings.setState({ orgKeymapConfigurationJson: JSON.stringify({ version: 1, bindings: [
			{ scope: "workspace", key: "x", command: "save" },
			{ scope: "file-tree", key: "x", command: null },
		] }) })
		const tree = vi.fn(() => true)
		const workspace = vi.fn(() => true)
		render(<><Route scope="workspace" execute={workspace} /><FileTree execute={tree} /></>)
		const event = new KeyboardEvent("keydown", { key: "x", bubbles: true, cancelable: true })
		act(() => { screen.getByRole("tree").dispatchEvent(event) })
		expect(event.defaultPrevented).toBe(false)
		expect(tree).not.toHaveBeenCalled()
		expect(workspace).not.toHaveBeenCalled()
	})
	it("retires a file-tree prefix on configuration ABA and focus departure", () => {
		const raw = JSON.stringify({ version: 1, leaders: [{ scope: "file-tree", key: "Space", map: "files" }],
			transients: [{ id: "files", label: "Files", scope: "file-tree", timeoutMs: null, bindings: [{ key: "F12", command: "refresh" }] }] })
		useSettings.setState({ orgKeymapConfigurationJson: raw })
		const execute = vi.fn(() => true)
		render(<><FileTree execute={execute} /><button>Other control</button></>)
		const tree = screen.getByRole("tree")
		act(() => { tree.focus() })
		fireEvent.keyDown(tree, { key: " " })
		act(() => { useSettings.setState({ orgKeymapConfigurationJson: "" }); useSettings.setState({ orgKeymapConfigurationJson: raw }) })
		fireEvent.keyDown(tree, { key: "F12" })
		expect(execute).not.toHaveBeenCalled()
		fireEvent.keyDown(tree, { key: " " })
		act(() => { screen.getByRole("button").focus(); tree.focus() })
		fireEvent.keyDown(tree, { key: "F12" })
		expect(execute).not.toHaveBeenCalled()
	})
})
