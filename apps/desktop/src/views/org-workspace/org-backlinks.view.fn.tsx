import { ChevronDown, ChevronRight, Link2 } from "lucide-react"
import { memo } from "react"
import type { OrgBacklink } from "@/flows/org-workspace"

export interface OrgBacklinksViewProps {
	readonly backlinks: readonly OrgBacklink[]
	readonly error: string | null
	readonly isExpanded: boolean
	readonly isLoading: boolean
	readonly onOpenBacklink: (backlink: OrgBacklink) => void
	readonly onToggle: () => void
}

const sourceName = (backlink: OrgBacklink): string =>
	backlink.sourceHeading ??
	backlink.sourceTitle ??
	backlink.sourceRelativePath.split("/").at(-1) ??
	"Untitled"

const kindLabel = (kind: OrgBacklink["targetKind"]): string => {
	if (kind === "custom-id") {
		return "custom ID"
	}
	return kind
}

export const OrgBacklinksView = memo(function OrgBacklinksView({
	backlinks,
	error,
	isExpanded,
	isLoading,
	onOpenBacklink,
	onToggle,
}: OrgBacklinksViewProps) {
	return (
		<section className="shrink-0 border-t bg-background" aria-label="Backlinks">
			<button
				type="button"
				className="flex h-9 w-full items-center gap-2 px-3 text-left text-sm hover:bg-muted/60"
				aria-expanded={isExpanded}
				onClick={onToggle}
			>
				{isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
				<Link2 className="size-4 text-muted-foreground" />
				<span className="font-medium">Backlinks</span>
				<span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
					{backlinks.length}
				</span>
				{isLoading && <span className="ml-auto text-xs text-muted-foreground">Loading…</span>}
			</button>

			{isExpanded && (
				<div className="max-h-48 overflow-auto border-t px-2 py-2">
					{error ? (
						<p role="alert" className="px-2 py-1 text-xs text-destructive">
							{error}
						</p>
					) : backlinks.length === 0 ? (
						<p className="px-2 py-1 text-xs text-muted-foreground">
							{isLoading ? "Loading backlinks…" : "No backlinks to this document."}
						</p>
					) : (
						<ul className="space-y-1">
							{backlinks.map((backlink) => (
								<li
									key={`${backlink.sourceRelativePath}:${backlink.line}:${backlink.column}:${backlink.targetKind}:${backlink.label}`}
								>
									<button
										type="button"
										className="flex w-full min-w-0 items-center gap-3 rounded px-2 py-1.5 text-left hover:bg-muted"
										onClick={() => onOpenBacklink(backlink)}
									>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm font-medium">
												{sourceName(backlink)}
											</span>
											<span className="block truncate text-xs text-muted-foreground">
												{backlink.sourceRelativePath}:{backlink.line}
											</span>
										</span>
										<span className="max-w-48 shrink-0 truncate text-xs text-muted-foreground">
											{kindLabel(backlink.targetKind)} · {backlink.label}
										</span>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			)}
		</section>
	)
})
