import * as E from "fp-ts/Either"
import { memo, useEffect, useRef, useState } from "react"
import { loadOrgBacklinksFlow, type OrgBacklink } from "@/flows/org-workspace"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { OrgBacklinksView } from "./org-backlinks.view.fn"

export const ORG_BACKLINKS_DEBOUNCE_MS = 200

export const OrgBacklinksContainer = memo(function OrgBacklinksContainer({
	controller,
}: {
	readonly controller: OrgWorkspaceController
}) {
	const [backlinks, setBacklinks] = useState<readonly OrgBacklink[]>([])
	const [error, setError] = useState<string | null>(null)
	const [isExpanded, setExpanded] = useState(false)
	const [isLoading, setLoading] = useState(false)
	const generationRef = useRef(0)
	const workspace = controller.workspace
	const activeDocument = controller.activeDocument
	const content = controller.content

	useEffect(() => {
		const generation = ++generationRef.current
		if (!workspace || !activeDocument) {
			setBacklinks([])
			setError(null)
			setLoading(false)
			return
		}

		let disposed = false
		setLoading(true)
		setError(null)
		const timer = window.setTimeout(() => {
			void loadOrgBacklinksFlow(workspace, activeDocument.relativePath, content)().then(
				(result) => {
					if (disposed || generation !== generationRef.current) {
						return
					}
					setLoading(false)
					if (E.isLeft(result)) {
						setBacklinks([])
						setError(result.left.message)
						return
					}
					setBacklinks(result.right)
				},
			)
		}, ORG_BACKLINKS_DEBOUNCE_MS)

		return () => {
			disposed = true
			window.clearTimeout(timer)
		}
	}, [activeDocument, content, workspace])

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
