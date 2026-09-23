import * as E from "fp-ts/Either"
import type { OrgFileRepository } from "@/io/file/org-file.repository"
import { orgFileRepository } from "@/io/file/org-file.repository"
import { buildOrgDerivedIndexDocument } from "@/pipes/org"
import type {
	OrgDerivedIndexInput,
	OrgDerivedIndexStats,
	OrgFileError,
	OrgWorkspaceInterface,
} from "@/types/org"

export interface OrgDerivedIndexStaleReadError {
	readonly type: "ORG_DERIVED_INDEX_STALE_READ_ERROR"
	readonly relativePath: string
	readonly expectedRevision: string
	readonly actualRevision: string
	readonly message: string
}

export interface OrgDerivedIndexCountMismatchError {
	readonly type: "ORG_DERIVED_INDEX_COUNT_MISMATCH_ERROR"
	readonly expected: OrgDerivedIndexStats
	readonly actual: OrgDerivedIndexStats
	readonly message: string
}

export type OrgDerivedIndexFlowError =
	| OrgFileError
	| OrgDerivedIndexStaleReadError
	| OrgDerivedIndexCountMismatchError

const compareText = (left: string, right: string): number =>
	left < right ? -1 : left > right ? 1 : 0

/** Combines per-document parser results into stable database insertion order. */
export const aggregateOrgDerivedIndexDocuments = (
	indexes: readonly OrgDerivedIndexInput[],
): OrgDerivedIndexInput => ({
	agenda: indexes
		.flatMap(({ agenda }) => agenda)
		.sort(
			(left, right) =>
				compareText(left.relativePath, right.relativePath) ||
				left.line - right.line ||
				left.column - right.column ||
				compareText(left.kind, right.kind),
		),
	documents: indexes
		.flatMap(({ documents }) => documents)
		.sort((left, right) => compareText(left.relativePath, right.relativePath)),
	headings: indexes
		.flatMap(({ headings }) => headings)
		.sort(
			(left, right) => compareText(left.relativePath, right.relativePath) || left.line - right.line,
		),
	links: indexes
		.flatMap(({ links }) => links)
		.sort(
			(left, right) =>
				compareText(left.sourceRelativePath, right.sourceRelativePath) ||
				left.line - right.line ||
				left.column - right.column ||
				compareText(left.targetKind, right.targetKind),
		),
})

export const orgDerivedIndexStatsFrom = (payload: OrgDerivedIndexInput): OrgDerivedIndexStats => ({
	agendaCount: payload.agenda.length,
	documentCount: payload.documents.length,
	headingCount: payload.headings.length,
	linkCount: payload.links.length,
})

const sameStats = (left: OrgDerivedIndexStats, right: OrgDerivedIndexStats): boolean =>
	left.agendaCount === right.agendaCount &&
	left.documentCount === right.documentCount &&
	left.headingCount === right.headingCount &&
	left.linkCount === right.linkCount

const mismatch = (
	expected: OrgDerivedIndexStats,
	actual: OrgDerivedIndexStats,
): OrgDerivedIndexCountMismatchError => ({
	actual,
	expected,
	message: `Derived Org index count verification failed: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
	type: "ORG_DERIVED_INDEX_COUNT_MISMATCH_ERROR",
})

/** Reads every scanned revision, atomically replaces the index, then verifies persisted counts. */
export const rebuildOrgDerivedIndexFlow =
	(
		workspace: OrgWorkspaceInterface,
		repository: OrgFileRepository = orgFileRepository,
	): (() => Promise<E.Either<OrgDerivedIndexFlowError, OrgDerivedIndexStats>>) =>
	async () => {
		const indexes: OrgDerivedIndexInput[] = []
		const documents = [...workspace.documents].sort((left, right) =>
			compareText(left.relativePath, right.relativePath),
		)
		for (const scanned of documents) {
			const opened = await repository.readDocument({
				relativePath: scanned.relativePath,
				workspaceRoot: workspace.rootPath,
			})()
			if (E.isLeft(opened)) {
				return opened
			}
			if (opened.right.revision !== scanned.revision) {
				return E.left({
					actualRevision: opened.right.revision,
					expectedRevision: scanned.revision,
					message: `Org document changed while rebuilding derived index: ${scanned.relativePath}`,
					relativePath: scanned.relativePath,
					type: "ORG_DERIVED_INDEX_STALE_READ_ERROR",
				})
			}
			indexes.push(
				buildOrgDerivedIndexDocument(scanned.relativePath, scanned.revision, opened.right.content),
			)
		}
		const payload = aggregateOrgDerivedIndexDocuments(indexes)
		const replaced = await repository.replaceDerivedIndex(workspace.rootPath, payload)()
		if (E.isLeft(replaced)) {
			return replaced
		}
		const expected = orgDerivedIndexStatsFrom(payload)
		return sameStats(expected, replaced.right)
			? E.right(replaced.right)
			: E.left(mismatch(expected, replaced.right))
	}

/** Clears one workspace's disposable index and verifies that all four tables are empty. */
export const clearOrgDerivedIndexFlow =
	(
		workspaceRoot: string,
		repository: OrgFileRepository = orgFileRepository,
	): (() => Promise<E.Either<OrgDerivedIndexFlowError, OrgDerivedIndexStats>>) =>
	async () => {
		const cleared = await repository.clearDerivedIndex(workspaceRoot)()
		if (E.isLeft(cleared)) {
			return cleared
		}
		const expected: OrgDerivedIndexStats = {
			agendaCount: 0,
			documentCount: 0,
			headingCount: 0,
			linkCount: 0,
		}
		return sameStats(expected, cleared.right)
			? E.right(cleared.right)
			: E.left(mismatch(expected, cleared.right))
	}
