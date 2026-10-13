import type { OrgTextEdit } from "./org-text.pipe"
import { scanOrgNodeSource } from "./org-node-source.pipe"
import { escapeOrgLinkTarget } from "./org-link-syntax.pipe"

export interface OrgRoamNode {
	readonly id: string
	readonly title: string
	readonly aliases: readonly string[]
	readonly tags: readonly string[]
	readonly relativePath: string
	readonly line: number
	readonly kind: "file" | "heading"
	readonly revision: string
	readonly ambiguous: boolean
}

/** Org's quoted whitespace-separated property values, without evaluating Lisp. */
export const parseOrgRoamAliases = (value: string): readonly string[] => {
	const values: string[] = []
	let token = ""
	let quoted = false
	let escaped = false
	for (const character of value) {
		if (escaped) { token += character; escaped = false }
		else if (character === "\\") escaped = true
		else if (character === '"') quoted = !quoted
		else if (/\s/.test(character) && !quoted) {
			if (token) values.push(token)
			token = ""
		} else token += character
	}
	if (escaped) token += "\\"
	if (token) values.push(token)
	return [...new Set(values)]
}

export const parseOrgRoamNodes = (
	relativePath: string,
	source: string,
	revision: string,
): readonly OrgRoamNode[] => {
	if (relativePath.endsWith("-notes.org")) return []
	const records = new Map<number, {
		ids: string[]; title: string; aliases: string[]; tags: string[]; kind: "file" | "heading"
	}>()
	records.set(0, { ids: [], title: relativePath.split("/").at(-1)?.replace(/\.org$/, "") ?? relativePath, aliases: [], tags: [], kind: "file" })
	let fileTags: string[] = []
	for (const row of scanOrgNodeSource(source)) {
		if (row.headingStart && row.heading !== null) {
			const tags = row.heading.match(/\s+(:[^\s:]+(?::[^\s:]+)*:)\s*$/)
			records.set(row.headingLine, { ids: [], title: (tags ? row.heading.slice(0, tags.index) : row.heading).replace(/^\[#\w\]\s+/, "").trim(), aliases: [], tags: tags ? tags[1].split(":").filter(Boolean) : [], kind: "heading" })
		}
		const record = records.get(row.heading === null ? 0 : row.headingLine)
		if (!record) continue
		if (row.visible && row.heading === null) {
			const title = row.text.match(/^\s*#\+TITLE:\s*(.*?)\s*$/i)
			if (title) record.title = title[1]
			const tags = row.text.match(/^\s*#\+FILETAGS:\s*(.*?)\s*$/i)
			if (tags) fileTags = tags[1].split(/[:\s]+/).filter(Boolean)
		}
		if (row.property?.name === "ID" && row.property.value) record.ids.push(row.property.value)
		if (row.property?.name === "ROAM_ALIASES") record.aliases.push(...parseOrgRoamAliases(row.property.value))
	}
	const nodes: OrgRoamNode[] = []
	for (const [line, record] of records) for (const id of record.ids) {
		nodes.push({ id, title: record.title, aliases: [...new Set(record.aliases)], tags: [...new Set([...fileTags, ...record.tags])], relativePath, line: line || 1, kind: record.kind, revision, ambiguous: false })
	}
	return nodes
}

/** Duplicate IDs cannot confer navigation or insertion authority. Titles remain disambiguated by path. */
export const markAmbiguousOrgRoamNodes = (nodes: readonly OrgRoamNode[]): readonly OrgRoamNode[] => {
	const counts = new Map<string, number>()
	for (const node of nodes) counts.set(node.id, (counts.get(node.id) ?? 0) + 1)
	return nodes.map((node) => ({ ...node, ambiguous: counts.get(node.id) !== 1 }))
}

/** Org's ASCII trim and U+200B bracket separators, applied at every edge to keep long bracket runs valid. */
export const orgRoamIdLink = (id: string, title: string): string => {
	const description = title.replace(/^[ \t\n\r]+|[ \t\n\r]+$/g, "").replace(/\]$/, "]\u200B").replace(/\](?=\])/g, "]\u200B")
	const target = escapeOrgLinkTarget(`id:${id}`)
	return /[^ \t\n\r]/.test(description) ? `[[${target}][${description}]]` : `[[${target}]]`
}

export const planOrgRoamLinkEdit = (source: string, from: number, to: number, id: string, title: string): OrgTextEdit | null => {
	if (!id || !Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to < from || to > source.length) return null
	const insert = orgRoamIdLink(id, title)
	return { from, to, insert, cursor: from + insert.length }
}
