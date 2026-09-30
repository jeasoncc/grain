import { Link } from "@tanstack/react-router"
import dayjs from "dayjs"
import {
	Database,
	DatabaseBackup,
	FolderOpen,
	MoreHorizontal,
	PanelLeftOpen,
	RotateCcw,
	ShieldCheck,
	Trash2,
} from "lucide-react"
import { memo, useCallback, useEffect, useState } from "react"
import { Group, Panel, Separator } from "react-resizable-panels"
import { type OrgWorkspaceController, useOrgWorkspace } from "@/hooks/use-org-workspace"
import { useAllWorkspaces } from "@/hooks/use-workspace"
import { listenForOrgDiaryCreation } from "@/io/event"
import type { WorkspaceInterface } from "@/types/workspace"
import { Button } from "@/views/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/views/ui/dropdown-menu"
import { OrgCaptureDialog } from "./org-action-dialog.view.fn"
import { OrgAgendaContainer } from "./org-agenda.container.fn"
import { OrgDocumentPane } from "./org-document-pane.view.fn"
import { OrgWorkspaceSidebar } from "./org-workspace-sidebar.view.fn"

export interface OrgTodoCapturePromptResult {
	readonly targetRelativePath: string
	readonly title: string
}

export const promptOrgTodoCapture = (): OrgTodoCapturePromptResult | null => {
	const title = window.prompt("TODO title:")
	if (!title?.trim()) {
		return null
	}
	const target = window.prompt("Target Org file (relative to workspace):", "inbox.org")
	if (target === null) {
		return null
	}
	return { targetRelativePath: target.trim() || "inbox.org", title }
}

export const createOrgDiaryFromController = async (
	controller: OrgWorkspaceController,
	date: Date = new Date(),
): Promise<"created" | "opened" | "no-workspace"> => {
	const currentWorkspace = controller.workspace
	if (!currentWorkspace) {
		return "no-workspace"
	}
	const relativePath = `diary/${dayjs(date).format("YYYY-MM-DD")}.org`
	const existing = currentWorkspace.documents.find(
		(document) => document.relativePath === relativePath,
	)
	if (existing) {
		await controller.openDocument(existing)
		return "opened"
	}
	if (!currentWorkspace.directories.includes("diary")) {
		await controller.createDirectory("diary")
	}
	await controller.createDocument(relativePath)
	return "created"
}

const selectLegacyWorkspace = (
	workspaces: readonly WorkspaceInterface[],
): WorkspaceInterface | null => {
	if (workspaces.length === 0) {
		window.alert("No legacy SQLite workspaces are available.")
		return null
	}
	const choices = workspaces
		.map((workspace, index) => `${index + 1}. ${workspace.title}`)
		.join("\n")
	const selection = window.prompt(`Choose a legacy workspace to migrate:\n\n${choices}`, "1")
	if (!selection) {
		return null
	}
	const index = Number.parseInt(selection, 10) - 1
	const workspace = workspaces[index]
	if (!workspace) {
		window.alert("Invalid workspace selection.")
		return null
	}
	return workspace
}

const withSelectedLegacyWorkspace = (
	workspaces: readonly WorkspaceInterface[],
	action: (workspace: WorkspaceInterface) => void,
): void => {
	const selected = selectLegacyWorkspace(workspaces)
	if (selected) {
		action(selected)
	}
}

