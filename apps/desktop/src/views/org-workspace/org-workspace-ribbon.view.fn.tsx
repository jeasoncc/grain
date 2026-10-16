import { CalendarDays, FilePenLine, Files, NotebookPen, Search } from "lucide-react"
import type { ReactNode } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/views/ui/tooltip"
import { ApplicationToolLauncher } from "@/views/application/application-tool-provider"

const RibbonAction = ({
	active = false,
	children,
	disabled = false,
	label,
	description,
	onClick,
}: {
	readonly active?: boolean
	readonly children: ReactNode
	readonly disabled?: boolean
	readonly label: string
	readonly description?: string
	readonly onClick: () => void
}) => (
	<Tooltip>
		<TooltipTrigger asChild>
			<button
				type="button"
				aria-label={label}
				aria-description={description}
				aria-pressed={active}
				disabled={disabled}
				onClick={onClick}
				className={`relative flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${active ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:-left-1.5 before:h-5 before:w-0.5 before:rounded-r before:bg-sidebar-primary" : ""}`}
			>
				{children}
			</button>
		</TooltipTrigger>
		<TooltipContent side="right" sideOffset={8}>
			{description ? (
				<div className="max-w-64 space-y-1">
					<p className="font-medium">{label}</p>
					<p>{description}</p>
				</div>
			) : label}
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
		className="flex w-11 shrink-0 flex-col items-center overflow-y-auto bg-sidebar py-1"
		aria-label="Workspace ribbon"
	>
		<div className="flex shrink-0 flex-col items-center gap-1" role="group" aria-label="Workspace navigation">
			<RibbonAction active={activeView === "editor"} label="Files" onClick={onShowFiles}>
				<Files className="size-[17px]" />
			</RibbonAction>
			<RibbonAction label="Quick open (Ctrl+O)" onClick={onQuickOpen}>
				<Search className="size-[17px]" />
			</RibbonAction>
			<RibbonAction active={activeView === "agenda"} label="Agenda" description="Scheduled tasks, deadlines and dated events from Org Source. Entries open their original file; configured views can also list TODO or search matches." onClick={onShowAgenda}>
				<CalendarDays className="size-[17px]" />
			</RibbonAction>
		</div>
		<div className="mt-auto flex shrink-0 flex-col items-center gap-1 pt-4">
			<div className="flex flex-col items-center gap-1 pt-2" role="group" aria-label="Quick creation">
				<RibbonAction disabled={isBusy} label="Quick capture" onClick={onCapture}>
					<NotebookPen className="size-[17px]" />
				</RibbonAction>
				<RibbonAction disabled={isBusy} label="New diary entry" onClick={onCreateDiary}>
					<FilePenLine className="size-[17px]" />
				</RibbonAction>
			</div>
			<div className="mt-1 flex flex-col items-center gap-1 pt-2">
				<ApplicationToolLauncher compact />
			</div>
		</div>
	</aside>
)
