/** Literal predicates and bounded, explicitly parsed boolean expressions. */
export type OrgSparseTreeQuery =
	| { readonly kind: "todo"; readonly state?: string }
	| { readonly kind: "tag"; readonly name: string }
	| { readonly kind: "text"; readonly literal: string }
	| { readonly kind: "itag"; readonly name: string }
	| {
			readonly kind: "and" | "or"
			readonly left: OrgSparseTreeQuery
			readonly right: OrgSparseTreeQuery
	  }
	| { readonly kind: "not"; readonly operand: OrgSparseTreeQuery }

/** Derived snapshot only: never authority for source edits or history. */
export interface OrgEffectiveTagSnapshot {
	readonly fileTags: readonly string[]
	readonly headings: readonly {
		readonly from: number
		readonly localTags: readonly string[]
		readonly effectiveTags: readonly string[]
	}[]
}

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
