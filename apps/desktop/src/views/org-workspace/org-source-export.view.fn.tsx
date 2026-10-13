import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { OrgSourceExportTool } from "@/hooks/use-org-source-tools"
import { ApplicationCompiledToolSurface } from "@/views/application/application-tool-provider"
import { useApplicationResultPublisher } from "@/views/application/application-command-provider"
import { Button } from "@/views/ui/button"
import type { ApplicationToolDescriptor } from "@/flows/application/application-tool-registry"
import type { TrustedCompiledExtension, CompiledExtensionToolHandle, CompiledExtensionToolWindow } from "@/flows/application/trusted-compiled-extension"
import { useTrustedCompiledExtension } from "../application/trusted-compiled-extension"

interface ExportSurfaceMetadata {
	pending: boolean
	live: boolean
	version: number
}
/** Literal output, never HTML execution, body history, browser download, or an ambient writer. */
export function OrgSourceExportView({ tool, onClosed }: {
	readonly tool: OrgSourceExportTool
	readonly onClosed: (id: string) => void
}) {
	const lifetime = useTrustedCompiledExtension({ identity: tool })
	const metadata = useRef<ExportSurfaceMetadata>({ pending: false, live: tool.isCurrent(), version: 0 })
	const [bound, setBound] = useState<{ owner: TrustedCompiledExtension; handle: CompiledExtensionToolHandle; body: { attached: boolean } } | null>(null)
	const descriptor = useMemo(() => ({
		id: `export:${tool.id}`, label: `${tool.format === "html" ? "HTML" : "Markdown"} export · ${tool.sourcePath}`,
		layout: "bottom" as const, active: true,
		get state() {
			const state = metadata.current
			// Publishing a file does not approve discarding this inspectable output.
			return { dirty: true, pending: state.pending, readOnly: !state.live, fence: state.version }
		},
		captureOrigin: () => tool.origin,
		requestClose: () => !metadata.current.pending,
		dispose: () => { onClosed(tool.id) },
	}), [tool, onClosed, metadata])
	const latestDescriptor = useRef(descriptor)
	latestDescriptor.current = descriptor
	useLayoutEffect(() => {
		const owner = lifetime.current!
		const body = { attached: false }
		const initial = latestDescriptor.current
		const handle = owner.registerTool({ ...initial,
			get state() { return body.attached ? initial.state : { ...initial.state, dirty: false, pending: false } },
			dispose: () => { if (body.attached) initial.dispose() },
		})
		if (handle) setBound({ owner, handle, body })
	}, [tool, lifetime])
	return bound ? <ApplicationCompiledToolSurface owner={bound.owner} handle={bound.handle}>
		{(window) => <OrgSourceExportBody tool={tool} owner={bound.owner} handle={bound.handle} window={window} descriptor={descriptor} metadata={metadata} body={bound.body} />}
	</ApplicationCompiledToolSurface> : null
}

