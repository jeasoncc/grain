import {
	guardOrgCommandOrigin,
	type OrgBufferCommand,
	type OrgBufferCommandContext,
	type OrgBufferCommandPreparation,
	type OrgBufferCommandResult,
} from "./org-buffer-command"
import { orgSparseTreeCandidates, parseOrgSparseTreeQuery } from "@/pipes/org/org-sparse-tree.pipe"

/** Sparse trees operate on the whole buffer, including when the caret is in preamble or a block. */
export const prepareOrgSparseTreeCommand = (
	context: OrgBufferCommandContext,
): OrgBufferCommandPreparation => ({
	kind: "ready",
	context,
	initialInput: "",
	candidates: orgSparseTreeCandidates(context.content),
})

export const executeOrgSparseTreeCommand = (
	origin: OrgBufferCommandContext,
	current: OrgBufferCommandContext,
	input: string,
): OrgBufferCommandResult => {
	const guard = guardOrgCommandOrigin(origin, current)
	if (guard) return guard
	const query = input.trim()
	if (!parseOrgSparseTreeQuery(query))
		return {
			kind: "rejected",
			reason: "invalid-query",
			message: "Use todo, todo:STATE, tag:NAME, or text:LITERAL.",
		}
	return { kind: "view", view: { kind: "sparse-tree", query } }
}

export const orgSparseTreeBufferCommand: OrgBufferCommand = {
	id: "org.sparse-tree",
	prompt: "Sparse tree (todo, todo:STATE, tag:NAME, text:LITERAL):",
	completion: "value",
	updatedMessage: "Sparse tree applied",
	unchangedMessage: "Sparse tree unchanged",
	prepare: prepareOrgSparseTreeCommand,
	execute: executeOrgSparseTreeCommand,
}
