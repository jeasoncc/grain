import { planOrgRemarkMutation } from "@/pipes/org/org-remark.pipe"
import type { OrgRemarkAction } from "@/pipes/org/org-remark.types"
import type { OrgTextEdit } from "@/pipes/org/org-text.pipe"
import type { OrgRemarkActionOutcome, OrgRemarkNotesContext, OrgRemarkSourceCapture } from "@/types/org/org-remark-workflow.types"
import { saveOrgWorkingCopyFlow, type OrgSaveWorkingCopyPorts } from "./org-save-working-copy.flow"

export interface OrgRemarkMutationPorts {
	readonly isCurrentSource: () => boolean
	readonly notesAreCurrent: (notes: OrgRemarkNotesContext) => boolean
	/** Allocates only after a valid, nonempty edit plan; never activates the sidecar. */
	readonly prepareCanonical: (notes: OrgRemarkNotesContext) => OrgRemarkNotesContext | null
	readonly apply: (notes: OrgRemarkNotesContext, edits: readonly OrgTextEdit[], guard: () => boolean) => boolean
	readonly snapshot: (path: string) => OrgRemarkNotesContext | null
	readonly save: OrgSaveWorkingCopyPorts<{
		readonly relativePath: string
		readonly content: string
		readonly expectedRevision: string
		readonly workspaceRoot: string
		readonly capabilityToken?: string
	}>
	readonly capabilityToken?: string
	readonly pause: (path: string) => void
}

/** One sidecar history event followed by one CAS. Refusal retains the canonical draft. */
export const runOrgRemarkMutationFlow = async (
	source: OrgRemarkSourceCapture,
	notes: OrgRemarkNotesContext,
	action: OrgRemarkAction,
	ports: OrgRemarkMutationPorts,
): Promise<OrgRemarkActionOutcome> => {
	const stale = (): OrgRemarkActionOutcome => ({ kind: "stale", message: "The captured source or remark notes changed; nothing else was applied." })
	if (!ports.isCurrentSource() || !ports.notesAreCurrent(notes)) return stale()
	const plan = planOrgRemarkMutation({ notesSource: notes.content, sourceRelativePath: source.relativePath, source: source.source, action })
	if (plan.kind !== "ready") return plan
	if (plan.notesPath !== notes.document.relativePath) return { kind: "rejected", message: "The sidecar does not belong to the captured source." }
	if (plan.next === plan.previous) return { kind: "confirmed", notes }
	const canonical = ports.prepareCanonical(notes)
	if (!canonical || !ports.isCurrentSource() || !ports.notesAreCurrent(canonical)) return stale()
	const guard = () => ports.isCurrentSource() && ports.notesAreCurrent(canonical)
	let applied = false
	try {
		applied = ports.apply(canonical, plan.edits, guard)
	} catch {
		// A publication callback can fail after the one canonical commit.
		applied = canonical.runtime?.source === plan.next && canonical.runtime.revision !== canonical.sourceGeneration
	}
	if (!applied) return stale()
	const path = notes.document.relativePath
	const committed = ports.snapshot(path)
	if (!committed || committed.runtime !== canonical.runtime || committed.content !== plan.next) {
		ports.pause(path)
		return { kind: "uncertain", message: "The sidecar edit was retained, but its owner changed before save. Reconcile it manually; no retry or rollback was attempted." }
	}
	const result = await saveOrgWorkingCopyFlow({
		relativePath: path,
		content: plan.next,
		expectedRevision: committed.document.revision,
		workspaceRoot: notes.rootPath,
		capabilityToken: ports.capabilityToken,
	}, {
		...ports.save,
		isFresh: (capture) => ports.isCurrentSource() && ports.notesAreCurrent(committed) && ports.save.isFresh(capture),
	})
	if (result.kind === "confirmed") {
		const accepted = ports.snapshot(path)
		if (accepted) return { kind: "confirmed", notes: accepted }
	}
	ports.pause(path)
	return { kind: "uncertain", message: result.kind === "write-left" ? result.error.message : "The sidecar draft was retained, but saving was not confirmed. Refresh and reconcile before a manual retry; no rollback was attempted." }
}
