/** Convert raw UTF-16 source offsets to CodeMirror's normalized document offsets. */
export const editorOffsetFromSource = (
	source: string,
	position: number,
	lineBreak: string,
): number => {
	if (lineBreak.length === 1) {
		return position
	}
	const completeBreaks = source.slice(0, position).match(/\r\n/g)?.length ?? 0
	return position - completeBreaks * (lineBreak.length - 1)
}
