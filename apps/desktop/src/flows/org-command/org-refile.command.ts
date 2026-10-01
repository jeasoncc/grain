import { extractOrgSubtreeAt, isSafeRelativeOrgPath } from "@/pipes/org/org-subtree-refile.pipe"
import {
	guardOrgCommandOrigin,
	guardOrgHeadingCommand,
	type OrgBufferCommandContext,
	type OrgBufferCommandPreparation,
	type OrgBufferCommandRejected,
} from "./org-buffer-command"

const comparable = (path: string) => path.normalize("NFC").toLocaleLowerCase("en-US")
export const prepareOrgRefileCommand = (
	context: OrgBufferCommandContext,
	paths: readonly string[],
): OrgBufferCommandPreparation => {
	const guard = guardOrgHeadingCommand(context)
	if (guard) return guard
	if (!extractOrgSubtreeAt(context.content, context.cursor))
		return {
			kind: "rejected",
			reason: "no-subtree",
			message: "Place the cursor on the heading line of the subtree to refile.",
		}
	const candidates = paths.filter(
		(path) => isSafeRelativeOrgPath(path) && comparable(path) !== comparable(context.relativePath),
	)
	return {
		kind: "ready",
		context: { ...context },
		candidates,
		initialInput:
			comparable(context.relativePath) !== "inbox.org" ? "inbox.org" : (candidates[0] ?? ""),
	}
}
export type OrgRefileCommandResult =
	| { readonly kind: "transfer"; readonly targetRelativePath: string }
	| OrgBufferCommandRejected
/** Validate target parameters only. Filesystem effects remain in the existing copy-first flow. */
export const executeOrgRefileCommand = (
	origin: OrgBufferCommandContext,
	current: OrgBufferCommandContext,
	input: string,
): OrgRefileCommandResult => {
	const guard = guardOrgCommandOrigin(origin, current) ?? guardOrgHeadingCommand(origin)
	if (guard) return guard
	if (!extractOrgSubtreeAt(origin.content, origin.cursor))
		return {
			kind: "rejected",
			reason: "no-subtree",
			message: "Place the cursor on the heading line of the subtree to refile.",
		}
	const targetRelativePath = input.trim()
	if (!isSafeRelativeOrgPath(targetRelativePath))
		return {
			kind: "rejected",
			reason: "invalid-path",
			message:
				"Choose a safe workspace-relative lowercase .org path; absolute paths and traversal are not allowed.",
		}
	if (comparable(targetRelativePath) === comparable(origin.relativePath))
		return {
			kind: "rejected",
			reason: "same-document",
			message: "Refile source and target must be different Org files.",
		}
	return { kind: "transfer", targetRelativePath }
}

export const prepareOrgArchiveCommand = (
	context: OrgBufferCommandContext,
): OrgBufferCommandPreparation => {
	const prepared = prepareOrgRefileCommand(context, [])
	if (prepared.kind === "rejected")
		return prepared.reason === "no-subtree"
			? { ...prepared, message: "Place the cursor on the heading line of the subtree to archive." }
			: prepared
	return { ...prepared, initialInput: "no", candidates: ["yes", "no"] }
}
export const executeOrgArchiveCommand = (
	origin: OrgBufferCommandContext,
	current: OrgBufferCommandContext,
	input: string,
): { readonly kind: "transfer" | "cancel" } | OrgBufferCommandRejected => {
	const guard = guardOrgCommandOrigin(origin, current)
	if (guard) return guard
	const prepared = prepareOrgArchiveCommand(origin)
	if (prepared.kind === "rejected") return prepared
	if (input.trim().toLowerCase() === "no") return { kind: "cancel" }
	if (input.trim().toLowerCase() !== "yes")
		return {
			kind: "rejected",
			reason: "confirmation-required",
			message: "Type yes to archive, or no to cancel.",
		}
	return { kind: "transfer" }
}
