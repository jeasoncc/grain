import { useRef, useState } from "react"
import type { OrgWorkspaceController } from "./use-org-workspace"
import type { OrgEditorCommandTarget } from "@/views/org-editor/org-editor.types"
import type { ApplicationToolOrigin } from "@/flows/application/application-tool-registry"
import type { ApplicationCommandResult } from "@/views/application/application-command-provider"
import type { OrgClockCommand, OrgClockOutcome } from "@/flows/org-workspace/org-clock-owner"
import { hasOrgAgendaActionOrigin, validateOrgAgendaOrigin, type OrgAgendaEntry } from "@/pipes/org/org-agenda.pipe"
import { useTrustedCompiledExtension } from "@/views/application/trusted-compiled-extension"

export interface OrgClockReportTool {
	readonly id: string
	readonly sourcePath: string
	readonly content: string
	readonly origin: ApplicationToolOrigin
	readonly isCurrent: () => boolean
}
/** The report is a retained literal snapshot; only Root's captured transform can
 * edit Source, and accepted commands drain even when their producer retires. */
export function useOrgClockWorkflow({ controller, getTarget, captureOrigin }: {
	readonly controller: OrgWorkspaceController
	readonly getTarget: () => OrgEditorCommandTarget | null
	readonly captureOrigin: () => ApplicationToolOrigin | null
}) {
	const ports = useRef({ controller, getTarget, captureOrigin })
	ports.current = { controller, getTarget, captureOrigin }
	const identity = useRef({})
	const extension = useTrustedCompiledExtension({ identity: identity.current,
		captureSource: () => ports.current.getTarget()?.captureSourceTransform?.() ?? null })
	const [reports, setReports] = useState<readonly OrgClockReportTool[]>([])
	const publish = (outcome: OrgClockOutcome, sourcePath: string, origin: ApplicationToolOrigin, isCurrent: () => boolean): ApplicationCommandResult => {
		if (outcome.kind !== "report") return outcome
		const minutes = (value: number) => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`
		const active = outcome.report.active
		const running = active ? outcome.runningMinutes === null
			? "Open row is recovered/unowned; no elapsed epoch duration was inferred."
			: `Known live clock: ${minutes(outcome.runningMinutes)} elapsed (native epoch).` : "No active clock."
		const liveMinutes = outcome.runningMinutes ?? 0
		const totalIncludingLive = outcome.report.totalMinutes + liveMinutes
		if (!Number.isSafeInteger(totalIncludingLive)) return { kind: "rejected", message: "Clock report including the known live epoch exceeds exact minute precision." }
		const content = [`Clock report · ${sourcePath}`, `Completed total: ${minutes(outcome.report.totalMinutes)} (${outcome.report.completedRows} rows)`, running,
			...(outcome.runningMinutes === null ? [] : [`Total including known live clock: ${minutes(totalIncludingLive)}`]),
			"Completed rows are attributed to their start date; no boundary prorating.",
			"Direct/subtree minutes include only the identified known live epoch, never recovered open rows.", "", "Direct\tSubtree\tHeading",
			...outcome.report.headings.map(total => {
				const direct = total.directMinutes + (active?.headingFrom === total.heading.from ? liveMinutes : 0)
				const subtree = total.subtreeMinutes + (active && active.headingFrom >= total.heading.from && active.headingFrom < total.heading.subtreeTo ? liveMinutes : 0)
				return `${minutes(direct)}\t${minutes(subtree)}\t${"*".repeat(total.heading.level)} ${total.heading.title}`
			})].join("\n")
		setReports(current => [...current, Object.freeze({ id: crypto.randomUUID(), sourcePath, content, origin, isCurrent })])
		return { kind: "success", message: "Clock report opened; Source and canonical history are unchanged." }
	}
	const capture = (operation: OrgClockCommand): (() => Promise<ApplicationCommandResult>) | null => {
		const current = ports.current.controller
		const lifetime = extension.current
		const transform = lifetime?.captureSource()
		const origin = ports.current.captureOrigin()
		if (!lifetime || !transform || !origin?.isLive()) return null
		const context = transform.snapshot
		const buffer = current.liveBuffers.find(buffer => buffer.document.relativePath === context.relativePath && buffer.runtime.source === context.content)
		if (!buffer || buffer.runtime.closed) return null
		const permit = current.captureBufferWindowPermit(context.windowId, buffer.bufferId)
		const scopeCurrent = () => lifetime.isLive() && origin.isLive() && permit() && ports.current.controller.clock === current.clock &&
			ports.current.controller.workspaceSessionId === current.workspaceSessionId &&
			ports.current.controller.workspace?.rootPath === current.workspace?.rootPath &&
			ports.current.controller.workspace?.capabilityToken === current.workspace?.capabilityToken &&
			ports.current.controller.liveBuffers.some(live => live.runtime === buffer.runtime && live.document.relativePath === context.relativePath)
		const run = current.clock.captureSource(operation, transform, buffer.runtime, scopeCurrent)
		if (!run) return null
		return () => lifetime.accept(async () => publish(await run(), context.relativePath, origin, () => scopeCurrent() && transform.isCurrent()))
	}
	const executeAgenda = (entry: OrgAgendaEntry, operation: OrgClockCommand, origin: ApplicationToolOrigin, isCurrent: () => boolean, signal?: AbortSignal): Promise<ApplicationCommandResult> => {
		const anchor = entry.origin
		if (!hasOrgAgendaActionOrigin(anchor)) return Promise.resolve({ kind: "rejected", message: "The Agenda Clock target has no captured Source origin." })
		const target = { ...entry, origin: anchor }
		const current = ports.current.controller
		const lifetime = extension.current
		if (!lifetime || !origin.isLive()) return Promise.resolve({ kind: "rejected", message: "The Agenda Clock origin is unavailable." })
		const guard = () => lifetime.isLive() && origin.isLive() && isCurrent() && ports.current.controller.clock === current.clock
		return lifetime.accept(async () => {
			const outcome = await current.clock.executeAgenda(target, operation, guard, signal)
			const snapshotCurrent = () => {
				const root = ports.current.controller
				if (!guard() || root.workspaceSessionId !== current.workspaceSessionId) return false
				const buffer = root.liveBuffers.find(buffer => buffer.document.relativePath === target.relativePath)
				if (!buffer) return anchor.source === "disk" &&
					root.workspace?.documents.some(document => document.relativePath === target.relativePath && document.revision === anchor.diskRevision) === true
				return validateOrgAgendaOrigin(target, buffer.runtime.source,
					anchor.source === "live" ? buffer.bufferId : buffer.document.revision,
					{ workspaceSessionId: root.workspaceSessionId ?? undefined,
						...(anchor.source === "live" ? { runtimeIncarnation: buffer.runtimeIncarnation, sourceGeneration: buffer.runtime.revision } : {}) }).valid
			}
			return publish(outcome, entry.relativePath, origin, snapshotCurrent)
		})
	}
	return { capture, executeAgenda, reports, closeReport: (id: string) => setReports(current => current.filter(report => report.id !== id)) }
}
