import * as ContextMenu from "@radix-ui/react-context-menu"
import {
	ChevronRight,
	Copy,
	FilePenLine,
	FilePlus2,
	FolderInput,
	FileText,
	FolderMinus,
	Folder,
	FolderOpen,
	FolderPlus,
	Link2,
	MoreHorizontal,
	PanelLeftClose,
	RefreshCw,
	ScanLine,
	Search,
	Trash2,
	X,
} from "lucide-react"
import { memo, type ReactNode, type RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { buildOrgWorkspaceTree } from "@/pipes/org"
import type { OrgTreeEntryInterface } from "@/types/org"
import { createParameterSession } from "@/flows/org-command/parameter-session"
import { getOrgInputCommandKeys } from "@/flows/org-command/org-prefix-keymap"
import { useOrgInputConfiguration } from "@/hooks/use-org-input-configuration"
import { useOrgScopedInput } from "@/hooks/use-org-scoped-input"
import { useApplicationParameterRegistration } from "@/views/application/application-command-provider"
import type { OrgMinibufferAcceptResult } from "@/types/editor/minibuffer.interface"
import { Button } from "@/views/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@/views/ui/dropdown-menu"

export interface OrgWorkspaceSidebarProps {
	readonly controller: OrgWorkspaceController
	readonly isBusy: boolean
	readonly tools: ReactNode
	readonly onFocusEditor: () => void
	readonly onHide: () => void
	readonly onShowEditor: () => void
}

interface VisibleTreeRow {
	readonly entry: OrgTreeEntryInterface
	readonly level: number
	readonly position: number
	readonly siblings: number
	readonly parentPath?: string
	readonly expanded?: boolean
}

const fileActions = [
	["file-tree.open", "Open", FileText],
	["file-tree.rename", "Rename…", FilePenLine],
	["file-tree.move", "Move to…", FolderInput],
	["file-tree.copy-relative-path", "Copy relative path", Copy],
	["file-tree.copy-absolute-path", "Copy absolute path", Copy],
	["file-tree.copy-org-link", "Copy Org link", Link2],
	["file-tree.reveal-in-file-manager", "Show in file manager", FolderOpen],
	["file-tree.delete", "Delete…", Trash2],
] as const
const rootActions = [
	["file-tree.create-document", "New Org file…", FilePlus2],
	["file-tree.create-directory", "New directory…", FolderPlus],
	["file-tree.refresh", "Refresh", RefreshCw],
	["file-tree.reveal-active", "Reveal active file", ScanLine],
	["file-tree.collapse-all", "Collapse all", FolderMinus],
	["file-tree.reveal-in-file-manager", "Show in file manager", FolderOpen],
] as const
interface TreeMenuTarget {
	readonly scopeKey: string
	readonly workspaceRoot: string | null
	readonly generation: object
	readonly entry: OrgTreeEntryInterface | null
	readonly bufferId: string | null
	readonly sourceRevision: number | null
}
type TreeMenuAction = readonly [string, string, typeof FileText]

/** Both entry points use the same captured target and action content. */
function TreeMenu({
	path, actions, capture, reason, invoke, shortcuts, children, label, className, viewportRef, elements,
}: {
	readonly path: string | null
	readonly actions: readonly TreeMenuAction[]
	readonly capture: (path: string | null) => TreeMenuTarget
	readonly reason: (id: string, target: TreeMenuTarget) => string | null
	readonly invoke: (id: string, target: TreeMenuTarget) => boolean
	readonly shortcuts: ReadonlyMap<string, string>
	readonly children: ReactNode
	readonly label?: string
	readonly className: string
	readonly viewportRef?: RefObject<HTMLDivElement | null>
	readonly elements?: Map<string, HTMLButtonElement>
}) {
	const [target, setTarget] = useState<TreeMenuTarget | null>(null)
	const container = useRef<HTMLElement | null>(null)
	const origin = useRef<HTMLElement | null>(null)
	const open = () => {
		const captured = capture(path)
		setTarget(captured)
		const focused = document.activeElement
		origin.current = path ? elements?.get(path) ?? null
			: label && focused instanceof HTMLElement && container.current?.contains(focused) ? focused
				: label ? container.current?.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`) ?? null : container.current
		origin.current?.focus({ preventScroll: true })
	}
	const restore = (event: Event) => {
		event.preventDefault()
		const focused = document.activeElement
		if (!focused || focused === document.body)
			origin.current?.focus({ preventScroll: true })
	}
	const content = (context: boolean) => {
		if (!target) return null
		const Item = context ? ContextMenu.Item : DropdownMenuItem
		const Label = context ? ContextMenu.Label : DropdownMenuLabel
		const Separator = context ? ContextMenu.Separator : DropdownMenuSeparator
		const targetPath = target.entry?.relativePath ?? target.workspaceRoot ?? "No workspace open"
		const notice = reason(target.entry?.type === "document" ? "file-tree.rename" : actions[0][0], target)
		return <>
			<Label className="px-2 py-1.5 font-normal">
				<div className="truncate text-xs font-medium" title={target.entry?.name}>{target.entry?.name ?? "Workspace"}</div>
				<div className="mt-0.5 line-clamp-2 break-all font-mono text-[10px] leading-relaxed text-muted-foreground" title={targetPath}>{target.entry && targetPath === target.entry.name ? "Workspace root" : targetPath}</div>
			</Label>
			<Separator className="-mx-1 my-1 h-px bg-muted" />
			{actions.map(([id, text, Icon]) => {
				const unavailable = reason(id, target)
				return <div key={id}>
					{id === "file-tree.delete" || id === "file-tree.copy-relative-path" ? <Separator className="-mx-1 my-1 h-px bg-muted" /> : null}
					<Item disabled={Boolean(unavailable)} aria-label={text} aria-description={unavailable ?? undefined} title={unavailable ?? undefined}
						className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${id === "file-tree.delete" ? "text-destructive focus:bg-destructive/10" : "focus:text-accent-foreground"}`}
						onSelect={() => { origin.current?.focus({ preventScroll: true }); invoke(id, target) }}>
						<Icon className="mr-2 size-3.5 shrink-0" />{text}
						<DropdownMenuShortcut className="font-mono text-[10px] tracking-normal">{shortcuts.get(id)}</DropdownMenuShortcut>
					</Item>
				</div>
			})}
			{notice && <p role="note" className="mx-2 mt-1 border-t border-border/60 py-2 text-[11px] leading-relaxed text-muted-foreground">{notice}</p>}
		</>
	}
	const Tag = path === null ? "div" : "li"
	return <ContextMenu.Root modal={false} onOpenChange={(opened) => { if (opened) open() }}>
		<ContextMenu.Trigger asChild>
			<Tag role={path === null ? undefined : "none"} tabIndex={path === null && !label ? 0 : undefined}
				aria-label={path === null && !label ? "Workspace file viewport" : undefined}
				ref={(element: HTMLElement | null) => {
					container.current = element
					if (viewportRef) viewportRef.current = element as HTMLDivElement | null
				}}
				className={className}
				onContextMenu={(event) => event.stopPropagation()}
				onKeyDown={(event) => {
					if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return
					if ((event.target as Element).closest('[role="menu"]')) return
					event.preventDefault()
					event.stopPropagation()
					const bounds = (event.target as HTMLElement).getBoundingClientRect()
					event.currentTarget.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: bounds.left + 12, clientY: bounds.bottom }))
				}}>
				{children}
				{label && <DropdownMenu modal={false} onOpenChange={(opened) => { if (opened) open() }}>
					<DropdownMenuTrigger asChild>
						<button type="button" aria-label={label} tabIndex={path ? -1 : 0}
							className={`${path ? "absolute right-0.5 top-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-data-[state=open]:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100" : "shrink-0"} flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`}>
							<MoreHorizontal className="size-3.5" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent side={path ? "right" : "bottom"} align="start" className="w-72" aria-label={target ? `Actions for ${target.entry?.relativePath ?? target.workspaceRoot ?? "workspace"}` : undefined} onCloseAutoFocus={restore}>
						{content(false)}
					</DropdownMenuContent>
				</DropdownMenu>}
			</Tag>
		</ContextMenu.Trigger>
		<ContextMenu.Portal>
			<ContextMenu.Content className="z-50 w-72 rounded-md border border-border/60 bg-popover p-1 text-popover-foreground shadow-md outline-none"
				aria-label={target ? `Actions for ${target.entry?.relativePath ?? target.workspaceRoot ?? "workspace"}` : undefined}
				onCloseAutoFocus={restore}>{content(true)}</ContextMenu.Content>
		</ContextMenu.Portal>
	</ContextMenu.Root>
}

