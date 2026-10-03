import type {
	OrgRuntimeCommitContext,
	OrgRuntimeCommitDecision,
	OrgRuntimeCommitRejection,
} from "@/types/editor/org-runtime-owner.interface"

const reject = (reason: OrgRuntimeCommitRejection, message: string): OrgRuntimeCommitDecision => ({
	kind: "rejected",
	reason,
	message,
})

/** Decide authority using literal source equality; no normalization or editor state. */
export const guardOrgRuntimeCommit = (
	context: OrgRuntimeCommitContext,
): OrgRuntimeCommitDecision => {
	if (!context.mounted) return reject("unmounted", "The workspace is no longer mounted.")
	if (!context.closeReady) return reject("close-not-ready", "Window close protection is not ready.")
	if (!context.grantMatches) return reject("wrong-grant", "The workspace grant has changed.")
	if (!context.sessionMatches) return reject("wrong-session", "The workspace session has changed.")

	if (context.notificationInProgress)
		return reject(
			"notification-in-progress",
			"Cannot commit source during reentrant observer notification.",
		)

	const installation = context.authorizedInstallation
	const authorized = Boolean(
		installation &&
			installation.bufferId === context.runtimeBufferId &&
			installation.expected === context.previous &&
			installation.next === context.next,
	)
	if (!context.isActiveOwner) {
		if (authorized && context.parkedSource === context.previous)
			return { kind: "accepted", destination: "parked", reason: "installation" }
		return reject("inactive-owner", "Only an authorized installation may update a parked buffer.")
	}
	if (context.previous !== context.activeSource)
		return reject("stale-source", "The active source has changed.")
	if (authorized) return { kind: "accepted", destination: "active", reason: "installation" }
	if (context.loading) return reject("loading", "A workspace source is being loaded.")
	if (context.mutationInProgress && !context.ordinarySaveInFlight)
		return reject("mutation-in-progress", "A workspace mutation is in progress.")
	return { kind: "accepted", destination: "active", reason: "edit" }
}
