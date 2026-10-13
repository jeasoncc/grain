import { useMemo } from "react"
import type { OrgDocumentEntryInterface } from "@/types/org"
import { useOrgNavigationParameter } from "@/hooks/use-org-navigation-parameter"

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
	useOrgNavigationParameter({
		...props, candidates, label: "Quick open", inputLabel: "Search workspace notes",
		emptyMessage: "No matching notes.", errorMessage: "Could not open note. Try again.",
	})
	return null
}
