import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useTheme } from "@/hooks/use-theme"
import { useApplicationCommandRegistration, type ApplicationCommandDescriptor } from "./application-command-provider"

const navigationCommands = [
	{ id: "application.org", label: "Open Org workspace", to: "/org" },
	{ id: "application.history", label: "Preview historical SQLite (read-only)", to: "/history" },
	{ id: "application.settings", label: "Open Settings", to: "/settings/design" },
	{ id: "application.settings.general", label: "Open General settings", to: "/settings/general" },
	{ id: "application.settings.editor", label: "Open Editor settings", to: "/settings/editor" },
	{ id: "application.settings.typography", label: "Open Typography settings", to: "/settings/typography" },
	{ id: "application.settings.icons", label: "Open Icon settings", to: "/settings/icons" },
	{ id: "application.settings.diagrams", label: "Open Diagram settings", to: "/settings/diagrams" },
	{ id: "application.settings.data", label: "Open Data settings", to: "/settings/data" },
	{ id: "application.settings.export", label: "Open Export settings", to: "/settings/export" },
	{ id: "application.settings.logs", label: "Open Logs", to: "/settings/logs" },
	{ id: "application.about", label: "About Grain", to: "/settings/about" },
] as const

/** Only mounted, executable application actions enter the live inventory. */
export function ApplicationActions() {
	const [owner] = useState(() => ({}))
	const navigate = useNavigate()
	const { isDark, setMode } = useTheme()
	const commands: readonly ApplicationCommandDescriptor[] = [
		...navigationCommands.map((entry): ApplicationCommandDescriptor => ({
			id: entry.id, label: entry.label, group: "Application", getDisabledReason: () => null,
			capture: () => async () => { await navigate({ to: entry.to }); return { kind: "success" } },
		})),
		{
			id: "application.theme", label: isDark ? "Switch to Light Theme" : "Switch to Dark Theme", group: "Settings",
			getDisabledReason: () => null,
			capture: () => { const nextMode = isDark ? "light" : "dark"; return () => { setMode(nextMode); return { kind: "success" } } },
		},
	]
	useApplicationCommandRegistration(owner, commands)
	return null
}
