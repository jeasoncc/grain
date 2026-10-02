import { EditorView } from "@codemirror/view"
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import {
	BUILTIN_ORG_CAPTURE_TEMPLATES,
	isOrgCaptureTargetPath,
	prepareOrgCaptureTemplate,
	validateOrgCaptureEntry,
} from "@/pipes/org/org-capture.pipe"
import type { OrgMinibufferSession } from "@/types/editor/minibuffer.interface"
import type { OrgCaptureTemplate } from "@/types/editor/org-capture.interface"
import { OrgEditor, type OrgEditorCommandTarget } from "@/views/org-editor"
import { OrgMinibuffer } from "./org-minibuffer.view.fn"

export interface OrgCaptureOrigin {
	readonly scope: {
		readonly workspaceSessionId: string | null
		readonly rootPath: string | null
		readonly capabilityToken: string | undefined
	}
	readonly bufferId: string | null
}
export interface OrgCaptureWorkflowProps {
	readonly controller: OrgWorkspaceController
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	/** Called after the bound switchBuffer succeeds; parent may focus its exact origin editor. */
	readonly onRestoreOrigin?: (
		origin: OrgCaptureOrigin,
		signal?: AbortSignal,
	) => void | Promise<void>
}
let nextSession = 0
const scopeOf = (controller: OrgWorkspaceController): OrgCaptureOrigin["scope"] => ({
	capabilityToken: controller.workspace?.capabilityToken,
	rootPath: controller.workspace?.rootPath ?? null,
	workspaceSessionId: controller.workspaceSessionId,
})
const scopeKey = (controller: OrgWorkspaceController) => JSON.stringify(scopeOf(controller))

/** A bottom parameter minibuffer followed by a non-modal, memory-only scratch tool window. */
export const OrgCaptureWorkflow = (props: OrgCaptureWorkflowProps) =>
	props.open ? <CaptureSession {...props} /> : null

