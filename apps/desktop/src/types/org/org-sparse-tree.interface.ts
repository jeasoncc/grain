/** One sparse-tree predicate; values are literal, not regular expressions. */
export type OrgSparseTreeQuery =
	| { readonly kind: "todo"; readonly state?: string }
	| { readonly kind: "tag"; readonly name: string }
	| { readonly kind: "text"; readonly literal: string }

/** Half-open offsets into the original, unmodified UTF-16 source. */
export interface OrgSparseTreeRange {
	readonly from: number
	readonly to: number
}

export interface OrgSparseTreePlan {
	readonly query: OrgSparseTreeQuery
	readonly matchedHeadingStarts: readonly number[]
	readonly visibleHeadingStarts: readonly number[]
	readonly hiddenRanges: readonly OrgSparseTreeRange[]
	/** True when there are no matches (or nothing to hide). */
	readonly allVisible: boolean
}
