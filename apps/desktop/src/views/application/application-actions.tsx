import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { deleteSavedCaptureDrafts, openConfigurationFile, reloadConfiguration } from "@/flows/configuration/configuration.flow"
import { useApplicationCommandRegistration, type ApplicationCommandDescriptor } from "./application-command-provider"
import { useApplicationTools } from "./application-tool-provider"
import { useConfirm } from "@/views/ui/confirm"

const navigationCommands = [
	{ id: "application.org", label: "Open Org workspace", to: "/org" },
	{ id: "application.history", label: "Preview historical SQLite (read-only)", to: "/history" },
	{ id: "application.logs", label: "Open Logs", to: "/logs" },
	{ id: "application.about", label: "About Grain", to: "/about" },
] as const

/** Only mounted, executable application actions enter the live inventory. */
export function ApplicationActions() {
	const [owner] = useState(() => ({}))
	const navigate = useNavigate()
	const confirm = useConfirm()
	const { registry: tools } = useApplicationTools()
	const commands: readonly ApplicationCommandDescriptor[] = [
		...navigationCommands.map((entry): ApplicationCommandDescriptor => ({
			id: entry.id, label: entry.label, group: "Application", getDisabledReason: () => null,
			capture: () => async () => { await navigate({ to: entry.to }); return { kind: "success" } },
		})),
		{
			id: "application.configuration.open", label: "Open configuration file", group: "Application",
			getDisabledReason: () => null,
			capture: () => async () => openConfigurationFile(),
		},
		{
			id: "application.configuration.reload", label: "Reload configuration", group: "Application",
			getDisabledReason: () => null,
			capture: () => async () => reloadConfiguration(),
		},
		{
			id: "application.capture.delete-drafts", label: "Delete saved Capture drafts", group: "Recovery",
			getDisabledReason: () => null,
			capture: () => () => deleteSavedCaptureDrafts(
				() => confirm({
					title: "Delete saved Capture drafts?",
					description: "Permanently delete all locally saved Capture drafts and retained publication markers? This cannot be undone. Org files will not be changed.",
					confirmText: "Delete saved drafts", cancelText: "Keep drafts",
				}),
				() => tools.getSnapshot().some(tool => tool.state.pending),
			),
		},
	]
	useApplicationCommandRegistration(owner, commands)
	return null
}
