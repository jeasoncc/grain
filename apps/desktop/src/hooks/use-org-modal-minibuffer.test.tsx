import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ApplicationCommandProvider } from "@/views/application/application-command-provider"
import { useOrgModalMinibuffer, type OrgModalMinibufferOriginPorts } from "./use-org-modal-minibuffer"
import type { OrgModalPrompt, OrgModalPromptHandle, OrgModalPromptPorts } from "@/flows/org-modal/org-modal-adapter"

function Bridge({ origin, expose }: { origin: OrgModalMinibufferOriginPorts; expose: (ports: OrgModalPromptPorts) => void }) {
	expose(useOrgModalMinibuffer(origin))
	return null
}
function request(overrides: Partial<OrgModalPrompt> = {}): OrgModalPrompt {
	return {
		prompt: ":", initialInput: "", selectValueOnOpen: false,
		onOpen: vi.fn(), onInput: vi.fn(), onKeyDown: vi.fn(() => false), onKeyUp: vi.fn(),
		onAccept: vi.fn(() => ({ ok: true } as const)), onCancel: vi.fn(), onClose: vi.fn(), ...overrides,
	}
}
function mount() {
	const lease = {}
	let current = true
	const restore = vi.fn()
	const origin = { capture: () => lease, isCurrent: (value: object) => current && value === lease, restore }
	let ports!: OrgModalPromptPorts
	const expose = (value: OrgModalPromptPorts) => { ports = value }
	const tree = () => <ApplicationCommandProvider><button>Other window</button><Bridge origin={origin} expose={expose} /></ApplicationCommandProvider>
	const mounted = render(tree())
	return { ports: () => ports, restore, retire: () => { current = false; mounted.rerender(tree()) }, resume: () => { current = true; mounted.rerender(tree()) } }
}

