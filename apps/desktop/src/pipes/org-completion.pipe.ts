// Locale-independent folding keeps completion identical across machines.
const fold = (value: string): string => value.toLowerCase().replace(/ß/g, "ss").replace(/ς/g, "σ")

const terms = (query: string): string[] => fold(query).trim().split(/\s+/u).filter(Boolean).sort()

/** Literal, order-independent AND matching. Punctuation has no special meaning. */
export const matchOrgCompletionTerms = (query: string, searchText: string): boolean => {
	const text = fold(searchText)
	return terms(query).every((term) => text.includes(term))
}

// Preserve the navigation picker's basename/path/subsequence ranks for one term.
const scoreTerm = (query: string, text: string): number | null => {
	const basename =
		text
			.split("/")
			.at(-1)
			?.replace(/\.org$/i, "") ?? text
	if (basename === query) return 0
	if (basename.startsWith(query)) return 10 + basename.length - query.length
	const basenameIndex = basename.indexOf(query)
	if (basenameIndex >= 0) return 100 + basenameIndex
	const pathIndex = text.indexOf(query)
	if (pathIndex >= 0) return 200 + pathIndex
	let cursor = 0
	let gap = 0
	for (const character of query) {
		const match = text.indexOf(character, cursor)
		if (match < 0) return null
		gap += match - cursor
		cursor = match + character.length
	}
	return 300 + gap
}

/** Each whitespace term must match (including fuzzy subsequences); lower is better. */
export const scoreOrgCompletionTerms = (query: string, searchText: string): number | null => {
	const text = fold(searchText)
	let total = 0
	for (const term of terms(query)) {
		const score = scoreTerm(term, text)
		if (score === null) return null
		total += score
	}
	return total
}
