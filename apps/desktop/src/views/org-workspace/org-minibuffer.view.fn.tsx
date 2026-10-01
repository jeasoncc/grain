import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react"

import type { OrgMinibufferSession } from "@/types/editor/minibuffer.interface"
export type { OrgMinibufferSession } from "@/types/editor/minibuffer.interface"

/** Non-modal parameter session. The originating buffer owns all edits and IO. */
export const OrgMinibuffer = ({
	session,
	onFocusTarget,
}: {
	readonly session: OrgMinibufferSession | null
	readonly onFocusTarget?: (focus: (() => void) | null) => void
}) => {
	const inputRef = useRef<HTMLInputElement>(null)
	const composingRef = useRef(false)
	const [input, setInput] = useState("")
	const [selected, setSelected] = useState(0)
	const [caret, setCaret] = useState(0)
	const pendingCaretRef = useRef<number | null>(null)
	const [selectionRequest, setSelectionRequest] = useState(0)
	const historyDraftRef = useRef("")
	const [error, setError] = useState<string | null>(null)
	const historyRef = useRef<string[]>([])
	const historiesRef = useRef(new Map<string, string[]>())
	const historyIndexRef = useRef(-1)
	const id = useId()
	const wholeValue = session?.completion === "value"
	const tokenFrom = wholeValue
		? 0
		: caret - (input.slice(0, caret).match(/[^\s,:]*$/)?.[0].length ?? 0)
	const tokenTo = wholeValue
		? input.length
		: caret + (input.slice(caret).match(/^[^\s,:]*/)?.[0].length ?? 0)
	const token = wholeValue ? input.trim() : input.slice(tokenFrom, caret)
	const candidates = useMemo(() => {
		const used = new Set(`${input.slice(0, tokenFrom)} ${input.slice(tokenTo)}`.split(/[\s,:]+/))
		return (session?.candidates ?? [])
			.filter(
				(candidate) =>
					!used.has(candidate) && candidate.toLocaleLowerCase().includes(token.toLocaleLowerCase()),
			)
			.slice(0, 30)
	}, [session?.candidates, input, token, tokenFrom, tokenTo])

	useEffect(() => {
		if (!session) return
		setInput(session.initialInput)
		setCaret(session.initialInput.length)
		pendingCaretRef.current = session.initialInput.length
		setSelectionRequest((current) => current + 1)
		setSelected(0)
		setError(null)
		historyIndexRef.current = -1
		historyRef.current = historiesRef.current.get(session.historyKey ?? session.prompt) ?? []
		composingRef.current = false
		inputRef.current?.focus()
	}, [session?.id])
	useEffect(() => {
		setSelected(0)
	}, [candidates])
	useLayoutEffect(() => {
		if (pendingCaretRef.current !== null) {
			inputRef.current?.setSelectionRange(pendingCaretRef.current, pendingCaretRef.current)
			pendingCaretRef.current = null
		}
	}, [input, selectionRequest])
	useEffect(() => {
		const element = document.getElementById(`${id}-candidate-${selected}`)
		if (typeof element?.scrollIntoView === "function") element.scrollIntoView({ block: "nearest" })
	}, [id, selected])

	if (!session) return null
	const complete = (candidate: string | undefined) => {
		if (!candidate) return
		const suffix = input.slice(tokenTo)
		const separator = wholeValue || (suffix && /^[\s,:]/.test(suffix)) ? "" : " "
		setInput(input.slice(0, tokenFrom) + candidate + separator + suffix)
		const nextCaret = tokenFrom + candidate.length + separator.length
		setCaret(nextCaret)
		pendingCaretRef.current = nextCaret
		setSelectionRequest((current) => current + 1)
		setError(null)
		inputRef.current?.focus()
	}
	const accept = () => {
		const value =
			session.acceptCandidate && !session.candidates.includes(input)
				? (candidates[selected] ?? input)
				: input
		const result = session.onAccept(value)
		if (!result.ok) {
			setError(result.message)
			return
		}
		if (value.trim()) {
			historyRef.current = [value, ...historyRef.current.filter((entry) => entry !== value)].slice(
				0,
				50,
			)
			historiesRef.current.set(session.historyKey ?? session.prompt, historyRef.current)
		}
	}

	return (
		<section
			aria-label="Minibuffer"
			data-org-parameter-input="true"
			className="shrink-0 border-t border-border bg-background shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.4)]"
		>
			<div
				id={`${id}-results`}
				role="listbox"
				aria-label={`${session.prompt.replace(/:$/, "")} completions`}
				className="max-h-[min(12rem,30vh)] overflow-auto px-2 py-1"
			>
				{candidates.map((candidate, index) => (
					<button
						key={candidate}
						id={`${id}-candidate-${index}`}
						type="button"
						role="option"
						aria-selected={index === selected}
						tabIndex={-1}
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => complete(candidate)}
						className={`flex h-7 w-full items-center rounded px-2 text-left font-mono text-xs ${index === selected ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}
					>
						{candidate}
					</button>
				))}
			</div>
			<div className="flex min-h-9 items-center gap-2 border-t border-border/50 px-3 font-mono text-xs">
				<label htmlFor={`${id}-input`} className="shrink-0 font-medium text-primary">
					{session.prompt}
				</label>
				<input
					ref={(node) => {
						inputRef.current = node
						onFocusTarget?.(node ? () => node.focus() : null)
					}}
					id={`${id}-input`}
					role="combobox"
					aria-controls={`${id}-results`}
					aria-expanded={candidates.length > 0}
					aria-autocomplete="list"
					aria-activedescendant={candidates[selected] ? `${id}-candidate-${selected}` : undefined}
					aria-invalid={Boolean(error)}
					aria-describedby={error ? `${id}-error` : `${id}-help`}
					value={input}
					onCompositionStart={() => {
						composingRef.current = true
					}}
					onCompositionEnd={() => {
						composingRef.current = false
					}}
					onSelect={(event) => setCaret(event.currentTarget.selectionStart ?? input.length)}
					onChange={(event) => {
						setInput(event.target.value)
						setCaret(event.target.selectionStart ?? event.target.value.length)
						setError(null)
					}}
					onKeyDown={(event) => {
						event.stopPropagation()
						if (composingRef.current || event.nativeEvent.isComposing || event.keyCode === 229)
							return
						const key = event.key.toLowerCase()
						if (key === "escape" || (event.ctrlKey && key === "g")) {
							event.preventDefault()
							session.onCancel()
						} else if (key === "enter") {
							event.preventDefault()
							accept()
						} else if (key === "tab" && !event.shiftKey && candidates[selected]) {
							event.preventDefault()
							complete(candidates[selected])
						} else if (key === "arrowdown" || (event.ctrlKey && key === "n")) {
							event.preventDefault()
							setSelected((current) => Math.min(current + 1, Math.max(0, candidates.length - 1)))
						} else if (key === "arrowup" || (event.ctrlKey && key === "p")) {
							event.preventDefault()
							setSelected((current) => Math.max(current - 1, 0))
						} else if (event.altKey && (key === "p" || key === "n")) {
							event.preventDefault()
							if (!historyRef.current.length) return
							if (historyIndexRef.current === -1) historyDraftRef.current = input
							const next = Math.max(
								-1,
								Math.min(
									historyRef.current.length - 1,
									historyIndexRef.current + (key === "p" ? 1 : -1),
								),
							)
							historyIndexRef.current = next
							const value = next < 0 ? historyDraftRef.current : historyRef.current[next]
							setInput(value)
							setCaret(value.length)
							pendingCaretRef.current = value.length
							setSelectionRequest((current) => current + 1)
						}
					}}
					className="min-w-0 flex-1 bg-transparent py-2 text-foreground outline-none"
				/>
				<button
					type="button"
					onClick={session.onCancel}
					className="rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
					aria-label="Cancel minibuffer"
				>
					C-g
				</button>
			</div>
			{error ? (
				<p id={`${id}-error`} role="alert" className="px-3 pb-2 text-xs text-destructive">
					{error}
				</p>
			) : (
				<p id={`${id}-help`} className="px-3 pb-1 text-[10px] text-muted-foreground">
					RET accept · TAB complete · C-n/C-p select · M-p/M-n history · C-g/Esc cancel
				</p>
			)}
		</section>
	)
}
