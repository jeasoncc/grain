import { useLayoutEffect, useMemo, useState } from "react"
import type { OrgClockReportTool } from "@/hooks/use-org-clock-workflow"
import { ApplicationCompiledToolSurface } from "@/views/application/application-tool-provider"
import { useTrustedCompiledExtension } from "@/views/application/trusted-compiled-extension"
import type { TrustedCompiledExtension, CompiledExtensionToolHandle } from "@/flows/application/trusted-compiled-extension"
import { Button } from "@/views/ui/button"

/** No report body writer, execution, persistence or Source history authority. */
export function OrgClockReportView({ tool, onClosed }: {
	readonly tool: OrgClockReportTool
	readonly onClosed: (id: string) => void
}) {
	const lifetime = useTrustedCompiledExtension({ identity: tool })
	const [bound, setBound] = useState<{ owner: TrustedCompiledExtension; handle: CompiledExtensionToolHandle } | null>(null)
	const descriptor = useMemo(() => ({ id: `clock-report:${tool.id}`, label: `Clock report · ${tool.sourcePath}`, layout: "bottom" as const,
		state: { dirty: false, pending: false, readOnly: true, fence: tool.id }, active: true,
		captureOrigin: () => tool.origin, requestClose: () => true, dispose: () => onClosed(tool.id) }), [tool, onClosed])
	useLayoutEffect(() => {
		const owner = lifetime.current!
		const handle = owner.registerTool(descriptor)
		if (handle) setBound({ owner, handle })
	}, [tool, lifetime])
	useLayoutEffect(() => { if (bound) bound.owner.updateTool(bound.handle, descriptor) }, [bound, descriptor])
	return bound ? <ApplicationCompiledToolSurface owner={bound.owner} handle={bound.handle}>
		{window => <ClockReportBody tool={tool} close={() => bound.owner.closeTool(bound.handle)}
			canReturn={() => !window.revoked && bound.owner.isLive() && tool.isCurrent()} />}
	</ApplicationCompiledToolSurface> : null
}
function ClockReportBody({ tool, close, canReturn }: { readonly tool: OrgClockReportTool; readonly close: () => Promise<boolean>; readonly canReturn: () => boolean }) {
	const [binary, setBinary] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const text = useMemo(() => binary ? Array.from(new TextEncoder().encode(tool.content), byte => byte.toString(16).padStart(2, "0")).join(" ") : tool.content, [binary, tool.content])
	return <aside aria-label="Org clock report" className="max-h-[60vh] overflow-auto border-t bg-background p-3 text-sm">
		<header className="flex flex-wrap items-center gap-2"><strong>Clock report · {tool.sourcePath}</strong>
			<Button variant="ghost" size="sm" disabled={!canReturn() || !tool.origin.isLive()} onClick={() => { if (canReturn() && tool.origin.isLive()) void tool.origin.restore() }}>Return source</Button>
			<Button variant="ghost" size="sm" onClick={() => {
				if (!binary && tool.content.includes("\0")) { setError("Plain text clipboard can truncate NUL; select Hex UTF-8 bytes for lossless copy."); return }
				if (!navigator.clipboard?.writeText) { setError("Clipboard is unavailable; the report remains selectable."); return }
				void navigator.clipboard.writeText(text).then(() => setError(null), () => setError("Clipboard access failed; the report remains selectable."))
			}}>Copy displayed report</Button>
			<label><input type="checkbox" checked={binary} onChange={event => setBinary(event.target.checked)} /> Hex UTF-8 bytes</label>
			<Button variant="ghost" size="sm" onClick={() => { void close() }}>Close report</Button>
		</header>
		{!canReturn() && <p>Captured origin changed; this original report remains selectable and copyable.</p>}
		{error && <p role="alert">{error}</p>}
		<pre tabIndex={0} role="textbox" aria-readonly="true" aria-label={binary ? "Copy Org clock report UTF-8 hex bytes" : "Copy exact Org clock report"}
			className="max-h-72 w-full select-text overflow-auto whitespace-pre border p-2 font-mono text-xs"
			onKeyDown={event => {
				if (event.defaultPrevented || event.nativeEvent.isComposing || event.altKey || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "a") return
				event.preventDefault(); event.stopPropagation()
				event.currentTarget.ownerDocument.getSelection()?.selectAllChildren(event.currentTarget)
			}}>{text}</pre>
	</aside>
}
