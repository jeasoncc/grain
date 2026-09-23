import { listen } from "@tauri-apps/api/event"
import type { OrgWorkspaceChangedEventInterface } from "@/types/org"

export const ORG_WORKSPACE_CHANGED_EVENT = "org-workspace-changed" as const

export type StopOrgWorkspaceEventListener = () => void
export type OrgWorkspaceEventHandler = (payload: OrgWorkspaceChangedEventInterface) => void
export type ListenToTauriEvent = (
	eventName: typeof ORG_WORKSPACE_CHANGED_EVENT,
	handler: (event: { readonly payload: OrgWorkspaceChangedEventInterface }) => void,
) => Promise<StopOrgWorkspaceEventListener>

export interface OrgWorkspaceEventAdapter {
	readonly listen: (handler: OrgWorkspaceEventHandler) => Promise<StopOrgWorkspaceEventListener>
}

const listenToTauriEvent: ListenToTauriEvent = (eventName, handler) => listen(eventName, handler)

/** Adapts Tauri's event envelope to the typed Org workspace payload. */
export const createOrgWorkspaceEventAdapter = (
	listenToEvent: ListenToTauriEvent = listenToTauriEvent,
): OrgWorkspaceEventAdapter => ({
	listen: (handler) =>
		listenToEvent(ORG_WORKSPACE_CHANGED_EVENT, ({ payload }) => handler(payload)),
})

export const orgWorkspaceEventAdapter = createOrgWorkspaceEventAdapter()
