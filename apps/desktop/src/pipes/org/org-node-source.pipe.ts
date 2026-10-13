export interface OrgNodeSourceLine {
	readonly text: string
	readonly line: number
	readonly heading: string | null
	readonly headingLine: number
	readonly headingStart: boolean
	readonly property: { readonly name: string; readonly value: string } | null
	readonly visible: boolean
}

/** One lexical boundary for node metadata, ID navigation and backlinks; source remains verbatim. */
export const scanOrgNodeSource = (source: string): readonly OrgNodeSourceLine[] => {
	const lines = source.split(/\r\n|\r|\n/)
	const blocked: boolean[] = []
	let block: string | null = null
	for (const line of lines) {
		const begin = line.match(/^\s*#\+begin_(\S+)/i)
		const end = line.match(/^\s*#\+end_(\S+)/i)
		if (block === null && begin) block = begin[1].toLowerCase()
		blocked.push(block !== null || end !== null)
		if (end && end[1].toLowerCase() === block) block = null
	}
	const keywords = new Set(["TODO", "DONE"])
	lines.forEach((line, index) => {
		if (blocked[index]) return
		const match = line.match(/^\s*#\+(?:SEQ_)?TODO:\s*(.*)$/i)
		if (match) for (const word of match[1].split(/\s+/)) {
			const keyword = word.replace(/\([^)]*\)$/, "")
			if (keyword && keyword !== "|") keywords.add(keyword)
		}
	})
	let heading: string | null = null
	let headingLine = 1
	let commentLevel: number | null = null
	let eligible = true
	let drawer: string | null = null
	let propertyDrawer = false
	return lines.map((text, index) => {
		let headingStart = false
		let property: OrgNodeSourceLine["property"] = null
		let visible = false
		if (blocked[index] || /^[ \t]*#(?: |$)/.test(text)) {
			if (blocked[index] || heading !== null) eligible = false
		} else {
			const match = !drawer ? text.match(/^(\*+)\s+(.*)$/) : null
			if (match) {
				const level = match[1].length
				if (commentLevel === null || level <= commentLevel) {
					const first = match[2].split(/\s+/, 1)[0]
					const title = (keywords.has(first) ? match[2].slice(first.length) : match[2]).trim()
					commentLevel = /^COMMENT(?:\s|$)/.test(match[2]) || /^COMMENT(?:\s|$)/.test(title) ? level : null
					if (commentLevel === null) {
						heading = title
						headingLine = index + 1
						headingStart = true
						eligible = true
					}
				}
			}
			if (commentLevel === null) {
				if (drawer) {
					if (/^\s*:END:\s*$/i.test(text)) {
						drawer = null
						propertyDrawer = false
					} else if (propertyDrawer) {
						const match = text.match(/^\s*:([A-Z0-9_]+):\s*(.*?)\s*$/i)
						if (match) property = { name: match[1].toUpperCase(), value: match[2] }
					}
				} else {
					const start = text.match(/^\s*:([A-Z0-9_]+):\s*$/i)
					if (start && start[1].toUpperCase() !== "END") {
						drawer = start[1].toUpperCase()
						propertyDrawer = drawer === "PROPERTIES" && eligible
						if (propertyDrawer) {
							let closed = false
							for (let next = index + 1; next < lines.length; next++) {
								if (/^(\*+)\s+/.test(lines[next])) break
								if (!blocked[next] && /^\s*:END:\s*$/i.test(lines[next])) { closed = true; break }
							}
							propertyDrawer = closed
						}
						eligible = false
					} else {
						visible = true
						if (!headingStart && !/^\s*(?:(?:SCHEDULED|DEADLINE|CLOSED):\s*[<[][^>\]]+[>\]]\s*)+$/.test(text)) {
							eligible = false
						}
					}
				}
			}
		}
		return { text, line: index + 1, heading, headingLine, headingStart, property, visible }
	})
}
