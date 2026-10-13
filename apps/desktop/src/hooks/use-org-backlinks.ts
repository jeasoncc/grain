import * as E from "fp-ts/Either"
import { useEffect, useRef, useState } from "react"
import { loadOrgBacklinksFlow, type OrgBacklink } from "@/flows/org-workspace/org-backlinks.flow"
import { orgQuerySourcesFromController } from "./org-query-sources"
import type { OrgWorkspaceController } from "./use-org-workspace"

export const ORG_BACKLINKS_DEBOUNCE_MS = 200

interface BacklinksSnapshot {
	readonly key: string
	readonly backlinks: readonly OrgBacklink[]
	readonly error: string | null
	readonly isLoading: boolean
}

/** Inspector and backlinks share the same canonical-source/freshness boundary. */
export const useOrgBacklinks = (controller: OrgWorkspaceController, enabled = true) => {
	const sources = enabled ? orgQuerySourcesFromController(controller) : null
	const workspace = sources?.workspace
	const session = sources?.session
	const overlays = sources?.overlays ?? []
	const targetPath = enabled ? controller.activeDocument?.relativePath : undefined
	const key = enabled ? JSON.stringify([sources?.sourceKey, targetPath]) : "disabled"
	const currentKey = useRef(key)
	currentKey.current = key
	const [snapshot, setSnapshot] = useState<BacklinksSnapshot>({
		key: "",
		backlinks: [],
		error: null,
		isLoading: false,
	})
	useEffect(() => {
		if (!enabled || !workspace || !targetPath) return
		const abort = new AbortController()
		setSnapshot({ key, backlinks: [], error: null, isLoading: true })
		const timer = window.setTimeout(() => {
			void loadOrgBacklinksFlow(
				workspace,
				targetPath,
				overlays,
				undefined,
				undefined,
				{ workspaceSessionId: session ?? undefined },
				abort.signal,
			)()
				.then((result) => {
					if (abort.signal.aborted || currentKey.current !== key) return
					setSnapshot(
						E.isLeft(result)
							? { key, backlinks: [], error: result.left.message, isLoading: false }
							: { key, backlinks: result.right, error: null, isLoading: false },
					)
				})
				.catch(() => {
					if (abort.signal.aborted || currentKey.current !== key) return
					setSnapshot({ key, backlinks: [], error: "Cannot load backlinks.", isLoading: false })
				})
		}, ORG_BACKLINKS_DEBOUNCE_MS)
		return () => {
			abort.abort()
			window.clearTimeout(timer)
		}
	}, [key])
	// Hide old rows in the render that changes source/grant, before effect cleanup runs.
	return snapshot.key === key && enabled && workspace && targetPath
		? snapshot
		: { key, backlinks: [], error: null, isLoading: !!(enabled && workspace && targetPath) }
}
