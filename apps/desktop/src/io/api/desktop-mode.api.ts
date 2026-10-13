import { invoke } from "@tauri-apps/api/core"
import type * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { z } from "zod"
import type { AppError } from "@/types/error"
import { dbError } from "@/types/error"

const desktopModeSchema = z.enum(["org", "legacy"])
export type DesktopMode = "org" | "legacy"

const isNativeDesktop = (): boolean =>
	typeof window !== "undefined" &&
	("__TAURI_INTERNALS__" in window || "__TAURI__" in window)

// Native mode is immutable for the process. A failed lookup remains fail-closed.
let desktopModeResult: Promise<E.Either<AppError, DesktopMode>> | undefined

export const getDesktopMode = (): TE.TaskEither<AppError, DesktopMode> => () => {
	desktopModeResult ??= TE.tryCatch(
		async (): Promise<DesktopMode> => {
			// The browser has no legacy database authority, even with a configured HTTP API.
			if (!isNativeDesktop()) return "org"
			const mode = await invoke<unknown>("get_desktop_mode")
			return desktopModeSchema.parse(mode)
		},
		(cause) => dbError(`Unable to determine desktop mode: ${String(cause)}`),
	)()
	return desktopModeResult
}

export const requireLegacyMode = (): TE.TaskEither<AppError, void> =>
	TE.flatMap((mode: DesktopMode) =>
		mode === "legacy"
			? TE.right(undefined)
			: TE.left(dbError("Legacy database access requires explicit native legacy mode")),
	)(getDesktopMode())
