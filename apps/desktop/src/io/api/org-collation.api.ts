import { invoke } from "@tauri-apps/api/core"
import {
	OrgSparseTreeContextRequiredError,
	type OrgSparseTreeNativeContext,
} from "@/pipes/org/org-sparse-tree.pipe"

interface NativeOrgCollationSnapshot {
	readonly locale: string
	readonly ranks: readonly number[]
}

/** Data-only comparison; no filesystem grant, Source mutation, or external execution. */
export async function readOrgSparseTreeNativeContext(
	strings: readonly string[],
	signal?: AbortSignal,
): Promise<OrgSparseTreeNativeContext | undefined> {
	if (signal?.aborted) throw new DOMException("Native collation read was cancelled", "AbortError")
	if (strings.length === 0) return undefined
	const snapshot = await invoke<NativeOrgCollationSnapshot>("collate_org_match_strings", { strings })
	if (signal?.aborted) throw new DOMException("Native collation read was cancelled", "AbortError")
	if (!snapshot || typeof snapshot.locale !== "string" || !snapshot.locale ||
		!Array.isArray(snapshot.ranks) || snapshot.ranks.length !== strings.length) {
		throw new Error("Native Org collation returned an invalid comparison snapshot")
	}
	const ranks = new Map<string, number>()
	for (let index = 0; index < strings.length; index++) {
		const rank = snapshot.ranks[index]
		if (!Number.isSafeInteger(rank) || rank < 0 || rank >= strings.length) {
			throw new Error("Native Org collation returned an invalid comparison rank")
		}
		ranks.set(strings[index], rank)
	}
	return Object.freeze({
		compareStrings: (left: string, right: string) => {
			const leftRank = ranks.get(left)
			const rightRank = ranks.get(right)
			if (leftRank === undefined || rightRank === undefined) {
				throw new OrgSparseTreeContextRequiredError("Sparse-tree property strings changed; a fresh native collation snapshot is required")
			}
			return leftRank - rightRank
		},
	})
}
