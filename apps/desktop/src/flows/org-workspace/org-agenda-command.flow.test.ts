import { redoDepth, undoDepth } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createOrgWorkspaceRuntimeRegistry } from "@/flows/org-editor-runtime/org-workspace-runtime-registry"
import { type OrgAgendaEntry, parseOrgAgenda } from "@/pipes/org/org-agenda.pipe"
import {
	type OrgAgendaCommandPorts,
	type OrgAgendaRootSnapshot,
	runOrgAgendaOperationFlow,
} from "./org-agenda-command.flow"

const source = "* TODO task\nSCHEDULED: <2026-07-01 Wed>\nbody\n"
const edit = { date: "2026-07-09", kind: "schedule" }
const cleanups: (() => void)[] = []
afterEach(() => {
	for (const cleanup of cleanups.splice(0).reverse()) {
		cleanup()
	}
})
function deferred() {
	let resolve!: (value: unknown) => void
	let reject!: (error: Error) => void
	const promise = new Promise<unknown>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, reject, resolve }
}

/** Explicit Root owner/read tokens; real registry, CM transactions, generation and history. */
function setup(raw = source, live = false) {
	const registry = createOrgWorkspaceRuntimeRegistry()
	cleanups.push(() => registry.close())
	const key = { bufferId: "buffer", workspaceSessionId: "G1" }
	const document = { content: raw, relativePath: "tasks.org", revision: "disk-1" }
	const grant = { capabilityToken: "grant", directories: [], documents: [], rootPath: "/org" }
	const flags: OrgAgendaRootSnapshot = {
		agendaBusy: false,
		conflict: false,
		current: true,
		loading: false,
		mirrorsMutable: true,
		mutating: false,
		nativeReady: true,
		paused: false,
		saveAll: false,
		saving: false,
	}
	let state = { ...flags }
	let owner = 0
	let readOwner = 0
	let allocated = live
	let mirror = raw
	let notification: (() => void) | undefined
	const commitSource = vi.fn((_key, next: string) => {
		mirror = next
		notification?.()
	})
	const create = () =>
		registry.create(key, raw, {
			commitSource,
			emitFailure: vi.fn(),
			readCommitContext: (_key, previous, next) => ({
				activeSource: mirror,
				closeReady: true,
				grantMatches: true,
				isActiveOwner: true,
				loading: false,
				mounted: true,
				mutationInProgress: false,
				next,
				notificationInProgress: false,
				ordinarySaveInFlight: false,
				parkedSource: mirror,
				previous,
				registeredWindowBufferId: key.bufferId,
				runtimeBufferId: key.bufferId,
				sessionMatches: true,
			}),
		})
	if (live) {
		create()
	}
	const ports: OrgAgendaCommandPorts = {
		captureClock: vi.fn(() => "[2026-07-01 Wed 00:01]"),
		claim: vi.fn(() => {
			const token = ++owner
			return {
				finishRead: vi.fn(() => {
					if (readOwner === token) {
						readOwner = 0
					}
				}),
				isCurrent: () => owner === token,
				readIsCurrent: () => readOwner === token,
				release: vi.fn(() => {
					if (owner === token) {
						owner = 0
					}
					if (readOwner === token) {
						readOwner = 0
					}
				}),
				startRead: () => {
					readOwner = token
				},
			}
		}),
		commit: vi.fn((_id, expected, edits, guard) =>
			registry.applyCommandEdits(key, expected, edits, guard),
		),
		createRuntime: vi.fn(create),
		getRuntime: vi.fn(() => registry.get(key)),
		lookupId: vi.fn(() => (allocated ? key.bufferId : undefined)),
		parkEditSource: vi.fn(() => {
			allocated = true
			return key.bufferId
		}),
		readDocument: vi.fn(async () => ({ _tag: "Right", right: document })),
		readWorkingCopy: vi.fn(() => (live ? { content: mirror, document } : undefined)),
		runtimeIdentity: () => "incarnation-1",
		scope: { grant, sessionId: key.workspaceSessionId },
		snapshot: vi.fn(() => state),
	}
	const row = (): OrgAgendaEntry => {
		const parsed = structuredClone(parseOrgAgenda(document.relativePath, raw)[0]!)
		return {
			...parsed,
			origin: {
				...parsed.origin!,
				capabilityToken: grant.capabilityToken,
				diskRevision: document.revision,
				source: live ? "live" : "disk",
				sourceRevision: live ? key.bufferId : document.revision,
				workspaceRoot: grant.rootPath,
				workspaceSessionId: key.workspaceSessionId,
				...(live
					? { runtimeIncarnation: "incarnation-1", sourceGeneration: registry.get(key)!.revision }
					: {}),
			},
		}
	}
	return {
		change: (patch: Partial<OrgAgendaRootSnapshot>) => {
			state = { ...state, ...patch }
		},
		commitSource,
		document,
		key,
		notify: (fn: () => void) => {
			notification = fn
		},
		owner: () => owner,
		ports,
		readOwner: () => readOwner,
		registry,
		row,
		runtime: () => registry.get(key)!,
	}
}
function expectNoAllocation(h: ReturnType<typeof setup>) {
	expect(h.ports.parkEditSource).not.toHaveBeenCalled()
	expect(h.ports.createRuntime).not.toHaveBeenCalled()
	expect(h.ports.commit).not.toHaveBeenCalled()
	expect(h.commitSource).not.toHaveBeenCalled()
}

