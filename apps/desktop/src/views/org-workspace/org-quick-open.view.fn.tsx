import { FileText, Search } from "lucide-react"
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { OrgDocumentEntryInterface } from "@/types/org"

const fuzzyScore = (value: string, query: string): number | null => {
	const lower = value.toLocaleLowerCase()
	const basename =
		lower
			.split("/")
			.at(-1)
			?.replace(/\.org$/i, "") ?? lower
	if (basename === query) {
		return 0
	}
	if (basename.startsWith(query)) {
		return 10 + basename.length - query.length
	}
	const basenameIndex = basename.indexOf(query)
	if (basenameIndex >= 0) {
		return 100 + basenameIndex
	}
	const pathIndex = lower.indexOf(query)
	if (pathIndex >= 0) {
		return 200 + pathIndex
	}
	let cursor = 0
	let gap = 0
	for (const character of query) {
		const match = lower.indexOf(character, cursor)
		if (match < 0) {
			return null
		}
		gap += match - cursor
		cursor = match + 1
	}
	return 300 + gap
}

export const OrgQuickOpen = ({
	documents,
	open,
	onOpenChange,
	onSelect,
	sessionKey,
}: {
	readonly documents: readonly OrgDocumentEntryInterface[]
	readonly sessionKey?: string
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly onSelect: (
		document: OrgDocumentEntryInterface,
		signal?: AbortSignal,
	) => boolean | undefined | Promise<boolean | undefined>
}) => {
	const id = useId()
	const inputRef = useRef<HTMLInputElement>(null)
	const previousFocus = useRef<HTMLElement | null>(null)
	const session = useRef<object | null>(null)
	const inFlight = useRef<object | null>(null)
	const abortRef = useRef<AbortController | null>(null)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [query, setQuery] = useState("")
	const [selectedIndex, setSelectedIndex] = useState(0)
	const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
	const results = useMemo(() => {
		const normalized = query.trim().toLocaleLowerCase()
		if (!normalized) {
			return documents.slice(0, 30)
		}
		return documents
			.map((document) => ({ document, score: fuzzyScore(document.relativePath, normalized) }))
			.filter(
				(result): result is { document: OrgDocumentEntryInterface; score: number } =>
					result.score !== null,
			)
			.sort(
				(left, right) =>
					left.score - right.score ||
					left.document.relativePath.localeCompare(right.document.relativePath),
			)
			.slice(0, 30)
			.map(({ document }) => document)
	}, [documents, query])

	useLayoutEffect(() => {
		abortRef.current?.abort()
		abortRef.current = null
		session.current = open ? {} : null
		inFlight.current = null
		setBusy(false)
		setError(null)
		if (open) {
			setQuery("")
			setSelectedIndex(0)
			// Keep the original return target when switching roots while already focused.
			if (document.activeElement !== inputRef.current) {
				previousFocus.current =
					document.activeElement instanceof HTMLElement ? document.activeElement : null
			}
			inputRef.current?.focus()
		}
		return () => {
			abortRef.current?.abort()
			abortRef.current = null
			session.current = null
			inFlight.current = null
		}
	}, [open, sessionKey])
	// Query changes intentionally reset keyboard selection to the best-ranked result.
	// biome-ignore lint/correctness/useExhaustiveDependencies: query is the reset signal.
	useEffect(() => setSelectedIndex(0), [query])
	useEffect(() => {
		setSelectedIndex((current) => Math.min(current, Math.max(0, results.length - 1)))
	}, [results.length])
	useEffect(() => {
		const option = optionRefs.current[selectedIndex]
		if (typeof option?.scrollIntoView === "function") {
			option.scrollIntoView({ block: "nearest" })
		}
	}, [selectedIndex])

	const cancel = () => {
		if (!session.current) return
		abortRef.current?.abort()
		abortRef.current = null
		session.current = null
		inFlight.current = null
		setBusy(false)
		onOpenChange(false)
		previousFocus.current?.focus()
	}

	const select = async (document: OrgDocumentEntryInterface | undefined) => {
		const currentSession = session.current
		if (!document || !currentSession || inFlight.current) return
		const request = {}
		const abort = new AbortController()
		abortRef.current = abort
		inFlight.current = request
		setBusy(true)
		setError(null)
		try {
			const opened = await onSelect(document, abort.signal)
			if (session.current !== currentSession || inFlight.current !== request) return
			if (opened === false) {
				setError("Could not open note. Try again.")
			} else {
				session.current = null
				onOpenChange(false)
			}
		} catch {
			if (session.current === currentSession && inFlight.current === request) {
				setError("Could not open note. Try again.")
			}
		} finally {
			if (inFlight.current === request) {
				abortRef.current = null
				inFlight.current = null
				setBusy(false)
			}
		}
	}

	if (!open) return null

	return (
		<section
			aria-label="Quick open"
			data-org-parameter-input="true"
			className="flex flex-col overflow-hidden border-t bg-background"
		>
			<div className="max-h-[min(360px,35vh)] overflow-auto p-1.5">
				<div id={`${id}-results`} role="listbox" className="space-y-px">
					{results.length > 0 ? (
						results.map((document, index) => (
							<div key={document.relativePath}>
								<button
									ref={(node) => {
										optionRefs.current[index] = node
									}}
									id={`${id}-option-${index}`}
									role="option"
									aria-selected={index === selectedIndex}
									type="button"
									tabIndex={-1}
									disabled={busy}
									onMouseDown={(event) => event.preventDefault()}
									className={`flex h-10 w-full items-center gap-2 rounded-md px-2 text-left transition-colors duration-150 ${index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"}`}
									onMouseEnter={() => setSelectedIndex(index)}
									onClick={() => void select(document)}
								>
									<FileText className="size-4 shrink-0 text-muted-foreground" />
									<span className="min-w-0 flex-1">
										<span className="block truncate text-sm">
											{document.relativePath
												.split("/")
												.at(-1)
												?.replace(/\.org$/i, "")}
										</span>
										{document.relativePath.includes("/") && (
											<span className="block truncate text-[11px] text-muted-foreground">
												{document.relativePath.slice(0, document.relativePath.lastIndexOf("/"))}
											</span>
										)}
									</span>
								</button>
							</div>
						))
					) : (
						<output className="block px-3 py-8 text-center text-sm text-muted-foreground">
							No matching notes.
						</output>
					)}
				</div>
			</div>
			{error && (
				<p id={`${id}-error`} role="alert" className="px-4 py-2 text-sm text-destructive">
					{error}
				</p>
			)}
			<label className="flex h-12 items-center gap-3 border-t px-4" htmlFor={`${id}-input`}>
				<Search className="size-4 text-muted-foreground" />
				<input
					id={`${id}-input`}
					ref={inputRef}
					role="combobox"
					aria-autocomplete="list"
					aria-controls={`${id}-results`}
					aria-expanded="true"
					aria-busy={busy}
					aria-describedby={error ? `${id}-error` : undefined}
					aria-activedescendant={
						results[selectedIndex] ? `${id}-option-${selectedIndex}` : undefined
					}
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					onKeyDown={(event) => {
						if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
						if (event.key === "Escape" || (event.ctrlKey && event.key.toLowerCase() === "g")) {
							event.preventDefault()
							event.stopPropagation()
							cancel()
						} else if (
							event.key === "ArrowDown" ||
							(event.ctrlKey && event.key.toLowerCase() === "n")
						) {
							event.preventDefault()
							setSelectedIndex((current) => Math.min(current + 1, Math.max(0, results.length - 1)))
						} else if (
							event.key === "ArrowUp" ||
							(event.ctrlKey && event.key.toLowerCase() === "p")
						) {
							event.preventDefault()
							setSelectedIndex((current) => Math.max(current - 1, 0))
						} else if (event.key === "Enter") {
							event.preventDefault()
							void select(results[selectedIndex])
						}
					}}
					placeholder="Open a note…"
					aria-label="Search workspace notes"
					className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
				/>
				<kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
					Esc
				</kbd>
			</label>
		</section>
	)
}
