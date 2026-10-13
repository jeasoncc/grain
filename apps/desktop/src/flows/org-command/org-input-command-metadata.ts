import { orgCommandDefinitions } from "./org-workspace-command"

export interface OrgInputCommandMetadata { readonly id: string; readonly label: string }
/** These IDs are implemented by the corresponding owned tool producer, never by an ID-only grant. */
export const ORG_TOOL_INPUT_COMMANDS: readonly OrgInputCommandMetadata[] = Object.freeze([
	{ id: "org-capture.finish", label: "Finish Capture" }, { id: "org-capture.cancel", label: "Cancel Capture" },
	{ id: "org-roam.finish", label: "Finish Org-roam capture" }, { id: "org-roam.cancel", label: "Cancel Org-roam capture" },
	{ id: "org-agenda.save", label: "Save agenda changes" }, { id: "org-agenda.return-source", label: "Return to agenda source" },
	{ id: "org-agenda.next", label: "Next agenda entry" }, { id: "org-agenda.previous", label: "Previous agenda entry" },
	{ id: "org-agenda.open", label: "Open agenda entry" }, { id: "org-agenda.cycle-todo", label: "Cycle agenda TODO" },
	{ id: "org-agenda.schedule", label: "Schedule agenda entry" }, { id: "org-agenda.deadline", label: "Set agenda deadline" },
	{ id: "org-agenda.todo-state", label: "Set agenda TODO state" }, { id: "org-agenda.complete-repeating", label: "Complete recurring agenda TODO" },
	{ id: "org-agenda.remove-schedule", label: "Remove agenda schedule" }, { id: "org-agenda.remove-deadline", label: "Remove agenda deadline" },
	{ id: "org-agenda.cancel", label: "Cancel agenda command" },
	{ id: "org-todo-note.finish", label: "Accept TODO note" }, { id: "org-todo-note.cancel", label: "Cancel TODO transition" },
	{ id: "org-remark.save", label: "Save remark" }, { id: "org-remark.return-source", label: "Return to remark source" },
])
const registrations = new Map<object, { readonly token: object; readonly entries: readonly OrgInputCommandMetadata[] }>()
const listeners = new Set<() => void>()
const builtins = [...orgCommandDefinitions.map(({ id, label }) => ({ id, label })), { id: "execute-command", label: "Execute command" }, ...ORG_TOOL_INPUT_COMMANDS]
let snapshot: readonly OrgInputCommandMetadata[] = Object.freeze(builtins)
export const getOrgInputCommandMetadata = () => snapshot
export const subscribeOrgInputCommandMetadata = (listener: () => void) => {
	listeners.add(listener)
	return () => { listeners.delete(listener) }
}
const publish = () => {
	const commands = new Map(builtins.map((definition) => [definition.id, definition]))
	for (const { entries } of registrations.values()) for (const entry of entries) commands.set(entry.id, entry)
	const next = [...commands.values()]
	if (next.length === snapshot.length && next.every((entry, index) => entry.id === snapshot[index].id && entry.label === snapshot[index].label)) return
	snapshot = Object.freeze(next)
	for (const listener of listeners) listener()
}
/** Discoverability only. Execution must still capture the live application/tool registry owner. */
export const registerOrgInputCommandMetadata = (owner: object, entries: readonly OrgInputCommandMetadata[]) => {
	const registration = {}
	const commands = entries.map(({ id, label }) => {
		if (!id.trim() || !label.trim()) throw new Error("Input command metadata requires nonblank IDs and labels.")
		return Object.freeze({ id, label })
	})
	registrations.set(owner, { token: registration, entries: Object.freeze(commands) })
	publish()
	return () => {
		if (registrations.get(owner)?.token !== registration) return
		registrations.delete(owner)
		publish()
	}
}