const CaptureSession = (props: OrgCaptureWorkflowProps) => {
	const latest = useRef(props)
	latest.current = props
	const [session] = useState(() => ({
		abort: new AbortController(),
		clearDirty: props.controller.setTransientDirty,
		closing: false,
		focus: document.activeElement instanceof HTMLElement ? document.activeElement : null,
		id: ++nextSession,
		key: scopeKey(props.controller),
		live: true,
		origin: { bufferId: props.controller.activeBufferId, scope: scopeOf(props.controller) },
		pending: false,
		retired: false,
	}))
	const dirtyId = `org-capture:${session.key}:${session.id}`
	const [template, setTemplate] = useState<OrgCaptureTemplate | null>(null)
	const [draft, setDraft] = useState("")
	const [target, setTarget] = useState("")
	const [pending, setPending] = useState(false)
	const [retired, setRetired] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const prefix = useRef(false)
	const composing = useRef(false)
	const scratchFocused = useRef(false)
	const scratch = useRef<HTMLDivElement>(null)
	if (props.controller.isLoading || props.controller.isSaving || pending || retired) {
		prefix.current = false
	}
	const current = useCallback(
		() => session.live && scopeKey(latest.current.controller) === session.key,
		[session],
	)
	const focusScratch = useCallback(
		(target: OrgEditorCommandTarget | null) => {
			if (!target) {
				// StrictMode destroys and recreates the CM instance during effect replay.
				scratchFocused.current = false
				return
			}
			if (!current() || scratchFocused.current || composing.current) {
				return
			}
			scratchFocused.current = true
			target.restoreFocus()
		},
		[current],
	)
	const clear = useCallback(() => session.clearDirty(dirtyId, false), [session, dirtyId])
	useLayoutEffect(() => {
		// React StrictMode replays setup/cleanup without remounting the local draft.
		session.live = scopeKey(latest.current.controller) === session.key
		if (session.abort.signal.aborted) {
			session.abort = new AbortController()
		}
		return () => {
			session.live = false
			session.abort.abort()
			clear()
		}
	}, [session, clear])
	useLayoutEffect(() => {
		if (scopeKey(props.controller) !== session.key) {
			prefix.current = false
			session.pending = false
			session.live = false
			session.abort.abort()
			clear()
		}
	}, [props.controller, session, clear])
	const restore = useCallback(async () => {
		const origin = session.origin
		if (
			!current() ||
			!origin.bufferId ||
			!latest.current.controller.openBuffers.some((buffer) => buffer.bufferId === origin.bufferId)
		) {
			return
		}
		try {
			const switched = await latest.current.controller.switchBuffer(
				origin.bufferId,
				session.abort.signal,
			)
			if (!switched || !current()) {
				return
			}
			if (latest.current.onRestoreOrigin) {
				await latest.current.onRestoreOrigin(origin, session.abort.signal)
			} else if (session.focus?.isConnected) {
				session.focus.focus()
			}
		} catch {
			/* Restoration is best effort, never a retry of the write. */
		}
	}, [current, session])
	const cancel = useCallback(async () => {
		if (!current() || session.pending || session.closing || latest.current.controller.isLoading) {
			return
		}
		session.closing = true
		prefix.current = false
		setPending(true)
		clear()
		await restore()
		if (current()) {
			latest.current.onOpenChange(false)
		}
	}, [clear, current, restore, session])
	const finish = async () => {
		if (
			!current() ||
			session.pending ||
			session.retired ||
			session.closing ||
			latest.current.controller.isLoading ||
			composing.current ||
			!template
		) {
			return
		}
		const validation = validateOrgCaptureEntry(draft)
		if (validation._tag === "Left") {
			setError(validation.left.message)
			return
		}
		if (!isOrgCaptureTargetPath(target)) {
			setError("Capture target must be a safe relative .org path.")
			return
		}
		if (latest.current.controller.isSaving) {
			setError("Workspace is busy saving. Wait before finishing capture.")
			return
		}
		session.pending = true
		prefix.current = false
		setPending(true)
		setError(null)
		let result: Awaited<ReturnType<OrgWorkspaceController["captureEntry"]>>
		try {
			result = await latest.current.controller.captureEntry(draft, target)
		} catch {
			result = { kind: "uncertain" as const, message: "Capture ended unexpectedly." }
		}
		if (!current()) {
			return
		}
		if (result.kind === "success") {
			clear()
			await restore()
			if (!current()) {
				return
			}
			if (result.message) {
				session.pending = false
				session.retired = true
				setPending(false)
				setRetired(true)
				setError(`Capture saved. ${result.message} No rollback was attempted.`)
			} else {
				latest.current.onOpenChange(false)
			}
			return
		}
		session.pending = false
		setPending(false)
		if (result.kind === "uncertain") {
			session.retired = true
			setRetired(true)
			setError(
				`${result.message ?? "Capture could not be confirmed."} The target may already contain the entry. Reread and reconcile it; do not blindly retry. No rollback was attempted. You can select and copy this draft.`,
			)
		} else {
			setError(result.message ?? "Capture was rejected before writing. Check the draft and target.")
		}
	}
	const minibuffer = useMemo<OrgMinibufferSession>(
		() => ({
			acceptCandidate: true,
			candidates: BUILTIN_ORG_CAPTURE_TEMPLATES.map((entry) => entry.id),
			completion: "value",
			historyKey: "org-capture-template",
			id: session.id,
			initialInput: "",
			onAccept: (value) => {
				if (!current()) {
					return { message: "Capture scope changed.", ok: false }
				}
				const builtin = BUILTIN_ORG_CAPTURE_TEMPLATES.find((entry) => entry.id === value)
				if (!builtin) {
					return { message: "Choose todo or note.", ok: false }
				}
				const prepared = prepareOrgCaptureTemplate(builtin)
				if (prepared._tag === "Left") {
					return { message: prepared.left.message, ok: false }
				}
				setTemplate(prepared.right)
				setDraft(prepared.right.initialSource)
				setTarget(prepared.right.targetRelativePath)
				return { ok: true }
			},
			onCancel: cancel,
			prompt: "Capture template:",
		}),
		[session, cancel, current],
	)
	if (!current()) {
		return null
	}
	if (!template) {
		return (
			<div data-org-capture-template-minibuffer="true">
				<OrgMinibuffer session={minibuffer} />
			</div>
		)
	}
	const update = (source: string, path: string) => {
		if (
			!current() ||
			session.pending ||
			session.closing ||
			session.retired ||
			latest.current.controller.isLoading
		) {
			return
		}
		// Register before React state so synchronous native close/route guards see this edit.
		latest.current.controller.setTransientDirty(
			dirtyId,
			source !== template.initialSource || path !== template.targetRelativePath,
		)
		setDraft(source)
		setTarget(path)
		setError(null)
	}
	return (
		<section
			aria-label="Org capture tool buffer"
			data-org-parameter-input="true"
			data-org-capture-tool-window="true"
			aria-busy={pending || props.controller.isSaving || props.controller.isLoading}
			onBlurCapture={() => {
				prefix.current = false
			}}
			onPointerDownCapture={() => {
				prefix.current = false
			}}
			onClickCapture={() => {
				prefix.current = false
			}}
			onInputCapture={() => {
				prefix.current = false
			}}
			className="shrink-0 border-t border-border bg-background p-3 shadow-lg"
			onCompositionStart={() => {
				composing.current = true
				prefix.current = false
			}}
			onCompositionEnd={() => {
				composing.current = false
			}}
			onKeyDown={(event) => {
				event.stopPropagation()
				if (
					!event.defaultPrevented &&
					!event.nativeEvent.defaultPrevented &&
					!event.repeat &&
					!event.altKey &&
					!event.shiftKey &&
					!composing.current &&
					!event.nativeEvent.isComposing &&
					event.keyCode !== 229 &&
					(event.ctrlKey || event.metaKey) &&
					event.key.toLowerCase() === "s"
				) {
					event.preventDefault()
					void finish()
				}
			}}
			onKeyDownCapture={(event) => {
				const consumed = event.defaultPrevented || event.nativeEvent.defaultPrevented
				if (
					consumed ||
					composing.current ||
					event.nativeEvent.isComposing ||
					event.keyCode === 229
				) {
					prefix.current = false
					return
				}
				const key = event.key.toLowerCase()
				if (
					(event.ctrlKey || event.metaKey) &&
					key === "s" &&
					(event.repeat || event.altKey || event.shiftKey)
				) {
					prefix.current = false
					event.preventDefault()
					event.stopPropagation()
					return
				}
				if (event.ctrlKey && key === "g") {
					event.preventDefault()
					event.stopPropagation()
					prefix.current = false
					cancel()
					return
				}
				const inScratch = event.target instanceof Node && scratch.current?.contains(event.target)
				if (
					!inScratch ||
					session.pending ||
					session.closing ||
					session.retired ||
					props.controller.isLoading ||
					props.controller.isSaving
				) {
					prefix.current = false
					if (inScratch && event.ctrlKey && key === "c") {
						event.stopPropagation()
					}
					return
				}
				const element = event.target as HTMLElement
				const view = EditorView.findFromDOM(element)
				const input = element as HTMLTextAreaElement
				const selected = view
					? view.state.selection.ranges.some((range) => !range.empty)
					: typeof input.selectionStart === "number" && input.selectionStart !== input.selectionEnd
				if (event.ctrlKey && key === "c" && (selected || event.repeat)) {
					prefix.current = false
					// Bypass Org prefix routing without preventing the browser's native copy.
					event.stopPropagation()
					return
				}
				if (prefix.current) {
					prefix.current = false
					if (
						event.ctrlKey &&
						!event.altKey &&
						!event.shiftKey &&
						!event.metaKey &&
						(key === "c" || key === "k")
					) {
						event.preventDefault()
						event.stopPropagation()
						if (key === "c") {
							void finish()
						} else {
							cancel()
						}
						return
					}
				}
				// Only the editor's accepted prefix can arm capture. A native handler may
				// still consume this first C-c after React capture, before CodeMirror.
			}}
		>
			<header className="mb-2 font-medium">Capture · {template.label} · Scratch Org buffer</header>
			<label className="flex gap-2">
				Target file
				<input
					aria-label="Capture target file"
					value={target}
					readOnly={pending || retired || props.controller.isLoading}
					onChange={(event) => update(draft, event.target.value)}
				/>
			</label>
			<div ref={scratch} className="max-h-[40vh] overflow-auto">
				<OrgEditor
					sessionKey={`org-capture:${session.id}`}
					value={draft}
					initialCursor={template.initialCursor}
					onCommandTarget={focusScratch}
					onPrefixChange={(next) => {
						prefix.current =
							current() &&
							!session.pending &&
							!session.retired &&
							!latest.current.controller.isLoading &&
							!latest.current.controller.isSaving &&
							!composing.current &&
							next?.label === "C-c"
					}}
					onChange={(value) => update(value, target)}
					onSave={() => {
						void finish()
					}}
					readOnly={pending || retired || props.controller.isLoading}
					ariaLabel="Capture Org draft"
				/>
			</div>
			{error && <p role="alert">{error}</p>}
			{!pending && props.controller.isSaving && (
				<output className="block">
					Workspace is busy saving; capture has not started. You can cancel.
				</output>
			)}
			{pending && (
				<output className="block">
					{session.closing
						? "Restoring capture origin…"
						: "Finishing capture… Cancellation is unavailable while the write is pending."}
				</output>
			)}
			<footer className="flex gap-3 text-xs">
				{!retired && (
					<button
						type="button"
						disabled={pending || props.controller.isSaving || props.controller.isLoading}
						onClick={() => {
							void finish()
						}}
					>
						Finish
					</button>
				)}
				<button
					type="button"
					disabled={pending || props.controller.isLoading}
					onClick={() => {
						void cancel()
					}}
				>
					{retired ? "Dismiss (no rollback)" : "Cancel"}
				</button>
				<span>C-c C-c / Mod-S finish · C-c C-k / C-g cancel</span>
			</footer>
		</section>
	)
}
