export interface OrgPlanningFieldRange {
	readonly kind: "CLOSED" | "SCHEDULED" | "DEADLINE"
	readonly from: number
	readonly to: number
	readonly date: string
	readonly dateFrom: number
	/** Includes an existing weekday, which must be removed when changing the date. */
	readonly dateAndWeekdayTo: number
}
export type OrgPlanningLineResult =
	| { readonly kind: "none" }
	| { readonly kind: "invalid"; readonly message: string }
	| { readonly kind: "planning"; readonly fields: readonly OrgPlanningFieldRange[] }

/** Source ranges only. Ambiguous/unsupported lines must never be rewritten by guessing. */
export const parseOrgPlanningLine = (text: string): OrgPlanningLineResult => {
	if (!/^[ \t]*(?:CLOSED|SCHEDULED|DEADLINE):/i.test(text)) return { kind: "none" }
	const fields: OrgPlanningFieldRange[] = []
	let position = 0
	while (position < text.length) {
		position += /^[ \t]*/.exec(text.slice(position))![0].length
		if (position === text.length) break
		const field = /^(CLOSED|SCHEDULED|DEADLINE):[ \t]*/i.exec(text.slice(position))
		if (!field) {
			// Preserve opaque text between/after fields, but never find a field inside brackets.
			const brackets: string[] = []
			while (position < text.length) {
				const character = text[position]
				if (
					brackets.length === 0 &&
					(position === 0 || /[ \t]/.test(text[position - 1])) &&
					/^(?:CLOSED|SCHEDULED|DEADLINE):/i.test(text.slice(position))
				)
					break
				if (character === "<" || character === "[") brackets.push(character === "<" ? ">" : "]")
				else if (character === ">" || character === "]") {
					if (brackets.pop() !== character)
						return {
							kind: "invalid",
							message:
								"The planning line contains mismatched brackets. Edit it directly before changing its date.",
						}
				}
				position++
			}
			if (brackets.length)
				return {
					kind: "invalid",
					message:
						"The planning line contains an unterminated bracketed value. Edit it directly before changing its date.",
				}
			continue
		}
		if (field[1] !== field[1].toUpperCase())
			return {
				kind: "invalid",
				message:
					"The planning line contains noncanonical field casing. Use uppercase CLOSED, SCHEDULED, and DEADLINE before changing its date.",
			}
		const kind = field[1] as OrgPlanningFieldRange["kind"]
		if (fields.some((existing) => existing.kind === kind))
			return {
				kind: "invalid",
				message: `The planning line contains duplicate ${kind} fields. Resolve them before changing its date.`,
			}
		const timestampFrom = position + field[0].length
		const opener = text[timestampFrom]
		if (opener !== "<" && opener !== "[")
			return {
				kind: "invalid",
				message:
					"The planning line contains a malformed timestamp. Edit it directly before changing its date.",
			}
		const close = opener === "<" ? ">" : "]"
		const timestampTo = text.indexOf(close, timestampFrom + 1)
		const body = timestampTo < 0 ? "" : text.slice(timestampFrom + 1, timestampTo)
		const date =
			/^(\d{4}-\d{2}-\d{2})(?:[ \t]+(?:[A-Za-z]{3}|(?:周|星期|礼拜)[一二三四五六日天]|[月火水木金土日]曜日))?(?=[ \t]|$)/u.exec(
				body,
			)
		if (timestampTo < 0 || /[<>\[\]]/.test(body) || !date)
			return {
				kind: "invalid",
				message:
					"The planning line contains a malformed timestamp. Edit it directly before changing its date.",
			}
		if (date[0].length === 10 && /^[ \t]+[\p{L}\p{M}]/u.test(body.slice(date[0].length)))
			return {
				kind: "invalid",
				message:
					"The timestamp uses an unsupported weekday or detail format. Edit it directly before changing its date.",
			}
		fields.push({
			kind,
			from: position,
			to: timestampTo + 1,
			date: date[1],
			dateFrom: timestampFrom + 1,
			dateAndWeekdayTo: timestampFrom + 1 + date[0].length,
		})
		position = timestampTo + 1
	}
	return { kind: "planning", fields }
}
