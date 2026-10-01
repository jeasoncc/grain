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
import { useEffect, useRef, useState, type ReactNode } from "react"
import type { OrgMinibufferSession } from "@/types/editor/minibuffer.interface"
import { OrgMinibuffer } from "./org-minibuffer.view.fn"

interface OrgCommand {
	readonly id?: string
	readonly disabled?: boolean
	readonly icon: ReactNode
	readonly label: string
	readonly run: () => void
	readonly shortcut?: string
}

/** Execute-command parameter session; execution remains at the command/effect boundary. */
export const OrgCommandPalette = ({
	open,
	onOpenChange,
	commands,
	sessionKey,
}: {
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly commands: readonly OrgCommand[]
	readonly sessionKey?: string
}) => {
	const [session, setSession] = useState<OrgMinibufferSession | null>(null)
	const generation = useRef(0)
	const latest = useRef({ commands, onOpenChange, sessionKey })
	latest.current = { commands, onOpenChange, sessionKey }
	useEffect(() => {
		const id = ++generation.current
		if (!open) {
			setSession(null)
			return
		}
		const previousFocus =
			document.activeElement instanceof HTMLElement ? document.activeElement : null
		setSession({
			id,
			prompt: "Execute command:",
			initialInput: "",
			historyKey: "workspace.execute-command",
			completion: "value",
			acceptCandidate: true,
			candidates: commands.map((command) => command.label),
			onCancel: () => {
				if (generation.current !== id || latest.current.sessionKey !== sessionKey) return
				++generation.current
				setSession(null)
				latest.current.onOpenChange(false)
				if (previousFocus?.isConnected) previousFocus.focus()
			},
			onAccept: (input) => {
				if (generation.current !== id || latest.current.sessionKey !== sessionKey)
					return { ok: false, message: "This command session is no longer active." }
				const selected = latest.current.commands.find((command) => command.label === input)
				if (!selected) return { ok: false, message: "Choose an available command." }
				if (selected.disabled)
					return { ok: false, message: "This command is unavailable in the current context." }
				++generation.current
				setSession(null)
				latest.current.onOpenChange(false)
				if (previousFocus?.isConnected) previousFocus.focus()
				selected.run()
				return { ok: true }
			},
		})
		return () => {
			++generation.current
		}
	}, [open, sessionKey])
	useEffect(() => {
		setSession((current) =>
			current ? { ...current, candidates: commands.map((command) => command.label) } : null,
		)
	}, [commands])
	return <OrgMinibuffer session={open ? session : null} />
}

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
