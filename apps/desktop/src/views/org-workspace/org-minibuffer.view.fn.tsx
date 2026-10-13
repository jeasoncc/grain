import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react"
import { OrgCalendarReader } from "./org-calendar-reader.view.fn"
import { isOrgRepeatedKeyEvent, retainOrgInputKeys } from "@/flows/org-command/org-prefix-keymap"

import { matchOrgCompletionTerms, scoreOrgCompletionTerms } from "@/pipes/org-completion.pipe"
import type {
	OrgMinibufferCandidate,
	OrgMinibufferAcceptResult,
	OrgMinibufferSession,
} from "@/types/editor/minibuffer.interface"
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
	const calendarKeyRef = useRef<((event: KeyboardEvent) => boolean) | null>(null)
	const setCalendarKey = useCallback((handler: ((event: KeyboardEvent) => boolean) | null) => { calendarKeyRef.current = handler }, [])
	const generationRef = useRef<{
		session: OrgMinibufferSession
		id: number
		cancelled: boolean
	} | null>(null)
	const acceptingRef = useRef(false)
	const [accepting, setAccepting] = useState(false)
	const [input, setInput] = useState("")
	const [selected, setSelected] = useState(0)
	const selectedValueRef = useRef<string | null>(null)
	const [caret, setCaret] = useState(0)
	const pendingCaretRef = useRef<number | null>(null)
	const [selectionRequest, setSelectionRequest] = useState(0)
	const historyDraftRef = useRef("")
	const [error, setError] = useState<string | null>(null)
	const historyRef = useRef<string[]>([])
	const historiesRef = useRef(new Map<string, string[]>())
	const historyIndexRef = useRef(-1)
	const id = useId()
	useLayoutEffect(() => retainOrgInputKeys(window), [])
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
		const entries: readonly OrgMinibufferCandidate[] =
			session?.annotatedCandidates ??
			(session?.candidates ?? []).map((value) => ({ value, label: value }))
		if (session?.matchingMode === "path") {
			if (!token.trim()) return entries.slice(0, 30)
			return entries.map((candidate) => {
				const path = candidate.path ?? candidate.value
				const pathScore = scoreOrgCompletionTerms(token, path)
				const displayScore = scoreOrgCompletionTerms(token, candidate.searchText ?? [path, candidate.label, candidate.detail].filter(Boolean).join(" "))
				return { candidate, score: pathScore ?? (displayScore === null ? null : 1000 + displayScore) }
			}).filter((entry): entry is { candidate: OrgMinibufferCandidate; score: number } => entry.score !== null)
				.sort((left, right) => left.score - right.score || (left.candidate.path ?? left.candidate.value).localeCompare(right.candidate.path ?? right.candidate.value))
				.slice(0, 30).map((entry) => entry.candidate)
		}
		return entries
			.filter((candidate) => {
				const text =
					candidate.searchText ??
					[candidate.label, candidate.detail, candidate.shortcut, candidate.value]
						.filter(Boolean)
						.join(" ")
				return (
					!used.has(candidate.value) &&
					(session?.matchingMode === "multi-term"
						? matchOrgCompletionTerms(token, text)
						: candidate.label.toLocaleLowerCase().includes(token.toLocaleLowerCase()))
				)
			})
			.slice(0, 30)
	}, [
		session?.candidates,
		session?.annotatedCandidates,
		session?.matchingMode,
		input,
		token,
		tokenFrom,
		tokenTo,
	])

	useLayoutEffect(() => {
		generationRef.current = session ? { session, id: session.id, cancelled: false } : null
		acceptingRef.current = false
		setAccepting(false)
		if (!session) return
		setInput(session.initialInput)
		setCaret(session.initialInput.length)
		pendingCaretRef.current = session.initialInput.length
		setSelectionRequest((current) => current + 1)
		setSelected(0)
		selectedValueRef.current = null
		setError(null)
		historyIndexRef.current = -1
		historyRef.current = historiesRef.current.get(session.historyKey ?? session.prompt) ?? []
		composingRef.current = false
		inputRef.current?.focus()
		if (session.nativeInput?.selectValueOnOpen !== false && session.nativeInput) inputRef.current?.select()
		return () => {
			generationRef.current = null
			acceptingRef.current = false
		}
	}, [session?.id, session?.onAccept, session?.onCancel])
	useEffect(() => {
		const index = session?.annotatedCandidates
			? candidates.findIndex((candidate) => candidate.value === selectedValueRef.current)
			: -1
		const next = index < 0 ? 0 : index
		setSelected(next)
		selectedValueRef.current = candidates[next]?.value ?? null
	}, [candidates, session?.annotatedCandidates])
	const selectIndex = (index: number) => {
		setSelected(index)
		selectedValueRef.current = candidates[index]?.value ?? null
	}
	useLayoutEffect(() => {
		if (pendingCaretRef.current !== null) {
			if (session?.nativeInput?.selectValueOnOpen !== false && session?.nativeInput) {
				pendingCaretRef.current = null
				return
			}
			inputRef.current?.setSelectionRange(pendingCaretRef.current, pendingCaretRef.current)
			pendingCaretRef.current = null
		}
	}, [input, selectionRequest])
	useEffect(() => {
		const element = document.getElementById(`${id}-candidate-${selected}`)
		if (typeof element?.scrollIntoView === "function") element.scrollIntoView({ block: "nearest" })
	}, [id, selected])

	if (!session) return null
	const complete = (entry: OrgMinibufferCandidate | undefined) => {
		if (!entry || entry.unavailableReason || acceptingRef.current) return
		const candidate = session.matchingMode === "path" ? (entry.path ?? entry.label) : session.annotatedCandidates ? entry.label : entry.value
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
	const cancel = () => {
		const generation = generationRef.current
		if (!generation || generation.id !== session.id || generation.session.onCancel !== session.onCancel) return
		if (acceptingRef.current && session.cancelWhileAccepting === false) return
		if (generationRef.current) generationRef.current.cancelled = true
		generationRef.current = null
		acceptingRef.current = false
		setAccepting(false)
		session.onCancel()
	}
	const accept = (chosen?: OrgMinibufferCandidate, calendarValue?: string) => {
		const generation = generationRef.current
		if (acceptingRef.current || composingRef.current || !generation || generation.id !== session.id || generation.session.onAccept !== session.onAccept) return
		const entry = chosen ?? (session.annotatedCandidates
			? candidates[selected]
			: (candidates.find((candidate) => candidate.value === input) ?? candidates[selected]))
		if (
			session.acceptCandidate &&
			(entry?.unavailableReason || (session.annotatedCandidates && !entry))
		) {
			setError(entry?.unavailableReason ?? "Choose an available command.")
			return
		}
		acceptingRef.current = true
		const value = calendarValue ?? (session.acceptCandidate ? (entry?.value ?? input) : input)
		const historyValue = calendarValue ?? (session.annotatedCandidates ? input : value)
		const isCurrent = () => generationRef.current === generation && generation.id === session.id
		const finish = (result: OrgMinibufferAcceptResult) => {
			// A confirmed accept may retire its prompt before the async result is delivered.
			// Persist raw history by its captured key; never update a replacement prompt's UI.
			if (
				result.ok &&
				!generation.cancelled &&
				historyValue.trim() &&
				(isCurrent() || generationRef.current === null)
			) {
				const key = session.historyKey ?? session.prompt
				const history = [
					historyValue,
					...(historiesRef.current.get(key) ?? []).filter((entry) => entry !== historyValue),
				].slice(0, 50)
				historiesRef.current.set(key, history)
				if (isCurrent()) historyRef.current = history
			}
			if (!isCurrent()) return
			acceptingRef.current = false
			setAccepting(false)
			if (!result.ok) {
				setError(result.message)
				return
			}
			setError(null)
		}
		const fail = (reason: unknown) => {
			finish({ ok: false, message: reason instanceof Error ? reason.message : String(reason) })
		}
		try {
			const result = session.onAccept(value)
			if ("then" in result) {
				if (isCurrent()) setAccepting(true)
				void result.then(finish, fail)
			} else {
				finish(result)
			}
		} catch (reason) {
			fail(reason)
		}
	}

	return (
		<section
			aria-label="Minibuffer"
			aria-busy={accepting}
			data-org-parameter-input="true"
			data-org-parameter-session={session.id}
			className="shrink-0 border-t border-border bg-background shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.4)]"
		>
			{session.preview && <div className="max-h-[30vh] overflow-auto px-3 py-2">
				<p className="text-xs font-medium">{session.preview.title}</p>
				<p className="text-[10px] text-muted-foreground">{session.preview.detail}</p>
				<pre aria-label="Refile insertion preview" className="whitespace-pre font-mono text-xs">{session.preview.source}</pre>
			</div>}
			{session.calendar && <div className="max-h-[45vh] overflow-auto">
				<OrgCalendarReader value={input} context={session.calendar} showInput={false} disabled={accepting}
					onKeyHandler={setCalendarKey}
					onChange={(value) => { if (!acceptingRef.current && !composingRef.current) { setInput(value); setCaret(value.length); pendingCaretRef.current = value.length; setSelectionRequest((current) => current + 1); setError(null) } }}
					onAccept={(value) => accept(undefined, value)} onCancel={cancel} />
			</div>}
			<div
				id={`${id}-results`}
				role="listbox"
				aria-label={`${session.prompt.replace(/:$/, "")} completions`}
				className="max-h-[min(12rem,30vh)] overflow-auto px-2 py-1"
			>
				{candidates.map((candidate, index) => (
					<button
						key={candidate.value}
						id={`${id}-candidate-${index}`}
						type="button"
						role="option"
						aria-label={session.matchingMode === "path" ? candidate.label : undefined}
						aria-selected={index === selected}
						disabled={accepting}
						aria-disabled={Boolean(candidate.unavailableReason) || accepting}
						tabIndex={-1}
						onMouseDown={(event) => event.preventDefault()}
						onClick={(event) => { if (event.detail > 1) return; if (session.matchingMode === "path") accept(candidate); else complete(candidate) }}
						className={`flex h-7 w-full items-center rounded px-2 text-left font-mono text-xs ${index === selected ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}
					>
						<span className="flex-1">
							{candidate.label}
							{candidate.detail && (
								<span className="ml-2 text-muted-foreground">{candidate.detail}</span>
							)}
							{candidate.unavailableReason && (
								<span className="ml-2 text-muted-foreground">{candidate.unavailableReason}</span>
							)}
						</span>
						{candidate.shortcut && <kbd className="ml-2">{candidate.shortcut}</kbd>}
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
						session.nativeInput?.bind(node, setInput)
					}}
					id={`${id}-input`}
					role="combobox"
					aria-busy={accepting}
					aria-label={session.inputLabel}
					aria-controls={`${id}-results`}
					aria-expanded={candidates.length > 0}
					aria-autocomplete="list"
					aria-activedescendant={candidates[selected] ? `${id}-candidate-${selected}` : undefined}
					aria-invalid={Boolean(error)}
					aria-describedby={error ? `${id}-error` : `${id}-help`}
					value={input}
					readOnly={accepting}
					onCompositionStart={() => {
						composingRef.current = true
					}}
					onCompositionEnd={() => {
						composingRef.current = false
					}}
					onSelect={(event) => {
						if (!acceptingRef.current) setCaret(event.currentTarget.selectionStart ?? input.length)
					}}
					onInput={(event) => {
						if (!acceptingRef.current) session.nativeInput?.onInput(event.nativeEvent, event.currentTarget)
					}}
					onChange={(event) => {
						if (acceptingRef.current) return
						setInput(event.target.value)
						selectedValueRef.current = null
						setSelected(0)
						setCaret(event.target.selectionStart ?? event.target.value.length)
						setError(null)
					}}
					onKeyUp={(event) => {
						if (acceptingRef.current || event.defaultPrevented || event.nativeEvent.defaultPrevented || composingRef.current || event.nativeEvent.isComposing || event.keyCode === 229 || event.getModifierState("AltGraph")) return
						session.nativeInput?.onKeyUp(event.nativeEvent, event.currentTarget)
						if (session.nativeInput) setInput(event.currentTarget.value)
					}}
					onKeyDown={(event) => {
						event.stopPropagation()
						if (event.defaultPrevented || event.nativeEvent.defaultPrevented) return
						if (composingRef.current || event.nativeEvent.isComposing || event.keyCode === 229 || event.getModifierState("AltGraph"))
							return
						const key = event.key.toLowerCase()
						// A held press must not accept a second phase, including native Vim readers.
						if (key === "enter" && isOrgRepeatedKeyEvent(event.nativeEvent)) {
							event.preventDefault()
							return
						}
						if (acceptingRef.current && !(session.cancelWhileAccepting !== false && (key === "escape" || (event.ctrlKey && key === "g")))) {
							event.preventDefault()
							return
						}
						if (session.nativeInput) {
							const handled = session.nativeInput.onKeyDown(event.nativeEvent, event.currentTarget)
							setInput(event.currentTarget.value)
							if (handled || event.nativeEvent.defaultPrevented) return
							if (key !== "enter" && key !== "escape" && !(event.ctrlKey && key === "g")) return
						}
						if (key === "escape" || (event.ctrlKey && key === "g")) {
							event.preventDefault()
							cancel()
						} else if (acceptingRef.current) {
							event.preventDefault()
						} else if (calendarKeyRef.current?.(event.nativeEvent)) {
							event.preventDefault()
						} else if (key === "enter") {
							event.preventDefault()
							accept()
						} else if (key === "tab" && !event.shiftKey && candidates[selected]) {
							event.preventDefault()
							complete(candidates[selected])
						} else if (
							key === "arrowdown" ||
							(event.ctrlKey &&
								(key === "n" || (session.matchingMode === "multi-term" && key === "j")))
						) {
							event.preventDefault()
							selectIndex(Math.min(selected + 1, Math.max(0, candidates.length - 1)))
						} else if (
							key === "arrowup" ||
							(event.ctrlKey &&
								(key === "p" || (session.matchingMode === "multi-term" && key === "k")))
						) {
							event.preventDefault()
							selectIndex(Math.max(selected - 1, 0))
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
					onClick={(event) => {
						if (event.detail > 1) return
						accept()
					}}
					disabled={accepting}
					className="rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
					aria-label="Accept minibuffer"
				>
					RET
				</button>
				<button
					type="button"
					onClick={cancel}
					disabled={accepting && session.cancelWhileAccepting === false}
					className="rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
					aria-label="Cancel minibuffer"
				>
					C-g
				</button>
			</div>
			{!candidates.length && session.emptyMessage && <p role="status" className="px-3 pb-1 text-xs text-muted-foreground">{session.emptyMessage}</p>}
			{error ? (
				<p id={`${id}-error`} role="alert" className="px-3 pb-2 text-xs text-destructive">
					{error}
				</p>
			) : (
				<p id={`${id}-help`} className="px-3 pb-1 text-[10px] text-muted-foreground">
					RET accept · TAB complete · C-n/C-p
					{session.matchingMode === "multi-term" ? " / C-j/C-k" : ""} select · M-p/M-n history ·
					C-g/Esc cancel
				</p>
			)}
		</section>
	)
}
