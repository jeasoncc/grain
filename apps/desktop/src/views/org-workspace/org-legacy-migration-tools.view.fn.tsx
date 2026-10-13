import { Link } from "@tanstack/react-router"
import { Database, DatabaseBackup, RotateCcw, ShieldCheck } from "lucide-react"
import type { RefObject } from "react"
import type { ParameterSession } from "@/flows/org-command/parameter-session"
import { useLegacyMigrationSource } from "@/hooks/use-legacy-migration-source"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { useApplicationCommandHost } from "@/views/application/application-command-provider"
import { DropdownMenuItem, DropdownMenuLabel } from "@/views/ui/dropdown-menu"

type Action = "migrateLegacyWorkspace" | "verifyLegacyMigration" | "runLegacyRecoveryDrill"

// Loaded only after immutable native authority reports explicit read-only legacy mode.
export const OrgLegacyMigrationTools = ({ controller, isBusy, sourcesEnabled, onEnableSources, parameters, context }: {
	readonly controller: OrgWorkspaceController
	readonly isBusy: boolean
	readonly sourcesEnabled: boolean
	readonly onEnableSources: () => void
	readonly parameters: ParameterSession
	readonly context: RefObject<{ controller: OrgWorkspaceController; isBusy: boolean }>
}) => {
	const sources = useLegacyMigrationSource(sourcesEnabled)
	const host = useApplicationCommandHost()
	const unavailable = !sourcesEnabled || !controller.workspace || !sources.data?.length || isBusy || Boolean(host.session)
	const choose = (action: Action, label: string) => {
		if (unavailable || !sources.data || !controller.workspace) return
		const captured = controller
		const root = controller.workspace.rootPath
		const grant = controller.workspace.capabilityToken
		const sessionId = controller.workspaceSessionId
		const bufferId = controller.activeBufferId
		const choices = sources.data.map(({ id, name }) => Object.freeze({ id, name }))
		const lease = parameters.begin()
		if (!lease) return
		const current = () => {
			const live = context.current
			return !live.isBusy &&
				live.controller.workspaceSessionId === sessionId &&
				live.controller.activeBufferId === bufferId &&
				live.controller.workspace?.rootPath === root &&
				live.controller.workspace?.capabilityToken === grant
		}
		parameters.publishSession(lease, {
			id: lease.id, prompt: `${label} — historical workspace:`, initialInput: "",
			completion: "value", acceptCandidate: true, matchingMode: "multi-term",
			candidates: choices.map(({ id }) => id),
			annotatedCandidates: choices.map(({ id, name }) => ({ value: id, label: name, detail: id })),
			onCancel: () => { parameters.cancel(lease) },
			onAccept: (id) => {
				if (!parameters.current(lease) || !current()) return { ok: false, message: "The captured Org destination is no longer current." }
				const selected = choices.find((workspace) => workspace.id === id)
				if (!selected) return { ok: false, message: "Select an exact historical workspace from the candidates." }
				const accepted = parameters.accept(lease, current, false, () => {
					// Selection hands off once; the controller owns confirmation, source rechecks
					// and publication using its captured destination grant/session.
					parameters.retire(lease)
					void captured[action]({ id: selected.id })
					return { ok: true as const }
				})
				return accepted ?? { ok: false, message: "This selection was cancelled or already accepted." }
			},
		})
	}
	return <>
		<DropdownMenuLabel>Read-only legacy migration</DropdownMenuLabel>
		<DropdownMenuItem asChild><Link to="/history"><Database className="mr-2 size-4" />Preview historical SQLite (read-only)</Link></DropdownMenuItem>
		{!sourcesEnabled && <DropdownMenuItem onClick={onEnableSources}><DatabaseBackup className="mr-2 size-4" />Load read-only migration sources…</DropdownMenuItem>}
		{sourcesEnabled && sources.isLoading && <DropdownMenuLabel>Reading historical workspace metadata…</DropdownMenuLabel>}
		{sourcesEnabled && sources.error && <DropdownMenuLabel><span role="alert">Historical source unavailable: {sources.error.message}</span></DropdownMenuLabel>}
		{sourcesEnabled && sources.isSuccess && !sources.data.length && <DropdownMenuLabel>No historical workspaces exist.</DropdownMenuLabel>}
		<DropdownMenuItem disabled={unavailable} onSelect={() => choose("migrateLegacyWorkspace", "Migrate")}><DatabaseBackup className="mr-2 size-4" />Migrate legacy workspace</DropdownMenuItem>
		<DropdownMenuItem disabled={unavailable} onSelect={() => choose("verifyLegacyMigration", "Verify")}><ShieldCheck className="mr-2 size-4" />Verify migration</DropdownMenuItem>
		<DropdownMenuItem disabled={unavailable} onSelect={() => choose("runLegacyRecoveryDrill", "Recovery drill")}><RotateCcw className="mr-2 size-4" />Run recovery drill</DropdownMenuItem>
	</>
}
