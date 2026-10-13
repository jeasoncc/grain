import { maskOrgInlineCode, orgMarkupEndAt } from "./org-default-syntax.pipe"
import { orgInlineBabelInvocationAt } from "./org-babel.pipe"
import { scanOrgBracketLinks } from "./org-link-syntax.pipe"
import {
	eligibleOrgBlockRanges,
	eligibleOrgDrawerRanges,
	eligibleOrgSourceLines,
	parseOrgTodoKeywords,
	type OrgBlockRange,
} from "./org-text.pipe"

export interface OrgSourceExportOptions {
	readonly format: "html" | "markdown"
	readonly title?: string
}

export type OrgSourceExportResult =
	| { readonly kind: "output"; readonly content: string; readonly mediaType: string; readonly extension: string }
	| { readonly kind: "rejected"; readonly message: string }

interface Unit {
	readonly kind: "line" | "block" | "drawer"
	readonly text: string
	readonly raw: string
	readonly from: number
	readonly body?: string
	readonly blockType?: string
}
interface ExportSettings {
	title: string
	author: string
	date: string
	todo: boolean
	tags: boolean
	timestamps: boolean
	drawers: boolean
	numbers: boolean
	toc: boolean | number
	subSuperscripts: boolean
}
interface Footnote { readonly label: string; readonly text: string }
interface Heading { readonly index: number; readonly level: number; readonly title: string; readonly anchor: string; readonly number: string }
interface Context {
	readonly format: "html" | "markdown"
	readonly settings: ExportSettings
	readonly states: ReadonlySet<string>
	readonly anchors: ReadonlyMap<string, string>
	readonly footnotes: ReadonlyMap<string, Footnote>
	readonly inlineFootnotes: ReadonlyMap<string, string>
}

const html = (text: string): string => text.replace(/[&<>"'\r\0]/g, (char) => ({
	"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "\r": "&#13;", "\0": "&#x2400;",
})[char] ?? char)
const markdown = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/[\\`*_{}[\]()#+.!|~-]/g, "\\$&")
const escape = (text: string, context: Context): string => context.format === "html" ? html(text) : markdown(text)
const rawHex = (text: string): string => {
	let result = ""
	for (let i = 0; i < text.length; i++) result += text.charCodeAt(i).toString(16).padStart(4, "0")
	return result
}

/** Adaptive fences keep every raw code unit, including CR/LF/NUL, inside literal data. */
const literal = (text: string, context: Context, language = "", raw = text): string => {
	if (context.format === "html") return `<pre data-org-source-utf16="${rawHex(raw)}"><code${language ? ` class="language-${html(language)}"` : ""}>${html(text)}</code></pre>`
	let length = 3
	for (const run of text.matchAll(/`+/g)) length = Math.max(length, run[0].length + 1)
	const fence = "`".repeat(length)
	return `${fence}${/^[A-Za-z0-9_-]+$/.test(language) ? language : ""}\n${text}${text.endsWith("\n") ? "" : "\n"}${fence}${raw !== text ? `\n<!-- org-source-utf16:${rawHex(raw)} -->` : ""}`
}

