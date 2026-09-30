import {
	CalendarDays,
	FilePenLine,
	Files,
	FolderSync,
	NotebookPen,
	PanelLeft,
	PanelRight,
	Save,
	Search,
} from "lucide-react"
import type { ReactNode } from "react"
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut,
} from "@/views/ui/command"

interface OrgCommand {
	readonly disabled?: boolean
	readonly icon: ReactNode
	readonly label: string
	readonly run: () => void
	readonly shortcut?: string
}

export const OrgCommandPalette = ({
	open,
	onOpenChange,
	commands,
}: {
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly commands: readonly OrgCommand[]
}) => (
	<CommandDialog
		open={open}
		onOpenChange={onOpenChange}
		className="top-[22%] max-w-[560px] translate-y-0"
		showCloseButton={false}
	>
		<CommandInput placeholder="Type a command…" autoFocus />
		<CommandList className="max-h-[360px] p-1">
			<CommandEmpty>No matching commands.</CommandEmpty>
			<CommandGroup heading="Grain commands">
				{commands.map((command) => (
					<CommandItem
						key={command.label}
						disabled={command.disabled}
						value={command.label}
						onSelect={() => {
							command.run()
							onOpenChange(false)
						}}
					>
						{command.icon}
						<span>{command.label}</span>
						{command.shortcut && <CommandShortcut>{command.shortcut}</CommandShortcut>}
					</CommandItem>
				))}
			</CommandGroup>
		</CommandList>
	</CommandDialog>
)

export const orgCommandIcons = {
	agenda: <CalendarDays className="size-4" />,
	capture: <NotebookPen className="size-4" />,
	diary: <FilePenLine className="size-4" />,
	files: <Files className="size-4" />,
	inspector: <PanelRight className="size-4" />,
	quickOpen: <Search className="size-4" />,
	refresh: <FolderSync className="size-4" />,
	save: <Save className="size-4" />,
	sidebar: <PanelLeft className="size-4" />,
} as const
