import { FileText, Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { OrgDocumentEntryInterface } from "@/types/org"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/views/ui/dialog"

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
}: {
	readonly documents: readonly OrgDocumentEntryInterface[]
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly onSelect: (
		document: OrgDocumentEntryInterface,
	) => boolean | undefined | Promise<boolean | undefined>
}) => {
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

	useEffect(() => {
		if (open) {
			setQuery("")
			setSelectedIndex(0)
		}
	}, [open])
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

	const select = async (document: OrgDocumentEntryInterface | undefined) => {
		if (!document) {
			return
		}
		const opened = await onSelect(document)
		if (opened !== false) {
			onOpenChange(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="top-[22%] max-h-[420px] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-[560px]">
				<DialogHeader className="sr-only">
					<DialogTitle>Quick open</DialogTitle>
					<DialogDescription>Search notes in the current workspace.</DialogDescription>
				</DialogHeader>
				<label
					className="flex h-12 items-center gap-3 border-b px-4"
					htmlFor="org-quick-open-input"
				>
					<Search className="size-4 text-muted-foreground" />
					<input
						id="org-quick-open-input"
						autoFocus
						role="combobox"
						aria-autocomplete="list"
						aria-controls="org-quick-open-results"
						aria-expanded="true"
						aria-activedescendant={
							results[selectedIndex] ? `org-quick-open-${selectedIndex}` : undefined
						}
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "ArrowDown") {
								event.preventDefault()
								setSelectedIndex((current) => Math.min(current + 1, results.length - 1))
							} else if (event.key === "ArrowUp") {
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
				<div className="max-h-[360px] overflow-auto p-1.5">
					<div id="org-quick-open-results" role="listbox" className="space-y-px">
						{results.length > 0 ? (
							results.map((document, index) => (
								<div key={document.relativePath}>
									<button
										ref={(node) => {
											optionRefs.current[index] = node
										}}
										id={`org-quick-open-${index}`}
										role="option"
										aria-selected={index === selectedIndex}
										type="button"
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
			</DialogContent>
		</Dialog>
	)
}