const inlineLiteral = (text: string, context: Context, language = ""): string => {
	if (context.format === "html") return `<code${language ? ` class="src src-${html(language)}"` : ""}>${html(text)}</code>`
	let length = 1
	for (const run of text.matchAll(/`+/g)) length = Math.max(length, run[0].length + 1)
	const fence = "`".repeat(length)
	return `${fence} ${text} ${fence}`
}


const maskInlineSource = (text: string): string => {
	const masked = maskOrgInlineCode(text)
	const chunks: string[] = []
	let from = 0
	for (const match of masked.matchAll(/(?<![\p{L}\p{N}_])(?:src|call)_[^ \t\r\n[({]+(?=[\[({])/gu)) {
		if (match.index < from) continue
		const source = orgInlineBabelInvocationAt(text, match.index)
		if (!source) continue
		chunks.push(masked.slice(from, match.index), masked.slice(match.index, source.to).replace(/[^\r\n]/g, " "))
		from = source.to
	}
	return chunks.length ? chunks.join("") + masked.slice(from) : masked
}

/** GNU results substitutes $1 only; an odd slash run escapes a comma. */
const firstMacroArgument = (text: string): string => {
	let value = ""
	for (let index = 0; index < text.length;) {
		const from = index
		while (text[index] === "\\") index++
		const slashes = index - from
		if (text[index] === ",") {
			value += "\\".repeat(Math.floor(slashes / 2))
			if (slashes % 2 === 0) break
			value += ","
			index++
		} else {
			value += text.slice(from, index)
			if (index < text.length) value += text[index++]
		}
	}
	return value
}

const unitsFrom = (source: string, states: ReadonlySet<string>): Unit[] | string => {
	const units: Unit[] = eligibleOrgSourceLines(source, states).map((line) => ({ kind: "line", text: line.text, raw: source.slice(line.from, line.breakTo), from: line.from }))
	const appendRange = (range: OrgBlockRange, kind: "block" | "drawer"): string | null => {
		if (!range.closed) return `An Org ${kind} at source offset ${range.from} is not closed.`
		const raw = source.slice(range.from, range.to)
		const lines = [...raw.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/g)].filter((match) => match[0].length > 0)
		const first = lines[0]?.[0] ?? ""
		const last = lines[lines.length - 1]
		const text = first.replace(/[\r\n]+$/, "")
		if (kind === "block") {
			const begin = /^[ \t]*#\+begin_([A-Za-z0-9_-]+)(?:[ \t]+(.*))?$/i.exec(text)
			if (!begin || !last || !new RegExp(`^[ \\t]*#\\+end_${begin[1]}[ \\t]*$`, "i").test(last[0].replace(/[\r\n]+$/, ""))) return `An Org block at source offset ${range.from} has ambiguous delimiters.`
			units.push({ kind, text, raw, from: range.from, body: raw.slice(first.length, last.index), blockType: begin[1].toLowerCase() })
		} else units.push({ kind, text, raw, from: range.from })
		return null
	}
	for (const range of eligibleOrgBlockRanges(source, states)) {
		const error = appendRange(range, "block")
		if (error) return error
	}
	for (const range of eligibleOrgDrawerRanges(source, states)) {
		const error = appendRange(range, "drawer")
		if (error) return error
	}
	return units.sort((a, b) => a.from - b.from)
}

const headingText = (text: string, context: Context): string => {
	let title = text
	const first = title.split(/[ \t]/, 1)[0]
	if (!context.settings.todo && context.states.has(first)) title = title.slice(first.length).trimStart()
	if (!context.settings.tags) title = title.replace(/[ \t]+:[\p{L}\p{N}_@#%:.-]+:[ \t]*$/u, "")
	return title
}

/** Only explicitly safe schemes or encoded relative file paths can become active links. */
const safeTarget = (target: string, context: Context): string | null => {
	if (/[\u0000-\u001f\u007f\\]/.test(target) || target.trim() !== target || /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(target)) return null
	if (/^(?:id:|#)/i.test(target)) {
		const key = target.startsWith("#") ? target.slice(1) : target.slice(3)
		const anchor = context.anchors.get(key)
		return anchor ? `#${anchor}` : null
	}
	if (/^https?:\/\//i.test(target)) {
		try {
			const url = new URL(target)
			return url.protocol === "http:" || url.protocol === "https:" ? url.href : null
		} catch { return null }
	}
	if (/^mailto:[^\s<>]+@[^\s<>]+$/i.test(target)) return target
	if (!target.startsWith("file:")) return null
	const file = target.slice(5)
	if (!file || file.startsWith("/") || /[:\\]/.test(file)) return null
	try { return `./${file.split("/").map((part) => encodeURIComponent(part)).join("/")}` }
	catch { return null }
}

/** Balanced inline footnotes also admit bracket links inside their definition. */
const inlineFootnoteAt = (text: string, start: number): { raw: string; label: string; text: string } | null => {
	const prefix = /^\[fn:([A-Za-z0-9_-]*):/.exec(text.slice(start))
	if (!prefix) return null
	let depth = 1
	for (let index = start + prefix[0].length; index < text.length; index++) {
		if (text[index] === "\\" && index + 1 < text.length) { index++; continue }
		if (text[index] === "[") depth++
		if (text[index] === "]" && --depth === 0) return { raw: text.slice(start, index + 1), label: prefix[1], text: text.slice(start + prefix[0].length, index) }
	}
	return null
}

const inline = (text: string, context: Context, allowLinks = true): string => {
	const links = allowLinks ? scanOrgBracketLinks(text) : []
	const linksAt = new Map(links.map((link) => [link.from, link]))
	let result = ""
	let plain = ""
	const flush = () => { result += escape(plain, context); plain = "" }
	for (let i = 0; i < text.length;) {
		const link = linksAt.get(i)
		if (link) {
			flush()
			const href = safeTarget(link.target, context)
			const label = inline(link.description ?? link.target, context, false)
			if (href) result += context.format === "html" ? `<a href="${html(href)}" rel="noopener noreferrer">${label}</a>` : `[${label}](<${href.replace(/[<>"()]/g, (char) => encodeURIComponent(char))}>)`
			else result += `${label} ${context.format === "html" ? `<code>${html(link.target)}</code>` : `(${markdown(link.target)})`}`
			i = link.to
			continue
		}
		const remaining = text.slice(i)
		const source = (remaining.startsWith("src_") || remaining.startsWith("call_")) && /(?:^|[^\p{L}\p{N}_])$/u.test(text.slice(Math.max(0, i - 2), i))
			? orgInlineBabelInvocationAt(text, i) : null
		if (source) {
			flush()
			result += source.kind === "inline"
				? inlineLiteral(text.slice(source.bodyFrom, source.bodyTo), context, source.name)
				: inlineLiteral(text.slice(source.from, source.to), context)
			i = source.to
			continue
		}
		const babelResult = /^\{\{\{results\(([\s\S]*?)\)\}\}\}/.exec(remaining)
		if (babelResult) {
			flush()
			result += inline(firstMacroArgument(babelResult[1]), context, allowLinks)
			i += babelResult[0].length
			continue
		}
		const inlineNote = inlineFootnoteAt(text, i)
		const inlineLabel = allowLinks && inlineNote ? context.inlineFootnotes.get(inlineNote.raw) : undefined
		if (inlineNote && inlineLabel) {
			flush()
			result += context.format === "html" ? `<sup><a href="#org-fn-${inlineLabel}">${html(inlineLabel)}</a></sup>` : `[^${inlineLabel}]`
			i += inlineNote.raw.length
			continue
		}
		const footnote = /^\[fn:([A-Za-z0-9_-]+)\]/.exec(remaining)
		if (allowLinks && footnote && context.footnotes.has(footnote[1])) {
			flush()
			const label = footnote[1]
			result += context.format === "html" ? `<sup><a href="#org-fn-${label}">${html(label)}</a></sup>` : `[^${label}]`
			i += footnote[0].length
			continue
		}
		const timestamp = /^(?:<\d{4}-\d{2}-\d{2}[^<>\r\n]*>|\[\d{4}-\d{2}-\d{2}[^\[\]\r\n]*\])/.exec(remaining)
		if (timestamp) {
			flush()
			if (context.settings.timestamps) result += context.format === "html" ? `<span class="org-timestamp">${html(timestamp[0])}</span>` : markdown(timestamp[0])
			i += timestamp[0].length
			continue
		}
		const marker = text[i]
		const script = context.settings.subSuperscripts && i > 0 && /[\p{L}\p{N}]/u.test(text[i - 1]) && (marker === "^" || marker === "_")
			? /^(?:\{([^{}\r\n]+)\}|([+-]?[\p{L}\p{N}]+))/u.exec(text.slice(i + 1)) : null
		if (script) {
			flush()
			const tag = marker === "^" ? "sup" : "sub"
			result += `<${tag}>${escape(script[1] ?? script[2], context)}</${tag}>`
			i += 1 + script[0].length
			continue
		}
		if ("*/_+~=".includes(marker)) {
			const end = orgMarkupEndAt(text, i)
			if (end >= 0) {
				flush()
				const value = text.slice(i + 1, end)
				if (marker === "~" || marker === "=") result += inlineLiteral(value, context)
				else {
					const rendered = inline(value, context, allowLinks)
					if (context.format === "html") {
						const tag = ({ "*": "strong", "/": "em", "_": "u", "+": "del" })[marker as "*" | "/" | "_" | "+"]
						result += `<${tag}>${rendered}</${tag}>`
					} else {
						const delimiter = marker === "*" ? "**" : marker === "+" ? "~~" : marker === "/" ? "*" : "_"
						result += `${delimiter}${rendered}${delimiter}`
					}
				}
				i = end + 1
				continue
			}
		}
		plain += marker
		i++
	}
	flush()
	return result
}

const listMatch = (text: string) => /^([ \t]*)([-+*]|\d+[.)])[ \t]+(?:\[([ Xx-])\][ \t]*)?(.*)$/.exec(text)
const indentation = (text: string): number => text.replace(/\t/g, "    ").length

const renderList = (units: readonly Unit[], start: number, context: Context): { content: string; next: number } => {
	const first = listMatch(units[start].text)!
	const indent = indentation(first[1])
	const ordered = /^\d/.test(first[2])
	const items: string[] = []
	let next = start
	while (next < units.length && units[next].kind === "line") {
		const match = listMatch(units[next].text)
		if (!match || indentation(match[1]) !== indent || /^\d/.test(match[2]) !== ordered) break
		const checkbox = match[3]
		const marker = checkbox === undefined ? "" : context.format === "html" ? `<span class="org-checkbox" aria-label="${checkbox.toLowerCase() === "x" ? "checked" : checkbox === "-" ? "partial" : "unchecked"}">${checkbox.toLowerCase() === "x" ? "☑" : checkbox === "-" ? "◩" : "☐"}</span> ` : `[${checkbox.toLowerCase() === "x" ? "x" : checkbox === "-" ? "-" : " "}] `
		const description = /^(.+?)[ \t]+::(?:[ \t]+(.*))?$/.exec(match[4])
		let body = marker + (description ? context.format === "html" ? `<strong>${inline(description[1], context)}</strong>: ${inline(description[2] ?? "", context)}` : `**${inline(description[1], context)}**: ${inline(description[2] ?? "", context)}` : inline(match[4], context))
		next++
		while (next < units.length && units[next].kind === "line" && units[next].text.trim()) {
			const child = listMatch(units[next].text)
			const leading = /^[ \t]*/.exec(units[next].text)![0]
			if (indentation(leading) <= indent) break
			if (child) {
				const nested = renderList(units, next, context)
				body += context.format === "html" ? nested.content : `\n${nested.content.split("\n").map((line) => `    ${line}`).join("\n")}`
				next = nested.next
			} else {
				body += context.format === "html" ? `<br>${inline(units[next].text.trimStart(), context)}` : `\n    ${inline(units[next].text.trimStart(), context)}`
				next++
			}
		}
		items.push(context.format === "html" ? `<li>${body}</li>` : `${ordered ? match[2].replace(")", ".") : "-"} ${body}`)
	}
	if (context.format === "markdown") return { content: items.join("\n"), next }
	const tag = ordered ? "ol" : "ul"
	return { content: `<${tag}${ordered ? ` start="${Number.parseInt(first[2], 10)}"` : ""}>${items.join("")}</${tag}>`, next }
}

const renderTable = (units: readonly Unit[], start: number, context: Context): { content: string; next: number } => {
	let next = start
	const rows: string[][] = []
	let header = false
	let separators = 0
	while (next < units.length && units[next].kind === "line" && /^[ \t]*\|/.test(units[next].text)) {
		const text = units[next++].text.trim()
		if (/^\|[-+|: \t]+\|?$/.test(text)) { if (rows.length === 1) header = true; separators++; continue }
		rows.push(text.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim()))
	}
	const width = rows[0]?.length ?? 0
	if (!width || rows.some((row) => row.length !== width) || separators > 1) return { content: literal(units.slice(start, next).map((unit) => unit.raw).join(""), context, "org"), next }
	if (context.format === "html") return { content: `<table>${rows.map((row, index) => `<tr>${row.map((cell) => `<${header && index === 0 ? "th" : "td"}>${inline(cell, context)}</${header && index === 0 ? "th" : "td"}>`).join("")}</tr>`).join("")}</table>`, next }
	// Markdown requires a header; an empty one avoids inventing a heading from a data row.
	const rendered = rows.map((row) => `| ${row.map((cell) => inline(cell, context).replace(/\|/g, "&#124;")).join(" | ")} |`)
	if (!header) rendered.unshift(`| ${Array.from({ length: width }, () => " ").join(" | ")} |`)
	rendered.splice(1, 0, `| ${Array.from({ length: width }, () => "---").join(" | ")} |`)
	return { content: rendered.join("\n"), next }
}

type SourceExports = "code" | "results" | "both" | "none"
/** Read literal header values only; quoted argument data cannot introduce headers. */
const exportHeader = (header: string): SourceExports | null | "invalid" => {
	const tokens = header.match(/(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s"']+)+/g) ?? []
	let value: SourceExports | null = null
	for (let index = 0; index < tokens.length; index++) {
		if (tokens[index] !== ":exports") continue
		const next = tokens[++index]?.replace(/^"(.*)"$/, "$1")
		if (next !== "code" && next !== "results" && next !== "both" && next !== "none") return "invalid"
		value = next
	}
	return value
}

/** Bounded, non-executing Org subset. Unknown syntax stays visible; this is not GNU Org export. */
export const exportOrgSource = (source: string, options: OrgSourceExportOptions): OrgSourceExportResult => {
	if (typeof source !== "string" || !options || (options.format !== "html" && options.format !== "markdown") || (options.title !== undefined && typeof options.title !== "string")) return { kind: "rejected", message: "Export requires Org source, an HTML or Markdown format, and an optional text title." }
	const keywords = parseOrgTodoKeywords(source)
	const states = new Set([...keywords.todo, ...keywords.done])
	const scanned = unitsFrom(source, states)
	if (typeof scanned === "string") return { kind: "rejected", message: scanned }
	// COMMENT uses shared eligibility. The standard noexport tag excludes its complete subtree.
	const units: Unit[] = []
	let excludedLevel: number | null = null
	for (const unit of scanned) {
		const heading = unit.kind === "line" ? /^(\*+)[ \t]+(.*)$/.exec(unit.text) : null
		if (heading) {
			if (excludedLevel !== null && heading[1].length <= excludedLevel) excludedLevel = null
			const tags = /[ \t]+(:[^ \t]+:)[ \t]*$/.exec(heading[2])
			if (tags?.[1].split(":").includes("noexport")) excludedLevel ??= heading[1].length
		}
		if (excludedLevel === null) units.push(unit)
	}
	const settings: ExportSettings = { title: "", author: "", date: "", todo: true, tags: true, timestamps: true, drawers: true, numbers: false, toc: false, subSuperscripts: true }
	const consumed = new Set<number>()
	const footnotes = new Map<string, Footnote>()
	const inlineFootnotes = new Map<string, string>()
	const aliases = new Map<string, string>()
	const headings: Heading[] = []
	const counters: number[] = []
	const booleanOptions: Record<string, keyof Pick<ExportSettings, "todo" | "tags" | "timestamps" | "drawers" | "numbers" | "subSuperscripts">> = { todo: "todo", tags: "tags", "<": "timestamps", d: "drawers", num: "numbers", "^": "subSuperscripts" }
	for (const unit of units) {
		if (unit.kind !== "line" && unit.blockType !== "quote") continue
		const executable = maskInlineSource(unit.kind === "line" ? unit.text : unit.body ?? "")
		if (/\{\{\{(?!results\()/.test(executable) || /^[ \t]*#\+(?:INCLUDE|SETUPFILE|MACRO|BIND):/im.test(executable)) return { kind: "rejected", message: `Executable includes or dynamic macros at source offset ${unit.from} are not supported by source export.` }
	}
	for (let index = 0; index < units.length; index++) {
		const unit = units[index]
		if (unit.kind !== "line") continue
		const directive = /^[ \t]*#\+([A-Za-z_]+):[ \t]*(.*)$/.exec(unit.text)
		if (directive) {
			const key = directive[1].toUpperCase()
			if (["INCLUDE", "SETUPFILE", "MACRO", "BIND"].includes(key)) return { kind: "rejected", message: `#+${key} is not supported by the non-executing source exporter.` }
			if (key === "TITLE" || key === "AUTHOR" || key === "DATE") { settings[key.toLowerCase() as "title" | "author" | "date"] = directive[2]; consumed.add(index) }
			if (["TODO", "SEQ_TODO", "TYP_TODO"].includes(key)) consumed.add(index)
			if (["TIME", "FILETAGS", "LATEX_CLASS"].includes(key)) consumed.add(index)
			if (key === "OPTIONS") {
				let unknown = false
				for (const token of directive[2].split(/[ \t]+/).filter(Boolean)) {
					const match = /^([^:]+):(.*)$/.exec(token)
					if (match?.[1] === "toc") {
						if (match[2] === "t" || match[2] === "nil") settings.toc = match[2] === "t"
						else if (/^[0-9]+$/.test(match[2]) && Number.isSafeInteger(Number(match[2]))) settings.toc = Number(match[2])
						else return { kind: "rejected", message: `Unsupported export option ${token}; toc requires t, nil, or a nonnegative depth.` }
						continue
					}
					const property = match && Object.hasOwn(booleanOptions, match[1]) ? booleanOptions[match[1]] : undefined
					if (!property) { unknown = true; continue }
					if (match![2] !== "t" && match![2] !== "nil") return { kind: "rejected", message: `Unsupported export option ${token}; this exporter accepts t or nil for ${match![1]}.` }
					settings[property] = match![2] === "t"
				}
				if (!unknown) consumed.add(index)
			}
		}
		const definition = /^\[fn:([A-Za-z0-9_-]+)\](?:[ \t]+(.*))?$/.exec(unit.text)
		if (definition) {
			if (footnotes.has(definition[1])) return { kind: "rejected", message: `Duplicate footnote definition ${definition[1]}.` }
			let text = definition[2] ?? ""
			consumed.add(index)
			while (index + 1 < units.length && units[index + 1].kind === "line" && units[index + 1].text.trim() && !/^(?:\*+[ \t]|\[fn:)|^[ \t]*#\+/.test(units[index + 1].text)) { text += `${text ? "\n" : ""}${units[++index].text.trimStart()}`; consumed.add(index) }
			footnotes.set(definition[1], { label: definition[1], text })
		}
	}
	const sourceExports = new Map<number, SourceExports>()
	const fileHeaders = new Map<string, string[]>()
	let beforeFirstHeading = true
	for (let index = 0; index < units.length; index++) {
		const unit = units[index]
		if (unit.kind === "line" && /^\*+[ \t]+/.test(unit.text)) beforeFirstHeading = false
		if (beforeFirstHeading && unit.kind === "drawer" && /^[ \t]*:PROPERTIES:/i.test(unit.text)) {
			for (const property of unit.raw.matchAll(/^[ \t]*:header-args(?::([A-Za-z0-9_-]+))?(\+)?:[ \t]+([^\r\n]*)/gim)) {
				const language = property[1] ?? ""
				fileHeaders.set(language, property[2] ? [...fileHeaders.get(language) ?? [], property[3]] : [property[3]])
			}
		}
		const property = unit.kind === "line" ? /^[ \t]*#\+PROPERTY:[ \t]+header-args(?::([A-Za-z0-9_-]+))?(\+)?[ \t]+(.*)$/i.exec(unit.text) : null
		if (!property) continue
		const language = property[1] ?? ""
		fileHeaders.set(language, property[2] ? [...fileHeaders.get(language) ?? [], property[3]] : [property[3]])
		consumed.add(index)
	}
	const ancestors: { level: number; headers: Map<string, string[]> }[] = []
	let affiliated: string[] = []
	let affiliatedName: { name: string; index: number } | null = null
	for (let index = 0; index < units.length; index++) {
		const unit = units[index]
		const heading = unit.kind === "line" ? /^(\*+)[ \t]+/.exec(unit.text) : null
		if (heading) {
			while (ancestors.length && ancestors[ancestors.length - 1].level >= heading[1].length) ancestors.pop()
			ancestors.push({ level: heading[1].length, headers: new Map() })
		}
		if (unit.kind === "drawer" && /^[ \t]*:PROPERTIES:/i.test(unit.text) && ancestors.length) {
			for (const property of unit.raw.matchAll(/^[ \t]*:header-args(?::([A-Za-z0-9_-]+))?(\+)?:[ \t]+([^\r\n]*)/gim)) {
				const headers = ancestors[ancestors.length - 1].headers
				const language = property[1] ?? ""
				headers.set(language, property[2] ? [...headers.get(language) ?? [], property[3]] : [property[3]])
			}
		}
		const header = unit.kind === "line" ? /^[ \t]*#\+HEADERS?:[ \t]*(.*)$/i.exec(unit.text) : null
		if (header) { affiliated.push(header[1]); consumed.add(index); continue }
		const name = unit.kind === "line" ? /^[ \t]*#\+NAME:[ \t]*(\S+)[ \t]*$/i.exec(unit.text) : null
		if (name) affiliatedName = { name: name[1], index }
		if (unit.kind === "block" && unit.blockType === "src") {
			const begin = /^[ \t]*#\+begin_src[ \t]+([A-Za-z0-9_-]+)(.*)$/i.exec(unit.text)
			if (!begin) return { kind: "rejected", message: `Source block at ${unit.from} has no language.` }
			let selection: SourceExports = "code"
			for (const args of [...fileHeaders.get("") ?? [], ...fileHeaders.get(begin[1]) ?? [],
				...ancestors.flatMap(({ headers }) => [...headers.get("") ?? [], ...headers.get(begin[1]) ?? []]), ...affiliated, begin[2]]) {
				const value = exportHeader(args)
				if (value === "invalid") return { kind: "rejected", message: `Nonliteral or unsupported :exports header at source offset ${unit.from}.` }
				if (value) selection = value
			}
			sourceExports.set(index, selection)
			if (affiliatedName) consumed.add(affiliatedName.index)
			let result = index + 1
			while (units[result]?.kind === "line" && !units[result].text.trim()) result++
			if (affiliatedName) {
				const namedResult = units.findIndex((candidate) => candidate.kind === "line"
					&& /^[ \t]*#\+RESULTS(?:\[[^\]]*\])?:[ \t]*(.*)$/i.exec(candidate.text)?.[1].trim() === affiliatedName!.name)
				if (namedResult >= 0) result = namedResult
			}
			if (units[result]?.kind === "line" && /^[ \t]*#\+RESULTS(?:\[[^\]]*\])?:/i.test(units[result].text)) {
				consumed.add(result++)
				while (units[result]?.kind === "line" && !units[result].text.trim()) result++
				const first = units[result]
				if (first?.kind === "block" || first?.kind === "drawer") {
					if (selection === "code" || selection === "none") consumed.add(result)
				} else if (first?.kind === "line") {
					const table = /^[ \t]*\|/.test(first.text)
					const fixed = /^[ \t]*:(?:[ \t]|$)/.test(first.text)
					while (units[result]?.kind === "line" && units[result].text.trim()
						&& !/^(?:\*+[ \t]|[ \t]*#\+)/.test(units[result].text)
						&& (!table || /^[ \t]*\|/.test(units[result].text))
						&& (!fixed || /^[ \t]*:(?:[ \t]|$)/.test(units[result].text))) {
						if (selection === "code" || selection === "none") consumed.add(result)
						result++
					}
				}
			}
		}
		if (!(unit.kind === "line" && /^[ \t]*#\+(?:NAME|CAPTION|ATTR_[A-Za-z]+):/i.test(unit.text))) {
			affiliated = []
			affiliatedName = null
		}
	}
	let anonymous = 0
	for (const unit of units) {
		const text = unit.kind === "line" ? unit.text : unit.blockType === "quote" ? unit.body ?? "" : ""
		const eligibleText = maskOrgInlineCode(text)
		for (let index = 0; index < text.length; index++) {
			if (eligibleText[index] !== "[") continue
			const note = inlineFootnoteAt(text, index)
			if (!note) continue
			if (!note.label && inlineFootnotes.has(note.raw)) { index += note.raw.length - 1; continue }
			const label = note.label || `org-inline-${++anonymous}`
			if (footnotes.has(label)) return { kind: "rejected", message: `Duplicate footnote definition ${label}.` }
			if (!inlineFootnotes.has(note.raw)) inlineFootnotes.set(note.raw, label)
			footnotes.set(label, { label, text: note.text })
			index += note.raw.length - 1
		}
	}
	if (options.title !== undefined) settings.title = options.title
	for (let index = 0; index < units.length; index++) {
		const unit = units[index]
		const match = unit.kind === "line" ? /^(\*+)[ \t]+(.*)$/.exec(unit.text) : null
		if (!match) continue
		const level = match[1].length
		counters.length = level
		for (let depth = 0; depth < level; depth++) counters[depth] ??= 0
		counters[level - 1]++
		const anchor = `org-heading-${headings.length + 1}`
		headings.push({ index, level, title: match[2], anchor, number: counters.join(".") })
		let drawerIndex = index + 1
		while (units[drawerIndex]?.kind === "line" && (!units[drawerIndex].text.trim() || /^[ \t]*(?:SCHEDULED|DEADLINE|CLOSED):/.test(units[drawerIndex].text))) drawerIndex++
		const drawer = units[drawerIndex]
		if (drawer?.kind === "drawer" && /^[ \t]*:PROPERTIES:[ \t]*$/i.test(drawer.text)) {
			for (const property of drawer.raw.matchAll(/^[ \t]*:(ID|CUSTOM_ID):[ \t]+([^\r\n]+)$/gim)) {
				const value = property[2].trim()
				if (aliases.has(value) && aliases.get(value) !== anchor) return { kind: "rejected", message: `Ambiguous duplicate heading ID ${value}.` }
				aliases.set(value, anchor)
			}
		}
	}
	const context: Context = { format: options.format, settings, states, anchors: aliases, footnotes, inlineFootnotes }
	const headingAt = new Map(headings.map((heading) => [heading.index, heading]))
	const output: string[] = []
	if (settings.title) output.push(options.format === "html" ? `<header><h1>${inline(settings.title, context)}</h1></header>` : `# ${inline(settings.title, context)}`)
	for (const value of [settings.author, settings.date]) if (value) output.push(options.format === "html" ? `<p class="org-document-meta">${inline(value, context)}</p>` : inline(value, context))
	if (settings.toc && headings.length) {
		const entries = headings.filter((heading) => typeof settings.toc !== "number" || heading.level <= settings.toc).map((heading) => {
			const title = `${settings.numbers ? `${heading.number} ` : ""}${headingText(heading.title, context)}`
			return options.format === "html" ? `<li><a href="#${heading.anchor}">${inline(title, context, false)}</a></li>` : `${"  ".repeat(heading.level - 1)}- [${inline(title, context, false)}](#${heading.anchor})`
		})
		output.push(options.format === "html" ? `<nav aria-label="Table of contents"><ul>${entries.join("")}</ul></nav>` : entries.join("\n"))
	}
	for (let index = 0; index < units.length;) {
		const unit = units[index]
		if (consumed.has(index) || (unit.kind === "line" && !unit.text.trim())) { index++; continue }
		if (unit.kind === "drawer") { if (settings.drawers) output.push(literal(unit.raw, context, "org")); index++; continue }
		if (unit.kind === "block") {
			if (unit.blockType === "src" || unit.blockType === "example") {
				const language = unit.blockType === "src" ? /^\s*#\+begin_src\s+([A-Za-z0-9_-]+)/i.exec(unit.text)?.[1] ?? "" : ""
				if (unit.blockType !== "src" || sourceExports.get(index) === "code" || sourceExports.get(index) === "both") output.push(literal(unit.body ?? "", context, language, unit.raw))
			} else if (unit.blockType === "quote") {
				const content = inline(unit.body ?? "", context)
				output.push(options.format === "html" ? `<blockquote data-org-source-utf16="${rawHex(unit.raw)}"><p>${content}</p></blockquote>` : `${content.split(/\r\n|\r|\n/).map((line) => `> ${line}`).join("\n")}\n<!-- org-source-utf16:${rawHex(unit.raw)} -->`)
			} else output.push(literal(unit.raw, context, "org"))
			index++; continue
		}
		const heading = headingAt.get(index)
		if (heading) {
			const title = inline(`${settings.numbers ? `${heading.number} ` : ""}${headingText(heading.title, context)}`, context)
			output.push(options.format === "html" ? `<h${Math.min(6, heading.level)} id="${heading.anchor}"${heading.level > 6 ? ` data-org-level="${heading.level}"` : ""}>${title}</h${Math.min(6, heading.level)}>` : `<a id="${heading.anchor}"></a>\n${"#".repeat(Math.min(6, heading.level))} ${heading.level > 6 ? markdown(`${heading.level}: `) : ""}${title}`)
			index++; continue
		}
		if (listMatch(unit.text)) { const list = renderList(units, index, context); output.push(list.content); index = list.next; continue }
		if (/^[ \t]*\|/.test(unit.text)) { const table = renderTable(units, index, context); output.push(table.content); index = table.next; continue }
		if (/^[ \t]*(?:#\+|:|#(?:[ \t]|$))/.test(unit.text)) { output.push(literal(unit.raw, context, "org")); index++; continue }
		const paragraph: string[] = [unit.text]
		index++
		while (index < units.length && !consumed.has(index) && units[index].kind === "line" && units[index].text.trim() && !headingAt.has(index) && !listMatch(units[index].text) && !/^[ \t]*(?:\||#|:)/.test(units[index].text)) paragraph.push(units[index++].text)
		const content = inline(paragraph.join("\n"), context)
		output.push(options.format === "html" ? `<p>${content}</p>` : content)
	}
	if (footnotes.size) {
		const notes = [...footnotes.values()].map((note) => options.format === "html" ? `<li id="org-fn-${note.label}"><span>${html(note.label)}:</span> ${inline(note.text, context)}</li>` : `[^${note.label}]: ${inline(note.text, context).replace(/\n/g, "\n    ")}`)
		output.push(options.format === "html" ? `<section aria-label="Footnotes"><ol>${notes.join("")}</ol></section>` : notes.join("\n"))
	}
	const body = output.join("\n\n")
	return options.format === "html"
		? { kind: "output", content: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${html(settings.title || "Org export")}</title></head><body>\n${body}\n</body></html>`, mediaType: "text/html;charset=utf-8", extension: "html" }
		: { kind: "output", content: `${body}\n`, mediaType: "text/markdown;charset=utf-8", extension: "md" }
}
