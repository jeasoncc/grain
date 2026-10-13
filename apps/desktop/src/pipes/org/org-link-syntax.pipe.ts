export interface OrgBracketLink {
	readonly from: number
	readonly to: number
	readonly target: string
	readonly description: string | null
}

/** Installed Org ol.el org-link-escape: double existing slashes before brackets/end, then escape brackets. */
export const escapeOrgLinkTarget = (target: string): string =>
	target.replace(/(\\*)([[\]]|$)/g, (_match, slashes: string, bracket: string) => `${slashes}${slashes}${bracket ? "\\" : ""}${bracket}`)

/** Org ID paths are literal: percent escapes are not decoded by org-id-open. */
export const unescapeOrgLinkTarget = (target: string): string =>
	target.replace(/\\+(?=[[\]]|$)/g, (slashes) => "\\".repeat(Math.floor(slashes.length / 2)))

/** Org ol.el org-link-bracket-re, including single ']' in descriptions and escaped target brackets. */
export const scanOrgBracketLinks = (source: string): readonly OrgBracketLink[] => {
	const links: OrgBracketLink[] = []
	const bracket = /\[\[((?:[^\[\]\\]|\\(?:\\\\)*[\[\]]|\\+[^\[\]])+)\](?:\[([\s\S]+?)\])?\]/g
	for (const match of source.matchAll(bracket)) {
		links.push({ from: match.index, to: match.index + match[0].length, target: unescapeOrgLinkTarget(match[1].replace(/[ \t]*\r?\n[ \t]*/g, " ")), description: match[2] ?? null })
	}
	return links
}
