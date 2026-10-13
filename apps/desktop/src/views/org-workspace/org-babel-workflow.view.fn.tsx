import { type KeyboardEvent, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import type { OrgBabelExecution } from "@/flows/org-execution/org-babel-execution"
import type { OrgExecutionOutputPage } from "@/io/execution/org-execution.types"
import { ApplicationCompiledToolSurface } from "@/views/application/application-tool-provider"
import { Button } from "@/views/ui/button"
import type { ApplicationToolDescriptor } from "@/flows/application/application-tool-registry"
import type { TrustedCompiledExtension, CompiledExtensionToolHandle, CompiledExtensionToolWindow } from "@/flows/application/trusted-compiled-extension"
import { useTrustedCompiledExtension } from "../application/trusted-compiled-extension"

function selectReadonlyText(event: KeyboardEvent<HTMLElement>) {
	if (event.defaultPrevented || event.nativeEvent.isComposing || event.altKey || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "a") return
	event.preventDefault()
	event.stopPropagation()
	event.currentTarget.ownerDocument.getSelection()?.selectAllChildren(event.currentTarget)
}

function BabelOutputPage({ execution, stream }: { readonly execution: OrgBabelExecution; readonly stream: "stdout" | "stderr" }) {
	const state = useSyncExternalStore(execution.subscribe, execution.getSnapshot, execution.getSnapshot)
	const [offset, setOffset] = useState("0")
	const [history, setHistory] = useState<readonly string[]>([])
	const [page, setPage] = useState<OrgExecutionOutputPage | null>(null)
	const [pending, setPending] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [binary, setBinary] = useState(false)
	const load = async (next: string) => {
		if (pending || state.pending || !state.result?.executionId) return
		setPending(true)
		setError(null)
		try { setPage(await execution.readPage(stream, next)); setOffset(next) }
		catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)) }
		finally { setPending(false) }
	}
	let text = ""
	let invalid = false
	if (page) {
		try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(new Uint8Array(page.bytes)) }
		catch { invalid = true }
		if (binary || invalid) text = page.bytes.map((byte) => byte.toString(16).padStart(2, "0")).join(" ")
	}
	return <section aria-label={`Babel ${stream}`} className="min-w-0 flex-1">
		<header className="flex flex-wrap items-center gap-2 text-xs">
			<strong>{stream}: {state.result ? stream === "stdout" ? state.result.stdoutBytes : state.result.stderrBytes : "0"} bytes</strong>
			<span>Byte offset {offset}; pages ≤ 65536 bytes</span>
			<Button size="sm" variant="ghost" disabled={pending || state.pending || !state.result?.executionId} onClick={() => { setHistory([]); void load("0") }}>Read first page</Button>
			<Button size="sm" variant="ghost" disabled={pending || state.pending || history.length === 0} onClick={() => { const previous = history[history.length - 1]; setHistory(history.slice(0, -1)); void load(previous) }}>Previous</Button>
			<Button size="sm" variant="ghost" disabled={pending || state.pending || !page || page.eof} onClick={() => { if (page) { setHistory([...history, offset]); void load(page.nextOffset) } }}>Next</Button>
			<Button size="sm" variant="ghost" disabled={!page} onClick={() => {
				if (text.includes("\0")) {
					setError("The system text clipboard can truncate NUL. Enable Hex bytes to copy a lossless representation.")
					return
				}
				if (!navigator.clipboard?.writeText) {
					setError("Clipboard is unavailable. The exact displayed page remains selectable below.")
					return
				}
				void navigator.clipboard.writeText(text).catch(() => setError("Clipboard access failed. The exact displayed page remains selectable below."))
			}}>Copy displayed page</Button>
			<label><input type="checkbox" checked={binary} onChange={(event) => setBinary(event.target.checked)} /> Hex bytes</label>
		</header>
		{invalid && <p className="text-xs">This byte page is not complete valid UTF-8 (a boundary can split a character). Exact hex bytes are shown; no replacement decoding.</p>}
		{!binary && !invalid && text.includes("\0") && <p className="text-xs">The literal page contains NUL; plain text clipboard formats can truncate it. Select Hex bytes for a lossless copy.</p>}
		{error && <p role="alert">{error}</p>}
		<pre tabIndex={0} role="textbox" aria-readonly="true" aria-label={`Copy Babel ${stream} page`} className="max-h-72 w-full select-text overflow-auto whitespace-pre border p-2 font-mono text-xs"
			onKeyDown={selectReadonlyText}>{text}</pre>
	</section>
}

