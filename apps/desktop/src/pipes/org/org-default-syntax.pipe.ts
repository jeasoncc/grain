import { ORG_NATIVE_CHARACTER_ATOMS, ORG_NATIVE_WORD_NAVIGATION } from "./org-default-syntax-data.pipe"

/** Installed-default Org buffer word syntax, generated from actual GNU primitives. */
export const ORG_DEFAULT_WORD_REGEXP_SOURCE = ORG_NATIVE_CHARACTER_ATOMS.propertyWord
const defaultWordCharacter = new RegExp(`^(?:${ORG_DEFAULT_WORD_REGEXP_SOURCE})$`, "u")

/** Default Org word syntax, without the tag-only table's underscore override. */
export const isOrgDefaultWordCharacter = (character: string): boolean =>
	defaultWordCharacter.test(character)

const nativeRangeIndex = (ranges: readonly (readonly [number, number, ...unknown[]])[], point: number): number => {
	let low = 0
	let high = ranges.length - 1
	while (low <= high) {
		const middle = (low + high) >>> 1
		const range = ranges[middle]
		if (point < range[0]) high = middle - 1
		else if (point > range[1]) low = middle + 1
		else return middle
	}
	return -1
}

const nativeWordScript = (point: number): string | undefined => {
	const index = nativeRangeIndex(ORG_NATIVE_WORD_NAVIGATION.scripts, point)
	return index < 0 ? undefined : ORG_NATIVE_WORD_NAVIGATION.scripts[index][2]
}
const nativeWordCategory = (point: number, category: number): boolean =>
	nativeRangeIndex(ORG_NATIVE_WORD_NAVIGATION.categories[category], point) >= 0

/** GNU word_boundary_p: ordered category exceptions to script boundaries. */
const nativeWordBreak = (left: number, right: number): boolean => {
	const sameScript = nativeWordScript(left) === nativeWordScript(right)
	const pairs = sameScript ? ORG_NATIVE_WORD_NAVIGATION.separating : ORG_NATIVE_WORD_NAVIGATION.combining
	for (const [before, after] of pairs) {
		if ((before === null || nativeWordCategory(left, before) && !nativeWordCategory(right, before)) &&
			(after === null || !nativeWordCategory(left, after) && nativeWordCategory(right, after))) return sameScript
	}
	return !sameScript
}
const previousCharacterStart = (source: string, point: number): number => {
	const unit = source.charCodeAt(point - 1)
	return unit >= 0xdc00 && unit <= 0xdfff ? point - 2 : point - 1
}

const nativeForwardWord = (source: string, point: number): number => {
	while (point < source.length) {
		const character = source.codePointAt(point)!
		const width = character > 0xffff ? 2 : 1
		point += width
		if (!isOrgDefaultWordCharacter(String.fromCodePoint(character))) continue
		let previous = character
		while (point < source.length) {
			const next = source.codePointAt(point)!
			if (!isOrgDefaultWordCharacter(String.fromCodePoint(next)) || nativeWordBreak(previous, next)) break
			point += next > 0xffff ? 2 : 1
			previous = next
		}
		return point
	}
	return point
}

const nativeBackwardWord = (source: string, point: number): number => {
	while (point > 0) {
		point = previousCharacterStart(source, point)
		const character = source.codePointAt(point)!
		if (!isOrgDefaultWordCharacter(String.fromCodePoint(character))) continue
		let next = character
		while (point > 0) {
			const start = previousCharacterStart(source, point)
			const previous = source.codePointAt(start)!
			if (!isOrgDefaultWordCharacter(String.fromCodePoint(previous)) || nativeWordBreak(previous, next)) break
			point = start
			next = previous
		}
		return point
	}
	return point
}

/** Installed-default thingatpt word bounds for validated LF/uniform-CRLF source.
 * Point and bounds are raw UTF-16 character boundaries. Navigation uses native
 * scripts/categories, unlike regexp \\w, and can select a word ending at point.
 */
export const orgDefaultWordBounds = (source: string, point: number): { readonly from: number; readonly to: number } | null => {
	if (!/[^\t\r\n ]/.test(source)) return null
	const firstEnd = nativeForwardWord(source, point)
	const firstStart = nativeBackwardWord(source, firstEnd)
	if (firstStart <= point) {
		const to = nativeForwardWord(source, firstStart)
		return point <= to && firstStart < to ? { from: firstStart, to } : null
	}
	const end = nativeForwardWord(source, nativeBackwardWord(source, point))
	const from = nativeBackwardWord(source, end)
	return from <= point && point <= end && from < end ? { from, to: end } : null
}

/** GNU default emphasis punctuation, non-space borders and one line break. */
export const orgMarkupEndAt = (text: string, start: number): number => {
	if ((start > 0 && !/[-\s('"{]/.test(text[start - 1])) || /\s/.test(text[start + 1])) return -1
	let breaks = 0
	for (let end = start + 1; end < text.length; end++) {
		if (text[end] === "\n" || text[end] === "\r" && text[end + 1] !== "\n") {
			if (++breaks > 1) return -1
		}
		if (text[end] === text[start] && end > start + 1 && !/\s/.test(text[end - 1])
			&& (end + 1 === text.length || /[-\s.,:!?;'")}\[]/.test(text[end + 1]))) return end
	}
	return -1
}

/** Mask literal inline code without shifting raw UTF-16 source positions. */
export const maskOrgInlineCode = (text: string): string => {
	let result = ""
	let from = 0
	for (let index = 0; index < text.length; index++) {
		if (text[index] !== "~" && text[index] !== "=") continue
		const end = orgMarkupEndAt(text, index)
		if (end < 0) continue
		result += text.slice(from, index) + " ".repeat(end - index + 1)
		from = end + 1
		index = end
	}
	return result + text.slice(from)
}

