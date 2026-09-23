import { type ParsedOrgLinkTarget, parseOrgLinkTarget } from "./org-backlinks.pipe"

/** A safe, normalized navigation target found under a source position. */
export type OrgLinkClickTarget = ParsedOrgLinkTarget

const LINK = /\[\[([^\]\r\n]+)\](?:\[([^\]\r\n]*)\])?\]/g

const linkTextAt = (content: string, position: number): string | null => {
	for (const match of content.matchAll(LINK)) {
		const from = match.index
		const to = from + match[0].length
		if (position >= from && position < to) {
			return match[1]
		}
	}
	return null
}

/** Resolves a supported Org link under `position` without performing any IO. */
export const orgLinkTargetAt = (
	content: string,
	position: number,
	baseDocument: string,
): OrgLinkClickTarget | null => {
	const target = linkTextAt(content, position)
	return target === null ? null : parseOrgLinkTarget(baseDocument, target)
}

/**
 * Compatibility wrapper for callers that only navigate to files. Search suffixes
 * remain excluded from the returned path, as before.
 */
export const orgFileLinkAt = (
	content: string,
	position: number,
	baseDocument: string,
): string | null => {
	const linkText = linkTextAt(content, position)
	if (linkText === null || /^id:/i.test(linkText) || linkText.startsWith("#")) {
		return null
	}
	const target = parseOrgLinkTarget(baseDocument, linkText)
	return target?.kind === "file" || target?.kind === "custom-id" ? target.relativePath : null
}
