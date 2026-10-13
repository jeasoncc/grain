import { useLayoutEffect, useMemo, useRef } from "react"
import type { ApplicationCommandDescriptor } from "@/flows/application-command-registry"
import { createTrustedCompiledExtension, type CompiledExtensionCommandHandle, type TrustedCompiledExtension } from "@/flows/application/trusted-compiled-extension"
import type { OrgCapturedSourceTransform } from "@/views/org-editor/org-editor.types"
import { useApplicationCommandHost } from "./application-command-provider"
import { useApplicationTools } from "./application-tool-provider"

/** React replay creates a new owner; captured callbacks never gain replacement-owner authority. */
export function useTrustedCompiledExtension({ identity, commands, captureSource }: {
	readonly identity: object
	readonly commands?: readonly ApplicationCommandDescriptor[]
	readonly captureSource?: () => OrgCapturedSourceTransform | null
}) {
	const { registry } = useApplicationCommandHost()
	const { registry: tools } = useApplicationTools()
	const latest = useRef({ commands, captureSource })
	latest.current = { commands, captureSource }
	const lifetime = useRef<TrustedCompiledExtension | null>(null)
	const registration = useRef<CompiledExtensionCommandHandle | null>(null)
	const signature = JSON.stringify(commands?.map((entry) => [entry.id, entry.label, entry.group, entry.shortcut, entry.getDisabledReason()]))
	const proxies = useMemo(() => commands?.map((entry): ApplicationCommandDescriptor => ({
		id: entry.id, label: entry.label, group: entry.group, shortcut: entry.shortcut,
		getDisabledReason: () => {
			const command = latest.current.commands?.find((command) => command.id === entry.id)
			return command ? command.getDisabledReason() : "This command is no longer available."
		},
		capture: () => latest.current.commands?.find((command) => command.id === entry.id)?.capture() ?? { kind: "cancelled" },
	})), [signature])
	useLayoutEffect(() => {
		const owned = createTrustedCompiledExtension({ commands: registry, tools, captureSource: () => latest.current.captureSource?.() ?? null })
		lifetime.current = owned
		registration.current = proxies ? owned.registerCommands(proxies) : null
		return () => {
			// The application host retains any declined tool's original portal and owner.
			// This producer ref is never reused by a replacement identity.
			void owned.unload()
			if (lifetime.current === owned) { lifetime.current = null; registration.current = null }
		}
	}, [registry, tools, identity])
	useLayoutEffect(() => {
		if (!lifetime.current) return
		if (registration.current) lifetime.current.updateCommands(registration.current, proxies ?? [])
		else if (proxies) registration.current = lifetime.current.registerCommands(proxies)
	}, [registry, identity, proxies])
	return lifetime
}
