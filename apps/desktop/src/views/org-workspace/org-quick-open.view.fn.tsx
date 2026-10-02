import { useMemo } from "react"
import type { OrgDocumentEntryInterface } from "@/types/org"
import { OrgNavigationPicker } from "./org-navigation-picker.view.fn"

export const OrgQuickOpen = ({
	documents,
	...props
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
	const candidates = useMemo(
		() =>
			documents.map((document) => ({
				id: document.relativePath,
				relativePath: document.relativePath,
				value: document,
			})),
		[documents],
	)
	return (
		<OrgNavigationPicker
			{...props}
			candidates={candidates}
			label="Quick open"
			inputLabel="Search workspace notes"
			placeholder="Open a note…"
			emptyMessage="No matching notes."
			errorMessage="Could not open note. Try again."
		/>
	)
}
