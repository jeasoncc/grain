import { useEffect } from "react"
import { act, cleanup, fireEvent, renderHook, screen, waitFor } from "@testing-library/react"
import { render } from "@/test/application-providers"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { OrgTodoNoteRequest, OrgTodoNoteResult } from "@/flows/org-command/org-todo-note"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { OrgTodoNote } from "@/views/org-editor/org-todo-note.view.fn"
import { useOrgTodoNoteWorkflow } from "./use-org-todo-note-workflow"

afterEach(cleanup)

function controller(grant = "G1", dirty = vi.fn(() => true)) {
	return {
		workspaceSessionId: "session",
		workspace: { rootPath: "/notes", capabilityToken: grant },
		setTransientDirty: dirty,
	} as unknown as OrgWorkspaceController
}

function deferred() {
	let resolve!: (result: OrgTodoNoteResult) => void
	let reject!: (error: Error) => void
	const promise = new Promise<OrgTodoNoteResult>((done, fail) => {
		resolve = done
		reject = fail
	})
	return { promise, resolve, reject }
}

function Harness({
	source,
	origin,
}: {
	source: OrgTodoNoteRequest
	origin: OrgWorkspaceController
}) {
	const workflow = useOrgTodoNoteWorkflow(origin)
	return (
		<>
			<button onClick={() => workflow.admit(source)}>Open</button>
			{workflow.note && (
				<OrgTodoNote
					request={workflow.note.request}
					onClose={workflow.note.close}
					origin={workflow.note.origin}
					closeFence={workflow.closeFence}
					isProtected={workflow.isProtected}
				/>
			)}
		</>
	)
}

