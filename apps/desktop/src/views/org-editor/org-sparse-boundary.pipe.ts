import { structuralOrgSourceLines } from "@/pipes/org/org-text.pipe"

/** Owned batches may remove a complete visible subtree, or replace its boundary separator.
 * Neither permission includes any byte of the following hidden heading. */
export const safeOrgSparseBoundaryChange = (
	source: string,
	from: number,
	to: number,
	insert: string,
): boolean => {
	if (insert === "")
		return (
			(from === 0 || /[\r\n]$/.test(source.slice(0, from))) &&
			structuralOrgSourceLines(source).some(
				(line) => line.from === from && /^\*+[ \t]+/.test(line.text),
			)
		)
	const separator = /(?:\r\n|\r|\n)$/.exec(source.slice(0, to))?.[0]
	return (
		separator !== undefined &&
		from === to - separator.length &&
		insert.startsWith(separator) &&
		/[\r\n]$/.test(insert)
	)
}
