import { memo, useState } from "react"
import { useOrgBacklinks } from "@/hooks/use-org-backlinks"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { OrgBacklinksView } from "./org-backlinks.view.fn"

export const OrgBacklinksContainer = memo(function OrgBacklinksContainer({
	controller,
}: {
	readonly controller: OrgWorkspaceController
}) {
	const { backlinks, error, isLoading } = useOrgBacklinks(controller)
	const [isExpanded, setExpanded] = useState(false)
	const workspace = controller.workspace
	const activeDocument = controller.activeDocument

	if (!workspace || !activeDocument) {
		return null
	}

	return (
		<OrgBacklinksView
			backlinks={backlinks}
			error={error}
			isExpanded={isExpanded}
			isLoading={isLoading}
			onOpenBacklink={(backlink) => {
				void controller.openDocumentAt(backlink.sourceRelativePath, backlink.line)
			}}
			onToggle={() => setExpanded((current) => !current)}
		/>
	)
})