/** Application lifetime retains this same output body after its former producer retires. */
export function OrgBabelWorkflowView({ execution, onClosed }: { readonly execution: OrgBabelExecution; readonly onClosed: (execution: OrgBabelExecution) => void }) {
	const lifetime = useTrustedCompiledExtension({ identity: execution })
	const [bound, setBound] = useState<{ owner: TrustedCompiledExtension; handle: CompiledExtensionToolHandle; body: { attached: boolean } } | null>(null)
	const descriptor = useMemo(() => ({
		id: `babel:${execution.id}`, label: `${execution.sourceKind === "table" ? "Table calculation" : "Babel"} · ${execution.source.path}`, layout: "bottom" as const,
		get active() { return !execution.getSnapshot().closed },
		get state() {
			const state = execution.getSnapshot()
			return { dirty: state.used || !!state.result?.executionId || state.pending, pending: state.pending,
				readOnly: !execution.source.isCurrent() || !execution.source.origin.isLive(), fence: state.revision }
		},
		captureOrigin: () => execution.source.origin,
		onOpen: () => !execution.getSnapshot().closed,
		requestClose: () => execution.close(),
		dispose: async () => { await execution.dispose(); onClosed(execution) },
	}), [execution, onClosed])
	const latestDescriptor = useRef(descriptor)
	latestDescriptor.current = descriptor
	useLayoutEffect(() => {
		const owner = lifetime.current!
		const body = { attached: false }
		const initial = latestDescriptor.current
		const handle = owner.registerTool({ ...initial,
			get state() { return body.attached ? initial.state : { ...initial.state, dirty: false, pending: false } },
			dispose: async () => { if (body.attached) await initial.dispose() },
		})
		if (handle) setBound({ owner, handle, body })
	}, [execution, lifetime])
	return bound ? <ApplicationCompiledToolSurface owner={bound.owner} handle={bound.handle}>
		{(window) => <OrgBabelWorkflowBody execution={execution} owner={bound.owner} handle={bound.handle} window={window} descriptor={descriptor} body={bound.body} />}
	</ApplicationCompiledToolSurface> : null
}

