import { Archive, FileText, Send } from "lucide-react"
import { memo, useState } from "react"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { OrgEditor } from "@/views/org-editor"
import { Button } from "@/views/ui/button"
import { OrgConfirmDialog, OrgInputDialog } from "./org-action-dialog.view.fn"
import { OrgBacklinksContainer } from "./org-backlinks.container.fn"

export const OrgDocumentPane = memo(function OrgDocumentPane({
	controller,
	isBusy,
}: {
	readonly controller: OrgWorkspaceController
	readonly isBusy: boolean
}) {
	const [cursor, setCursor] = useState(0)
	const [refilePosition, setRefilePosition] = useState<number | null>(null)
	const [archivePosition, setArchivePosition] = useState<number | null>(null)

	return (
		<main className="flex min-h-0 min-w-0 flex-1 flex-col">
			{controller.activeDocument ? (
				<>
					<div className="flex h-9 shrink-0 items-center gap-1 border-b px-3">
						<span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
							{controller.activeDocument.relativePath}
						</span>
						<Button
							variant="ghost"
							size="icon"
							disabled={isBusy || controller.isDirty}
							title="Refile subtree at cursor (Mod-Shift-R); save first if dirty"
							aria-label="Refile subtree"
							onClick={() => setRefilePosition(cursor)}
						>
							<Send className="size-3.5" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							disabled={isBusy || controller.isDirty}
							title="Archive subtree at cursor (Mod-Alt-A); save first if dirty"
							aria-label="Archive subtree"
							onClick={() => setArchivePosition(cursor)}
						>
							<Archive className="size-3.5" />
						</Button>
					</div>
					<div className="min-h-0 flex-1">
						<OrgEditor
							key={controller.activeDocument.relativePath}
							ariaLabel={`Editing ${controller.activeDocument.relativePath}`}
							documentPath={controller.activeDocument.relativePath}
							value={controller.content}
							onChange={controller.updateContent}
							onOpenOrgLink={(target) => void controller.openOrgLink(target)}
							onCursorChange={setCursor}
							onRefileSubtree={setRefilePosition}
							onArchiveSubtree={setArchivePosition}
							onSave={() => void controller.saveDocument()}
							readOnly={isBusy}
							revealTarget={
								controller.revealTarget?.relativePath === controller.activeDocument.relativePath
									? controller.revealTarget
									: null
							}
						/>
					</div>
					<OrgBacklinksContainer controller={controller} />
				</>
			) : (
				<div className="flex h-full items-center justify-center p-8">
					<div className="flex max-w-xs flex-col items-center text-center text-muted-foreground">
						<div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-muted/60">
							<FileText className="size-4" />
						</div>
						<p className="text-sm font-medium text-foreground">
							{controller.isLoading ? "Loading workspace…" : "No document selected"}
						</p>
						{!controller.isLoading && (
							<p className="mt-1 text-xs">Choose an .org file from the Files sidebar.</p>
						)}
					</div>
				</div>
			)}
			<OrgInputDialog
				open={refilePosition !== null}
				title="Refile subtree"
				description="Copy this subtree to another Org file, verify it, then remove the source copy."
				inputLabel="Target Org file"
				defaultValue="inbox.org"
				confirmLabel="Refile"
				onOpenChange={(open) => {
					if (!open) {
						setRefilePosition(null)
					}
				}}
				onSubmit={(target) => {
					if (refilePosition !== null) {
						void controller.refileSubtree(refilePosition, target)
					}
				}}
			/>
			<OrgConfirmDialog
				open={archivePosition !== null}
				title="Archive subtree?"
				description="Move this subtree to the sibling archive file after verifying the target copy."
				confirmLabel="Archive"
				onOpenChange={(open) => {
					if (!open) {
						setArchivePosition(null)
					}
				}}
				onConfirm={() => {
					if (archivePosition !== null) {
						void controller.archiveSubtree(archivePosition)
					}
				}}
			/>
		</main>
	)
})
