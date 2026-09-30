import {
	orgBlockRanges,
	type OrgTextEdit,
	setOrgHeadingTagsAt,
} from "../../pipes/org/org-text.pipe"

export interface OrgTagsCommandContext {
	readonly relativePath: string
	readonly content: string
	readonly cursor: number
}

export type OrgTagsRejectionReason =
	| "invalid-cursor"
	| "inside-block"
	| "no-heading"
	| "path-changed"
	| "content-changed"

export interface OrgTagsCommandRejected {
	readonly kind: "rejected"
	readonly reason: OrgTagsRejectionReason
	readonly message: string
}

export type OrgTagsCommandPreparation =
	| {
			readonly kind: "ready"
			readonly initialInput: string
			readonly candidates: readonly string[]
			readonly context: OrgTagsCommandContext
	  }
	| OrgTagsCommandRejected

export type OrgTagsCommandResult =
	| { readonly kind: "edit"; readonly edit: OrgTextEdit }
	| { readonly kind: "no-change"; readonly reason: "unchanged-tags" }
	| OrgTagsCommandRejected

const messages: Readonly<Record<OrgTagsRejectionReason, string>> = {
	"invalid-cursor": "The cursor is outside the Org document.",
	"inside-block": "Heading Tags is unavailable inside an Org block.",
	"no-heading": "The cursor does not belong to an Org heading.",
	"path-changed": "The active Org file changed while Heading Tags was open.",
	"content-changed": "The Org content changed while Heading Tags was open.",
}

const rejected = (reason: OrgTagsRejectionReason): OrgTagsCommandRejected => ({
	kind: "rejected",
	reason,
	message: messages[reason],
})

/** Scan raw lines rather than normalized parser text, retaining CRLF and lone-CR offsets. */
const headingTagsAt = (content: string, cursor: number) => {
	const blocks = orgBlockRanges(content)
	const cursorInBlock = blocks.some(
		(block) =>
			cursor >= block.from && (cursor < block.to || (!block.closed && cursor === block.to)),
	)
	let currentTags: readonly string[] | null = null
	const candidates = new Set<string>()
	for (const line of content.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/g)) {
		const from = line.index
		const text = line[0].replace(/[\r\n]+$/, "")
		const blocked = blocks.some((block) => from >= block.from && from < block.to)
		if (!blocked && /^\*+[ \t]+/.test(text)) {
			const tags = /[ \t]+((?::[^\s:]+)+:)[ \t]*$/.exec(text)?.[1]
			const parsedTags = tags ? tags.split(":").filter(Boolean) : []
			for (const tag of parsedTags) candidates.add(tag)
			if (from <= cursor) currentTags = parsedTags
		}
	}
	return { candidates: [...candidates], currentTags, cursorInBlock }
}

/** Capture the source and target cursor for a Heading Tags input session; no IO. */
export const prepareOrgTagsCommand = (
	context: OrgTagsCommandContext,
): OrgTagsCommandPreparation => {
	if (
		!Number.isInteger(context.cursor) ||
		context.cursor < 0 ||
		context.cursor > context.content.length
	) {
		return rejected("invalid-cursor")
	}
	const scanned = headingTagsAt(context.content, context.cursor)
	if (scanned.cursorInBlock) return rejected("inside-block")
	if (scanned.currentTags === null) return rejected("no-heading")
	return {
		kind: "ready",
		initialInput: scanned.currentTags.join(" "),
		candidates: scanned.candidates,
		context: {
			relativePath: context.relativePath,
			content: context.content,
			cursor: context.cursor,
		},
	}
}

/** Apply to the captured heading, not a cursor moved while the input was open. */
export const executeOrgTagsCommand = (
	sessionContext: OrgTagsCommandContext,
	currentContext: OrgTagsCommandContext,
	input: string,
): OrgTagsCommandResult => {
	if (sessionContext.relativePath !== currentContext.relativePath) return rejected("path-changed")
	if (sessionContext.content !== currentContext.content) return rejected("content-changed")
	const preparation = prepareOrgTagsCommand(sessionContext)
	if (preparation.kind === "rejected") return preparation
	const tags = [...new Set(input.split(/[\s,:]+/u).filter(Boolean))]
	const edit = setOrgHeadingTagsAt(sessionContext.content, sessionContext.cursor, tags)
	// A valid untagged heading with empty input yields null from the pipe, not a rejection.
	if (!edit || sessionContext.content.slice(edit.from, edit.to) === edit.insert) {
		return { kind: "no-change", reason: "unchanged-tags" }
	}
	return { kind: "edit", edit }
}
