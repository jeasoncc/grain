/** Legacy migration data access through one consistent backend snapshot. */

import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { decodeLegacyMigrationContents } from "@/types/codec"
import { decodeLegacyMigrationInput, decodeLegacyRecoveryGraph, type LegacyMigrationContent } from "@/pipes/migration"
import type { AppError } from "@/types/error"
import type { LegacyRecoveryGraph, LegacyRecoveryWorkspace } from "@/types/org/org.interface"
import { api } from "./client.api"

export interface LegacyMigrationSnapshot {
	readonly graph: LegacyRecoveryGraph
	readonly contents: readonly LegacyMigrationContent[]
}

/** Narrow, raw metadata; never uses generic editable workspace CRUD or JS integer projections. */
export const listLegacyWorkspaces = (): TE.TaskEither<AppError, readonly LegacyRecoveryWorkspace[]> =>
    pipe(api.listLegacyWorkspaces(), TE.chainEitherK((workspaces) => E.tryCatch(() => {
        const ids = new Set<string>()
        return workspaces.map((workspace) => {
            // Reuse the exact recovery metadata decoder, with no graph/body projection loaded.
            const decoded = decodeLegacyRecoveryGraph({ workspace, nodes: [] }).workspace
            if (ids.has(decoded.id)) throw new Error("Duplicate historical workspace ID")
            ids.add(decoded.id)
            return decoded
        })
    }, (cause): AppError => ({ type: "VALIDATION_ERROR", message: String(cause) }))))

/** Load and decode all migration inputs from the backend's single read snapshot. */
export const getLegacyMigrationSnapshot = (
	workspaceId: string,
): TE.TaskEither<AppError, LegacyMigrationSnapshot> =>
	pipe(
		api.getLegacyMigrationSnapshot(workspaceId),
		TE.chainEitherK(({ graph, contents }) => E.tryCatch(
			() => decodeLegacyMigrationInput({
				graph,
				contents: decodeLegacyMigrationContents(contents),
			}),
			(cause): AppError => ({ type: "VALIDATION_ERROR", message: String(cause) }),
		)),
	)