function OrgBabelWorkflowBody({ execution, owner, handle, window, descriptor, body }: {
	readonly execution: OrgBabelExecution
	readonly owner: TrustedCompiledExtension
	readonly handle: CompiledExtensionToolHandle
	readonly window: CompiledExtensionToolWindow
	readonly descriptor: ApplicationToolDescriptor
	readonly body: { attached: boolean }
}) {
	const state = useSyncExternalStore(execution.subscribe, execution.getSnapshot, execution.getSnapshot)
	const [program, setProgram] = useState("")
	const [environment, setEnvironment] = useState("{}")
	const [configurationError, setConfigurationError] = useState<string | null>(null)
	useLayoutEffect(() => {
		body.attached = true
		owner.ownProducer(execution.retire)
	}, [body, owner, execution])
	useEffect(() => { void execution.initialize() }, [execution])
	const live = !window.revoked && owner.isLive() && execution.source.isCurrent() && execution.source.origin.isLive()
	useLayoutEffect(() => { owner.updateTool(handle, descriptor) }, [owner, handle, descriptor, state])
	const ownsWindow = () => {
		const current = owner.getToolWindow(handle)
		return owner.isLive() && !!current?.open && !current.closing && current.windowId === window.windowId
	}
	const configure = () => {
		if (!ownsWindow()) return
		try {
			const value: unknown = JSON.parse(environment)
			if (!value || typeof value !== "object" || Array.isArray(value) || Object.values(value).some((entry) => typeof entry !== "string")) throw new Error("Environment must be a JSON object containing string values only.")
			if (execution.configure(program, value as Record<string, string>)) { setConfigurationError(null); setEnvironment(JSON.stringify(value)) }
		} catch (error) { setConfigurationError(error instanceof Error ? error.message : String(error)) }
	}
	return <aside aria-label="Org Babel execution" className="max-h-[65vh] overflow-auto border-t bg-background p-3 text-sm">
			<header className="flex flex-wrap items-center gap-2">
				<strong>GNU Org {execution.sourceKind === "table" ? "table calculation" : "Babel"} · {execution.source.path}</strong>
				<Button variant="ghost" size="sm" disabled={state.pending || !live} onClick={() => { if (ownsWindow() && execution.source.origin.isLive()) void execution.source.origin.restore() }}>Return source</Button>
				<Button variant="ghost" size="sm" disabled={state.pending} onClick={() => { void owner.closeTool(handle) }}>Close results</Button>
			</header>
			<p>Captured invocation: <strong>{execution.sourceKind ?? "unavailable"}</strong>. Only explicit Run obtains native consent; review and Apply remain separate.</p>
			<p role="alert">Unsandboxed full-OS execution. GNU Emacs and Org headers/code may run programs, evaluate Lisp, and read or modify any accessible file. Every Run requires native one-run consent showing the complete argv, wrapper, environment and stdin. This tool cannot bypass it.</p>
			{!live && <p>Captured source retired. Output remains copyable; Run and Apply are unavailable.</p>}
			<div className="flex flex-wrap items-center gap-2">
				<span>Native session: {!state.initialized ? "reading" : state.enabled ? "enabled" : "disabled"} (not persisted)</span>
				<Button size="sm" disabled={!state.initialized || state.pending || !live || state.enabled} onClick={() => { if (ownsWindow()) void execution.setEnabled(true) }}>Enable execution</Button>
				<Button size="sm" disabled={!state.initialized || !live || !state.enabled} onClick={() => { if (ownsWindow()) void execution.setEnabled(false) }}>Disable execution</Button>
			</div>
			<label className="block">Explicitly selected installed GNU Emacs absolute path<input aria-label="GNU Emacs interpreter" value={program} readOnly={state.pending || state.used || !live} onChange={(event) => setProgram(event.target.value)} placeholder="Enter absolute interpreter path" className="block w-full font-mono" /></label>
			<label className="block">Complete environment (ambient environment is cleared)<textarea aria-label="Babel complete environment" value={environment} readOnly={state.pending || state.used || !live} onChange={(event) => setEnvironment(event.target.value)} rows={3} className="block w-full font-mono" /></label>
			<Button size="sm" disabled={state.pending || state.used || !live} onClick={configure}>Prepare disclosed run</Button>
			{configurationError && <p role="alert">{configurationError}</p>}
			{state.request && <details open>
				<summary>Exact immutable native request (arbitrary executable Org input, not harmless JSON)</summary>
				<label>Program<textarea readOnly aria-label="Disclosed Babel program" value={state.request.program} rows={1} className="w-full font-mono text-xs" /></label>
				<label>Explicit argv / complete --batch -Q wrapper<textarea readOnly aria-label="Disclosed Babel argv" value={JSON.stringify(state.request.argv, null, 2)} rows={8} className="w-full font-mono text-xs" /></label>
				<label>Complete cleared environment<textarea readOnly aria-label="Disclosed Babel environment" value={JSON.stringify(state.request.environment, null, 2)} rows={2} className="w-full font-mono text-xs" /></label>
				<label>Exact immutable stdin (entire Org source/code and headers)<textarea readOnly aria-label="Disclosed Babel stdin" value={state.request.stdin ?? ""} rows={6} className="w-full font-mono text-xs" /></label>
				<Button size="sm" disabled={state.pending || state.used || !state.enabled || !live || program !== state.request.program || environment !== JSON.stringify(state.request.environment)} onClick={() => { if (state.request && ownsWindow()) void execution.runOnce(state.request) }}>Run once — request native consent</Button>
			</details>}
			<p role="status">{state.pending ? "Pending: accepted native work must drain; close is protected. " : ""}{state.status}</p>
			{state.result && <p>Outcome: {state.result.outcome}; exit: {state.result.exitCode ?? "none"}; signal: {state.result.signal ?? "none"}; error: {state.result.error ?? "none"}. No automatic result insertion.</p>}
			{state.result?.executionId && <div className="flex flex-wrap gap-3"><BabelOutputPage execution={execution} stream="stdout" /><BabelOutputPage execution={execution} stream="stderr" /></div>}
			{state.batch && <section>
				<p>GNU Org owns result placement and formatting. The insertion is live Org structure and may contain headings, links, drawers or directives. Only the exact reviewed span changes; all captured bytes outside it stay unchanged. Apply is one canonical undo batch; Save remains separate.</p>
				{state.batch.changes.map((change) => <div key={`${change.from}:${change.to}`}>
					<p>Replace captured UTF-16 range [{change.from}, {change.to}) ({change.to - change.from} code units).</p>
					<label>Exact captured text removed<pre tabIndex={0} role="textbox" aria-readonly="true" aria-label="Proposed Babel results removal" onKeyDown={selectReadonlyText} className="max-h-40 select-text overflow-auto whitespace-pre border p-2 font-mono text-xs">{execution.source.source.slice(change.from, change.to)}</pre></label>
					<label>Exact GNU text inserted<pre tabIndex={0} role="textbox" aria-readonly="true" aria-label="Proposed Babel results insertion" onKeyDown={selectReadonlyText} className="max-h-40 select-text overflow-auto whitespace-pre border p-2 font-mono text-xs">{change.insert}</pre></label>
					<details><summary>Escaped exact text (including newlines and NUL)</summary>
						<pre className="whitespace-pre-wrap">Removed: {JSON.stringify(execution.source.source.slice(change.from, change.to))}{"\n"}Inserted: {JSON.stringify(change.insert)}</pre>
					</details>
				</div>)}
				<Button size="sm" disabled={state.pending || state.applied || !live} onClick={() => { if (ownsWindow()) void execution.apply() }}>Apply results</Button>
			</section>}
		</aside>
}
