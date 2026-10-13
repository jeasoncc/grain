import type React from "react"
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/views/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/views/ui/dialog"

export interface ConfirmOptions {
	title?: string
	description?: string
	confirmText?: string
	cancelText?: string
	readonly signal?: AbortSignal
}

interface ConfirmContextValue {
	confirm: (options: ConfirmOptions) => Promise<boolean>
}

interface PendingConfirmation {
	readonly options: ConfirmOptions
	readonly origin: HTMLElement | null
	readonly selection: {
		readonly anchor: Node
		readonly anchorOffset: number
		readonly anchorValue: string | null
		readonly focus: Node
		readonly focusOffset: number
		readonly focusValue: string | null
	} | null
	accepted: boolean
	readonly resolve: (value: boolean) => void
	readonly onAbort: () => void
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
	const active = useRef(true)
	const pending = useRef<PendingConfirmation | null>(null)
	const closed = useRef<PendingConfirmation | null>(null)
	const [request, setRequest] = useState<PendingConfirmation | null>(null)

	const settle = useCallback((current: PendingConfirmation, accepted: boolean) => {
		if (pending.current !== current) {
			return
		}
		pending.current = null
		current.accepted = accepted
		closed.current = current
		current.options.signal?.removeEventListener("abort", current.onAbort)
		current.resolve(accepted)
		if (active.current) {
			setRequest(null)
		}
	}, [])

	const confirm = useCallback(
		(options: ConfirmOptions) => {
			if (!active.current || pending.current || options.signal?.aborted) {
				return Promise.resolve(false)
			}
			const { promise, resolve } = Promise.withResolvers<boolean>()
			const focused = document.activeElement
			const origin = focused instanceof HTMLElement
				? focused.closest('[data-org-confirm-dialog]') ? closed.current?.origin ?? null : focused
				: null
			const selection = document.getSelection()
			const anchor = selection?.anchorNode
			const focus = selection?.focusNode
			const savedSelection = focused?.closest("[data-org-confirm-dialog]") ? closed.current?.selection ?? null
				: anchor && focus ? {
					anchor, anchorOffset: selection!.anchorOffset, anchorValue: anchor.nodeValue,
					focus, focusOffset: selection!.focusOffset, focusValue: focus.nodeValue,
				} : null
			const current: PendingConfirmation = {
				onAbort: () => settle(current, false),
				options,
				origin,
				selection: savedSelection,
				accepted: false,
				resolve,
			}
			pending.current = current
			options.signal?.addEventListener("abort", current.onAbort, { once: true })
			setRequest(current)
			return promise
		},
		[settle],
	)

	useLayoutEffect(() => {
		active.current = true
		return () => {
			active.current = false
			if (pending.current) {
				settle(pending.current, false)
			}
		}
	}, [settle])

	const value = useMemo(() => ({ confirm }), [confirm])

	return (
		<ConfirmContext.Provider value={value}>
			{children}
			<Dialog
				open={request !== null}
				onOpenChange={(open) => !open && request && settle(request, false)}
			>
				<DialogContent data-org-confirm-dialog="" onCloseAutoFocus={(event) => {
					event.preventDefault()
					const previous = closed.current
					closed.current = null
					if (!previous || pending.current || !active.current || previous.options.signal?.aborted ||
						!previous.origin?.isConnected) return
					const focused = document.activeElement
					if (focused && focused !== document.body && !focused.closest('[data-org-confirm-dialog]')) return
					previous.origin.focus({ preventScroll: true })
					const saved = previous.selection
					if (!previous.accepted && saved?.anchor.isConnected && saved.focus.isConnected &&
						saved.anchor.nodeValue === saved.anchorValue && saved.focus.nodeValue === saved.focusValue &&
						saved.anchorOffset <= (saved.anchorValue?.length ?? saved.anchor.childNodes.length) &&
						saved.focusOffset <= (saved.focusValue?.length ?? saved.focus.childNodes.length))
						document.getSelection()?.setBaseAndExtent(saved.anchor, saved.anchorOffset, saved.focus, saved.focusOffset)
				}}>
					<DialogHeader>
						<DialogTitle>{request?.options.title ?? "请确认"}</DialogTitle>
						{request?.options.description ? (
							<DialogDescription>{request.options.description}</DialogDescription>
						) : null}
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => request && settle(request, false)}
						>
							{request?.options.cancelText ?? "取消"}
						</Button>
						<Button
							variant="destructive"
							onClick={() => request && settle(request, true)}
						>
							{request?.options.confirmText ?? "确认"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</ConfirmContext.Provider>
	)
}

export function useConfirm() {
	const ctx = useContext(ConfirmContext)
	if (!ctx) {
		throw new Error("useConfirm must be used within ConfirmProvider")
	}
	return ctx.confirm
}
