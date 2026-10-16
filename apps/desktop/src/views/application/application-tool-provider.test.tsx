import { history, undo, undoDepth } from "@codemirror/commands"
import { Compartment, EditorSelection, EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { type ReactNode, useLayoutEffect, useRef, useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useSettings } from "@/hooks/use-settings"
import { ConfirmProvider } from "@/views/ui/confirm"
import { ApplicationCompiledToolSurface, ApplicationToolLauncher, ApplicationToolProvider, ApplicationToolSurface, useApplicationToolRegistration, useApplicationTools } from "./application-tool-provider"
import type { ApplicationToolRegistry } from "@/flows/application/application-tool-registry"
import { createApplicationCommandRegistry } from "@/flows/application-command-registry"
import { createTrustedCompiledExtension, type CompiledExtensionToolHandle, type TrustedCompiledExtension } from "@/flows/application/trusted-compiled-extension"
import { ApplicationCommandProvider } from "./application-command-provider"
import { useTrustedCompiledExtension } from "./trusted-compiled-extension"

const initialSettings = useSettings.getState()
afterEach(() => { cleanup(); useSettings.setState(initialSettings) })

async function chooseTool(action: string, trigger = screen.getByRole("button", { name: "Application tools" })) {
	fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })
	fireEvent.click(await screen.findByRole("menuitem", { name: action }))
	await waitFor(() => expect(screen.queryByRole("menu", { name: "Application tools" })).not.toBeInTheDocument())
}

describe("application tool launcher", () => {
	it("opens registered closed tools from the fallback and restores tool focus after menu teardown", async () => {
		const requestClose = vi.fn(() => true)
		function Producer() {
			const owner = useRef({}).current
			const lease = useApplicationToolRegistration(owner, { id: "shell.preview", label: "Preview", layout: "side",
				state: { dirty: false, pending: false, fence: 1 }, requestClose })
			return <ApplicationToolSurface lease={lease}><textarea aria-label="Preview body" defaultValue="literal preview" /></ApplicationToolSurface>
		}
		useSettings.setState({ applicationPopupConfigurationJson: "" })
		render(<ConfirmProvider><ApplicationToolProvider><Producer /></ApplicationToolProvider></ConfirmProvider>)
		const trigger = screen.getByRole("button", { name: "Application tools" })
		expect(screen.queryByRole("textbox", { name: "Preview body" })).not.toBeInTheDocument()
		await chooseTool("Open Preview tool window")
		const body = screen.getByRole("textbox", { name: "Preview body" })
		await waitFor(() => expect(body).toHaveFocus())
		await chooseTool("Focus Preview tool window")
		await waitFor(() => expect(body).toHaveFocus())
		await chooseTool("Close Preview")
		await waitFor(() => expect(body).not.toBeInTheDocument())
		expect(trigger).toHaveFocus()
		await chooseTool("Open Preview tool window")
		await waitFor(() => expect(screen.getByRole("textbox", { name: "Preview body" })).toHaveFocus())
	})

	it("keeps a compact local trigger keyboard reachable with separate focus and close actions", async () => {
		function Producer() {
			const owner = useRef({}).current
			const lease = useApplicationToolRegistration(owner, { id: "pending.draft", label: "Pending draft", layout: "bottom", active: true,
				state: { dirty: true, pending: true, readOnly: true, fence: 1 }, requestClose: () => true })
			return <ApplicationToolSurface lease={lease}><textarea aria-label="Pending draft body" readOnly defaultValue="unsaved draft" /></ApplicationToolSurface>
		}
		useSettings.setState({ applicationPopupConfigurationJson: "" })
		render(<ConfirmProvider><ApplicationToolProvider>
			<aside aria-label="Local tools"><ApplicationToolLauncher compact /></aside><Producer />
		</ApplicationToolProvider></ConfirmProvider>)
		const trigger = within(screen.getByRole("complementary", { name: "Local tools" })).getByRole("button", { name: "Application tools" })
		expect(trigger).toHaveAttribute("aria-description", "1 tool with unsaved drafts")
		for (const key of ["Enter", " ", "ArrowDown"]) {
			trigger.focus()
			fireEvent.keyDown(trigger, { key })
			const menu = await screen.findByRole("menu", { name: "Application tools" })
			expect(menu).toHaveTextContent("Unsaved draft")
			expect(menu).toHaveTextContent("Read-only")
			expect(menu).toHaveTextContent("Pending")
			expect(screen.getByRole("menuitem", { name: "Close Pending draft" })).toHaveAttribute("data-disabled")
			const focus = screen.getByRole("menuitem", { name: "Focus Pending draft tool window" })
			await waitFor(() => expect(focus).toHaveFocus())
			fireEvent.keyDown(focus, { key: "ArrowDown" })
			await waitFor(() => expect(focus).toHaveFocus())
			fireEvent.keyDown(focus, { key: "ArrowUp" })
			fireEvent.keyDown(menu, { key: "Escape" })
			await waitFor(() => expect(screen.queryByRole("menu", { name: "Application tools" })).not.toBeInTheDocument())
			await waitFor(() => expect(trigger).toHaveFocus())
		}
		fireEvent.keyDown(trigger, { key: "ArrowDown" })
		const focus = await screen.findByRole("menuitem", { name: "Focus Pending draft tool window" })
		fireEvent.keyDown(focus, { key: "Enter" })
		await waitFor(() => expect(screen.getByRole("textbox", { name: "Pending draft body" })).toHaveFocus())
	})
})