function OrgSourceExportBody({ tool, owner, handle, window, descriptor, metadata, body }: {
	readonly tool: OrgSourceExportTool
	readonly owner: TrustedCompiledExtension
	readonly handle: CompiledExtensionToolHandle
	readonly window: CompiledExtensionToolWindow
	readonly descriptor: ApplicationToolDescriptor
	readonly metadata: { current: ExportSurfaceMetadata }
	readonly body: { attached: boolean }
}) {
	const beginResult = useApplicationResultPublisher(tool)
	const [pending, setPending] = useState(false)
	const [status, setStatus] = useState("Preview only. Save opens the native picker; source bytes and undo are unchanged.")
	const [error, setError] = useState<string | null>(null)
	const [binary, setBinary] = useState(false)
	const output = useMemo(() => ({
		text: binary ? Array.from(new TextEncoder().encode(tool.content), byte => byte.toString(16).padStart(2, "0")).join(" ") : tool.content,
		hasNul: tool.content.includes("\0"),
	}), [binary, tool.content])
	const mounted = useRef(true)
	const locked = useRef(false)
	const live = !window.revoked && owner.isLive() && tool.isCurrent()
	const previous = metadata.current
	if (previous.live !== live || previous.pending !== pending) {
		metadata.current = { live, pending, version: previous.version + 1 }
	}
	useLayoutEffect(() => { body.attached = true; owner.updateTool(handle, descriptor) }, [body, owner, handle, descriptor, live, pending])
	useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
	const ownsWindow = () => {
		const current = owner.getToolWindow(handle)
		return owner.isLive() && !!current?.open && !current.closing && current.windowId === window.windowId
	}
	const save = () => {
		if (locked.current || !ownsWindow() || !tool.isCurrent()) return
		const report = beginResult()
		locked.current = true
		metadata.current = { ...metadata.current, pending: true, version: metadata.current.version + 1 }
		setPending(true)
		setError(null)
		void owner.accept(async () => {
			try {
				const result = await tool.save()
				if (!mounted.current) return
				if (result.kind === "cancelled") {
					setStatus("Native picker/replacement cancelled. Output remains copyable; no export was written.")
					if (owner.isLive()) report?.({ kind: "cancelled", message: "Export save cancelled" })
				} else {
					setStatus(`Saved ${result.path}. Independent recovery artifacts retained at ${result.recoveryPath}; no automatic cleanup.`)
					if (owner.isLive()) report?.({ kind: "success", message: `Export saved: ${result.path}` })
				}
			} catch (failure) {
				if (!mounted.current) return
				const message = failure instanceof Error ? failure.message : String(failure)
				setError(message)
				if (owner.isLive()) report?.({ kind: "rejected", message })
			} finally {
				locked.current = false
				if (mounted.current) setPending(false)
				metadata.current = { ...metadata.current, pending: false, version: metadata.current.version + 1 }
			}
		})
	}
	return <aside aria-label="Org export output" className="max-h-[60vh] overflow-auto border-t bg-background p-3 text-sm">
			<header className="flex flex-wrap items-center gap-2">
				<strong>{tool.format === "html" ? "HTML" : "Markdown"} · {tool.sourcePath}</strong>
				<span>{tool.mediaType}</span>
				<Button variant="ghost" size="sm" disabled={pending || !live || !tool.origin.isLive()} onClick={() => { if (ownsWindow() && tool.origin.isLive()) void tool.origin.restore() }}>Return source</Button>
				<Button size="sm" disabled={pending || !live} onClick={save}>Save export with native picker</Button>
				<Button variant="ghost" size="sm" onClick={() => {
					if (!binary && output.hasNul) {
						setError("The system text clipboard can truncate NUL. Enable Hex UTF-8 bytes to copy a lossless representation.")
						return
					}
					if (!navigator.clipboard?.writeText) {
						setError("Clipboard is unavailable. The exact output remains selectable below.")
						return
					}
					void navigator.clipboard.writeText(output.text).then(
						() => { setError(null); setStatus(binary ? "UTF-8 hex bytes copied." : "Displayed export output copied.") },
						() => setError("Clipboard access failed. The exact output remains selectable below."),
					)
				}}>Copy displayed output</Button>
				<label><input type="checkbox" checked={binary} onChange={event => setBinary(event.target.checked)} /> Hex UTF-8 bytes</label>
				<Button variant="ghost" size="sm" disabled={pending} onClick={() => { void owner.closeTool(handle) }}>Close output</Button>
			</header>
			{!live && <p>Captured Source retired or changed. Output remains copyable; saving is unavailable.</p>}
			{output.hasNul && !binary && <p>The literal output contains NUL; plain text clipboard formats can truncate it. Select Hex UTF-8 bytes for a lossless copy.</p>}
			{error && <p role="alert">{error}</p>}
			<p>{pending ? "Native picker/publication pending; accepted work must drain. " : ""}{status}</p>
			<pre tabIndex={0} role="textbox" aria-readonly="true" aria-label={binary ? "Copy Org export UTF-8 hex bytes" : "Copy exact Org export output"} className="max-h-72 w-full select-text overflow-auto whitespace-pre border p-2 font-mono text-xs"
				onKeyDown={event => {
					if (event.defaultPrevented || event.nativeEvent.isComposing || event.altKey || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "a") return
					event.preventDefault()
					event.stopPropagation()
					event.currentTarget.ownerDocument.getSelection()?.selectAllChildren(event.currentTarget)
				}}>{output.text}</pre>
		</aside>
}
