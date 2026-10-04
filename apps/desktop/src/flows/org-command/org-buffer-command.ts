import { headingPositionAt, orgBlockRanges, type OrgTextEdit } from "@/pipes/org/org-text.pipe"

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
}
export type OrgBufferCommandResult =
	| { readonly kind: "view"; readonly view: OrgBufferViewPayload }
	| { readonly kind: "edit"; readonly edit: OrgTextEdit }
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

export const guardOrgHeadingCommand = (
	context: OrgBufferCommandContext,
): OrgBufferCommandRejected | null => {
	if (
		!Number.isInteger(context.cursor) ||
		context.cursor < 0 ||
		context.cursor > context.content.length
	) {
		return {
			kind: "rejected",
			reason: "invalid-cursor",
			message: "The cursor is outside the Org document.",
		}
	}
	if (
		orgBlockRanges(context.content).some(
			(block) =>
				context.cursor >= block.from &&
				(context.cursor < block.to || (!block.closed && context.cursor === block.to)),
		)
	) {
		return {
			kind: "rejected",
			reason: "inside-block",
			message: "This heading command is unavailable inside an Org block.",
		}
	}
	if (!headingPositionAt(context.content, context.cursor)) {
		return {
			kind: "rejected",
			reason: "no-heading",
			message: "The cursor does not belong to an Org heading.",
		}
	}
	return null
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
