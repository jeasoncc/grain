import { orgSparseTreeCandidates, parseOrgSparseTreeQuery } from "@/pipes/org/org-sparse-tree.pipe"
import { readOrgSparseTreeMatchQuery } from "@/pipes/org/org-sparse-tree-query.pipe"
import {
	guardOrgCommandOrigin,
	type OrgBufferCommand,
	type OrgBufferCommandContext,
	type OrgBufferCommandPreparation,
	type OrgBufferCommandResult,
} from "./org-buffer-command"

/** Sparse trees operate on the whole buffer, including when the caret is in preamble or a block. */
export const prepareOrgSparseTreeCommand = (
	context: OrgBufferCommandContext,
): OrgBufferCommandPreparation => ({
	candidates: orgSparseTreeCandidates(context.content),
	context,
	initialInput: "",
	kind: "ready",
})

export const executeOrgSparseTreeCommand = (
	origin: OrgBufferCommandContext,
	current: OrgBufferCommandContext,
	input: string,
): OrgBufferCommandResult => {
	const guard = guardOrgCommandOrigin(origin, current)
	if (guard) return guard
	const query = input.trim()
	if (!parseOrgSparseTreeQuery(input)) {
		const match = readOrgSparseTreeMatchQuery(input, true)
		return {
			kind: "rejected",
			message: match.kind === "error"
				? `${match.message} At UTF-16 offset ${match.offset}.`
				: 'Use todo, todo:STATE, tag:NAME, itag:NAME, text:LITERAL, or +work-boss|home; property comparisons, regex braces, grouping and /TODO-state matches are supported. Limits: 8192 UTF-16 units, depth 32, 128 nodes.',
			reason: "invalid-query",
		}
	}
	return { kind: "view", view: { kind: "sparse-tree", query } }
}

export const orgSparseTreeBufferCommand: OrgBufferCommand = {
	completion: "value",
	execute: executeOrgSparseTreeCommand,
	id: "org.sparse-tree",
	prepare: prepareOrgSparseTreeCommand,
	prompt:
		"Sparse tree (todo, todo:STATE, tag:NAME, itag:NAME, text:LITERAL; match:+work-boss|home):",
	unchangedMessage: "Sparse tree unchanged",
	updatedMessage: "Sparse tree applied",
}