describe("physical tool frames", () => {
	it("moves one mounted Source between popup, side, bottom and producer placement without resetting selection or history", () => {
		let editor!: EditorView
		const destroyed = vi.fn()
		function Scratch() {
			const root = useRef<HTMLDivElement | null>(null)
			useLayoutEffect(() => {
				editor = new EditorView({ parent: root.current!, state: EditorState.create({ doc: "* scratch\n未知 source\n", extensions: [history(), EditorState.allowMultipleSelections.of(true)] }) })
				return () => { destroyed(); editor.destroy() }
			}, [])
			return <div ref={root} />
		}
		function Producer() {
			const owner = useRef({}).current
			const lease = useApplicationToolRegistration(owner, { id: "org-roam", label: "Roam scratch", layout: "bottom", active: true, state: { dirty: true, pending: false, fence: 1 }, requestClose: () => true })
			return <ApplicationToolSurface lease={lease}><Scratch /></ApplicationToolSurface>
		}
		useSettings.setState({ applicationPopupConfigurationJson: "" })
		const mounted = render(<ConfirmProvider><ApplicationToolProvider><Producer /></ApplicationToolProvider></ConfirmProvider>)
		act(() => {
			editor.dispatch({ changes: { from: editor.state.doc.length, insert: "literal draft" }, selection: EditorSelection.create([EditorSelection.range(2, 5), EditorSelection.cursor(9)], 1) })
			editor.focus()
		})
		const instance = editor
		const surface = editor.dom.closest("[data-application-tool]")!
		const windowId = surface.getAttribute("data-application-tool-window")
		for (const layout of ["popup", "side", "bottom"] as const) {
			act(() => useSettings.setState({ applicationPopupConfigurationJson: JSON.stringify({ version: 1, rules: [{ id: "org-roam", layout, size: { widthPercent: 60, heightPercent: 40 } }] }) }))
			expect(editor).toBe(instance)
			expect(editor.dom.closest("[data-application-tool-dock]")?.getAttribute("data-application-tool-dock")).toBe(layout)
			expect(surface.getAttribute("data-application-tool-window")).toBe(windowId)
			expect(undoDepth(editor.state)).toBe(1)
			expect(destroyed).not.toHaveBeenCalled()
			expect(editor.hasFocus).toBe(true)
		}
		act(() => useSettings.setState({ applicationPopupConfigurationJson: "" }))
		expect(editor.dom.closest("[data-application-tool-dock]")).toBeNull()
		act(() => { expect(undo(editor)).toBe(true) })
		expect(editor.state.doc.toString()).toBe("* scratch\n未知 source\n")
		mounted.unmount()
		expect(destroyed).toHaveBeenCalledOnce()
	})
	it("rejects old dirty-draft approval after React-batched popup policy ABA", async () => {
		let registry!: ApplicationToolRegistry
		let lease!: ReturnType<ApplicationToolRegistry["createLease"]>
		let accepted = 0
		let disposed = 0
		function Producer() {
			registry = useApplicationTools().registry
			const owner = useRef({}).current
			lease = useApplicationToolRegistration(owner, { id: "owned.draft", label: "Owned draft", layout: "bottom", active: true,
				state: { dirty: true, pending: false, fence: 1 }, requestClose: () => { accepted++; return true }, dispose: () => { disposed++ } })
			return <ApplicationToolSurface lease={lease}><textarea aria-label="Owned draft body" defaultValue={"literal 未保存\0😀"} /></ApplicationToolSurface>
		}
		useSettings.setState({ applicationPopupConfigurationJson: "" })
		render(<ConfirmProvider><ApplicationToolProvider><Producer /></ApplicationToolProvider></ConfirmProvider>)
		const body = screen.getByRole("textbox", { name: "Owned draft body" }) as HTMLTextAreaElement
		body.focus()
		body.setSelectionRange(2, 7, "backward")
		let closing!: Promise<boolean>
		await act(async () => { closing = registry.close(lease); await Promise.resolve() })
		act(() => {
			useSettings.setState({ applicationPopupConfigurationJson: JSON.stringify({ version: 1, rules: [{ id: lease.id, layout: "side" }] }) })
			useSettings.setState({ applicationPopupConfigurationJson: "" })
		})
		await act(async () => {
			const staleApproval = screen.queryByRole("button", { name: "Close tool" })
			if (staleApproval) fireEvent.click(staleApproval)
			expect(await closing).toBe(false)
		})
		expect(accepted).toBe(0)
		expect(disposed).toBe(0)
		expect(screen.getByRole("textbox", { name: "Owned draft body" })).toBe(body)
		expect(body.value).toBe("literal 未保存\0😀")
		expect([body.selectionStart, body.selectionEnd, body.selectionDirection]).toEqual([2, 7, "backward"])
	})
	it("places an imperative compiled-tool host and does not reattach a removed or retired producer", async () => {
		let registry!: ApplicationToolRegistry
		function Observe() { registry = useApplicationTools().registry; return null }
		useSettings.setState({ applicationPopupConfigurationJson: "" })
		render(<ConfirmProvider><ApplicationToolProvider><Observe /></ApplicationToolProvider></ConfirmProvider>)
		const source = document.createElement("div"), host = document.createElement("div"), draft = document.createElement("textarea")
		draft.value = "literal 未保存\nsource"
		host.appendChild(draft); source.appendChild(host); document.body.appendChild(source)
		const lease = registry.createLease({}, "compiled.review")
		act(() => {
			registry.register(lease, { id: lease.id, label: "Compiled review", layout: "bottom", state: { dirty: true, pending: true, fence: 1 }, requestClose: () => true })
			registry.open(lease)
			registry.bindHost(lease, host)
			draft.focus()
			draft.setSelectionRange(2, 7, "backward")
			useSettings.setState({ applicationPopupConfigurationJson: JSON.stringify({ version: 1, rules: [{ id: lease.id, layout: "popup" }] }) })
		})
		expect(host.closest("[data-application-tool-dock]")?.getAttribute("data-application-tool-dock")).toBe("popup")
		expect(draft.value).toBe("literal 未保存\nsource")
		expect([draft.selectionStart, draft.selectionEnd, draft.selectionDirection]).toEqual([2, 7, "backward"])
		expect(await registry.close(lease)).toBe(false)
		act(() => useSettings.setState({ applicationPopupConfigurationJson: "" }))
		expect(host.parentNode).toBe(source)
		act(() => useSettings.setState({ applicationPopupConfigurationJson: JSON.stringify({ version: 1, rules: [{ id: lease.id, layout: "side" }] }) }))
		host.remove()
		await act(async () => { await registry.retire(lease) })
		expect(host.isConnected).toBe(false)
		act(() => registry.bindHost(lease, host))
		expect(host.isConnected).toBe(false)
		source.remove()
	})
	it("keeps the compiled body mounted across policy changes and removes its projection on owner revocation", async () => {
		let owner!: TrustedCompiledExtension
		let handle!: CompiledExtensionToolHandle
		function Producer() {
			const { registry } = useApplicationTools()
			const [bound, setBound] = useState<{ owner: TrustedCompiledExtension; handle: CompiledExtensionToolHandle } | null>(null)
			useLayoutEffect(() => {
				const lifetime = createTrustedCompiledExtension({ commands: createApplicationCommandRegistry(), tools: registry })
				const tool = lifetime.registerTool({ id: "compiled.result", label: "Compiled result", layout: "bottom", active: true, state: { dirty: false, pending: false, readOnly: true, fence: 1 }, requestClose: () => true })!
				owner = lifetime; handle = tool
				setBound({ owner: lifetime, handle: tool })
				return () => { void lifetime.unload() }
			}, [registry])
			return bound ? <ApplicationCompiledToolSurface owner={bound.owner} handle={bound.handle}>{(tool) => <textarea aria-label="Compiled output Source" readOnly={tool.state.readOnly} defaultValue={"literal output\n未知 result"} />}</ApplicationCompiledToolSurface> : null
		}
		useSettings.setState({ applicationPopupConfigurationJson: "" })
		render(<ConfirmProvider><ApplicationToolProvider><Producer /></ApplicationToolProvider></ConfirmProvider>)
		const body = screen.getByRole("textbox", { name: "Compiled output Source" }) as HTMLTextAreaElement
		body.focus(); body.setSelectionRange(2, 8, "backward")
		const window = owner.getToolWindow(handle)!.windowId
		for (const layout of ["side", "popup", "bottom"]) {
			act(() => useSettings.setState({ applicationPopupConfigurationJson: JSON.stringify({ version: 1, rules: [{ id: "compiled.result", layout }] }) }))
			expect(screen.getByRole("textbox", { name: "Compiled output Source" })).toBe(body)
			expect(body.closest("[data-application-tool-dock]")?.getAttribute("data-application-tool-dock")).toBe(layout)
			expect([body.selectionStart, body.selectionEnd, body.selectionDirection]).toEqual([2, 8, "backward"])
			expect(owner.getToolWindow(handle)!.windowId).toBe(window)
		}
		await act(async () => { expect(await owner.unload()).toBe(true) })
		expect(screen.queryByRole("textbox", { name: "Compiled output Source" })).toBeNull()
		expect(owner.bindToolHost(handle, document.createElement("div"), window)).toBe(false)
	})
	it("retains a declined unload's exact dirty body as selectable readonly recovery across later placement changes", async () => {
		let owner!: TrustedCompiledExtension
		let handle!: CompiledExtensionToolHandle
		function Producer() {
			const { registry } = useApplicationTools()
			const [bound, setBound] = useState<{ owner: TrustedCompiledExtension; handle: CompiledExtensionToolHandle } | null>(null)
			useLayoutEffect(() => {
				const lifetime = createTrustedCompiledExtension({ commands: createApplicationCommandRegistry(), tools: registry })
				const tool = lifetime.registerTool({ id: "compiled.draft", label: "Compiled draft", layout: "bottom", active: true, state: { dirty: true, pending: false, fence: 1 }, requestClose: () => true })!
				owner = lifetime; handle = tool
				setBound({ owner: lifetime, handle: tool })
				return () => { void lifetime.unload() }
			}, [registry])
			return bound ? <ApplicationCompiledToolSurface owner={bound.owner} handle={bound.handle}>{(tool) => <textarea aria-label="Compiled draft Source" readOnly={tool.state.readOnly} defaultValue={"literal draft\n未保存"} />}</ApplicationCompiledToolSurface> : null
		}
		useSettings.setState({ applicationPopupConfigurationJson: "" })
		render(<ConfirmProvider><ApplicationToolProvider><Producer /></ApplicationToolProvider></ConfirmProvider>)
		const body = screen.getByRole("textbox", { name: "Compiled draft Source" }) as HTMLTextAreaElement
		body.focus(); body.setSelectionRange(2, 8, "backward")
		let unloading!: Promise<boolean>
		await act(async () => { unloading = owner.unload(); await Promise.resolve() })
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Keep draft" })); expect(await unloading).toBe(false) })
		expect(screen.getByRole("textbox", { name: "Compiled draft Source" })).toBe(body)
		expect(body.readOnly).toBe(true)
		expect(body.closest("[inert]")).toBeNull()
		expect(body.value).toBe("literal draft\n未保存")
		body.focus(); body.setSelectionRange(1, 9, "backward")
		act(() => useSettings.setState({ applicationPopupConfigurationJson: JSON.stringify({ version: 1, rules: [{ id: "compiled.draft", layout: "side" }] }) }))
		expect(screen.getByRole("textbox", { name: "Compiled draft Source" })).toBe(body)
		expect(body.closest("[data-application-tool-dock]")?.getAttribute("data-application-tool-dock")).toBe("side")
		expect([body.selectionStart, body.selectionEnd, body.selectionDirection]).toEqual([1, 9, "backward"])
		expect(owner.bindToolHost(handle, document.createElement("div"), owner.getToolWindow(handle)!.windowId)).toBe(false)
		await chooseTool("Focus Compiled draft tool window")
		await waitFor(() => expect(body).toHaveFocus())
		expect([body.selectionStart, body.selectionEnd, body.selectionDirection]).toEqual([1, 9, "backward"])
		await chooseTool("Close Compiled draft")
		fireEvent.click(await screen.findByRole("button", { name: "Keep draft" }))
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
		await waitFor(() => expect(screen.getByRole("button", { name: "Application tools" })).toHaveFocus())
		expect(screen.getByRole("textbox", { name: "Compiled draft Source" })).toBe(body)
		expect(body.readOnly).toBe(true)
		await chooseTool("Close Compiled draft")
		fireEvent.click(await screen.findByRole("button", { name: "Close tool" }))
		await waitFor(() => expect(screen.queryByRole("textbox", { name: "Compiled draft Source" })).toBeNull())
	})
	it("keeps the same editor after its hook producer is removed or replaced until the old draft's discard is approved", async () => {
		let owner!: TrustedCompiledExtension
		let handle!: CompiledExtensionToolHandle
		const views: EditorView[] = []
		const destroyed = vi.fn()
		function Draft({ readOnly, label }: { readOnly: boolean; label: string }) {
			const element = useRef<HTMLDivElement>(null)
			const [compartment] = useState(() => new Compartment())
			const view = useRef<EditorView | null>(null)
			useLayoutEffect(() => {
				const editor = new EditorView({ parent: element.current!, state: EditorState.create({
					doc: "* literal\n未知 body\n", extensions: [history(), compartment.of(EditorState.readOnly.of(readOnly)), EditorView.contentAttributes.of({ "aria-label": label })],
				}) })
				view.current = editor
				views.push(editor)
				return () => { destroyed(label); editor.destroy(); view.current = null }
			}, [])
			useLayoutEffect(() => { view.current?.dispatch({ effects: compartment.reconfigure(EditorState.readOnly.of(readOnly)) }) }, [compartment, readOnly])
			return <div ref={element} />
		}
		function Producer({ identity, label }: { identity: object; label: string }) {
			const lifetime = useTrustedCompiledExtension({ identity })
			const [bound, setBound] = useState<{ owner: TrustedCompiledExtension; handle: CompiledExtensionToolHandle } | null>(null)
			useLayoutEffect(() => {
				const current = lifetime.current!
				const tool = current.registerTool({ id: "compiled.replace", label, layout: "bottom", active: true,
					state: { dirty: true, pending: false, fence: 1 }, requestClose: () => true })!
				owner = current; handle = tool
				setBound({ owner: current, handle: tool })
			}, [identity, lifetime])
			return bound ? <ApplicationCompiledToolSurface owner={bound.owner} handle={bound.handle}>{(tool) => <Draft readOnly={!!tool.state.readOnly} label={label} />}</ApplicationCompiledToolSurface> : null
		}
		const firstIdentity = {}, secondIdentity = {}
		const tree = (producer: ReactNode) => <ConfirmProvider><ApplicationCommandProvider><ApplicationToolProvider>{producer}</ApplicationToolProvider></ApplicationCommandProvider></ConfirmProvider>
		useSettings.setState({ applicationPopupConfigurationJson: "" })
		const mounted = render(tree(<Producer identity={firstIdentity} label="Old draft" />))
		const first = owner, oldHandle = handle, editor = views[0]
		act(() => editor.dispatch({ changes: { from: editor.state.doc.length, insert: "未保存 😀" }, selection: EditorSelection.range(2, 8) }))
		const body = editor.dom
		const frame = body.parentElement!.parentElement!.parentElement
		const exactBody = editor.state.doc.toString()
		const depth = undoDepth(editor.state)
		const selection = editor.state.selection
		const oldWindow = first.getToolWindow(oldHandle)!.windowId
		await act(async () => { mounted.rerender(tree(<Producer identity={secondIdentity} label="New draft" />)); await Promise.resolve() })
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Keep draft" })); await Promise.resolve() })
		const second = owner, newHandle = handle
		expect(second).not.toBe(first)
		expect(views).toHaveLength(2)
		expect(editor.dom).toBe(body)
		expect(body.isConnected).toBe(true)
		expect(body.parentElement!.parentElement!.parentElement).toBe(frame)
		expect(editor.state.doc.toString()).toBe(exactBody)
		expect(editor.state.readOnly).toBe(true)
		expect(editor.state.selection.eq(selection)).toBe(true)
		expect(undoDepth(editor.state)).toBe(depth)
		expect(destroyed).not.toHaveBeenCalled()
		editor.focus()
		act(() => editor.dispatch({ selection: EditorSelection.range(1, 10) }))
		expect(editor.state.sliceDoc(editor.state.selection.main.from, editor.state.selection.main.to)).toBe(exactBody.slice(1, 10))
		expect(first.bindToolHost(oldHandle, views[1].dom, second.getToolWindow(newHandle)!.windowId)).toBe(false)
		expect(second.bindToolHost(oldHandle, body, oldWindow)).toBe(false)
		expect(second.updateTool(oldHandle, { id: "compiled.replace", label: "Wrong owner", layout: "side", state: { dirty: false, pending: false, fence: 2 }, requestClose: () => true })).toBe(false)
		expect(first.openTool(newHandle)).toBe(false)
		await act(async () => { mounted.rerender(tree(null)); await Promise.resolve() })
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Keep draft" })); await Promise.resolve() })
		expect(body.isConnected).toBe(true)
		expect(views[1].dom.isConnected).toBe(true)
		expect(views[1].state.readOnly).toBe(true)
		act(() => useSettings.setState({ applicationPopupConfigurationJson: JSON.stringify({ version: 1, rules: [{ id: "compiled.replace", layout: "side" }] }) }))
		expect(body.closest("[data-application-tool-dock]")?.getAttribute("data-application-tool-dock")).toBe("side")
		expect(editor.state.doc.toString()).toBe(exactBody)
		expect(undoDepth(editor.state)).toBe(depth)
		let closing!: Promise<boolean>
		await act(async () => { closing = first.closeTool(oldHandle); await Promise.resolve() })
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Close tool" })); expect(await closing).toBe(true) })
		expect(body.isConnected).toBe(false)
		expect(destroyed).toHaveBeenCalledWith("Old draft")
		expect(first.getToolWindow(oldHandle)).toBeNull()
		expect(views[1].dom.isConnected).toBe(true)
		await act(async () => { closing = second.closeTool(newHandle); await Promise.resolve() })
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Close tool" })); expect(await closing).toBe(true) })
		expect(destroyed).toHaveBeenCalledWith("New draft")
	})
})
