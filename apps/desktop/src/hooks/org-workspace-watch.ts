import type { OrgWorkspaceChangedEventInterface, OrgWorkspaceWatchToken } from "@/types/org"

export interface DebouncedOrgWorkspaceRefresh {
	readonly schedule: () => void
	readonly cancel: () => void
}

export const matchesOrgWorkspaceWatch = (
	event: OrgWorkspaceChangedEventInterface,
	workspaceRoot: string,
	token: OrgWorkspaceWatchToken,
): boolean => event.workspaceRoot === workspaceRoot && event.token === token

/** Coalesces bursts from the filesystem boundary into one current-state refresh. */
export const createDebouncedOrgWorkspaceRefresh = (
	refresh: () => void,
	delayMilliseconds = 150,
): DebouncedOrgWorkspaceRefresh => {
	let timer: ReturnType<typeof setTimeout> | undefined
	return {
		cancel: () => {
			if (timer !== undefined) {
				clearTimeout(timer)
				timer = undefined
			}
		},
		schedule: () => {
			if (timer !== undefined) {
				clearTimeout(timer)
			}
			timer = setTimeout(() => {
				timer = undefined
				refresh()
			}, delayMilliseconds)
		},
	}
}