const flattenTree = (
	entries: readonly OrgTreeEntryInterface[],
	collapsed: ReadonlySet<string>,
	rows: VisibleTreeRow[] = [],
	level = 1,
	parentPath?: string,
): readonly VisibleTreeRow[] => {
	for (let index = 0; index < entries.length; index++) {
		const entry = entries[index]
		const expanded = entry.type === "directory" ? !collapsed.has(entry.relativePath) : undefined
		rows.push({ entry, level, parentPath, expanded, position: index + 1, siblings: entries.length })
		if (entry.type === "directory" && expanded)
			flattenTree(entry.children, collapsed, rows, level + 1, entry.relativePath)
	}
	return rows
}

const filterTree = (
	entries: readonly OrgTreeEntryInterface[],
	query: string,
): readonly OrgTreeEntryInterface[] => {
	const normalized = query.trim().toLocaleLowerCase()
	if (!normalized) return entries
	const filtered: OrgTreeEntryInterface[] = []
	for (const entry of entries) {
		if (entry.type === "document") {
			if (entry.relativePath.toLocaleLowerCase().includes(normalized)) filtered.push(entry)
			continue
		}
		const children = filterTree(entry.children, normalized)
		if (entry.relativePath.toLocaleLowerCase().includes(normalized) || children.length > 0) {
			filtered.push({ ...entry, children })
		}
	}
	return filtered
}

const workspaceName = (rootPath: string) => {
	const parts = rootPath.replaceAll("\\", "/").split("/").filter(Boolean)
	return parts.at(-1) ?? "Workspace"
}

const expandAncestors = (collapsed: ReadonlySet<string>, activePath: string): ReadonlySet<string> => {
	let next: Set<string> | undefined
	let separator = activePath.indexOf("/")
	while (separator !== -1) {
		const ancestor = activePath.slice(0, separator)
		if (collapsed.has(ancestor)) {
			next ??= new Set(collapsed)
			next.delete(ancestor)
		}
		separator = activePath.indexOf("/", separator + 1)
	}
	return next ?? collapsed
}

