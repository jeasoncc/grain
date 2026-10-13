import * as E from "fp-ts/Either"
import type {
	OrgCaptureRequest,
	OrgCaptureTarget,
	OrgCaptureTargetPreview,
	OrgCaptureValidationError,
} from "@/types/editor/org-capture.interface"
import { validateOrgCaptureSource, validateOrgCaptureTarget } from "./org-capture.pipe"
import { enumerateOrgRefileHeadings, type OrgRefileHeadingTarget } from "./org-refile-target.pipe"
import { appendOrgSubtree, detectOrgNewline } from "./org-subtree-refile.pipe"
import { orgBlockRanges, orgDrawerRanges, parseOrgTodoKeywords, structuralOrgSourceLines } from "./org-text.pipe"

const invalid = (message: string): OrgCaptureValidationError => ({
	type: "ORG_CAPTURE_VALIDATION_ERROR",
	message,
})

interface Heading {
	readonly heading: OrgRefileHeadingTarget | null
	readonly title: string
	readonly rawTitle: string
	readonly children: Heading[]
	readonly bodyFrom: number
	bodyTo: number
	to: number
}

const outline = (source: string): Heading => {
	const root: Heading = { heading: null, title: "", rawTitle: "", children: [], bodyFrom: 0, bodyTo: source.length, to: source.length }
	const stack = [root]
	const lineEnds = new Map(structuralOrgSourceLines(source).map((line) => [line.from, line.breakTo]))
	const keywords = parseOrgTodoKeywords(source)
	const states = new Set([...keywords.todo, ...keywords.done])
	for (const heading of enumerateOrgRefileHeadings(source)) {
		while (stack.length > 1 && (stack.at(-1)?.heading?.level ?? 0) >= heading.level) {
			const closed = stack.pop()!
			closed.to = heading.from
		}
		const parent = stack.at(-1)!
		if (!parent.children.length) parent.bodyTo = heading.from
		const rawTitle = heading.heading.replace(/^\*+[ \t]+/, "").trim()
		const firstWord = rawTitle.split(/[ \t]+/, 1)[0]
		const withoutState = states.has(firstWord) ? rawTitle.slice(firstWord.length).trimStart() : rawTitle
		const title = withoutState.replace(/^\[#[A-Za-z0-9]+\][ \t]+/, "").replace(/^COMMENT[ \t]+/, "")
			.replace(/^(?:\[[0-9%/]+\][ \t]*)+/, "").replace(/[ \t]+:(?:[^:\s]+:)+[ \t]*$/, "")
			.replace(/[ \t]*(?:\[[0-9%/]+\][ \t]*)+$/, "").trim()
		const node: Heading = { heading, title, rawTitle, children: [], bodyFrom: lineEnds.get(heading.from)!, bodyTo: source.length, to: source.length }
		parent.children.push(node)
		stack.push(node)
	}
	const close = (node: Heading) => {
		if (!node.children.length) node.bodyTo = node.to
		for (const child of node.children) close(child)
	}
	close(root)
	return root
}


/** Only boundary separators are new; neither side is serialized or normalized. */
const insertAt = (source: string, at: number, payload: string): string => {
	const joined = appendOrgSubtree(source.slice(0, at), payload)
	return joined + (source.slice(at) && !/[\r\n]$/.test(joined) ? detectOrgNewline(source) : "") + source.slice(at)
}

interface ResolvedTarget {
	readonly source: string
	readonly node: Heading
	readonly preview: OrgCaptureTargetPreview
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

/** Resolves exact sibling paths, creating only the missing suffix. Date keys are sorted at each depth. */
const resolveTarget = (existingSource: string, target: OrgCaptureTarget): E.Either<OrgCaptureValidationError, ResolvedTarget> => {
	const valid = validateOrgCaptureTarget(target)
	if (E.isLeft(valid)) return valid
	if (orgBlockRanges(existingSource).some((range) => !range.closed) || orgDrawerRanges(existingSource).some((range) => !range.closed))
		return E.left(invalid("Capture target has an unclosed Org block or drawer."))
	const destination = valid.right
	const path = destination.kind === "file" ? [] : [...(destination.headingPath ?? [])]
	const parentDepth = path.length
	if (destination.kind === "datetree") {
		const [year, month, day] = destination.date.split("-").map(Number)
		const date = new Date(0)
		date.setFullYear(year, month - 1, day)
		date.setHours(12, 0, 0, 0)
		path.push(destination.date.slice(0, 4), `${destination.date.slice(0, 7)} ${MONTHS[month - 1]}`, `${destination.date} ${WEEKDAYS[date.getDay()]}`)
	}
	let source = existingSource
	let node = outline(source)
	const createdHeadings: string[] = []
	const resolvedPath: string[] = []
	const resolvedRawPath: string[] = []
	for (let index = 0; index < path.length; index++) {
		const title = path[index].trim()
		const dateDepth = destination.kind === "datetree" ? index - parentDepth : -1
		const keyPattern = dateDepth === 0 ? /^(\d{4})(?:[ \t]|$)/ : dateDepth === 1 ? /^(\d{4}-\d{2})(?:[ \t]|$)/ : /^(\d{4}-\d{2}-\d{2})(?:[ \t]|$)/
		const key = dateDepth < 0 ? title : title.split(" ")[0]
		const matches = node.children.filter((child) => dateDepth < 0 ? child.title === title || child.rawTitle === title : keyPattern.exec(child.title)?.[1] === key)
		if (matches.length > 1) return E.left(invalid(`Capture target is ambiguous: duplicate sibling heading ${title}.`))
		let at = node.to
		if (dateDepth >= 0) {
			let previous = ""
			for (const child of node.children) {
				const childKey = keyPattern.exec(child.title)?.[1]
				if (!childKey) continue
				if (childKey <= previous) return E.left(invalid("Capture datetree has duplicate or unsorted date siblings."))
				previous = childKey
				if (childKey > key && at === node.to) at = child.heading!.from
			}
		}
		if (matches[0]) {
			node = matches[0]
		} else {
			const level = (node.heading?.level ?? 0) + 1
			source = insertAt(source, at, `${"*".repeat(level)} ${title}${detectOrgNewline(source)}`)
			createdHeadings.push(title)
			// Re-resolve by exact actual ancestor titles, never by slash splitting or line guesses.
			node = outline(source)
			for (const part of [...resolvedRawPath, title]) node = node.children.find((child) => child.rawTitle === part)!
		}
		resolvedPath.push(node.title || node.rawTitle)
		resolvedRawPath.push(node.rawTitle)
	}
	const preview = Object.freeze({
		headingPath: Object.freeze(resolvedPath),
		line: node.heading?.lineNumber ?? source.split(/\r\n|\r|\n/).length,
		createdHeadings: Object.freeze(createdHeadings),
	})
	return E.right({ source, node, preview })
}

export const previewOrgCaptureTarget = (existingSource: string, target: OrgCaptureTarget): E.Either<OrgCaptureValidationError, OrgCaptureTargetPreview> =>
	E.map((resolved: ResolvedTarget) => resolved.preview)(resolveTarget(existingSource, target))

const itemMatch = (text: string) => /^(?<indent>[ \t]*)(?<bullet>[-+]|\d+[.)]|[a-zA-Z][.)]|(?<star>\*))(?<space>[ \t]+)(?<body>.*)$/.exec(text)
const indentation = (text: string): number => {
	let columns = 0
	for (const character of text) columns = character === "\t" ? columns + 8 - columns % 8 : columns + 1
	return columns
}

/** Heading searches use only their body; file searches span the whole file. Containers keep their own boundaries. */
const bodyContainer = (source: string, node: Pick<Heading, "bodyFrom" | "bodyTo">, table: boolean) => {
	const lines = structuralOrgSourceLines(source).filter((line) => line.from >= node.bodyFrom && line.from < node.bodyTo)
	const first = lines.find((line) => {
		if (table) return /^[ \t]*\|/.test(line.text)
		const match = itemMatch(line.text)
		return match && (!match.groups?.star || !!match.groups.indent)
	})
	if (!first) return null
	const indent = /^[ \t]*/.exec(first.text)![0]
	const columns = indentation(indent)
	let to = first.breakTo
	let lastBullet = itemMatch(first.text)?.groups?.bullet ?? "-"
	let blanks = 0
	for (const line of lines.filter((line) => line.from >= first.breakTo)) {
		if (table) {
			if (line.from !== to || !/^[ \t]*\|/.test(line.text)) break
			to = line.breakTo
			continue
		}
		if (/^\*+[ \t]+/.test(line.text)) break
		if (!line.text.trim()) {
			if (++blanks >= 2) break
			continue
		}
		const gap = source.slice(to, line.from)
		// A skipped block/drawer belongs to this item only when its opening is indented.
		if (gap.trim()) {
			const firstProtected = gap.split(/\r\n|\r|\n/).find((text) => text.trim())!
			if (indentation(/^[ \t]*/.exec(firstProtected)![0]) <= columns) break
		}
		const match = itemMatch(line.text)
		const lineColumns = indentation(/^[ \t]*/.exec(line.text)![0])
		if (lineColumns < columns || (!match && lineColumns <= columns)) break
		if (match && lineColumns === columns) lastBullet = match.groups!.bullet
		blanks = 0
		to = line.breakTo
	}
	// A trailing indented literal block is part of the list even without a subsequent eligible line.
	if (!table) {
		for (const range of [...orgBlockRanges(source), ...orgDrawerRanges(source)].sort((a, b) => a.from - b.from)) {
			const gap = source.slice(to, range.from)
			if (range.from < to || range.to > node.bodyTo || gap.trim() || (gap.match(/\r\n|\r|\n/g)?.length ?? 0) >= 2) continue
			const opening = source.slice(range.from).split(/\r\n|\r|\n/, 1)[0]
			if (indentation(/^[ \t]*/.exec(opening)![0]) > columns) to = range.to
		}
	}
	return { to, indent, lastBullet }
}

export const planOrgCapturePlacement = (existingSource: string, request: OrgCaptureRequest): E.Either<OrgCaptureValidationError, { content: string; preview: OrgCaptureTargetPreview }> => {
	const valid = validateOrgCaptureSource(request.entrySource, request.entryType)
	if (E.isLeft(valid)) return valid
	if (orgBlockRanges(request.entrySource).some((range) => !range.closed) || orgDrawerRanges(request.entrySource).some((range) => !range.closed))
		return E.left(invalid("Capture source has an unclosed Org block or drawer."))
	const resolved = resolveTarget(existingSource, request.target)
	if (E.isLeft(resolved)) return resolved
	const { source, node, preview } = resolved.right
	let incoming = request.entrySource
	let at = request.entryType === "entry" || !node.heading ? node.to : node.bodyTo
	const bodyScope = { bodyFrom: node.bodyFrom, bodyTo: node.heading ? node.bodyTo : node.to }
	const headings = enumerateOrgRefileHeadings(incoming)
	if (request.entryType === "entry") {
		if (!headings.length || headings[0].level !== 1 || incoming.slice(0, headings[0].from).trim())
			return E.left(invalid("Capture entry must begin with a real level-one heading."))
		const delta = node.heading?.level ?? 0
		if (delta) {
			let from = 0
			const parts: string[] = []
			for (const heading of headings) {
				parts.push(incoming.slice(from, heading.from), "*".repeat(heading.level + delta))
				from = heading.from + heading.level
			}
			parts.push(incoming.slice(from))
			incoming = parts.join("")
		}
	} else {
		if (request.entryType !== "plain") {
			if (headings.length) return E.left(invalid("Capture list and table sources must not contain real headings."))
			const table = request.entryType === "table-line"
			if (!table) {
				const list = bodyContainer(incoming, outline(incoming), false)
				if (!list || incoming.slice(list.to).trim())
					return E.left(invalid("Capture item source must contain only one complete list, including its indented continuations."))
			}
			const container = bodyContainer(source, bodyScope, table)
			if (container) {
				at = container.to
				const firstIndent = /^[ \t]*/.exec(incoming.split(/\r\n|\r|\n/).find((line) => line.trim())!)![0]
				const bullet = /^(\d+)([.)])$/.exec(container.lastBullet)
				let nextNumber = bullet ? Number(bullet[1]) + 1 : 0
				// Match real eligible list lines, not heading-looking or bullet-looking block literals.
				const eligible = new Set(structuralOrgSourceLines(incoming).map((line) => line.from))
				incoming = incoming.replace(/(^|\r\n|\r|\n)([^\r\n]*)/g, (whole, boundary: string, line: string, offset: number) => {
					if (!line.trim()) return whole
					const match = !table && eligible.has(offset + boundary.length) ? itemMatch(line) : null
					let shifted = table ? line.replace(/^[ \t]*/, "") : line.startsWith(firstIndent) ? line.slice(firstIndent.length) : line
					if (match && match.groups!.indent === firstIndent) {
						const nextBullet = bullet ? `${nextNumber++}${bullet[2]}` : container.lastBullet
						shifted = nextBullet + match.groups!.space + match.groups!.body
					}
					return boundary + container.indent + shifted
				})
			} else if (table) {
				const newline = detectOrgNewline(source)
				incoming = `|   |${newline}|---|${newline}${incoming}`
			}
		}
	}
	return E.right({ content: insertAt(source, at, incoming), preview })
}
