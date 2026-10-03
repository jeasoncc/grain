import type {
	OrgWorkingCopyAckContext,
	OrgWorkingCopyAckPlan,
} from "@/types/editor/org-working-copy-ack.interface"

/** Compare disk authority only; newer working source is intentionally independent. */
export const guardOrgWorkingCopyBaseline = (
	expectedDocument: OrgWorkingCopyAckContext["expectedDocument"],
	currentDocument: OrgWorkingCopyAckContext["currentDocument"],
): Extract<OrgWorkingCopyAckPlan, { kind: "rejected" }> | null => {
	if (!currentDocument) return { kind: "rejected", reason: "missing-baseline" }
	if (currentDocument.relativePath !== expectedDocument.relativePath)
		return { kind: "rejected", reason: "path-drift" }
	if (currentDocument.revision !== expectedDocument.revision)
		return { kind: "rejected", reason: "revision-drift" }
	if (currentDocument.content !== expectedDocument.content)
		return { kind: "rejected", reason: "content-drift" }
	return null
}

/** Advance only the captured disk baseline, never replace live source/history. */
export const planOrgWorkingCopyAck = (context: OrgWorkingCopyAckContext): OrgWorkingCopyAckPlan => {
	const { expectedDocument, currentDocument, workingSource, capturedSource, receipt } = context
	const rejection = guardOrgWorkingCopyBaseline(expectedDocument, currentDocument)
	if (rejection) return rejection
	if (receipt.relativePath !== expectedDocument.relativePath)
		return { kind: "rejected", reason: "receipt-path" }
	if (typeof receipt.revision !== "string" || !receipt.revision.trim())
		return { kind: "rejected", reason: "receipt-revision" }
	return {
		kind: "ack",
		document: { ...expectedDocument, content: capturedSource, revision: receipt.revision },
		workingSource,
		isDirty: workingSource !== capturedSource,
	}
}
