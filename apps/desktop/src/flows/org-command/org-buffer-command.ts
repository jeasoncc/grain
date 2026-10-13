import { headingPositionAt, orgBlockRanges, type OrgTextEdit, type OrgTextEditBatch } from "@/pipes/org/org-text.pipe"
import type { OrgLoggingNoteRequest } from "@/pipes/org/org-todo-logging.pipe"

export interface OrgBufferCommandContext {
	readonly relativePath: string
	readonly content: string
	readonly cursor: number
}
export interface OrgBufferCommandRejected {
	readonly kind: "rejected"
	readonly reason: string
	readonly message: string
}
export type OrgBufferCommandPreparation =
	| {
			readonly kind: "ready"
			readonly context: OrgBufferCommandContext
			readonly initialInput: string
			readonly candidates: readonly string[]
	  }
	| OrgBufferCommandRejected
export interface OrgBufferViewPayload {
	readonly kind: "sparse-tree"
	readonly query: string | null
	/** Captured data-only locale comparison; never a Source or file-effect authority. */
	readonly nativeContext?: import("@/pipes/org/org-sparse-tree.pipe").OrgSparseTreeNativeContext
}
export type OrgBufferCommandResult =
	| { readonly kind: "view"; readonly view: OrgBufferViewPayload }
	| { readonly kind: "edit"; readonly edit: OrgTextEdit }
	| { readonly kind: "batch"; readonly batch: OrgTextEditBatch }
	| { readonly kind: "needs-note"; readonly request: OrgLoggingNoteRequest }
	| { readonly kind: "no-change"; readonly reason: string }
	| OrgBufferCommandRejected

/** A parameterized buffer operation, not a file-write or application-wide command service. */
export interface OrgBufferCommand {
	readonly id: string
	readonly prompt: string
	readonly completion: "token" | "value"
	readonly updatedMessage: string
	readonly unchangedMessage: string
	readonly prepare: (context: OrgBufferCommandContext) => OrgBufferCommandPreparation
	readonly execute: (
		origin: OrgBufferCommandContext,
		current: OrgBufferCommandContext,
		input: string,
		dateContext?: import("@/pipes/org/org-date-reader.pipe").OrgDateContext,
	) => OrgBufferCommandResult
}

const headingGuards = new WeakMap<OrgBufferCommandContext, {
	readonly content: string
	readonly cursor: number
	readonly result: OrgBufferCommandRejected | null
}>()
const rememberHeadingGuard = (context: OrgBufferCommandContext, result: OrgBufferCommandRejected | null) => {
	const captured = result ? Object.freeze(result) : null
	headingGuards.set(context, { content: context.content, cursor: context.cursor, result: captured })
	return captured
}

export const guardOrgHeadingCommand = (
	context: OrgBufferCommandContext,
): OrgBufferCommandRejected | null => {
	const cached = headingGuards.get(context)
	if (cached && cached.content === context.content && cached.cursor === context.cursor) return cached.result
	if (
		!Number.isInteger(context.cursor) ||
		context.cursor < 0 ||
		context.cursor > context.content.length
	) {
		return rememberHeadingGuard(context, {
			kind: "rejected",
			reason: "invalid-cursor",
			message: "The cursor is outside the Org document.",
		})
	}
	if (
		orgBlockRanges(context.content).some(
			(block) =>
				context.cursor >= block.from &&
				(context.cursor < block.to || (!block.closed && context.cursor === block.to)),
		)
	) {
		return rememberHeadingGuard(context, {
			kind: "rejected",
			reason: "inside-block",
			message: "This heading command is unavailable inside an Org block.",
		})
	}
	if (!headingPositionAt(context.content, context.cursor)) {
		return rememberHeadingGuard(context, {
			kind: "rejected",
			reason: "no-heading",
			message: "The cursor does not belong to an Org heading.",
		})
	}
	return rememberHeadingGuard(context, null)
}

export const guardOrgCommandOrigin = (
	origin: OrgBufferCommandContext,
	current: OrgBufferCommandContext,
): OrgBufferCommandRejected | null => {
	if (origin.relativePath !== current.relativePath)
		return {
			kind: "rejected",
			reason: "path-changed",
			message: "The active Org file changed while the command was open.",
		}
	if (origin.content !== current.content)
		return {
			kind: "rejected",
			reason: "content-changed",
			message: "The Org content changed while the command was open.",
		}
	return null
}
