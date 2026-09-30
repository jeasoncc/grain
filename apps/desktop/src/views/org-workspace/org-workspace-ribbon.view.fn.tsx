import { Link } from "@tanstack/react-router"
import { CalendarDays, FilePenLine, Files, NotebookPen, Search, Settings } from "lucide-react"
import type { ReactNode } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/views/ui/tooltip"

const RibbonAction = ({
	active = false,
	children,
	disabled = false,
	label,
	onClick,
}: {
	readonly active?: boolean
	readonly children: ReactNode
	readonly disabled?: boolean
	readonly label: string
	readonly onClick: () => void
}) => (
	<Tooltip>
		<TooltipTrigger asChild>
			<button
				type="button"
				aria-label={label}
				aria-pressed={active}
				disabled={disabled}
				onClick={onClick}
				className={`relative flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${active ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:-left-1.5 before:h-5 before:w-0.5 before:rounded-r before:bg-sidebar-primary" : ""}`}
			>
				{children}
			</button>
		</TooltipTrigger>
		<TooltipContent side="right" sideOffset={8}>
			{label}
		</TooltipContent>
	</Tooltip>
)

export const OrgWorkspaceRibbon = ({
	activeView,
	isBusy,
	onCapture,
	onCreateDiary,
	onQuickOpen,
	onShowAgenda,
	onShowFiles,
}: {
	readonly activeView: "agenda" | "editor"
	readonly isBusy: boolean
	readonly onCapture: () => void
	readonly onCreateDiary: () => void
	readonly onQuickOpen: () => void
	readonly onShowAgenda: () => void
	readonly onShowFiles: () => void
}) => (
	<aside
		className="flex w-11 shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar py-1.5"
		aria-label="Workspace ribbon"
	>
		<div className="flex flex-col items-center gap-1">
			<RibbonAction active={activeView === "editor"} label="Files" onClick={onShowFiles}>
				<Files className="size-[17px]" />
			</RibbonAction>
			<RibbonAction label="Quick open (Ctrl+O)" onClick={onQuickOpen}>
				<Search className="size-[17px]" />
			</RibbonAction>
			<RibbonAction active={activeView === "agenda"} label="Agenda" onClick={onShowAgenda}>
				<CalendarDays className="size-[17px]" />
			</RibbonAction>
		</div>
		<div className="mt-auto flex flex-col items-center gap-1">
			<RibbonAction disabled={isBusy} label="Quick capture" onClick={onCapture}>
				<NotebookPen className="size-[17px]" />
			</RibbonAction>
			<RibbonAction disabled={isBusy} label="New diary (today)" onClick={onCreateDiary}>
				<FilePenLine className="size-[17px]" />
			</RibbonAction>
			<Tooltip>
				<TooltipTrigger asChild>
					<Link
						to="/settings"
						aria-label="Settings"
						className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
					>
						<Settings className="size-[17px]" />
					</Link>
				</TooltipTrigger>
				<TooltipContent side="right" sideOffset={8}>
					Settings
				</TooltipContent>
			</Tooltip>
		</div>
	</aside>
)
