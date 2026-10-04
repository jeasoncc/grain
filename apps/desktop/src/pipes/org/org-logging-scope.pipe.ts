import { parseOrgPlanningLine } from "./org-planning-line.pipe"
import { eligibleOrgSourceLines, eligibleOrgDrawerRanges } from "./org-text.pipe"

export interface OrgLoggingDeclaration {
	readonly key: "LOGGING" | "LOG_INTO_DRAWER"
	readonly append: boolean
	readonly value: string
	readonly from: number
	readonly to: number
}
export interface OrgLoggingPropertyScope {
	readonly headingFrom: number | null
	readonly declarations: readonly OrgLoggingDeclaration[]
}
export type OrgLoggingScopeResult =
	| { readonly kind: "scope"; readonly scopes: readonly OrgLoggingPropertyScope[] }
	| { readonly kind: "rejected"; readonly reason: string }

/** Raw ranges and small property values only: never an AST, body copy or authority. */
export const snapshotOrgLoggingScopes = (
	source: string,
	targetHeadingFrom: number,
	states: ReadonlySet<string>,
): OrgLoggingScopeResult => {
	const eligible = eligibleOrgSourceLines(source, states)
	const headings = eligible.filter((line) => /^\*+[ \t]+/.test(line.text))
	const chain: typeof headings = []
	for (const heading of eligible.filter((line) => /^\*+[ \t]+/.test(line.text))) {
		if (heading.from > targetHeadingFrom) break
		const level = heading.text.match(/^\*+/)![0].length
		while (chain.length && chain.at(-1)!.text.match(/^\*+/)![0].length >= level) chain.pop()
		chain.push(heading)
	}
	if (chain.at(-1)?.from !== targetHeadingFrom)
		return { kind: "rejected", reason: "invalid-policy-target" }
	const raw = [...source.matchAll(/([^\r\n]*)(\r\n|\r|\n|$)/g)].map((match) => ({
		from: match.index,
		text: match[1],
		to: match.index + match[0].length,
	}))
	const drawers = eligibleOrgDrawerRanges(source, states)
	const scopes: OrgLoggingPropertyScope[] = []
	for (const owner of [null, ...chain]) {
		const start = owner?.breakTo ?? 0
		const end = headings.find((line) => line.from >= start)?.from ?? source.length
		const properties = drawers.filter(
			(range) =>
				range.from >= start &&
				range.from < end &&
				/^[ \t]*:PROPERTIES:[ \t]*$/i.test(
					raw.find((line) => line.from === range.from)?.text ?? "",
				),
		)
		if (properties.length > 1) return { kind: "rejected", reason: "ambiguous-properties" }
		const declarations: OrgLoggingDeclaration[] = []
		if (properties[0]) {
			const range = properties[0]
			if (!range.closed || range.to > end)
				return { kind: "rejected", reason: "malformed-properties" }
			// A heading property drawer belongs immediately after its optional planning line.
			if (owner) {
				const first = raw.find((line) => line.from === start)
				const expected =
					first && parseOrgPlanningLine(first.text).kind === "planning" ? first.to : start
				if (range.from !== expected) return { kind: "rejected", reason: "misplaced-properties" }
			} else if (
				raw.some((line) => line.from < range.from && line.text.trim() && !/^#\+/.test(line.text))
			) {
				return { kind: "rejected", reason: "misplaced-properties" }
			}
			for (const line of raw.filter((line) => line.from > range.from && line.from < range.to)) {
				if (/^[ \t]*:END:[ \t]*$/i.test(line.text)) continue
				const match = /^[ \t]*:([^\s:]+):(?:[ \t](.*))?$/.exec(line.text)
				if (!match || /^(PROPERTIES|LOGBOOK)$/i.test(match[1]))
					return { kind: "rejected", reason: "malformed-properties" }
				const key = match[1].replace(/\+$/, "").toUpperCase()
				if (key === "LOGGING" || key === "LOG_INTO_DRAWER")
					declarations.push({
						append: match[1].endsWith("+"),
						from: line.from,
						key,
						to: line.to,
						value: match[2] ?? "",
					})
			}
		}
		if (!owner) {
			// File PROPERTY declarations are eligible anywhere; inert body/drawer text is excluded.
			const directives = eligible.flatMap((line): OrgLoggingDeclaration[] => {
				const match = /^#\+PROPERTY:[ \t]+(LOGGING|LOG_INTO_DRAWER)(\+)?(?:[ \t]+(.*))?$/i.exec(
					line.text,
				)
				return match
					? [
							{
								append: !!match[2],
								from: line.from,
								key: match[1].toUpperCase() as OrgLoggingDeclaration["key"],
								to: line.breakTo,
								value: match[3] ?? "",
							},
						]
					: []
			})
			declarations.push(...directives)
			declarations.sort((a, b) => a.from - b.from)
		}
		scopes.push({ declarations, headingFrom: owner?.from ?? null })
	}
	return { kind: "scope", scopes }
}
