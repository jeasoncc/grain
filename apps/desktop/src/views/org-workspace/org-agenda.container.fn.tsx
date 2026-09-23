import * as E from "fp-ts/Either"
import { memo, useEffect, useState } from "react"
import { loadOrgAgendaFlow } from "@/flows/org-workspace"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import type { OrgAgendaEntry } from "@/pipes/org"
import { OrgAgendaView } from "./org-agenda.view.fn"

export const OrgAgendaContainer = memo(function OrgAgendaContainer({
	controller,
	onShowEditor,
}: {
	readonly controller: OrgWorkspaceController
	readonly onShowEditor: () => void
}) {
	const [entries, setEntries] = useState<readonly OrgAgendaEntry[]>([])
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setLoading] = useState(true)
	const workspace = controller.workspace

	useEffect(() => {
		let disposed = false
		if (!workspace) {
			setEntries([])
			setError(null)
			setLoading(false)
			return () => {
				disposed = true
			}
		}
		setLoading(true)
		setError(null)
		void loadOrgAgendaFlow(workspace)().then((result) => {
			if (disposed) {
				return
			}
			setLoading(false)
			if (E.isLeft(result)) {
				setEntries([])
				setError(result.left.message)
				return
			}
			setEntries(result.right)
		})
		return () => {
			disposed = true
		}
	}, [workspace])

	return (
		<OrgAgendaView
			entries={entries}
			error={error}
			isLoading={isLoading}
			onOpenEntry={(entry) => {
				void controller.openDocumentAt(entry.relativePath, entry.line).then((opened) => {
					if (opened) {
						onShowEditor()
					}
				})
			}}
		/>
	)
})
