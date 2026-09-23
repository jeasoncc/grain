/** Legacy migration data access through one consistent backend snapshot. */

import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { decodeLegacyMigrationContents, decodeNodes } from "@/types/codec"
import type { ContentInterface } from "@/types/content"
import type { AppError } from "@/types/error"
import type { NodeInterface } from "@/types/node"
import { api } from "./client.api"

export interface LegacyMigrationSnapshot {
	readonly workspaceTitle: string
	readonly workspaceNodes: readonly NodeInterface[]
	readonly allNodes: readonly NodeInterface[]
	readonly allContents: readonly ContentInterface[]
}

/** Load and decode all migration inputs from the backend's single read snapshot. */
export const getLegacyMigrationSnapshot = (
	workspaceId: string,
): TE.TaskEither<AppError, LegacyMigrationSnapshot> =>
	pipe(
		api.getLegacyMigrationSnapshot(workspaceId),
		TE.map(({ allContents, allNodes, workspaceNodes, workspaceTitle }) => ({
			allContents: decodeLegacyMigrationContents(allContents),
			allNodes: decodeNodes(allNodes),
			workspaceNodes: decodeNodes(workspaceNodes),
			workspaceTitle,
		})),
	)
