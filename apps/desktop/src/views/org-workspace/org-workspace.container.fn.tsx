import { Link } from "@tanstack/react-router"
import dayjs from "dayjs"
import {
	CalendarDays,
	Database,
	DatabaseBackup,
	FilePenLine,
	FolderOpen,
	ListTodo,
	MoreHorizontal,
	RotateCcw,
	Save,
	ShieldCheck,
	Trash2,
} from "lucide-react"
import { memo, useEffect, useState } from "react"
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

const isCaptureDisabled = (hasWorkspace: boolean, isBusy: boolean): boolean =>
	!hasWorkspace || isBusy

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
	workspaces,
}: {
	readonly controller: OrgWorkspaceController
	readonly isBusy: boolean
	readonly workspaces: readonly WorkspaceInterface[]
}) => {
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
				<DropdownMenuItem
					disabled={!migrationSupported || migrationUnavailable}
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
					disabled={migrationUnavailable}
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
					disabled={migrationUnavailable}
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

interface OrgWorkspaceHeaderProps {
	readonly controller: OrgWorkspaceController
	readonly isBusy: boolean
	readonly legacyWorkspaces: readonly WorkspaceInterface[]
	readonly showAgenda: boolean
	readonly onOpenCapture: () => void
	readonly onToggleAgenda: () => void
}

const OrgWorkspaceHeader = ({
	controller,
	isBusy,
	legacyWorkspaces,
	showAgenda,
	onOpenCapture,
	onToggleAgenda,
}: OrgWorkspaceHeaderProps) => (
	<header className="flex h-12 shrink-0 items-center gap-3 border-b px-3">
		<div className="min-w-0 flex-1">
			<p className="truncate text-sm font-medium">Org workspace</p>
			<p className="truncate text-xs text-muted-foreground">
				{controller.workspace?.rootPath ?? "Open a directory containing .org files"}
			</p>
		</div>
		<span className="hidden text-xs text-muted-foreground sm:inline">
			{controller.isSaving ? "Saving…" : controller.isDirty ? "Unsaved" : "Saved"}
		</span>
		<div className="flex shrink-0 items-center gap-1">
			<Button
				variant={showAgenda ? "secondary" : "ghost"}
				size="sm"
				disabled={!controller.workspace}
				aria-pressed={showAgenda}
				onClick={onToggleAgenda}
			>
				{showAgenda ? (
					<FilePenLine className="size-4 lg:mr-2" />
				) : (
					<CalendarDays className="size-4 lg:mr-2" />
				)}
				<span className="hidden lg:inline">{showAgenda ? "Editor" : "Agenda"}</span>
			</Button>
			<Button
				variant="ghost"
				size="sm"
				disabled={isCaptureDisabled(controller.workspace !== null, isBusy)}
				onClick={onOpenCapture}
			>
				<ListTodo className="size-4 lg:mr-2" />
				<span className="hidden lg:inline">Capture</span>
			</Button>
			<Button
				variant="ghost"
				size={controller.workspace ? "icon" : "sm"}
				title={controller.workspace ? "Open another Org directory" : undefined}
				disabled={isBusy}
				onClick={() => void controller.selectWorkspace()}
			>
				<FolderOpen className={controller.workspace ? "size-4" : "mr-2 size-4"} />
				{controller.workspace ? (
					<span className="sr-only">Open another Org directory</span>
				) : (
					"Open directory"
				)}
			</Button>
			<WorkspaceToolsMenu controller={controller} isBusy={isBusy} workspaces={legacyWorkspaces} />
			<Button
				size="sm"
				disabled={!controller.activeDocument || !controller.isDirty || isBusy}
				onClick={() => void controller.saveDocument()}
			>
				<Save className="size-4 lg:mr-2" />
				<span className="hidden lg:inline">Save</span>
			</Button>
		</div>
	</header>
)

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
	const legacyWorkspaces = useAllWorkspaces() ?? []
	const isBusy = controller.isLoading || controller.isSaving
	const [showAgenda, setShowAgenda] = useState(false)
	const [showCapture, setShowCapture] = useState(false)

	useEffect(
		() =>
			listenForOrgDiaryCreation(() => {
				void createOrgDiaryFromController(controller).then((result) => {
					if (result === "no-workspace") {
						window.alert("Open an Org workspace before creating a diary file.")
					}
				})
			}),
		[controller],
	)

	return (
		<div className="flex h-full min-h-0 w-full flex-col bg-background">
			<OrgWorkspaceHeader
				controller={controller}
				isBusy={isBusy}
				legacyWorkspaces={legacyWorkspaces}
				showAgenda={showAgenda}
				onOpenCapture={() => setShowCapture(true)}
				onToggleAgenda={() => setShowAgenda((current) => !current)}
			/>
			<OrgWorkspaceNotice controller={controller} />

			{controller.workspace ? (
				<div className="flex min-h-0 flex-1">
					<OrgWorkspaceSidebar controller={controller} isBusy={isBusy} />
					{showAgenda ? (
						<OrgAgendaContainer controller={controller} onShowEditor={() => setShowAgenda(false)} />
					) : (
						<OrgDocumentPane controller={controller} isBusy={isBusy} />
					)}
				</div>
			) : (
				<OrgWorkspaceEmptyState
					isLoading={controller.isLoading}
					onOpenDefault={() => void controller.openDefaultWorkspace()}
					onChooseDirectory={() => void controller.selectWorkspace()}
				/>
			)}
			<OrgCaptureDialog
				open={showCapture}
				onOpenChange={setShowCapture}
				onSubmit={(title, targetPath) => void controller.captureTodo(title, targetPath)}
			/>
		</div>
	)
})
