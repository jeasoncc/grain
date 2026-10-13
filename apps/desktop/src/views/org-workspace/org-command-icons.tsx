import { CalendarDays, FilePenLine, Files, FolderSync, NotebookPen, PanelLeft, PanelRight, Save, Search } from "lucide-react"

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