describe("TODO note workflow ownership", () => {
	it("requires dirty acknowledgement before publishing and tolerates a throwing abort", () => {
		const dirty = vi.fn(() => false)
		const source = {
			execute: vi.fn(),
			abort: vi.fn(() => {
				throw new Error("abort failed")
			}),
		}
		const { result } = renderHook(() => useOrgTodoNoteWorkflow(controller("G1", dirty)))
		act(() => expect(result.current.admit(source)).toBe(false))
		expect(result.current.note).toBeNull()
		expect(result.current.isOwned()).toBe(false)
		expect(source.execute).not.toHaveBeenCalled()
		expect(source.abort).toHaveBeenCalledOnce()
	})

	it("releases ownership even when an admitted source throws from abort", () => {
		const source = {
			execute: vi.fn(),
			abort: vi.fn(() => {
				throw new Error("abort failed")
			}),
		}
		const { result } = renderHook(() => useOrgTodoNoteWorkflow(controller()))
		act(() => {
			result.current.admit(source)
		})
		act(() => {
			result.current.note!.request.abort()
			result.current.note!.close()
		})
		expect(result.current.isOwned()).toBe(false)
		act(() => expect(result.current.admit({ execute: vi.fn(), abort: vi.fn() })).toBe(true))
	})

	it("registers a retained draft before G2 passive native readiness and fences stale execution", () => {
		const dirty = vi.fn(() => true)
		const nextDirty = vi.fn(() => true)
		const { result, rerender } = renderHook(
			({ origin }) => {
				const workflow = useOrgTodoNoteWorkflow(origin)
				useEffect(() => {
					if (origin.workspace?.capabilityToken === "G2")
						expect(nextDirty).toHaveBeenCalledWith(expect.any(String), true)
				}, [origin])
				return workflow
			},
			{ initialProps: { origin: controller("G1", dirty) } },
		)
		act(() => {
			result.current.admit({ execute: vi.fn(), abort: vi.fn() })
		})
		rerender({ origin: controller("G2", nextDirty) })
		expect(result.current.note!.request.validate?.()).toEqual({
			kind: "rejected",
			reason: "stale-note-request",
		})
		expect(dirty).toHaveBeenCalledTimes(1)
	})

	it("retains text read-only when G2 refuses registration", () => {
		const source = { execute: vi.fn(), abort: vi.fn() }
		const mounted = render(<Harness source={source} origin={controller()} />)
		fireEvent.click(screen.getByText("Open"))
		fireEvent.change(screen.getByRole("textbox"), { target: { value: "keep me" } })
		const dirty = vi.fn(() => false)
		mounted.rerender(<Harness source={source} origin={controller("G2", dirty)} />)
		expect(dirty).toHaveBeenCalledWith(expect.any(String), true)
		expect(screen.getByRole("textbox")).toHaveValue("keep me")
		expect(screen.getByRole("textbox")).toHaveAttribute("readonly")
		expect(screen.getByText("Finish note")).toBeDisabled()
	})

	it.each(["editor", "agenda"])("restores the exact connected %s origin on cancel", async (kind) => {
		const source = { execute: vi.fn(), abort: vi.fn() }
		const mounted = render(
			<>
				<div
					className={kind === "editor" ? "cm-editor" : undefined}
					data-agenda-key={kind === "agenda" ? "row" : undefined}
				>
					<button>Origin</button>
				</div>
				<Harness source={source} origin={controller()} />
			</>,
		)
		const origin = screen.getByText("Origin")
		origin.focus()
		fireEvent.click(screen.getByText("Open"))
		expect(screen.getByRole("textbox")).toHaveFocus()
		await act(async () => {
			fireEvent.keyDown(screen.getByRole("textbox"), { key: "g", ctrlKey: true })
		})
		await waitFor(() => expect(origin).toHaveFocus())
		mounted.unmount()
	})

	it.each([
		false,
		true,
	])("restores after finish only while focus remains in the note host (external=%s)", async (external) => {
		const outcome = deferred()
		render(
			<>
				<div className="cm-editor">
					<button>Origin</button>
				</div>
				<button>External</button>
				<Harness
					source={{ execute: () => outcome.promise, abort: vi.fn() }}
					origin={controller()}
				/>
			</>,
		)
		const origin = screen.getByText("Origin")
		origin.focus()
		fireEvent.click(screen.getByText("Open"))
		fireEvent.keyDown(screen.getByRole("textbox"), { key: "s", ctrlKey: true })
		if (external) screen.getByText("External").focus()
		await act(async () => outcome.resolve({ kind: "applied" }))
		expect(screen.queryByRole("textbox")).toBeNull()
		if (external) expect(screen.getByText("External")).toHaveFocus()
		else expect(origin).toHaveFocus()
	})

	it.each([
		"external",
		"disconnected",
		"scope",
		"workspaceRoot",
	])("does not steal focus when origin restoration is %s", async (reason) => {
		const outcome = deferred()
		const source = { execute: () => outcome.promise, abort: vi.fn() }
		const first = controller()
		const mounted = render(
			<>
				<div className="cm-editor">
					<button>Origin</button>
				</div>
				<button>External</button>
				<Harness source={source} origin={first} />
			</>,
		)
		const origin = screen.getByText("Origin")
		origin.focus()
		fireEvent.click(screen.getByText("Open"))
		if (reason === "external") screen.getByText("External").focus()
		if (reason === "disconnected") origin.remove()
		if (reason === "scope" || reason === "workspaceRoot")
			mounted.rerender(
				<>
					<div className="cm-editor">
						<button>Origin</button>
					</div>
					<button>External</button>
					<Harness
						source={source}
						origin={
							reason === "scope"
								? controller("G2")
								: {
										...first,
										workspace: { ...first.workspace!, rootPath: "/other-notes" },
									}
						}
					/>
				</>,
			)
		await act(async () => {
			fireEvent.keyDown(screen.getByRole("textbox"), { key: "g", ctrlKey: true })
		})
		expect(origin).not.toHaveFocus()
		if (reason === "external") expect(screen.getByText("External")).toHaveFocus()
	})

	it("forwards abort during a pending read and discards only after the rejected read settles", async () => {
		const read = deferred()
		const abort = vi.fn()
		const execute = vi.fn(() => read.promise)
		const origin = controller()
		render(<Harness source={{ execute, abort }} origin={origin} />)
		fireEvent.click(screen.getByText("Open"))
		fireEvent.change(screen.getByRole("textbox"), { target: { value: "discard explicitly" } })
		fireEvent.click(screen.getByText("Finish note"))
		fireEvent.click(screen.getByText("Abort note"))
		fireEvent.click(screen.getByText("Abort note"))
		expect(abort).toHaveBeenCalledTimes(1)
		expect(screen.getByRole("textbox")).toHaveValue("discard explicitly")
		expect(origin.setTransientDirty).toHaveBeenCalledTimes(1)
		await act(async () => read.resolve({ kind: "rejected", reason: "read aborted" }))
		expect(screen.queryByRole("textbox")).toBeNull()
		expect(origin.setTransientDirty).toHaveBeenLastCalledWith(expect.any(String), false)
	})

	it("preserves applied confirmation when abort lands in the awaiting gap", async () => {
		const outcome = deferred()
		const abort = vi.fn()
		const { result } = renderHook(() => useOrgTodoNoteWorkflow(controller()))
		act(() => {
			result.current.admit({ execute: () => outcome.promise, abort })
		})
		const owned = result.current.note!
		let execution!: Promise<OrgTodoNoteResult>
		act(() => {
			execution = Promise.resolve(owned.request.execute("note"))
		})
		// Source committed already, but the shell has not resumed its await.
		outcome.resolve({ kind: "applied" })
		act(() => {
			owned.request.abort()
			owned.close()
		})
		expect(abort).toHaveBeenCalledTimes(1)
		expect(result.current.isOwned()).toBe(true)
		await expect(execution).resolves.toEqual({ kind: "applied" })
		act(() => owned.close())
		expect(result.current.isOwned()).toBe(false)
	})

	it("fences an old draft's dirty callback after a G2 grant replaces G1", async () => {
		const dirty = vi.fn(() => true)
		const nextDirty = vi.fn(() => true)
		const old = controller("G1", dirty)
		const next = controller("G2", nextDirty)
		const outcome = deferred()
		const { result, rerender } = renderHook(({ origin }) => useOrgTodoNoteWorkflow(origin), {
			initialProps: { origin: old },
		})
		act(() => {
			result.current.admit({ execute: () => outcome.promise, abort: vi.fn() })
		})
		const owned = result.current.note!
		let execution!: OrgTodoNoteResult | Promise<OrgTodoNoteResult>
		act(() => { execution = owned.request.execute("note") })
		rerender({ origin: next })
		expect(nextDirty).toHaveBeenCalledWith(expect.any(String), true)
		expect(result.current.isProtected).toBe(true)
		act(() => {
			owned.request.abort()
			owned.close()
		})
		expect(result.current.isOwned()).toBe(true)
		await act(async () => {
			outcome.resolve({ kind: "rejected", reason: "cancelled" })
			await execution
		})
		act(() => owned.close())
		expect(dirty).toHaveBeenCalledTimes(1)
		expect(result.current.isOwned()).toBe(false)
		act(() => {
			result.current.admit({ execute: () => ({ kind: "applied" }), abort: vi.fn() })
		})
		const newer = result.current.note!
		act(() => owned.close())
		expect(result.current.note).toBe(newer)
		expect(dirty).toHaveBeenCalledTimes(1)
		expect(nextDirty).toHaveBeenNthCalledWith(2, expect.any(String), false)
		expect(nextDirty).toHaveBeenNthCalledWith(3, expect.any(String), true)
	})

	it("rejects duplicate admission without aborting the owned source", () => {
		const origin = controller()
		const source = { execute: vi.fn(() => ({ kind: "applied" as const })), abort: vi.fn() }
		const duplicate = { ...source, abort: vi.fn() }
		const { result } = renderHook(() => useOrgTodoNoteWorkflow(origin))
		act(() => {
			expect(result.current.admit(source)).toBe(true)
		})
		const owned = result.current.note
		act(() => {
			expect(result.current.admit(source)).toBe(false)
			expect(result.current.admit(duplicate)).toBe(false)
		})
		expect(source.abort).not.toHaveBeenCalled()
		expect(duplicate.abort).toHaveBeenCalledTimes(1)
		expect(source.execute).not.toHaveBeenCalled()
		expect(result.current.note).toBe(owned)
		expect(origin.setTransientDirty).toHaveBeenCalledTimes(1)
	})

	it("retains a rejected draft without explicit abort and allows retry", async () => {
		const execute = vi.fn((): OrgTodoNoteResult => ({ kind: "rejected", reason: "locked" }))
		const { result } = renderHook(() => useOrgTodoNoteWorkflow(controller()))
		act(() => {
			result.current.admit({ execute, abort: vi.fn() })
		})
		const owned = result.current.note!
		await expect(owned.request.execute("keep me")).resolves.toEqual({
			kind: "rejected",
			reason: "locked",
		})
		act(() => owned.close())
		expect(result.current.isOwned()).toBe(true)
		expect(owned.request.validate?.()).toEqual({ kind: "ready" })
		execute.mockReturnValue({ kind: "applied" })
		await expect(owned.request.execute("keep me")).resolves.toEqual({ kind: "applied" })
		act(() => owned.close())
		expect(result.current.isOwned()).toBe(false)
	})

	it("settles a thrown failure after explicit abort", async () => {
		const outcome = deferred()
		const { result } = renderHook(() => useOrgTodoNoteWorkflow(controller()))
		act(() => {
			result.current.admit({ execute: () => outcome.promise, abort: vi.fn() })
		})
		const owned = result.current.note!
		const execution = owned.request.execute("note")
		owned.request.abort()
		await act(async () => {
			outcome.reject(new Error("read cancelled"))
			await execution
		})
		await expect(execution).resolves.toEqual({ kind: "aborted" })
		act(() => owned.close())
		expect(result.current.isOwned()).toBe(false)
	})
})