const OrgTreeRow = memo(function OrgTreeRow({
	row, selected, active, modified, elements, shortcuts, onSelect, onAction, capture, reason, invoke,
}: {
	readonly row: VisibleTreeRow
	readonly selected: boolean
	readonly active: boolean
	readonly modified: boolean
	readonly elements: Map<string, HTMLButtonElement>
	readonly shortcuts: ReadonlyMap<string, string>
	readonly onSelect: (path: string) => void
	readonly onAction: (id: string, path?: string | null) => boolean
	readonly capture: (path: string | null) => TreeMenuTarget
	readonly reason: (id: string, target: TreeMenuTarget) => string | null
	readonly invoke: (id: string, target: TreeMenuTarget) => boolean
}) {
	const { entry } = row
	return (
		<TreeMenu path={entry.relativePath} label={`Actions for ${entry.relativePath}`} className="group relative min-w-0"
			elements={elements} shortcuts={shortcuts} capture={capture} reason={reason} invoke={invoke}
			actions={entry.type === "document" ? fileActions : [
				rootActions[0], rootActions[1],
				["file-tree.open", row.expanded ? "Collapse" : "Expand", row.expanded ? FolderOpen : Folder],
				fileActions[3], fileActions[4], fileActions[6],
			]}>
			<button
				type="button"
				role="treeitem"
				ref={(element) => { if (element) elements.set(entry.relativePath, element); else elements.delete(entry.relativePath) }}
				tabIndex={selected ? 0 : -1}
				aria-level={row.level}
				aria-posinset={row.position}
				aria-setsize={row.siblings}
				aria-selected={selected}
				aria-expanded={row.expanded}
				aria-current={active ? "page" : undefined}
				aria-label={entry.relativePath}
				aria-description={modified ? "Unsaved changes" : undefined}
				title={entry.relativePath}
				style={{ paddingLeft: 8 + (row.level - 1) * 16 }}
				className={`relative flex h-8 w-full min-w-0 items-center gap-1.5 rounded pr-9 text-left text-[13px] outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring ${
					selected ? "bg-sidebar-accent/80 text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
				} ${active ? "font-medium before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded before:bg-sidebar-primary" : ""}`}
				onFocus={() => onSelect(entry.relativePath)}
				onClick={() => onAction("file-tree.open", entry.relativePath)}
			>
				{entry.type === "directory" ? <>
					<ChevronRight className={`size-3 shrink-0 ${row.expanded ? "rotate-90" : ""}`} />
					{row.expanded ? <FolderOpen className="size-3.5 shrink-0" /> : <Folder className="size-3.5 shrink-0" />}
				</> : <FileText className="ml-[18px] size-3.5 shrink-0" />}
				<span className="min-w-0 flex-1 truncate">{entry.name}</span>
				{modified && <span aria-hidden="true" title="Unsaved changes" className="ml-1 size-1.5 shrink-0 rounded-full bg-sidebar-primary" />}
			</button>
		</TreeMenu>
	)
})

