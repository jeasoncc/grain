import { type ParsedOrgLinkTarget, parseOrgLinkTarget } from "./org-backlinks.pipe"
import { scanOrgBracketLinks } from "./org-link-syntax.pipe"

/** A safe, normalized navigation target found under a source position. */
export type OrgLinkClickTarget = ParsedOrgLinkTarget


const linkTextAt = (content: string, position: number): string | null => {
	for (const link of scanOrgBracketLinks(content)) {
		if (position >= link.from && position < link.to) {
			return link.target
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
