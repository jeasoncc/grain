import { FileText, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import type { OrgDocumentEntryInterface } from "@/types/org"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/views/ui/dialog"

export const OrgQuickOpen = ({
	documents,
	open,
	onOpenChange,
	onSelect,
}: {
	readonly documents: readonly OrgDocumentEntryInterface[]
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly onSelect: (document: OrgDocumentEntryInterface) => boolean | void | Promise<boolean | void>
}) => {
	const [query, setQuery] = useState("")
	const [selectedIndex, setSelectedIndex] = useState(0)
	const results = useMemo(() => {
		const normalized = query.trim().toLocaleLowerCase()
		return (normalized
			? documents.filter((document) => document.relativePath.toLocaleLowerCase().includes(normalized))
			: documents
		).slice(0, 30)
	}, [documents, query])

	useEffect(() => {
		if (open) {
			setQuery("")
			setSelectedIndex(0)
		}
	}, [open])
	useEffect(() => setSelectedIndex(0), [query])

	const select = async (document: OrgDocumentEntryInterface | undefined) => {
		if (!document) return
		const opened = await onSelect(document)
		if (opened !== false) onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
				<DialogHeader className="sr-only">
					<DialogTitle>Quick open</DialogTitle>
					<DialogDescription>Search notes in the current workspace.</DialogDescription>
				</DialogHeader>
				<label className="flex h-12 items-center gap-3 border-b px-4">
					<Search className="size-4 text-muted-foreground" />
					<input
						autoFocus
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
					<kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Esc</kbd>
				</label>
				<div className="max-h-80 overflow-auto p-2">
					{results.length > 0 ? (
						<ul className="space-y-px">
							{results.map((document, index) => (
								<li key={document.relativePath}>
									<button type="button" className={`flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm ${index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"}`} onMouseEnter={() => setSelectedIndex(index)} onClick={() => void select(document)}>
										<FileText className="size-4 shrink-0 text-muted-foreground" />
										<span className="min-w-0 flex-1 truncate">{document.relativePath.replace(/\.org$/i, "")}</span>
									</button>
								</li>
							))}
						</ul>
					) : <p className="px-3 py-8 text-center text-sm text-muted-foreground">No matching notes.</p>}
				</div>
			</DialogContent>
		</Dialog>
	)
}
