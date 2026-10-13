import type { OrgInheritanceConfiguration } from "@/pipes/org/org-behavior-configuration.pipe"

export type OrgMatchComparison = "=" | "<>" | "<" | "<=" | ">" | ">="
export type OrgMatchValue =
	| { readonly kind: "string" | "date" | "regexp"; readonly value: string }
	| { readonly kind: "number"; readonly value: number }

/** Parsed match predicates; the root captures this window's immutable inheritance policy. */
export type OrgSparseTreeQuery = { readonly inheritance?: OrgInheritanceConfiguration } & (
	| { readonly kind: "all" }
	| { readonly kind: "todo"; readonly state?: string }
	| { readonly kind: "tag"; readonly name: string }
	| { readonly kind: "text"; readonly literal: string }
	| { readonly kind: "itag"; readonly name: string }
	| { readonly kind: "tag-regexp"; readonly pattern: string }
	| { readonly kind: "todo-regexp"; readonly pattern: string }
	| { readonly kind: "property"; readonly name: string; readonly comparison: OrgMatchComparison; readonly value: OrgMatchValue; readonly requirePresent?: boolean }
	| {
			readonly kind: "and" | "or"
			readonly left: OrgSparseTreeQuery
			readonly right: OrgSparseTreeQuery
	  }
	| { readonly kind: "not"; readonly operand: OrgSparseTreeQuery }
)

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
