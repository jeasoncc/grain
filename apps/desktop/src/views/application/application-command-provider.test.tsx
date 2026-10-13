import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createParameterSession } from "@/flows/org-command/parameter-session"
import type { OrgMinibufferSession } from "@/types/editor/minibuffer.interface"
import { ApplicationCommandProvider, useApplicationCommandHost, useApplicationCommandRegistration, useApplicationParameterRegistration, type ApplicationCommandDescriptor, type ApplicationCommandResult, type ApplicationCommandHost } from "@/views/application/application-command-provider"

function Commands({ commands }: { readonly commands: readonly ApplicationCommandDescriptor[] }) {
	const [owner] = useState(() => ({}))
	useApplicationCommandRegistration(owner, commands)
	return null
}
function Parameter({ session, result }: { readonly session: OrgMinibufferSession | null; readonly result?: ApplicationCommandResult }) {
	const [owner] = useState(() => ({}))
	useApplicationParameterRegistration(owner, session, result)
	return null
}
const command = (id: string, label: string, run = vi.fn((): ApplicationCommandResult => ({ kind: "success" }))): ApplicationCommandDescriptor => ({
	id, label, getDisabledReason: () => null, capture: () => run,
})
const open = () => fireEvent.keyDown(window, { key: "x", altKey: true })
const choose = async (query: string) => {
	fireEvent.change(screen.getByRole("combobox"), { target: { value: query } })
	await act(async () => { fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" }) })
}
afterEach(cleanup)

describe("application Execute command ownership", () => {
	it("discovers actual mounted commands outside Org and captures before dismissing the prompt", async () => {
		const captured = vi.fn(() => { expect(screen.getByRole("combobox")).toHaveFocus(); return () => ({ kind: "success", message: "Settings opened" } as const) })
		render(<ApplicationCommandProvider><Commands commands={[{ id: "settings", label: "Open Settings", getDisabledReason: () => null, capture: captured }]} /></ApplicationCommandProvider>)
		open()
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		await choose("settings")
		expect(captured).toHaveBeenCalledOnce()
	})
	it("rechecks availability without resetting query, selection or candidate identity", async () => {
		const first = vi.fn((): ApplicationCommandResult => ({ kind: "success" }))
		const second = vi.fn((): ApplicationCommandResult => ({ kind: "success" }))
		const a = command("save", "缓冲区 保存", first)
		const b = command("save-all", "全部 缓冲区 保存", second)
		const mounted = render(<ApplicationCommandProvider><Commands commands={[a, b]} /></ApplicationCommandProvider>)
		open()
		const input = screen.getByRole("combobox")
		fireEvent.change(input, { target: { value: "缓冲区 保存" } })
		fireEvent.keyDown(input, { key: "j", ctrlKey: true })
		const held = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
		held.preventDefault()
		fireEvent(input, held)
		mounted.rerender(<ApplicationCommandProvider><Commands commands={[b, a]} /></ApplicationCommandProvider>)
		expect(input).toHaveValue("缓冲区 保存")
		fireEvent.keyDown(input, { key: "Enter", repeat: true })
		expect(second).not.toHaveBeenCalled()
		fireEvent.keyUp(window, { key: "Enter" })
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
		expect(second).toHaveBeenCalledOnce()
		expect(first).not.toHaveBeenCalled()
	})
	it("uses the live disabled reason and never executes a retired entry", async () => {
		const run = vi.fn((): ApplicationCommandResult => ({ kind: "success" }))
		const available = command("save", "Save current note", run)
		const mounted = render(<ApplicationCommandProvider><Commands commands={[available]} /></ApplicationCommandProvider>)
		open()
		fireEvent.change(screen.getByRole("combobox"), { target: { value: "save" } })
		mounted.rerender(<ApplicationCommandProvider><Commands commands={[{ ...available, getDisabledReason: () => "Workspace is busy" }]} /></ApplicationCommandProvider>)
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
		expect(screen.getByRole("alert")).toHaveTextContent("Workspace is busy")
		expect(run).not.toHaveBeenCalled()
		mounted.rerender(<ApplicationCommandProvider>{null}</ApplicationCommandProvider>)
		expect(screen.queryByRole("option")).not.toBeInTheDocument()
	})
	it("preserves the exact origin selection on cancel but does not steal subsequent focus", () => {
		render(<ApplicationCommandProvider><input aria-label="Origin" defaultValue="selected text" /><button>Other</button><Commands commands={[]} /></ApplicationCommandProvider>)
		const origin = screen.getByRole("textbox", { name: "Origin" }) as HTMLInputElement
		origin.focus()
		origin.setSelectionRange(2, 7, "backward")
		open()
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" })
		expect(origin).toHaveFocus()
		expect([origin.selectionStart, origin.selectionEnd, origin.selectionDirection]).toEqual([2, 7, "backward"])
		open()
		const other = screen.getByRole("button", { name: "Other" })
		other.focus()
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" })
		expect(other).toHaveFocus()
	})
	it("does not restore a retired editor window on cancellation", () => {
		render(<ApplicationCommandProvider><div data-org-editor-window="w1" data-org-active-editor-window="true"><input aria-label="Origin" /></div></ApplicationCommandProvider>)
		const origin = screen.getByRole("textbox", { name: "Origin" })
		origin.focus()
		open()
		origin.parentElement?.setAttribute("data-org-active-editor-window", "false")
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" })
		expect(origin).not.toHaveFocus()
	})
	it("routes flow-owned parameters through one host and aborts superseded candidate readers", () => {
		const core = createParameterSession()
		const lease = core.begin()!
		const read = core.beginRead(lease)!
		const first: OrgMinibufferSession = { id: lease.id, prompt: "Find file:", initialInput: "", candidates: [], onAccept: () => ({ ok: true }), onCancel: () => { core.cancel(lease) } }
		const second: OrgMinibufferSession = { id: lease.id + 1, prompt: "Set tags:", initialInput: "", candidates: ["work"], onAccept: () => ({ ok: true }), onCancel: vi.fn() }
		const mounted = render(<ApplicationCommandProvider><Parameter session={first} /><Parameter session={null} /></ApplicationCommandProvider>)
		mounted.rerender(<ApplicationCommandProvider><Parameter session={first} /><Parameter session={second} /></ApplicationCommandProvider>)
		expect(read.signal.aborted).toBe(true)
		expect(core.current(lease)).toBe(false)
		expect(screen.getAllByRole("combobox")).toHaveLength(1)
		expect(screen.getByRole("combobox")).toHaveAccessibleName("Set tags:")
	})
	it("retains query and selected path across reader refreshes but not registration replacement", async () => {
		const session = (blocked: boolean): OrgMinibufferSession => ({
			id: 7003, prompt: "Find file:", initialInput: "", candidates: [],
			matchingMode: "path", completion: "value", acceptCandidate: true,
			annotatedCandidates: [
				{ value: "notes/a.org", label: "notes/a.org", path: "notes/a.org" },
				{ value: "notes/b.org", label: "notes/b.org", path: "notes/b.org", unavailableReason: blocked ? "Source review is required" : undefined },
			],
			onAccept: () => ({ ok: true }), onCancel: () => {},
		})
		const mounted = render(<ApplicationCommandProvider><Parameter key="reader" session={session(false)} /></ApplicationCommandProvider>)
		const input = screen.getByRole("combobox")
		fireEvent.change(input, { target: { value: "notes" } })
		fireEvent.keyDown(input, { key: "ArrowDown" })
		mounted.rerender(<ApplicationCommandProvider><Parameter key="reader" session={session(true)} /></ApplicationCommandProvider>)
		expect(input).toHaveValue("notes")
		expect(screen.getByRole("option", { name: "notes/b.org" })).toHaveAttribute("aria-selected", "true")
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
		expect(screen.getByRole("alert")).toHaveTextContent("Source review is required")
		mounted.rerender(<ApplicationCommandProvider><Parameter key="replacement" session={{ ...session(false), initialInput: "replacement" }} /></ApplicationCommandProvider>)
		expect(screen.getByRole("combobox")).toHaveValue("replacement")
		expect(screen.queryByRole("alert")).not.toBeInTheDocument()
	})
	it("drains an owned commit and does not publish its result into a later prompt", async () => {
		const deferred = Promise.withResolvers<ApplicationCommandResult>()
		let host: ApplicationCommandHost | null = null
		function Host() { host = useApplicationCommandHost(); return null }
		const entry: ApplicationCommandDescriptor = { id: "write", label: "Write", getDisabledReason: () => null, capture: () => () => deferred.promise }
		const mounted = render(<ApplicationCommandProvider><Commands commands={[entry]} /><Host /></ApplicationCommandProvider>)
		let pending!: Promise<ApplicationCommandResult>
		act(() => { pending = host!.execute("write") })
		mounted.rerender(<ApplicationCommandProvider><Host /></ApplicationCommandProvider>)
		act(() => { host!.registry.publishResult({ kind: "success", message: "New owner" }) })
		await act(async () => { deferred.resolve({ kind: "success", message: "Old write" }); await pending })
		expect(await pending).toEqual({ kind: "cancelled" })
		expect(screen.getByRole("status")).toHaveTextContent("New owner")
	})
	it("keeps the accepted command live while its opened reader publishes progress, then publishes the final selection", async () => {
		const commandResult = Promise.withResolvers<ApplicationCommandResult>()
		let host!: ApplicationCommandHost
		function Reader() {
			host = useApplicationCommandHost()
			const [session, setSession] = useState<OrgMinibufferSession | null>(null)
			const [result, setResult] = useState<ApplicationCommandResult>()
			const [selection, setSelection] = useState("")
			const entry: ApplicationCommandDescriptor = {
				id: "find-node", label: "Find node", getDisabledReason: () => null,
				capture: () => () => {
					setSession({
						id: 8101, prompt: "Choose node:", initialInput: "", candidates: ["research-id"],
						completion: "value", acceptCandidate: true,
						onAccept: (input) => {
							setSelection(input)
							setSession(null)
							setResult({ kind: "success", message: `Selected ${input}` })
							return { ok: true }
						},
						onCancel: () => { setSession(null) },
					})
					setResult({ kind: "success", message: "Reading nodes…" })
					return commandResult.promise
				},
			}
			return <><Commands commands={[entry]} /><Parameter session={session} result={result} /><output aria-label="Selected node">{selection}</output></>
		}
		render(<ApplicationCommandProvider><Reader /></ApplicationCommandProvider>)
		let pending!: Promise<ApplicationCommandResult>
		act(() => { pending = host.execute("find-node") })
		expect(screen.getByRole("combobox", { name: "Choose node:" })).toBeInTheDocument()
		await act(async () => { commandResult.resolve({ kind: "success" }); await pending })
		expect(await pending).toEqual({ kind: "success" })
		await choose("research-id")
		expect(screen.getByLabelText("Selected node")).toHaveTextContent("research-id")
		expect(screen.getByRole("status", { name: "" })).toHaveTextContent("Selected research-id")
	})
})
