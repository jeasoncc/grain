import {
	orgSparseTreeComparableStrings,
	orgSparseTreeSpecialPropertyRequest,
	type OrgSparseTreeNativeContext,
} from "@/pipes/org/org-sparse-tree.pipe"
import {
	captureOrgSparseSpecialProperties,
	orgSparseSpecialPropertyClockRequest,
	type OrgSparseClockContext,
	type OrgSparseDependencyContext,
} from "@/pipes/org/org-sparse-special-properties.pipe"
import type { OrgSparseTreeQuery } from "@/types/org"
import { readOrgSparseTreeNativeContext } from "@/io/api/org-collation.api"
import { readOrgSparseClockContext } from "@/io/api/org-clock-context.api"

const nativeDefaultDependencies: OrgSparseDependencyContext = Object.freeze({
	enforceTodoDependencies: false,
	enforceCheckboxDependencies: false,
	blockerHooks: "gnu-default",
})
export type OrgSparseClockAdapter = (clock: OrgSparseClockContext) => OrgSparseClockContext | Promise<OrgSparseClockContext>

/** Exact readonly Source metadata and native environment snapshot; owns no effect/write permission. */
export function prepareOrgSparseTreeContext(
	source: string, query: OrgSparseTreeQuery, fileName: string | null, signal?: AbortSignal, adaptClock?: OrgSparseClockAdapter,
): OrgSparseTreeNativeContext | Promise<OrgSparseTreeNativeContext> {
	const request = orgSparseTreeSpecialPropertyRequest(source, query)
	const capture = (clock?: OrgSparseClockContext): OrgSparseTreeNativeContext | Promise<OrgSparseTreeNativeContext> => {
		if (signal?.aborted) throw new DOMException("Sparse-tree context read aborted", "AbortError")
		const specialProperties = request.properties.length
			? captureOrgSparseSpecialProperties(source, request, { fileName, dependencies: nativeDefaultDependencies, clock })
			: undefined
		const context: OrgSparseTreeNativeContext = Object.freeze({ specialProperties })
		const strings = orgSparseTreeComparableStrings(source, query, undefined, context)
		if (strings.length === 0) return context
		return Promise.resolve().then(() => readOrgSparseTreeNativeContext(strings, signal)).then(collation =>
			Object.freeze({ specialProperties, compareStrings: collation?.compareStrings }))
	}
	if (request.properties.some(property => property === "CLOCKSUM" || property === "CLOCKSUM_T")) {
		const calendarTimes = orgSparseSpecialPropertyClockRequest(source, request).calendarTimes
		return Promise.resolve().then(() => readOrgSparseClockContext(calendarTimes, signal))
			.then(clock => adaptClock ? adaptClock(clock) : clock).then(capture)
	}
	return capture()
}