const WorkspaceToolsMenu = ({
	controller,
	isBusy,
}: {
	readonly controller: OrgWorkspaceController
	readonly isBusy: boolean
}) => {
	const [legacySourcesEnabled, setLegacySourcesEnabled] = useState(false)
	const workspaces = useAllWorkspaces(legacySourcesEnabled) ?? []
	const migrationSupported =
		navigator.userAgent.includes("Linux") || navigator.userAgent.includes("Macintosh")
	const migrationUnavailable = !controller.workspace || workspaces.length === 0 || isBusy
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" aria-label="Workspace tools" title="Workspace tools">
					<MoreHorizontal className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64">
				<DropdownMenuLabel>Org index</DropdownMenuLabel>
				<DropdownMenuItem
					disabled={!controller.workspace || controller.isDirty || isBusy}
					onClick={() => void controller.rebuildDerivedIndex()}
				>
					<Database className="mr-2 size-4" />
					Rebuild derived index
				</DropdownMenuItem>
				<DropdownMenuItem
					disabled={!controller.workspace || isBusy}
					onClick={() => {
						if (window.confirm("Clear the disposable Org index? Org files will not be changed.")) {
							void controller.clearDerivedIndex()
						}
					}}
				>
					<Trash2 className="mr-2 size-4" />
					Clear derived index
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuLabel>Legacy migration</DropdownMenuLabel>
				<DropdownMenuItem asChild>
					<Link to="/legacy">
						<Database className="mr-2 size-4" />
						Open legacy SQLite workspace
					</Link>
				</DropdownMenuItem>
				{!legacySourcesEnabled && (
					<DropdownMenuItem onClick={() => setLegacySourcesEnabled(true)}>
						<DatabaseBackup className="mr-2 size-4" />
						Load legacy migration sources…
					</DropdownMenuItem>
				)}
				<DropdownMenuItem
					disabled={!legacySourcesEnabled || !migrationSupported || migrationUnavailable}
					onClick={() =>
						withSelectedLegacyWorkspace(workspaces, (selected) => {
							void controller.migrateLegacyWorkspace(selected)
						})
					}
				>
					<DatabaseBackup className="mr-2 size-4" />
					Migrate legacy workspace
				</DropdownMenuItem>
				<DropdownMenuItem
					disabled={!legacySourcesEnabled || migrationUnavailable}
					onClick={() =>
						withSelectedLegacyWorkspace(workspaces, (selected) => {
							void controller.verifyLegacyMigration(selected)
						})
					}
				>
					<ShieldCheck className="mr-2 size-4" />
					Verify migration
				</DropdownMenuItem>
				<DropdownMenuItem
					disabled={!legacySourcesEnabled || migrationUnavailable}
					onClick={() =>
						withSelectedLegacyWorkspace(workspaces, (selected) => {
							void controller.runLegacyRecoveryDrill(selected)
						})
					}
				>
					<RotateCcw className="mr-2 size-4" />
					Run recovery drill
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

const OrgWorkspaceNotice = ({ controller }: { readonly controller: OrgWorkspaceController }) => {
	if (controller.error) {
		return (
			<div
				role="alert"
				className="border-b border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive"
			>
				{controller.error}
			</div>
		)
	}
	if (controller.migrationStatus) {
		return (
			<output className="block truncate border-b border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-300">
				{controller.migrationStatus}
			</output>
		)
	}
	if (controller.derivedIndexStatus) {
		return (
			<output className="block truncate border-b border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-300">
				{controller.derivedIndexStatus}
			</output>
		)
	}
	return null
}

const OrgWorkspaceEmptyState = ({
	isLoading,
	onOpenDefault,
	onChooseDirectory,
}: {
	readonly isLoading: boolean
	readonly onOpenDefault: () => void
	readonly onChooseDirectory: () => void
}) => (
	<div className="flex min-h-0 flex-1 items-center justify-center p-8">
		<div className="flex max-w-sm flex-col items-center text-center">
			<div className="mb-4 flex size-12 items-center justify-center rounded-xl border bg-muted/40">
				<FolderOpen className="size-5 text-muted-foreground" />
			</div>
			<h1 className="text-base font-semibold">Open an Org workspace</h1>
			<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
				Choose a local directory containing standard .org files. Grain will never replace them with
				database-only documents.
			</p>
			<div className="mt-5 flex items-center gap-2">
				<Button disabled={isLoading} onClick={onOpenDefault}>
					<FolderOpen className="mr-2 size-4" />
					{isLoading ? "Opening…" : "Open Documents/Grain"}
				</Button>
				<Button variant="outline" disabled={isLoading} onClick={onChooseDirectory}>
					Choose another…
				</Button>
			</div>
		</div>
	</div>
)

export const OrgWorkspaceContainer = memo(function OrgWorkspaceContainer() {
	const controller = useOrgWorkspace()
	const isBusy = controller.isLoading || controller.isSaving
	const [showAgenda, setShowAgenda] = useState(false)
	const [showCapture, setShowCapture] = useState(false)
	const [sidebarVisible, setSidebarVisible] = useState(true)
	const createDiary = useCallback(async () => {
		const result = await createOrgDiaryFromController(controller)
		if (result === "no-workspace") {
			window.alert("Open an Org workspace before creating a diary file.")
			return
		}
		setShowAgenda(false)
	}, [controller])

	useEffect(() => listenForOrgDiaryCreation(() => void createDiary()), [createDiary])

	return (
		<div className="flex h-full min-h-0 w-full flex-col bg-background">
			{!controller.workspace && <OrgWorkspaceNotice controller={controller} />}
			{controller.workspace ? (
				<Group orientation="horizontal" id="org-workspace-layout">
					{sidebarVisible && (
						<>
							<Panel id="org-sidebar" defaultSize={280} minSize={220} maxSize={420}>
								<OrgWorkspaceSidebar
									activeView={showAgenda ? "agenda" : "editor"}
									controller={controller}
									isBusy={isBusy}
									tools={<WorkspaceToolsMenu controller={controller} isBusy={isBusy} />}
									onCapture={() => setShowCapture(true)}
									onCreateDiary={() => void createDiary()}
									onHide={() => setSidebarVisible(false)}
									onShowAgenda={() => setShowAgenda(true)}
									onShowEditor={() => setShowAgenda(false)}
								/>
							</Panel>
							<Separator className="relative w-1 bg-transparent after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-border hover:after:bg-primary/40" />
						</>
					)}
					<Panel id="org-main" minSize={360}>
						<div className="flex h-full min-h-0 flex-col">
							<OrgWorkspaceNotice controller={controller} />
							{showAgenda ? (
								<div className="relative flex min-h-0 flex-1 flex-col">
									{!sidebarVisible && (
										<Button variant="ghost" size="icon" className="absolute left-2 top-2 z-10" aria-label="Show sidebar" onClick={() => setSidebarVisible(true)}>
											<PanelLeftOpen className="size-4" />
										</Button>
									)}
									<OrgAgendaContainer controller={controller} onShowEditor={() => setShowAgenda(false)} />
								</div>
							) : (
								<OrgDocumentPane controller={controller} isBusy={isBusy} sidebarVisible={sidebarVisible} onShowSidebar={() => setSidebarVisible(true)} />
							)}
						</div>
					</Panel>
				</Group>
			) : (
				<OrgWorkspaceEmptyState
					isLoading={controller.isLoading}
					onOpenDefault={() => void controller.openDefaultWorkspace()}
					onChooseDirectory={() => void controller.selectWorkspace()}
				/>
			)}
			<OrgCaptureDialog open={showCapture} onOpenChange={setShowCapture} onSubmit={(title, targetPath) => void controller.captureTodo(title, targetPath)} />
		</div>
	)
})