describe("application-owned Vim parameter bridge", () => {
	it("mounts only the shared real input, forwards native events, and owns focus before publication", () => {
		const host = mount()
		let owned!: OrgModalPromptHandle
		const prompt = request({ onOpen: vi.fn(handle => { owned = handle }) })
		act(() => { host.ports().openPrompt(prompt) })
		const input = screen.getByRole("combobox") as HTMLInputElement
		expect(document.querySelectorAll("input")).toHaveLength(1)
		expect(document.activeElement).toBe(input)
		expect(owned.ownsInput(input)).toBe(true)
		fireEvent.input(input, { target: { value: "write" } })
		fireEvent.keyDown(input, { key: "ArrowUp" })
		fireEvent.keyUp(input, { key: "ArrowUp" })
		expect(prompt.onInput).toHaveBeenCalledWith(expect.any(Event), input)
		expect(prompt.onKeyDown).toHaveBeenCalledWith(expect.any(KeyboardEvent), input)
		expect(prompt.onKeyUp).toHaveBeenCalledWith(expect.any(KeyboardEvent), input)
		act(() => { owned.setValue("undo") })
		expect(input.value).toBe("undo")
		act(() => { owned.close() })
		expect(host.restore).toHaveBeenCalledTimes(1)
		expect(prompt.onClose).toHaveBeenCalledWith(expect.any(HTMLElement))
	})
	it("gives prevented, composition, 229 and AltGraph events priority without claiming a real IME proof", () => {
		const host = mount(), prompt = request()
		act(() => { host.ports().openPrompt(prompt) })
		const input = screen.getByRole("combobox")
		fireEvent.keyDown(input, { key: "Enter", isComposing: true })
		fireEvent.keyDown(input, { key: "Enter", keyCode: 229 })
		const graph = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
		Object.defineProperty(graph, "getModifierState", { value: (key: string) => key === "AltGraph" })
		fireEvent(input, graph)
		const prevented = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
		prevented.preventDefault(); fireEvent(input, prevented)
		expect(prompt.onKeyDown).not.toHaveBeenCalled()
		expect(prompt.onAccept).not.toHaveBeenCalled()
	})
	it("fences old handles after source/config retirement and after a replacement prompt", () => {
		const host = mount(), first = request(), second = request({ prompt: "/" })
		let old!: OrgModalPromptHandle
		act(() => { old = host.ports().openPrompt(first)! })
		act(() => { host.ports().openPrompt(second) })
		const input = screen.getByRole("combobox") as HTMLInputElement
		act(() => { old.setValue("stale"); old.close() })
		expect(input.value).toBe("")
		expect(old.ownsInput(input)).toBe(false)
		act(() => { host.retire() })
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(second.onAccept).not.toHaveBeenCalled()
		expect(host.restore).not.toHaveBeenCalled()
	})
	it("retiring for another window never steals focus or accepts a command", () => {
		const host = mount(), prompt = request()
		act(() => { host.ports().openPrompt(prompt) })
		act(() => { screen.getByRole("button", { name: "Other window" }).focus() })
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(host.restore).not.toHaveBeenCalled()
		expect(prompt.onAccept).not.toHaveBeenCalled()
	})
	it("publishes typed upstream errors and information without turning rejection into success", () => {
		const host = mount()
		let clearOld!: () => void
		act(() => { clearOld = host.ports().echo({ ok: false, message: "Upstream rejection" }) })
		expect(screen.getByRole("alert")).toHaveTextContent("Upstream rejection")
		act(() => { host.ports().echo({ ok: true, message: "Register information" }) })
		act(() => { clearOld() })
		expect(screen.queryByRole("alert")).toBeNull()
		expect(screen.getByRole("status")).toHaveTextContent("Register information")
		act(() => { host.retire() })
		act(() => { host.ports().echo({ ok: false, message: "Retired error" }) })
		expect(screen.queryByRole("alert")).toBeNull()
	})
	it("allows upstream acceptance to advance to a fresh owned confirmation reader", async () => {
		const host = mount()
		const confirmation = request({ prompt: "replace?", initialInput: "y" })
		const first = request({ onAccept: vi.fn(() => {
			host.ports().openPrompt(confirmation)
			return { ok: true as const }
		}) })
		act(() => { host.ports().openPrompt(first) })
		const input = screen.getByRole("combobox")
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
		expect(screen.getByRole("combobox")).toHaveValue("y")
		expect(first.onAccept).toHaveBeenCalledOnce()
		expect(confirmation.onAccept).not.toHaveBeenCalled()
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter", repeat: true })
		expect(confirmation.onAccept).not.toHaveBeenCalled()
	})
	it("retains the exact reader on native pre-effect rejection and accepts one corrected input", async () => {
		const host = mount()
		const onAccept = vi.fn((value: string) => value === "write"
			? { ok: true as const }
			: { ok: false as const, message: "Captured Source only" })
		const prompt = request({ onAccept })
		act(() => { host.ports().openPrompt(prompt) })
		const input = screen.getByRole("combobox")
		const reader = input.closest("[data-org-parameter-session]")
		fireEvent.change(input, { target: { value: "write other.org" } })
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
		expect(screen.getByRole("combobox")).toBe(input)
		expect(input.closest("[data-org-parameter-session]")).toBe(reader)
		expect(input).toHaveValue("write other.org")
		expect(screen.getByRole("alert")).toHaveTextContent("Captured Source only")
		fireEvent.change(input, { target: { value: "write" } })
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
		expect(onAccept.mock.calls).toEqual([["write other.org"], ["write"]])
		expect(screen.queryByRole("alert")).toBeNull()
	})
	it("drains a started native acceptance after origin ABA without publishing into its replacement", async () => {
		const host = mount()
		let resolve!: (result: { ok: false; message: string }) => void
		const pending = new Promise<{ ok: false; message: string }>(done => { resolve = done })
		const first = request({ onAccept: vi.fn(() => pending) })
		let old!: OrgModalPromptHandle
		act(() => { old = host.ports().openPrompt(first)! })
		const input = screen.getByRole("combobox")
		fireEvent.change(input, { target: { value: "write" } })
		fireEvent.keyDown(input, { key: "Enter" })
		expect(input).toHaveAttribute("readonly")
		fireEvent.keyDown(input, { key: "Escape" })
		expect(first.onCancel).not.toHaveBeenCalled()
		act(() => { host.retire() })
		act(() => { host.resume() })
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(old.ownsInput(input)).toBe(false)
		await act(async () => resolve({ ok: false, message: "Old acknowledged failure" }))
		const second = request({ initialInput: "replacement" })
		act(() => { host.ports().openPrompt(second) })
		expect(screen.getByRole("combobox")).toHaveValue("replacement")
		expect(screen.queryByRole("alert")).toBeNull()
		expect(first.onAccept).toHaveBeenCalledExactlyOnceWith("write")
		expect(host.restore).not.toHaveBeenCalled()
	})
})
