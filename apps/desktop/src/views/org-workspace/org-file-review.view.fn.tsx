import { useEffect, useMemo, useRef, useState } from "react"
import { flushSync } from "react-dom"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import type { OrgFileReview, OrgFileReviewChoice } from "@/flows/org-editor-runtime/org-file-review.types"
import type { ApplicationToolOrigin } from "@/flows/application/application-tool-registry"
import { ApplicationToolSurface, useApplicationToolRegistration, useApplicationTools } from "@/views/application/application-tool-provider"
import { useConfirm } from "@/views/ui/confirm"
import { Button } from "@/views/ui/button"

/** Raw Source/disk-state review; only explicit confirmed recreation may write a missing path. */
export function OrgFileReviewView({ review, controller, origin, onClosed, captureAdoptedOrigin }: {
	readonly review: OrgFileReview
	readonly controller: OrgWorkspaceController
	readonly origin: ApplicationToolOrigin | null
	readonly onClosed: (id: string) => void
	readonly captureAdoptedOrigin: (review: OrgFileReview) => ApplicationToolOrigin | null
}) {
	const tools = useApplicationTools()
	const confirm = useConfirm()
	const [pending, setPending] = useState(false)
	const [closed, setClosed] = useState(false)
	const [accepted, setAccepted] = useState(false)
	const [status, setStatus] = useState<string | null>(null)
	const [binary, setBinary] = useState(false)
	const locked = useRef(false)
	const lifetime = useRef(new AbortController())
	const returnOrigin = useRef(origin)
	const live = !accepted && controller.isFileReviewCurrent(review)
	const nonDocument = "kind" in review.disk ? review.disk : null
	const retained = review.workingSource !== undefined
	const sourceOutput = useMemo(() => binary && review.workingSource !== undefined
		? Array.from(new TextEncoder().encode(review.workingSource), byte => byte.toString(16).padStart(2, "0")).join(" ")
		: review.workingSource, [binary, review.workingSource])
	const latest = useRef(controller)
	latest.current = controller
	const lease = useApplicationToolRegistration(review, {
		id: `file-review:${review.id}`, label: `Reconcile · ${review.relativePath}`, layout: "bottom", active: !closed,
		state: { dirty: false, pending, readOnly: !live, fence: `${review.id}:${live}:${accepted}:${pending}` },
		captureOrigin: () => returnOrigin.current,
		onOpen: () => !closed,
		requestClose: () => {
			if (locked.current) return false
			latest.current.cancelFileReview(review)
			lifetime.current.abort()
			setClosed(true)
			return true
		},
		dispose: () => { lifetime.current.abort(); latest.current.cancelFileReview(review) },
	})
	useEffect(() => { tools.open(lease) }, [lease, tools.open])
	useEffect(() => { if (closed) onClosed(review.id) }, [closed, onClosed, review.id])
	const windowId = tools.tools.find((tool) => tool.lease === lease)?.windowId
	const choose = async (choice: OrgFileReviewChoice) => {
		if (locked.current || !latest.current.isFileReviewCurrent(review) || !tools.registry.getSnapshot().some((tool) =>
			tool.lease === lease && tool.windowId === windowId && tool.open && !tool.closing)) return
		locked.current = true
		setPending(true)
		try {
			const differs = !nonDocument && review.workingSource !== review.disk.content
			if ((differs || choice === "acknowledge-missing" || choice === "recreate-missing") && await confirm({
				title: choice === "acknowledge-missing" ? "Acknowledge this unopened path is absent?"
					: choice === "recreate-missing" ? "Recreate retained Source at this missing path?"
					: choice === "adopt-disk" ? "Discard retained Source and adopt disk?" : "Keep retained Source against the reviewed disk baseline?",
				description: choice === "acknowledge-missing"
					? "This only releases this absent unopened path's protection after another authorized disk check. It does not prove the transfer succeeded, remove Source, write a file or resolve any other protected path."
					: choice === "recreate-missing"
					? "Create this exact retained Source only if the authorized path is still absent. Native create-CAS refuses any newly occupied path. Newer input remains retained with autosave paused. There is no transfer retry or rollback."
					: choice === "adopt-disk"
					? "Only this file will change. Retained working Source and its undo history will be discarded. Copy it first if needed. No disk write is performed."
					: "No disk write is performed now. Automatic saving stays paused. A later explicit Save will replace the reviewed disk bytes using CAS; copied target text may be removed. Other protected files stay protected.",
				confirmText: choice === "acknowledge-missing" ? "Acknowledge absent path"
					: choice === "recreate-missing" ? "Create retained Source"
					: choice === "adopt-disk" ? "Discard and adopt disk" : "Keep Source; require manual Save",
				cancelText: "Cancel", signal: lifetime.current.signal,
			}) !== true) return
			const outcome = await latest.current.acceptFileReview(review, choice,
				choice === "adopt-disk" || choice === "recreate-missing", lifetime.current.signal)
			if (lifetime.current.signal.aborted) return
			if (outcome.kind === "accepted") {
				// Publish the owner's runtime replacement before capturing fresh focus authority.
				flushSync(() => setAccepted(true))
				if (choice === "adopt-disk" && differs) returnOrigin.current = captureAdoptedOrigin(review)
				setStatus(choice === "acknowledge-missing"
					? "Authorized absence acknowledged for this unopened path only. No file was written; no transfer success was inferred. Other paths remain protected."
					: choice === "recreate-missing"
					? outcome.manualSaveRequired ? "Creation confirmed. Newer input/history retained; autosave stays paused. Review again or explicitly Save."
						: "Creation confirmed from the exact retained Source. Autosave remains paused; explicitly Save to resume. No transfer was retried."
					: outcome.manualSaveRequired
					? "Reviewed baseline accepted. Source retained; autosave paused. Use explicit Save to CAS-write this Source, or review again to adopt disk."
					: "Disk baseline reconciled for this file only. No disk write was performed.")
			} else if (outcome.kind === "rejected") setStatus(outcome.message)
		} finally {
			locked.current = false
			if (!lifetime.current.signal.aborted) setPending(false)
		}
	}
	return <ApplicationToolSurface lease={lease}>
		<aside aria-label="Review protected Org file" className="max-h-[65vh] overflow-auto border-t bg-background p-3 text-sm">
			<header className="flex flex-wrap items-center gap-2">
				<strong>Reconcile {review.relativePath}</strong>
				<Button size="sm" variant="ghost" disabled={pending || !returnOrigin.current?.isLive()} onClick={() => {
					const captured = returnOrigin.current
					if (!locked.current && captured?.isLive()) captured.restore()
				}}>Return Source</Button>
				{!nonDocument && <>
					<Button size="sm" disabled={!live || pending} onClick={() => { void choose("adopt-disk") }}>Adopt reviewed disk Source</Button>
					<Button size="sm" variant="outline" disabled={!live || pending} onClick={() => { void choose("keep-working") }}>Keep retained Source</Button>
				</>}
				{nonDocument?.kind === "missing" && <Button size="sm" disabled={!live || pending}
					onClick={() => { void choose(retained ? "recreate-missing" : "acknowledge-missing") }}>
					{retained ? "Recreate retained Source" : "Acknowledge missing unopened path"}
				</Button>}
				{nonDocument && <Button size="sm" variant="outline" disabled={pending || controller.isWorkspaceBlocked}
					onClick={() => { void controller.refreshWorkspace() }}>Refresh workspace</Button>}
				{nonDocument?.kind === "unavailable" && !retained && <Button size="sm" variant="outline"
					disabled={pending || !live} onClick={() => { void controller.openDocumentPath(review.relativePath) }}>Open path as Org Source</Button>}
				{retained && <>
					<Button size="sm" variant="outline" onClick={() => {
						if (!binary && review.workingSource!.includes("\0")) {
							setStatus("Plain text clipboard can truncate NUL; select Hex UTF-8 bytes for a lossless copy.")
							return
						}
						if (!navigator.clipboard?.writeText) {
							setStatus("Clipboard access is unavailable. Retained Source remains selectable below.")
							return
						}
						void navigator.clipboard.writeText(sourceOutput!).then(
							() => setStatus(binary ? "Retained Source UTF-8 hex bytes copied." : "Retained Source copied."),
							() => setStatus("Clipboard access failed. Retained Source remains selectable below."),
						)
					}}>Copy retained Source</Button>
					<label><input type="checkbox" checked={binary} onChange={event => setBinary(event.target.checked)} /> Hex UTF-8 bytes</label>
				</>}
				<Button size="sm" variant="ghost" disabled={pending} onClick={() => { void tools.close(lease) }}>Cancel / close review</Button>
			</header>
			<p>Opening or cancelling this review writes nothing. Each protected file must be reconciled separately.</p>
			{!live && !accepted && <p role="alert">This review is stale. Retained snapshots remain copyable; open a new review before choosing.</p>}
			{status && <p role="status">{status}</p>}
			<p>Retained baseline revision: <code>{review.baselineRevision ?? "No retained document baseline"}</code></p>
			{nonDocument ? <p role="status">{nonDocument.kind === "missing"
				? "The authorized path was observed absent. Absence is not an empty document or a successful transfer."
				: "This path is unavailable or occupied by a non-document; reconciliation is blocked."} {nonDocument.message}</p>
				: <p>Reviewed disk revision: <code>{review.disk.revision}</code></p>}
			{nonDocument?.kind === "unavailable" && <p>Keep/copy retained Source. Restore a regular UTF-8 Org file or remove the obstruction using your workspace recovery tools; refresh, then open a new review. Symlinks and unknown reads never prove absence.</p>}
			<div className="grid gap-3 md:grid-cols-2">
				{retained ? <label>Retained working Source — copy before discarding
					<pre tabIndex={0} role="textbox" aria-readonly="true" aria-label={binary ? "Copy retained working Org Source UTF-8 hex bytes" : "Copy retained working Org Source"}
						className="max-h-72 select-text overflow-auto whitespace-pre border p-2 font-mono text-xs"
						onKeyDown={event => {
							if (event.defaultPrevented || event.nativeEvent.isComposing || event.altKey || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "a") return
							event.preventDefault()
							event.stopPropagation()
							event.currentTarget.ownerDocument.getSelection()?.selectAllChildren(event.currentTarget)
						}}>{sourceOutput}</pre>
				</label> : <p>No retained Source exists for this unopened path.</p>}
				{!nonDocument && <label>Newly read disk Source
					<pre tabIndex={0} aria-label="Reviewed disk Org Source" className="max-h-72 select-text overflow-auto whitespace-pre border p-2 font-mono text-xs">{review.disk.content}</pre>
				</label>}
			</div>
		</aside>
	</ApplicationToolSurface>
}