export const OrgWorkspaceSidebar = memo(function OrgWorkspaceSidebar({
	controller, isBusy, tools, onHide, onShowEditor, onFocusEditor,
}: OrgWorkspaceSidebarProps) {
	const [collapsedDirectories, setCollapsedDirectories] = useState<ReadonlySet<string>>(new Set())
	const [filterCollapsed, setFilterCollapsed] = useState<ReadonlySet<string>>(new Set())
	const [treeSessionRoot, setTreeSessionRoot] = useState<string | null>(null)
	const [selectedPath, setSelectedPath] = useState<string | null>(null)
	const [query, setQuery] = useState("")
	const [status, setStatus] = useState<{ readonly message: string; readonly error?: boolean } | null>(null)
	const [scrollRequest, setScrollRequest] = useState(0)
	const [elements] = useState(() => new Map<string, HTMLButtonElement>())
	const treeViewportRef = useRef<HTMLDivElement>(null)
	const treeRef = useRef<HTMLUListElement>(null)
	const filterRef = useRef<HTMLInputElement>(null)
	const [focusRequest, setFocusRequest] = useState<string | null>(null)
	const navigation = useRef<{ rootPath?: string; activePath?: string }>({})
	const configuration = useOrgInputConfiguration()
	const [parameters] = useState(createParameterSession)
	const parameter = useSyncExternalStore(parameters.subscribe, parameters.getSnapshot, parameters.getSnapshot)
	useApplicationParameterRegistration(parameters, parameter.session)
	useLayoutEffect(() => { parameters.attach(); return () => parameters.detach() }, [parameters])
	const rootPath = controller.workspace?.rootPath
	const scopeKey = JSON.stringify([controller.workspaceSessionId, rootPath, controller.workspace?.capabilityToken])
	const activePath = controller.activeDocument?.relativePath
	const directories = controller.workspace?.directories
	const documents = controller.workspace?.documents
	const normalizedQuery = query.trim().toLocaleLowerCase()
	const matchingCount = useMemo(() => normalizedQuery
		? documents?.reduce((count, document) => count + Number(document.relativePath.toLocaleLowerCase().includes(normalizedQuery)), 0) ?? 0
		: documents?.length ?? 0, [documents, normalizedQuery])
	const modifiedPaths = useMemo(() => {
		const paths = new Set<string>()
		for (const buffer of controller.liveBuffers) if (buffer.isDirty) paths.add(buffer.document.relativePath)
		return paths
	}, [controller.liveBuffers])
	const tree = useMemo(() => directories && documents ? buildOrgWorkspaceTree(directories, documents) : [], [directories, documents])
	const workspaceTree = useMemo(() => filterTree(tree, query), [tree, query])
	const treeCollapsed = query.trim() ? filterCollapsed : collapsedDirectories
	const rows = useMemo(() => flattenTree(workspaceTree, treeCollapsed), [workspaceTree, treeCollapsed])
	const cursor = rows.find((row) => row.entry.relativePath === selectedPath)
		?? rows.find((row) => row.entry.relativePath === activePath) ?? rows[0]
	const cursorPath = cursor?.entry.relativePath
	const shortcuts = useMemo(() => new Map<string, string>([...fileActions, ...rootActions].map(([id]) =>
		[id, getOrgInputCommandKeys(configuration.configuration, "file-tree", id).join(" / ")])), [configuration.configuration])
	const latest = useRef({ controller, isBusy, onShowEditor, onFocusEditor, onHide, scopeKey, generation: configuration.generation })
	latest.current = { controller, isBusy, onShowEditor, onFocusEditor, onHide, scopeKey, generation: configuration.generation }
	useLayoutEffect(() => {
		setSelectedPath(null)
		setStatus(null)
		setFocusRequest(null)
	}, [scopeKey])
	useLayoutEffect(() => {
		const lease = parameters.getSnapshot().lease
		if (lease) parameters.cancel(lease)
	}, [parameters, scopeKey, controller.activeBufferId, configuration.generation])
	useEffect(() => {
		if (!rootPath) { navigation.current = {}; setTreeSessionRoot(null); return }
		if (navigation.current.rootPath !== rootPath) {
			let collapsed: ReadonlySet<string> = new Set(directories)
			let hasSavedState = false
			try {
				const stored = window.localStorage.getItem(`grain:org-tree:${rootPath}`)
				const saved: unknown = stored === null ? null : JSON.parse(stored)
				if (Array.isArray(saved)) {
					hasSavedState = true
					collapsed = new Set(saved.filter((path): path is string => typeof path === "string"))
				}
			} catch { /* Tree expansion is disposable UI state. */ }
			if (!hasSavedState && activePath) collapsed = expandAncestors(collapsed, activePath)
			setCollapsedDirectories(collapsed)
			setTreeSessionRoot(rootPath)
			setQuery("")
			if (activePath) setScrollRequest((current) => current + 1)
		} else if (navigation.current.activePath !== activePath && activePath) {
			setCollapsedDirectories((current) => expandAncestors(current, activePath))
			setSelectedPath(activePath)
			setScrollRequest((current) => current + 1)
		}
		navigation.current = { rootPath, activePath }
	}, [rootPath, activePath, directories])
	useEffect(() => {
		if (!rootPath || treeSessionRoot !== rootPath) return
		try { window.localStorage.setItem(`grain:org-tree:${rootPath}`, JSON.stringify([...collapsedDirectories])) }
		catch { /* Unavailable UI-state storage does not block file management. */ }
	}, [collapsedDirectories, rootPath, treeSessionRoot])
	useEffect(() => {
		if (!status || status.error) return
		const timer = window.setTimeout(() => setStatus(null), 4000)
		return () => window.clearTimeout(timer)
	}, [status])
	const focusRow = useCallback((path: string) => {
		setSelectedPath(path)
		const row = elements.get(path)
		const viewport = treeViewportRef.current
		if (!row || !viewport) return
		row.focus({ preventScroll: true })
		const bounds = viewport.getBoundingClientRect()
		const target = row.getBoundingClientRect()
		if (target.top < bounds.top) viewport.scrollTop += target.top - bounds.top
		else if (target.bottom > bounds.bottom) viewport.scrollTop += target.bottom - bounds.bottom
	}, [elements])
	useLayoutEffect(() => {
		if (!focusRequest || !elements.has(focusRequest)) return
		focusRow(focusRequest)
		setFocusRequest(null)
	}, [focusRequest, rows, elements, focusRow])
	useEffect(() => {
		if (!scrollRequest || !activePath) return
		const row = elements.get(activePath)
		const viewport = treeViewportRef.current
		if (!row || !viewport || document.activeElement === row) return
		const bounds = viewport.getBoundingClientRect()
		const target = row.getBoundingClientRect()
		if (target.top < bounds.top) viewport.scrollTop += target.top - bounds.top
		else if (target.bottom > bounds.bottom) viewport.scrollTop += target.bottom - bounds.bottom
	}, [scrollRequest, activePath, elements])
	const entryCurrent = (entry: OrgTreeEntryInterface | null) => {
		const workspace = latest.current.controller.workspace
		if (!workspace) return false
		if (!entry) return true
		return entry.type === "directory" ? workspace.directories.includes(entry.relativePath)
			: workspace.documents.some((current) => current.relativePath === entry.relativePath && current.revision === entry.revision)
	}
	const beginPathParameter = (kind: "create-document" | "create-directory" | "rename" | "move", entry?: OrgTreeEntryInterface) => {
		const captured = latest.current
		if (captured.isBusy || !captured.controller.workspace) return false
		const relocating = kind === "rename" || kind === "move"
		if (relocating && entry?.type !== "document") return false
		const source = relocating && entry?.type === "document" ? Object.freeze({ ...entry }) : null
		const parent = entry?.type === "directory" ? entry.relativePath : entry?.relativePath.slice(0, Math.max(0, entry.relativePath.lastIndexOf("/"))) ?? ""
		const prefix = parent ? `${parent}/` : ""
		let initialInput = kind === "rename" ? source!.name : parent || "/"
		if (!relocating) {
			const occupied = new Set(captured.controller.workspace.directories)
			for (const document of captured.controller.workspace.documents) occupied.add(document.relativePath)
			const stem = kind === "create-directory" ? "new-folder" : "untitled"
			const extension = kind === "create-directory" ? "" : ".org"
			initialInput = `${prefix}${stem}${extension}`
			for (let number = 2; occupied.has(initialInput); number++) initialInput = `${prefix}${stem}-${number}${extension}`
		}
		const lease = parameters.begin()
		if (!lease) return false
		setStatus(null)
		const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null
		const targetBuffer = entry?.type === "document" ? captured.controller.liveBuffers.find((buffer) => buffer.document.relativePath === entry.relativePath) : undefined
		const targetRevision = targetBuffer?.runtime.revision
		const originRevision = captured.controller.activeBufferRuntime?.revision
		const originCurrent = () => latest.current.scopeKey === captured.scopeKey &&
			latest.current.generation === captured.generation &&
			latest.current.controller.activeBufferId === captured.controller.activeBufferId
		const targetCurrent = () => {
			const currentBuffer = entry?.type === "document" ? latest.current.controller.liveBuffers.find((buffer) => buffer.document.relativePath === entry.relativePath) : undefined
			return originCurrent() && !latest.current.isBusy && entryCurrent(entry ?? null) &&
				latest.current.controller.activeBufferRuntime?.revision === originRevision &&
				currentBuffer?.bufferId === targetBuffer?.bufferId && currentBuffer?.runtime.revision === targetRevision
		}
		const restore = () => { if (originCurrent() && origin?.isConnected) origin.focus({ preventScroll: true }) }
		parameters.publishSession(lease, {
			id: lease.id,
			prompt: kind === "rename" ? "Rename Org file:" : kind === "move" ? "Move Org file to:" : kind === "create-directory" ? "New directory:" : "New Org file:",
			inputLabel: kind === "rename" ? "New filename" : kind === "move" ? "Destination directory" : "Workspace-relative path",
			initialInput,
			initialSelection: kind === "move" ? [0, initialInput.length]
				: [kind === "rename" ? 0 : prefix.length, initialInput.length - (kind === "create-directory" ? 0 : 4)],
			description: source ? `File: ${source.relativePath}` : `Folder: ${parent || "/"} · ${captured.controller.workspace.rootPath}`,
			emptyMessage: kind === "move" ? "Choose an existing workspace directory; / is the workspace root." : kind === "rename" ? "A filename ending in .org, without directory separators." : "Workspace-relative path; existing entries are not overwritten.",
			historyKey: `file-tree.${kind}`,
			candidates: kind === "move" ? ["/", ...captured.controller.workspace.directories] : [],
			annotatedCandidates: kind === "move" ? [
				{ value: "/", path: "/", label: "Workspace root", detail: captured.controller.workspace.rootPath },
				...captured.controller.workspace.directories.map((directory) => ({ value: directory, label: directory })),
			] : undefined,
			acceptCandidate: kind === "move",
			matchingMode: kind === "move" ? "path" : undefined,
			completion: "value",
			get cancelWhileAccepting() { return parameters.getSnapshot().phase !== "commit" },
			onCancel: () => { if (parameters.cancel(lease)) restore() },
			onAccept: async (input): Promise<OrgMinibufferAcceptResult> => {
				const value = (kind === "rename" && input === source?.name) || (kind === "move" && captured.controller.workspace?.directories.includes(input)) ? input : input.trim()
				if (!value) return { ok: false, message: kind === "move" ? "Choose a directory, or / for the workspace root." : "Enter a path or filename." }
				if (kind === "rename" && (value.includes("/") || value.includes("\\") || value === "." || value === ".." || !/\.org$/i.test(value)))
					return { ok: false, message: "Enter only an .org filename, without directory separators." }
				if (kind === "create-document" && !/\.org$/i.test(value))
					return { ok: false, message: "Use a filename ending in .org." }
				const destination = value === "/" ? "" : value
				if (kind === "move" && destination !== "" && !latest.current.controller.workspace?.directories.includes(destination))
					return { ok: false, message: "Choose an existing workspace directory, or / for the workspace root." }
				const path = kind === "rename" ? `${prefix}${value}` : kind === "move" ? `${destination ? `${destination}/` : ""}${source!.name}` : value
				const result = await parameters.accept<Promise<OrgMinibufferAcceptResult>>(lease, targetCurrent, true, async () => {
					const workspace = latest.current.controller.workspace
					if (path !== source?.relativePath && (workspace?.directories.includes(path) || workspace?.documents.some((document) => document.relativePath === path)))
						return { ok: false, message: `"${path}" already exists. Choose another name or destination.` }
					if (!parameters.beginCommit(lease)) return { ok: false, message: "This file operation is no longer current." }
					if (relocating) {
						if (!source || (path !== source.relativePath && !await captured.controller.moveDocument(source, path)))
							return { ok: false, message: `Could not ${kind === "rename" ? "rename" : "move"} "${source?.relativePath}" to "${path}". Refresh the workspace before trying again.` }
						if (latest.current.scopeKey === captured.scopeKey) {
							setQuery("")
							setCollapsedDirectories((current) => expandAncestors(current, path))
							setFocusRequest(path)
						}
					} else {
						const created = kind === "create-directory" ? await captured.controller.createDirectory(path) : await captured.controller.createDocument(path)
						if (!created) return { ok: false, message: `Could not create "${path}". Check the workspace error and choose another path or cancel.` }
						if (latest.current.scopeKey === captured.scopeKey) {
							setQuery("")
							setCollapsedDirectories((current) => expandAncestors(current, path))
							if (kind === "create-directory") setFocusRequest(path)
							else captured.onShowEditor()
						}
					}
					parameters.retire(lease)
					restore()
					return { ok: true }
				})
				return result ?? { ok: false, message: "The workspace or file operation changed. Cancel and start again." }
			},
		})
		return true
	}
	const disabledReason = (id: string, row: VisibleTreeRow | undefined = cursor): string | null => {
		if (!controller.workspace) return "Open a workspace first."
		if (["file-tree.rename", "file-tree.move", "file-tree.delete", "file-tree.copy-org-link"].includes(id) && row?.entry.type !== "document")
			return "Select an Org file. Directory mutations are not supported."
		if (["file-tree.open", "file-tree.rename", "file-tree.move", "file-tree.delete", "file-tree.create-document", "file-tree.create-directory", "file-tree.refresh", "file-tree.reveal-in-file-manager"].includes(id) && isBusy)
			return "Wait for the current workspace operation."
		if (row && ["file-tree.open", "file-tree.rename", "file-tree.move", "file-tree.delete"].includes(id)) {
			const buffer = controller.liveBuffers.find((buffer) => buffer.document.relativePath === row.entry.relativePath)
			if (buffer && controller.getBufferEffectState(buffer.bufferId)?.busy) return "This file has an operation in progress."
			if ((id === "file-tree.rename" || id === "file-tree.move") && buffer?.isDirty)
				return "Save this file before renaming or moving it."
		}
		if (id === "file-tree.reveal-active" && !activePath) return "No active file."
		if (id === "file-tree.collapse-all" && !directories?.length) return "No folders to collapse."
		if (id === "file-tree.focus-source" && !activePath) return "Open a file first."
		return null
	}
	const runAction = (id: string, path?: string | null): boolean => {
		const row = path === null ? undefined : path ? rows.find((candidate) => candidate.entry.relativePath === path) : cursor
		const reason = disabledReason(id, row)
		if (reason) { setStatus({ message: reason, error: true }); return false }
		const index = row ? rows.indexOf(row) : -1
		switch (id) {
			case "file-tree.filter":
				filterRef.current?.focus()
				filterRef.current?.select()
				return true
			case "file-tree.next": case "file-tree.previous": case "file-tree.first": case "file-tree.last": {
				const next = id === "file-tree.first" ? 0 : id === "file-tree.last" ? rows.length - 1 : index + (id === "file-tree.next" ? 1 : -1)
				const target = rows[Math.max(0, Math.min(rows.length - 1, next))]
				if (target) focusRow(target.entry.relativePath)
				return true
			}
			case "file-tree.parent":
				if (row?.parentPath) focusRow(row.parentPath)
				return true
			case "file-tree.collapse":
				if (row?.expanded) {
					const update = query.trim() ? setFilterCollapsed : setCollapsedDirectories
					update((current) => new Set([...current, row.entry.relativePath]))
				} else if (row?.parentPath) focusRow(row.parentPath)
				return true
			case "file-tree.expand": case "file-tree.open":
				if (!row) return false
				if (row.entry.type === "directory") {
					if (id === "file-tree.expand" && row.expanded) {
						const child = rows[index + 1]
						if (child?.parentPath === row.entry.relativePath) focusRow(child.entry.relativePath)
					} else {
						const update = query.trim() ? setFilterCollapsed : setCollapsedDirectories
						update((current) => { const next = new Set(current); if (next.has(row.entry.relativePath)) next.delete(row.entry.relativePath); else next.add(row.entry.relativePath); return next })
					}
				} else if (id === "file-tree.open") {
					const captured = latest.current
					const origin = elements.get(row.entry.relativePath)
					captured.onShowEditor()
					void captured.controller.openDocument(row.entry).then((opened) => {
						if (opened && latest.current.scopeKey === captured.scopeKey && document.activeElement === origin)
							latest.current.onFocusEditor()
					})
				}
				return true
			case "file-tree.create-document": return beginPathParameter("create-document", path === null ? undefined : row?.entry)
			case "file-tree.create-directory": return beginPathParameter("create-directory", path === null ? undefined : row?.entry)
			case "file-tree.rename": return beginPathParameter("rename", row?.entry)
			case "file-tree.move": return beginPathParameter("move", row?.entry)
			case "file-tree.delete":
				if (row?.entry.type !== "document") return false
				{
					const captured = latest.current
					const nextPath = rows[index + 1]?.entry.relativePath ?? rows[index - 1]?.entry.relativePath
					void captured.controller.deleteDocument(row.entry).then((deleted) => {
						if (deleted && latest.current.scopeKey === captured.scopeKey && nextPath && !document.activeElement?.closest('[data-org-editor-window], [data-org-parameter-input]'))
							focusRow(nextPath)
					})
				}
				return true
			case "file-tree.copy-relative-path": case "file-tree.copy-absolute-path": case "file-tree.copy-org-link": {
				if (!row) return false
				const value = id === "file-tree.copy-relative-path" ? row.entry.relativePath
					: id === "file-tree.copy-absolute-path" ? `${rootPath?.replace(/[/\\]$/, "")}/${row.entry.relativePath}`
					: `[[file:${row.entry.relativePath}]]`
				const capturedScope = scopeKey
				void (async () => {
					try {
						if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable")
						await navigator.clipboard.writeText(value)
						if (latest.current.scopeKey === capturedScope) setStatus({ message: "Copied" })
					} catch {
						if (latest.current.scopeKey === capturedScope) setStatus({ message: "Could not access the clipboard", error: true })
					}
				})()
				return true
			}
			case "file-tree.refresh": void controller.refreshWorkspace(); return true
			case "file-tree.reveal-in-file-manager": void controller.revealWorkspacePath(path === null ? null : row?.entry.relativePath ?? null); return true
			case "file-tree.reveal-active":
				if (!activePath) return false
				setCollapsedDirectories((current) => expandAncestors(current, activePath))
				setFilterCollapsed((current) => expandAncestors(current, activePath))
				if (!activePath.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) setQuery("")
				setSelectedPath(activePath)
				setFocusRequest(activePath)
				return true
			case "file-tree.collapse-all":
				setQuery("")
				setCollapsedDirectories(new Set(directories))
				return true
			case "file-tree.focus-source": onFocusEditor(); return true
			case "file-tree.hide": onHide(); onFocusEditor(); return true
			default: return false
		}
	}
	const actionRef = useRef(runAction)
	actionRef.current = runAction
	const invoke = useCallback((id: string, path?: string | null) => actionRef.current(id, path), [])
	const captureMenu = (path: string | null): TreeMenuTarget => {
		if (path) setSelectedPath(path)
		const entry = path ? rows.find((row) => row.entry.relativePath === path)?.entry ?? null : null
		const buffer = entry?.type === "document" ? controller.liveBuffers.find((buffer) => buffer.document.relativePath === entry.relativePath) : undefined
		return { scopeKey, workspaceRoot: rootPath ?? null, generation: configuration.generation, entry, bufferId: buffer?.bufferId ?? null, sourceRevision: buffer?.runtime.revision ?? null }
	}
	const menuReason = (id: string, target: TreeMenuTarget) => {
		if (!controller.workspace) return "Open a workspace first."
		const buffer = target.entry?.type === "document" ? controller.liveBuffers.find((buffer) => buffer.document.relativePath === target.entry?.relativePath) : undefined
		if (scopeKey !== target.scopeKey || target.generation !== configuration.generation || !entryCurrent(target.entry) ||
			target.bufferId !== (buffer?.bufferId ?? null) || target.sourceRevision !== (buffer?.runtime.revision ?? null))
			return "This menu target changed. Close and reopen the menu."
		return disabledReason(id, target.entry ? rows.find((row) => row.entry.relativePath === target.entry?.relativePath) : undefined)
	}
	const invokeMenu = (id: string, target: TreeMenuTarget) => {
		const reason = menuReason(id, target)
		if (reason) { setStatus({ message: reason, error: true }); return false }
		return invoke(id, target.entry?.relativePath ?? null)
	}
	const owner = useMemo(() => ({}), [scopeKey, cursorPath])
	const input = useOrgScopedInput({
		scope: "file-tree", owner, execute: invoke,
		onUnavailable: (id) => setStatus({ message: disabledReason(id) ?? "This command is unavailable in the file tree.", error: true }),
		acceptsEvent: (event) => event.target instanceof Element && Boolean(treeRef.current?.contains(event.target)) && Boolean(event.target.closest('[role="treeitem"]')),
	})
	return (
		<aside className="flex h-full min-w-0 flex-col bg-sidebar" aria-label="Workspace files">
			<div className="flex h-10 shrink-0 items-center gap-1 px-2">
				<button type="button"
					className="h-8 min-w-0 flex-1 truncate rounded px-1 text-left text-sm font-semibold hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:opacity-60"
					aria-label={`Switch workspace${rootPath ? `: ${rootPath}` : ""}`} title={`Switch workspace: ${rootPath ?? ""}`} disabled={isBusy}
					onClick={() => void controller.selectWorkspace()}>
					{rootPath ? workspaceName(rootPath) : "Grain"}
				</button>
				{tools}
				<Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Hide sidebar" title="Hide sidebar" onClick={onHide}><PanelLeftClose className="size-4" /></Button>
			</div>
			<div className="shrink-0 px-2 pt-2">
				<div className="flex h-8 min-w-0 items-center gap-2 rounded-md border border-transparent bg-background/70 px-2 text-muted-foreground focus-within:border-ring/40 focus-within:bg-background">
					<Search className="size-3.5 shrink-0" />
					<input ref={filterRef} value={query} onChange={(event) => { setQuery(event.target.value); setFilterCollapsed(new Set()) }}
						placeholder="Filter files…" aria-label="Filter workspace files" data-org-parameter-input=""
						autoComplete="off" spellCheck={false}
						onKeyDown={(event) => {
							if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
							if (event.key === "Escape") {
								event.preventDefault()
								event.stopPropagation()
								if (event.repeat) return
								if (query) { setQuery(""); setFilterCollapsed(new Set()) }
								else if (cursorPath) focusRow(cursorPath)
							} else if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter") {
								event.preventDefault()
								event.stopPropagation()
								const firstFile = rows.find((row) => row.entry.type === "document")
								const target = event.key === "ArrowUp" ? rows.findLast((row) => row.entry.type === "document") ?? rows.at(-1)
									: firstFile ?? rows[0]
								if (!target) return
								focusRow(target.entry.relativePath)
								if (event.key === "Enter") invoke("file-tree.open", target.entry.relativePath)
							}
						}}
						className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground" />
					{query && <button type="button" aria-label="Clear file filter" title="Clear filter (Esc)" className="flex size-5 shrink-0 items-center justify-center rounded hover:bg-sidebar-accent hover:text-foreground"
						onMouseDown={(event) => event.preventDefault()} onClick={() => { setQuery(""); setFilterCollapsed(new Set()); filterRef.current?.focus() }}><X className="size-3" /></button>}
				</div>
			</div>
			<TreeMenu key={`header:${scopeKey}`} path={null} label="Workspace root actions" className="flex h-10 shrink-0 items-center gap-px px-2"
				actions={rootActions} capture={captureMenu} reason={menuReason} invoke={invokeMenu} shortcuts={shortcuts}>
				<h2 className="min-w-0 flex-1 px-1 text-[11px] font-medium text-muted-foreground">Files</h2>
				<span aria-live="polite" aria-label={normalizedQuery ? `${matchingCount} of ${documents?.length ?? 0} files` : `${matchingCount} files`}
					className="mr-1 text-[10px] tabular-nums text-muted-foreground">{normalizedQuery ? `${matchingCount}/${documents?.length ?? 0}` : matchingCount}</span>
				{([
					["file-tree.create-document", "New Org file", FilePlus2],
					["file-tree.refresh", "Refresh workspace", RefreshCw],
				] as const).map(([id, label, Icon]) => <Button key={id} variant="ghost" size="icon" className="size-7 shrink-0"
					aria-label={label} title={disabledReason(id) ?? label} disabled={Boolean(disabledReason(id))}
					onClick={() => invoke(id, null)}><Icon className="size-3.5" /></Button>)}
			</TreeMenu>
			{status && <div role={status.error ? "alert" : "status"} className={`mx-2 mb-1 flex items-start gap-1 rounded px-2 py-1 text-[11px] ${status.error ? "bg-destructive/10 text-destructive" : "bg-muted/60 text-muted-foreground"}`}>
				<span className="min-w-0 flex-1 break-words">{status.message}</span>
				<button type="button" aria-label="Dismiss file feedback" className="shrink-0 rounded p-0.5 hover:bg-muted" onMouseDown={(event) => event.preventDefault()} onClick={() => setStatus(null)}><X className="size-3" /></button>
			</div>}
			<TreeMenu key={`viewport:${scopeKey}`} path={null} className="min-h-0 min-w-0 flex-1 overflow-auto px-1.5 pb-2" viewportRef={treeViewportRef}
				actions={rootActions} capture={captureMenu} reason={menuReason} invoke={invokeMenu} shortcuts={shortcuts}>
				{rows.length ? <ul ref={treeRef} role="tree" aria-label="Workspace file tree" data-org-file-tree="" className="min-w-0 space-y-px" onKeyDown={(event) => input.handleKeyDown(event.nativeEvent)}>
					{rows.map((row) => <OrgTreeRow key={row.entry.relativePath} row={row} selected={row.entry.relativePath === cursorPath} active={row.entry.relativePath === activePath}
						modified={modifiedPaths.has(row.entry.relativePath)}
						elements={elements} shortcuts={shortcuts} onSelect={setSelectedPath} onAction={invoke} capture={captureMenu} reason={menuReason} invoke={invokeMenu} />)}
				</ul> : <div className="px-3 py-7 text-center text-xs text-muted-foreground">
					<p className="font-medium text-foreground">{normalizedQuery ? "No matching files" : controller.workspace ? "No Org files yet" : isBusy ? "Opening workspace…" : "No workspace open"}</p>
					<p className="mt-1 break-words leading-relaxed">{normalizedQuery ? `No paths match “${query.trim()}”.` : controller.workspace ? "Create an Org file to start writing." : "Choose a folder for your Org files."}</p>
					{normalizedQuery ? <Button variant="ghost" size="sm" className="mt-3 h-7 text-xs" onClick={() => { setQuery(""); setFilterCollapsed(new Set()); filterRef.current?.focus() }}>Clear filter</Button>
						: <Button variant="ghost" size="sm" className="mt-3 h-7 text-xs" disabled={isBusy}
							onClick={() => controller.workspace ? invoke("file-tree.create-document", null) : void controller.selectWorkspace()}>{controller.workspace ? "New Org file…" : "Open workspace…"}</Button>}
				</div>}
			</TreeMenu>
		</aside>
	)
})
