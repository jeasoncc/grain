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
import { memo, useCallback, useEffect, useRef, useState } from "react"
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
import { OrgCommandPalette, orgCommandIcons } from "./org-command-palette.view.fn"
import { OrgDocumentPane } from "./org-document-pane.view.fn"
import { OrgInspector } from "./org-inspector.view.fn"
import { OrgQuickOpen } from "./org-quick-open.view.fn"
import { OrgWorkspaceRibbon } from "./org-workspace-ribbon.view.fn"
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
	const [inspectorVisible, setInspectorVisible] = useState(false)
	const [quickOpenVisible, setQuickOpenVisible] = useState(false)
	const [commandPaletteVisible, setCommandPaletteVisible] = useState(false)
	const [openDocumentPaths, setOpenDocumentPaths] = useState<readonly string[]>([])
	const navigationRequestRef = useRef(0)
	const [sessionRoot, setSessionRoot] = useState<string | null>(null)
	const [navigationHistory, setNavigationHistory] = useState<{
		readonly index: number
		readonly paths: readonly string[]
	}>({ index: -1, paths: [] })
	const workspaceDocumentKey =
		controller.workspace?.documents.map((document) => document.relativePath).join("\u0000") ?? ""
	const createDiary = useCallback(async () => {
		const result = await createOrgDiaryFromController(controller)
		if (result === "no-workspace") {
			window.alert("Open an Org workspace before creating a diary file.")
			return
		}
		setShowAgenda(false)
	}, [controller])

	useEffect(() => listenForOrgDiaryCreation(() => void createDiary()), [createDiary])
	useEffect(() => {
		const rootPath = controller.workspace?.rootPath
		setSessionRoot(null)
		if (!rootPath) {
			setOpenDocumentPaths([])
			setNavigationHistory({ index: -1, paths: [] })
			setSidebarVisible(true)
			setInspectorVisible(false)
			return
		}
		let cancelled = false
		const available = new Set(
			controller.workspace?.documents.map((document) => document.relativePath) ?? [],
		)
		let activePath: string | null = null
		try {
			const raw = window.localStorage.getItem(`grain:org-session:${rootPath}`)
			const saved = raw
				? (JSON.parse(raw) as {
						activePath?: unknown
						inspectorVisible?: unknown
						openPaths?: unknown
						sidebarVisible?: unknown
					})
				: null
			const openPaths = Array.isArray(saved?.openPaths)
				? saved.openPaths.filter(
						(path): path is string => typeof path === "string" && available.has(path),
					)
				: []
			setOpenDocumentPaths(openPaths)
			setNavigationHistory({ index: -1, paths: [] })
			setSidebarVisible(typeof saved?.sidebarVisible === "boolean" ? saved.sidebarVisible : true)
			setInspectorVisible(
				typeof saved?.inspectorVisible === "boolean" ? saved.inspectorVisible : false,
			)
			if (typeof saved?.activePath === "string" && available.has(saved.activePath))
				activePath = saved.activePath
		} catch {
			setOpenDocumentPaths([])
			setNavigationHistory({ index: -1, paths: [] })
			setSidebarVisible(true)
			setInspectorVisible(false)
		}
		const finishRestore = async () => {
			if (activePath) await controller.openDocumentPath(activePath)
			if (!cancelled) setSessionRoot(rootPath)
		}
		void finishRestore()
		return () => {
			cancelled = true
		}
	}, [controller.workspace?.rootPath])
	useEffect(() => {
		if (!sessionRoot || sessionRoot !== controller.workspace?.rootPath) return
		try {
			window.localStorage.setItem(
				`grain:org-session:${sessionRoot}`,
				JSON.stringify({
					activePath: controller.activeDocument?.relativePath ?? null,
					inspectorVisible,
					openPaths: openDocumentPaths,
					sidebarVisible,
				}),
			)
		} catch {
			// UI session persistence is best-effort and never affects Org files.
		}
	}, [
		controller.activeDocument?.relativePath,
		controller.workspace?.rootPath,
		inspectorVisible,
		openDocumentPaths,
		sessionRoot,
		sidebarVisible,
	])
	useEffect(() => {
		const path = controller.activeDocument?.relativePath
		if (!path) return
		navigationRequestRef.current += 1
		setOpenDocumentPaths((current) => (current.includes(path) ? current : [...current, path]))
		setNavigationHistory((current) => {
			if (current.paths[current.index] === path) return current
			const paths = [...current.paths.slice(0, current.index + 1), path]
			return { index: paths.length - 1, paths }
		})
	}, [controller.activeDocument?.relativePath])
	useEffect(() => {
		const available = new Set(workspaceDocumentKey ? workspaceDocumentKey.split("\u0000") : [])
		setOpenDocumentPaths((current) => current.filter((path) => available.has(path)))
		setNavigationHistory((current) => {
			const activePath = current.paths[current.index]
			const paths = current.paths.filter((path) => available.has(path))
			const activeIndex = activePath ? paths.lastIndexOf(activePath) : -1
			return {
				index: activeIndex >= 0 ? activeIndex : Math.min(current.index, paths.length - 1),
				paths,
			}
		})
	}, [workspaceDocumentKey])
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (!(event.metaKey || event.ctrlKey)) return
			const key = event.key.toLocaleLowerCase()
			if (key === "o") {
				event.preventDefault()
				setQuickOpenVisible(true)
			} else if (key === "p" || key === "k") {
				event.preventDefault()
				setCommandPaletteVisible(true)
			}
		}
		window.addEventListener("keydown", onKeyDown)
		return () => window.removeEventListener("keydown", onKeyDown)
	}, [])
	useEffect(() => {
		const onTabNavigation = (event: KeyboardEvent) => {
			if (!event.ctrlKey || event.key !== "Tab" || openDocumentPaths.length < 2) return
			event.preventDefault()
			const currentIndex = openDocumentPaths.indexOf(controller.activeDocument?.relativePath ?? "")
			const offset = event.shiftKey ? -1 : 1
			const nextIndex =
				(Math.max(0, currentIndex) + offset + openDocumentPaths.length) % openDocumentPaths.length
			const nextPath = openDocumentPaths[nextIndex]
			if (nextPath) void controller.openDocumentPath(nextPath)
		}
		window.addEventListener("keydown", onTabNavigation)
		return () => window.removeEventListener("keydown", onTabNavigation)
	}, [controller.activeDocument?.relativePath, controller.openDocumentPath, openDocumentPaths])

	const navigateHistory = (offset: -1 | 1) => {
		const previousIndex = navigationHistory.index
		const nextIndex = previousIndex + offset
		const path = navigationHistory.paths[nextIndex]
		if (!path) return
		const requestId = navigationRequestRef.current + 1
		navigationRequestRef.current = requestId
		setNavigationHistory((current) => ({ ...current, index: nextIndex }))
		void controller.openDocumentPath(path).then((opened) => {
			if (!opened && requestId === navigationRequestRef.current) {
				setNavigationHistory((current) => ({ ...current, index: previousIndex }))
			}
		})
	}
	const closeTab = (relativePath: string) => {
		if (relativePath !== controller.activeDocument?.relativePath) {
			setOpenDocumentPaths((current) => current.filter((path) => path !== relativePath))
			return
		}
		const remaining = openDocumentPaths.filter((path) => path !== relativePath)
		void controller.closeActiveDocument().then((closed) => {
			if (closed) setOpenDocumentPaths(remaining)
		})
	}

	return (
		<div className="flex h-full min-h-0 w-full flex-col bg-background">
			{!controller.workspace && <OrgWorkspaceNotice controller={controller} />}
			{controller.workspace ? (
				<div className="flex min-h-0 flex-1">
					<OrgWorkspaceRibbon
						activeView={showAgenda ? "agenda" : "editor"}
						isBusy={isBusy}
						onCapture={() => setShowCapture(true)}
						onCreateDiary={() => void createDiary()}
						onQuickOpen={() => setQuickOpenVisible(true)}
						onShowAgenda={() => setShowAgenda(true)}
						onShowFiles={() => {
							setShowAgenda(false)
							setSidebarVisible(true)
						}}
					/>
					<Group orientation="horizontal" id="org-workspace-layout">
						{sidebarVisible && (
							<>
								<Panel id="org-sidebar" defaultSize={280} minSize={220} maxSize={360}>
									<OrgWorkspaceSidebar
										controller={controller}
										isBusy={isBusy}
										tools={<WorkspaceToolsMenu controller={controller} isBusy={isBusy} />}
										onHide={() => setSidebarVisible(false)}
										onShowEditor={() => setShowAgenda(false)}
									/>
								</Panel>
								<Separator className="relative w-1 bg-transparent after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-border hover:after:bg-primary/40" />
							</>
						)}
						<Panel id="org-main" minSize={480}>
							<div className="flex h-full min-h-0 flex-col">
								<OrgWorkspaceNotice controller={controller} />
								{showAgenda ? (
									<div className="flex min-h-0 flex-1 flex-col">
										<div className="flex h-10 shrink-0 items-center border-b bg-muted/20 px-1">
											{!sidebarVisible && (
												<Button
													variant="ghost"
													size="icon"
													className="size-8"
													aria-label="Show sidebar"
													onClick={() => setSidebarVisible(true)}
												>
													<PanelLeftOpen className="size-4" />
												</Button>
											)}
											<span className="px-2 text-xs font-medium">Agenda</span>
										</div>
										<OrgAgendaContainer
											controller={controller}
											onShowEditor={() => setShowAgenda(false)}
										/>
										<footer className="h-[22px] shrink-0 border-t border-border/70 bg-muted/20 px-2 text-right text-[11px] leading-[22px] text-muted-foreground">
											Workspace agenda
										</footer>
									</div>
								) : (
									<OrgDocumentPane
										canGoBack={navigationHistory.index > 0}
										canGoForward={
											navigationHistory.index >= 0 &&
											navigationHistory.index < navigationHistory.paths.length - 1
										}
										controller={controller}
										inspectorVisible={inspectorVisible}
										isBusy={isBusy}
										openDocumentPaths={openDocumentPaths}
										sidebarVisible={sidebarVisible}
										onCloseTab={closeTab}
										onGoBack={() => navigateHistory(-1)}
										onGoForward={() => navigateHistory(1)}
										onQuickOpen={() => setQuickOpenVisible(true)}
										onSelectTab={(relativePath) => {
											if (relativePath !== controller.activeDocument?.relativePath)
												void controller.openDocumentPath(relativePath)
										}}
										onShowInspector={() => setInspectorVisible(true)}
										onShowSidebar={() => setSidebarVisible(true)}
									/>
								)}
							</div>
						</Panel>
						{inspectorVisible && !showAgenda && (
							<>
								<Separator className="relative w-1 bg-transparent after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-border hover:after:bg-primary/40" />
								<Panel id="org-inspector" defaultSize={300} minSize={240} maxSize={380}>
									<OrgInspector
										controller={controller}
										onClose={() => setInspectorVisible(false)}
									/>
								</Panel>
							</>
						)}
					</Group>
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
			<OrgCommandPalette
				open={commandPaletteVisible}
				onOpenChange={setCommandPaletteVisible}
				commands={[
					{
						icon: orgCommandIcons.quickOpen,
						label: "Quick open",
						run: () => setQuickOpenVisible(true),
						shortcut: "Ctrl O",
					},
					{
						disabled: !controller.isDirty || isBusy,
						icon: orgCommandIcons.save,
						label: "Save current note",
						run: () => void controller.saveDocument(),
						shortcut: "Ctrl S",
					},
					{
						disabled: isBusy,
						icon: orgCommandIcons.refresh,
						label: "Refresh workspace",
						run: () => void controller.refreshWorkspace(),
					},
					{ icon: orgCommandIcons.agenda, label: "Open agenda", run: () => setShowAgenda(true) },
					{
						disabled: isBusy,
						icon: orgCommandIcons.capture,
						label: "Quick capture",
						run: () => setShowCapture(true),
					},
					{
						disabled: isBusy,
						icon: orgCommandIcons.diary,
						label: "Open today’s note",
						run: () => void createDiary(),
					},
					{ icon: orgCommandIcons.files, label: "Show editor", run: () => setShowAgenda(false) },
					{
						icon: orgCommandIcons.sidebar,
						label: sidebarVisible ? "Hide file sidebar" : "Show file sidebar",
						run: () => setSidebarVisible((visible) => !visible),
					},
					{
						disabled: !controller.activeDocument,
						icon: orgCommandIcons.inspector,
						label: inspectorVisible ? "Hide note inspector" : "Show note inspector",
						run: () => setInspectorVisible((visible) => !visible),
					},
				]}
			/>
			<OrgQuickOpen
				documents={controller.workspace?.documents ?? []}
				open={quickOpenVisible}
				onOpenChange={setQuickOpenVisible}
				onSelect={async (document) => {
					const opened = await controller.openDocument(document)
					if (opened) setShowAgenda(false)
					return opened
				}}
			/>
		</div>
	)
})