describe("agenda command flow adversarial boundaries", () => {
	it.each([
		"resolve",
		"reject",
	] as const)("aborted G1 late %s cannot release or allocate for G2", async (late) => {
		const h = setup()
		const g1 = deferred(),
			g2 = deferred()
		vi.mocked(h.ports.readDocument).mockReturnValueOnce(g1.promise).mockReturnValueOnce(g2.promise)
		const abort = new AbortController()
		const first = runOrgAgendaOperationFlow(h.row(), edit, h.ports, abort.signal)
		abort.abort()
		expect(await first).toEqual({ kind: "stale" })
		const second = runOrgAgendaOperationFlow(h.row(), edit, h.ports)
		const owner = h.owner()
		expect(h.readOwner()).toBe(owner)
		if (late === "resolve") {
			g1.resolve({ _tag: "Right", right: h.document })
		} else {
			g1.reject(new Error("late G1 rejection"))
		}
		await Promise.resolve()
		await Promise.resolve()
		expect(h.owner()).toBe(owner)
		expect(h.readOwner()).toBe(owner)
		expectNoAllocation(h)
		g2.resolve({ _tag: "Right", right: h.document })
		expect(await second).toEqual({ kind: "confirmed" })
		expect(h.runtime().revision).toBe(1)
		expect(h.ports.parkEditSource).toHaveBeenCalledTimes(1)
		expect(h.commitSource).toHaveBeenCalledTimes(1)
		expect(h.owner()).toBe(0)
		expect(h.readOwner()).toBe(0)
	})

	it.each([
		{},
		{ _tag: "Bogus", right: {} },
		{ _tag: "right", right: {} },
		{ _tag: "Left" },
		{ _tag: "Left", left: { message: 42 } },
		{ _tag: "Right" },
		{ _tag: "Right", right: null },
		{ _tag: "Right", right: { content: source, relativePath: "tasks.org" } },
		{ _tag: "Right", right: { content: source, relativePath: "other.org", revision: "disk-1" } },
		{ _tag: "Right", right: { content: 42, relativePath: "tasks.org", revision: "disk-1" } },
		{ _tag: "Right", right: { content: source, relativePath: "tasks.org", revision: "" } },
	])("rejects malformed read protocol %j before allocation", async (response) => {
		const h = setup()
		vi.mocked(h.ports.readDocument).mockResolvedValue(response)
		expect(await runOrgAgendaOperationFlow(h.row(), edit, h.ports)).toEqual({
			kind: "rejected",
			message: "Invalid document read response.",
		})
		expectNoAllocation(h)
		expect(h.owner()).toBe(0)
		expect(h.readOwner()).toBe(0)
	})

	it("captures entry anchors and operation before a deferred read", async () => {
		const h = setup(),
			read = deferred()
		vi.mocked(h.ports.readDocument).mockReturnValue(read.promise)
		const row = h.row(),
			operation = { ...edit }
		const original = structuredClone(row)
		const pending = runOrgAgendaOperationFlow(row, operation, h.ports)
		Object.assign(row, { relativePath: "other.org", title: "mutated" })
		Object.assign(row.origin!, {
			diskRevision: "bad",
			relativePath: "other.org",
			sourceRevision: "bad",
		})
		Object.assign(row.origin!.heading!, { title: "mutated" })
		Object.assign(operation, { date: "2026-07-20", kind: "deadline" })
		read.resolve({ _tag: "Right", right: h.document })
		expect(await pending).toEqual({ kind: "confirmed" })
		expect(h.ports.parkEditSource).toHaveBeenCalledWith(original.relativePath, h.document, source)
		expect(h.runtime().source).toBe(source.replace("2026-07-01 Wed", "2026-07-09"))
		expect(h.runtime().revision).toBe(1)
		expect(undoDepth(h.runtime().state)).toBe(1)
	})

	it.each([
		[source, { field: "schedule", kind: "prepare" }, "ready"],
		[`#+TODO: TODO | DONE(@)\n${source}`, { kind: "cycle-todo" }, "needs-note"],
		[source, { date: "2026-07-01", kind: "schedule" }, "unchanged"],
	] as const)("does not allocate for %s / %j", async (raw, operation, kind) => {
		const h = setup(raw)
		const observer = vi.fn()
		expect(
			await runOrgAgendaOperationFlow(h.row(), operation, h.ports, undefined, {
				onCommitStarted: observer,
			}),
		).toMatchObject({ kind })
		expectNoAllocation(h)
		expect(observer).not.toHaveBeenCalled()
		expect(h.owner()).toBe(0)
		expect(h.readOwner()).toBe(0)
	})

	it("observer throw is prepublication and preserves CM state/history", async () => {
		const h = setup(source, true),
			before = h.runtime().state
		const observer = vi.fn(() => {
			throw new Error("observer")
		})
		expect(
			await runOrgAgendaOperationFlow(h.row(), edit, h.ports, undefined, {
				onCommitStarted: observer,
			}),
		).toMatchObject({ kind: "rejected" })
		expect(observer).toHaveBeenCalledTimes(1)
		expectNoAllocation(h)
		expect(h.runtime().state).toBe(before)
		expect(h.runtime().revision).toBe(0)
		expect(undoDepth(h.runtime().state)).toBe(0)
		expect(redoDepth(h.runtime().state)).toBe(0)
	})

	it("observer abort prevents publication and releases only its lease", async () => {
		const h = setup(source, true),
			abort = new AbortController(),
			before = h.runtime().state
		const observer = vi.fn(() => abort.abort())
		expect(
			await runOrgAgendaOperationFlow(h.row(), edit, h.ports, abort.signal, {
				onCommitStarted: observer,
			}),
		).toEqual({ kind: "stale" })
		expect(observer).toHaveBeenCalledTimes(1)
		expectNoAllocation(h)
		expect(h.runtime().state).toBe(before)
		expect(h.runtime().revision).toBe(0)
		expect(h.owner()).toBe(0)
	})

	it("edit + undo during observer invalidates generation despite byte-identical source", async () => {
		const h = setup(source, true),
			runtime = h.runtime()
		let handle!: ReturnType<typeof runtime.attachWindow>
		const view = new EditorView({
			dispatchTransactions: (trs) => handle.dispatchTransactions(trs),
			state: EditorState.create({
				doc: runtime.state.doc,
				extensions: runtime.historyFreeSourceExtensions,
			}),
		})
		handle = runtime.attachWindow({ view, windowId: "observer" })
		cleanups.push(() => {
			handle.detach()
			view.destroy()
		})
		const observer = vi.fn(() => {
			view.dispatch({ changes: { from: source.length, insert: "extra\n" } })
			expect(handle.undo()).toBe(true)
			expect(runtime.source).toBe(source)
			expect(runtime.revision).toBe(2)
		})
		expect(
			await runOrgAgendaOperationFlow(h.row(), edit, h.ports, undefined, {
				onCommitStarted: observer,
			}),
		).toEqual({ kind: "stale" })
		expect(observer).toHaveBeenCalledTimes(1)
		expect(h.ports.commit).not.toHaveBeenCalled()
		expect(runtime.source).toBe(source)
		expect(runtime.revision).toBe(2)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(redoDepth(runtime.state)).toBe(1)
	})

	it.each([
		"nativeReady",
		"mirrorsMutable",
		"paused",
		"conflict",
		"current",
		"sourceGeneration",
	] as const)("rechecks %s after observer", async (boundary) => {
		const h = setup(source, true),
			before = h.runtime().state
		const observer = vi.fn(() => {
			if (boundary === "sourceGeneration") {
				h.registry.install(h.key, `${source}changed\n`)
			} else {
				h.change({ [boundary]: boundary === "paused" || boundary === "conflict" })
			}
		})
		expect(
			await runOrgAgendaOperationFlow(h.row(), edit, h.ports, undefined, {
				onCommitStarted: observer,
			}),
		).toMatchObject({
			kind: boundary === "current" || boundary === "sourceGeneration" ? "stale" : "rejected",
		})
		expect(observer).toHaveBeenCalledTimes(1)
		expect(h.ports.commit).not.toHaveBeenCalled()
		if (boundary !== "sourceGeneration") {
			expect(h.runtime().state).toBe(before)
			expect(h.commitSource).not.toHaveBeenCalled()
		}
		expect(undoDepth(h.runtime().state)).toBe(0)
	})

	it.each([
		false,
		true,
	])("confirms actual publication when notification aborts and changes scope (throw=%s)", async (throws) => {
		const h = setup(source, true),
			abort = new AbortController()
		h.notify(() => {
			expect(h.runtime().revision).toBe(1)
			abort.abort()
			h.change({ current: false })
			if (throws) {
				throw new Error("postpublication observer")
			}
		})
		expect(await runOrgAgendaOperationFlow(h.row(), edit, h.ports, abort.signal)).toEqual({
			kind: "confirmed",
		})
		expect(h.runtime().revision).toBe(1)
		expect(h.runtime().source).toContain("SCHEDULED: <2026-07-09>")
		expect(undoDepth(h.runtime().state)).toBe(1)
		expect(h.commitSource).toHaveBeenCalledTimes(1)
		expect(h.owner()).toBe(0)
	})

	it.each([
		null,
		{},
		{ kind: "unknown" },
		{ field: "bad", kind: "prepare" },
		{ date: "2026-02-30", kind: "schedule" },
		{ date: 42, kind: "deadline" },
		{ kind: "cycle-todo", timestamp: "invalid" },
		{ kind: "cycle-todo", note: 42, timestamp: "[2026-07-01 Wed 00:01]" },
	])("invalid operation %j has no boundary effects", async (operation) => {
		const h = setup()
		expect(await runOrgAgendaOperationFlow(h.row(), operation, h.ports)).toMatchObject({
			kind: "rejected",
		})
		expect(h.ports.captureClock).not.toHaveBeenCalled()
		expect(h.ports.snapshot).not.toHaveBeenCalled()
		expect(h.ports.claim).not.toHaveBeenCalled()
		expect(h.ports.readDocument).not.toHaveBeenCalled()
		expectNoAllocation(h)
	})
	it.each([
		"invalid",
		"throw",
	])("invalid clock %s has no authority/read/allocation effects", async (clock) => {
		const h = setup()
		vi.mocked(h.ports.captureClock).mockImplementation(() => {
			if (clock === "throw") {
				throw new Error("clock")
			}
			return clock
		})
		expect(await runOrgAgendaOperationFlow(h.row(), { kind: "cycle-todo" }, h.ports)).toMatchObject(
			{ kind: "rejected" },
		)
		expect(h.ports.captureClock).toHaveBeenCalledTimes(1)
		expect(h.ports.snapshot).not.toHaveBeenCalled()
		expect(h.ports.claim).not.toHaveBeenCalled()
		expect(h.ports.readDocument).not.toHaveBeenCalled()
		expectNoAllocation(h)
	})
})
