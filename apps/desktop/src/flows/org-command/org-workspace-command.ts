import { guardOrgHeadingCommand, type OrgBufferCommandContext } from "./org-buffer-command"
import { changeOrgHeadingLevelAt, moveOrgSubtreeAt, toggleOrgCheckboxAt } from "@/pipes/org/org-text.pipe"
import { orgLinkTargetAt } from "@/pipes/org/org-link.pipe"
import { extractOrgSubtreeAt } from "@/pipes/org/org-subtree-refile.pipe"
import { createOrgPlanningCommand } from "./org-planning.command"
import { orgPropertyBufferCommand } from "./org-property.command"
import type { OrgBufferCommand, OrgBufferCommandPreparation } from "./org-buffer-command"
import { orgTagsBufferCommand } from "./org-tags.command"
import { orgSparseTreeBufferCommand } from "./org-sparse-tree.command"
import { prepareOrgPlanningDefault, systemOrgNow } from "@/utils/org-date-clock"
import { orgTableCommandDefinitions } from "./org-table.command"
import { createOrgTimestampCommand } from "./org-timestamp.command"
import { createOrgTodoStateCommand } from "./org-todo-state.command"
import { DEFAULT_ORG_BEHAVIOR_CONFIGURATION, type OrgBehaviorConfiguration } from "@/pipes/org/org-behavior-configuration.pipe"

export interface OrgCommandEditorContext extends OrgBufferCommandContext {
	readonly readOnly: boolean
	/** Exact source offsets of the active window selection, not normalized editor offsets. */
	readonly selectionFrom?: number
	readonly selectionTo?: number
	readonly selectionRangeCount?: number
	readonly windowId?: string
	/** Exact mounted window/runtime ownership, not merely a document path. */
	readonly available: boolean
	readonly ownership: object
	readonly revision: number
}
export interface OrgCommandContext {
	readonly hasWorkspace: boolean
	readonly hasDocument: boolean
	readonly hasBuffers?: boolean
	readonly hasDirtyBuffers?: boolean
	readonly isDirty: boolean
	readonly isBusy: boolean
	readonly sidebarVisible: boolean
	readonly inspectorVisible: boolean
	readonly editor?: OrgCommandEditorContext | null
	/** Current parameter/TODO ownership may suspend commands at the common boundary. */
	readonly blockedReason?: string | null
}
export type OrgCommandIcon = "quickOpen" | "save" | "refresh" | "agenda" | "capture" | "diary" | "files" | "sidebar" | "inspector"
type Requirement = "workspace" | "document" | "buffers" | "dirty" | "dirty-buffers" | "editor" | "writable" | "heading" | "saved"
interface CommandMetadata {
	readonly id: string
	readonly label: string
	readonly icon: OrgCommandIcon
	readonly scope: "workspace" | "editor"
	readonly requires: readonly Requirement[]
	readonly shortcut?: string
	readonly prefix?: { readonly map: string; readonly key: string }
	readonly whileBusy?: boolean
	readonly check?: (context: OrgCommandEditorContext) => string | null
	readonly parameter?: (defaultDate: string, now: () => Date, configuration: OrgBehaviorConfiguration) => OrgBufferCommand
}
const heading = ["document", "editor", "writable", "heading"] as const
const writable = ["document", "editor", "writable"] as const
const remarkSourceReason = (target: OrgCommandEditorContext): string | null =>
	target.relativePath.endsWith("-notes.org") ? "Remarks belong to a source file, not its notes sidecar" : null
const preparationReason = (preparation: OrgBufferCommandPreparation): string | null =>
	preparation.kind === "rejected" ? preparation.message : null
const scheduled = createOrgPlanningCommand("SCHEDULED", "2000-01-01")
const deadline = createOrgPlanningCommand("DEADLINE", "2000-01-01")
const planningParameter = (kind: "SCHEDULED" | "DEADLINE", defaultDate: string, now: () => Date, configuration: OrgBehaviorConfiguration): OrgBufferCommand => {
	const command = createOrgPlanningCommand(kind, defaultDate, undefined, "set", { logging: configuration.logging, inheritance: configuration.inheritance })
	return { ...command, prepare: (context) => prepareOrgPlanningDefault(command.prepare(context), now) }
}
/** Metadata, prerequisites, prefix routes and discoverability have one owner. */
export const orgCommandDefinitions = [
	{ id: "quick-open", label: "Quick open", icon: "quickOpen", scope: "workspace", requires: ["workspace"], shortcut: "Ctrl O" },
	{ id: "save", label: "Save current note", icon: "save", scope: "workspace", requires: ["workspace", "document", "dirty"], shortcut: "Ctrl S" },
	{ id: "reconcile-file", label: "Review / reconcile current file", icon: "refresh", scope: "workspace", requires: ["workspace", "document", "editor"], shortcut: "Ctrl Alt R" },
	{ id: "buffer-switch", label: "Switch buffer", icon: "files", scope: "workspace", requires: ["workspace", "buffers"], shortcut: "Ctrl Shift B" },
	{ id: "buffer-next", label: "Next open buffer", icon: "files", scope: "workspace", requires: ["workspace", "buffers"], shortcut: "Ctrl Tab", whileBusy: true },
	{ id: "buffer-previous", label: "Previous open buffer", icon: "files", scope: "workspace", requires: ["workspace", "buffers"], shortcut: "Ctrl Shift Tab", whileBusy: true },
	{ id: "save-all", label: "Save all buffers", icon: "save", scope: "workspace", requires: ["workspace", "dirty-buffers"], shortcut: "Ctrl Shift S" },
	{ id: "refresh", label: "Refresh workspace", icon: "refresh", scope: "workspace", requires: ["workspace"] },
	{ id: "agenda", label: "Open agenda", icon: "agenda", scope: "workspace", requires: ["workspace"], whileBusy: true },
	{ id: "capture", label: "Quick capture", icon: "capture", scope: "workspace", requires: ["workspace"] },
	{ id: "diary", label: "New diary entry", icon: "diary", scope: "workspace", requires: ["workspace"] },
	{ id: "roam-find", label: "Org-roam: find node", icon: "quickOpen", scope: "workspace", requires: ["workspace"] },
	{ id: "roam-insert", label: "Org-roam: insert node link", icon: "files", scope: "workspace", requires: ["workspace", ...writable] },
	{ id: "roam-new", label: "Org-roam: capture new node", icon: "capture", scope: "workspace", requires: ["workspace"] },
	{ id: "babel-execute", label: "Org Babel: execute captured source", icon: "files", scope: "workspace", requires: ["workspace", ...writable] },
	{ id: "table-recalculate", label: "Org table: recalculate captured table", icon: "files", scope: "workspace", requires: ["workspace", ...writable] },
	{ id: "clock-in", label: "Org clock: start task", icon: "agenda", scope: "workspace", requires: ["workspace", ...heading] },
	{ id: "clock-out", label: "Org clock: stop running task", icon: "agenda", scope: "workspace", requires: ["workspace", ...writable] },
	{ id: "cancel-clock", label: "Org clock: cancel running task", icon: "agenda", scope: "workspace", requires: ["workspace", ...writable] },
	{ id: "clock-report", label: "Org clock: report totals", icon: "agenda", scope: "workspace", requires: ["workspace", "document", "editor"] },
	{ id: "export-html", label: "Org export: HTML", icon: "files", scope: "workspace", requires: ["workspace", "document", "editor"] },
	{ id: "export-markdown", label: "Org export: Markdown", icon: "files", scope: "workspace", requires: ["workspace", "document", "editor"] },
	{ id: "remark-mark", label: "Org-remark: mark region or word", icon: "files", scope: "workspace", requires: ["workspace", ...writable], check: remarkSourceReason },
	{ id: "remark-line", label: "Org-remark: mark line", icon: "files", scope: "workspace", requires: ["workspace", ...writable], check: remarkSourceReason },
	{ id: "remark-important", label: "Org-remark: important", icon: "files", scope: "workspace", requires: ["workspace", ...writable], check: remarkSourceReason },
	{ id: "remark-idea", label: "Org-remark: idea", icon: "files", scope: "workspace", requires: ["workspace", ...writable], check: remarkSourceReason },
	{ id: "remark-question", label: "Org-remark: question", icon: "files", scope: "workspace", requires: ["workspace", ...writable], check: remarkSourceReason },
	{ id: "remark-revise", label: "Org-remark: revise", icon: "files", scope: "workspace", requires: ["workspace", ...writable], check: remarkSourceReason },
	{ id: "remark-quote", label: "Org-remark: quote", icon: "files", scope: "workspace", requires: ["workspace", ...writable], check: remarkSourceReason },
	{ id: "remark-change", label: "Org-remark: change pen", icon: "files", scope: "workspace", requires: ["workspace", ...writable], check: remarkSourceReason },
	{ id: "remark-open", label: "Org-remark: open notes", icon: "files", scope: "workspace", requires: ["workspace", "document", "editor"], check: remarkSourceReason },
	{ id: "remark-previous", label: "Org-remark: previous remark", icon: "files", scope: "workspace", requires: ["workspace", "document", "editor"], check: remarkSourceReason },
	{ id: "remark-next", label: "Org-remark: next remark", icon: "files", scope: "workspace", requires: ["workspace", "document", "editor"], check: remarkSourceReason },
	{ id: "remark-remove", label: "Org-remark: remove highlight", icon: "files", scope: "workspace", requires: ["workspace", ...writable], check: remarkSourceReason },
	{ id: "remark-delete", label: "Org-remark: delete remark", icon: "files", scope: "workspace", requires: ["workspace", ...writable], check: remarkSourceReason },
	{ id: "editor", label: "Show editor", icon: "files", scope: "workspace", requires: [], whileBusy: true },
	{ id: "files", label: "Show files", icon: "files", scope: "workspace", requires: [], whileBusy: true },
	{ id: "sparse-tree", label: "Sparse tree", icon: "files", scope: "editor", requires: ["document", "editor"], shortcut: "C-c /", prefix: { map: "C-c", key: "/" }, parameter: () => orgSparseTreeBufferCommand },
	{ id: "clear-sparse-tree", label: "Clear sparse tree", icon: "files", scope: "editor", requires: ["document", "editor"] },
	{ id: "narrow-to-subtree", label: "Narrow to subtree", icon: "files", scope: "editor", requires: ["document", "editor"], check: (target: OrgCommandEditorContext) => extractOrgSubtreeAt(target.content, target.cursor) ? null : "Place the cursor on a subtree heading to narrow" },
	{ id: "widen", label: "Widen Source view", icon: "files", scope: "editor", requires: ["document", "editor"] },
	{ id: "toggle-fold", label: "Toggle heading fold", icon: "files", scope: "editor", requires: ["document", "editor"] },
	{ id: "cycle-folds", label: "Cycle all heading folds", icon: "files", scope: "editor", requires: ["document", "editor"] },
	{ id: "fold-all", label: "Fold all headings", icon: "files", scope: "editor", requires: ["document", "editor"] },
	{ id: "unfold-all", label: "Unfold all headings", icon: "files", scope: "editor", requires: ["document", "editor"] },
	{ id: "toggle-sidebar", label: "Show file sidebar", icon: "sidebar", scope: "workspace", requires: [], whileBusy: true },
	{ id: "toggle-inspector", label: "Show note inspector", icon: "inspector", scope: "workspace", requires: ["workspace", "document"], whileBusy: true },
	{ id: "todo", label: "Cycle TODO", icon: "files", scope: "editor", requires: heading, shortcut: "Alt Shift T", prefix: { map: "C-c", key: "C-t" } },
	{ id: "todo-state", label: "Set TODO state", icon: "files", scope: "editor", requires: heading, parameter: (_date: string, _now: () => Date, configuration: OrgBehaviorConfiguration) => createOrgTodoStateCommand({ logging: configuration.logging, inheritance: configuration.inheritance }) },
	{ id: "complete-repeating", label: "Complete recurring task without repeating", icon: "files", scope: "editor", requires: heading, parameter: (_date: string, _now: () => Date, configuration: OrgBehaviorConfiguration) => createOrgTodoStateCommand({ logging: configuration.logging, inheritance: configuration.inheritance }, true) },
	{ id: "checkbox", label: "Toggle checkbox", icon: "files", scope: "editor", requires: writable, shortcut: "Ctrl Shift X", prefix: { map: "C-c", key: "C-c" }, check: (target: OrgCommandEditorContext) => toggleOrgCheckboxAt(target.content, target.cursor) ? null : "No checkbox at cursor" },
	{ id: "link", label: "Open link", icon: "files", scope: "editor", requires: ["document", "editor"], prefix: { map: "C-c", key: "C-o" }, check: (target: OrgCommandEditorContext) => orgLinkTargetAt(target.content, target.cursor, target.relativePath) ? null : "No supported link at cursor" },
	{ id: "tags", label: "Edit tags", icon: "files", scope: "editor", requires: heading, prefix: { map: "C-c", key: "C-q" }, parameter: () => orgTagsBufferCommand },
	{ id: "scheduled", label: "Schedule", icon: "agenda", scope: "editor", requires: heading, prefix: { map: "C-c", key: "C-s" }, check: (target: OrgCommandEditorContext) => preparationReason(scheduled.prepare(target)), parameter: (date: string, now: () => Date, configuration: OrgBehaviorConfiguration) => planningParameter("SCHEDULED", date, now, configuration) },
	{ id: "deadline", label: "Set deadline", icon: "agenda", scope: "editor", requires: heading, prefix: { map: "C-c", key: "C-d" }, check: (target: OrgCommandEditorContext) => preparationReason(deadline.prepare(target)), parameter: (date: string, now: () => Date, configuration: OrgBehaviorConfiguration) => planningParameter("DEADLINE", date, now, configuration) },
	{ id: "remove-scheduled", label: "Remove scheduled date", icon: "agenda", scope: "editor", requires: heading, check: (target: OrgCommandEditorContext) => preparationReason(scheduled.prepare(target)), parameter: (date: string, _now: () => Date, configuration: OrgBehaviorConfiguration) => createOrgPlanningCommand("SCHEDULED", date, undefined, "remove", { logging: configuration.logging, inheritance: configuration.inheritance }) },
	{ id: "remove-deadline", label: "Remove deadline", icon: "agenda", scope: "editor", requires: heading, check: (target: OrgCommandEditorContext) => preparationReason(deadline.prepare(target)), parameter: (date: string, _now: () => Date, configuration: OrgBehaviorConfiguration) => createOrgPlanningCommand("DEADLINE", date, undefined, "remove", { logging: configuration.logging, inheritance: configuration.inheritance }) },
	{ id: "property", label: "Set property", icon: "files", scope: "editor", requires: heading, prefix: { map: "C-c", key: "C-p" }, check: (target: OrgCommandEditorContext) => preparationReason(orgPropertyBufferCommand.prepare(target)), parameter: () => orgPropertyBufferCommand },
	{ id: "refile", label: "Refile", icon: "files", scope: "editor", requires: ["workspace", ...heading], shortcut: "Ctrl Shift R", prefix: { map: "C-c", key: "C-w" }, check: (target: OrgCommandEditorContext) => extractOrgSubtreeAt(target.content, target.cursor) ? null : "Place the cursor on the heading line of the subtree to refile" },
	{ id: "archive", label: "Archive", icon: "files", scope: "editor", requires: ["workspace", ...heading, "saved"], shortcut: "Ctrl Alt A", prefix: { map: "C-c C-x", key: "C-a" }, check: (target: OrgCommandEditorContext) => extractOrgSubtreeAt(target.content, target.cursor) ? null : "Place the cursor on the heading line of the subtree to archive" },
	{ id: "timestamp-active", label: "Active timestamp", icon: "agenda", scope: "editor", requires: writable, prefix: { map: "C-c", key: "." }, parameter: (date: string) => createOrgTimestampCommand(true, date) },
	{ id: "timestamp-inactive", label: "Inactive timestamp", icon: "agenda", scope: "editor", requires: writable, prefix: { map: "C-c", key: "!" }, parameter: (date: string) => createOrgTimestampCommand(false, date) },
	{ id: "heading-promote", label: "Promote heading", icon: "files", scope: "editor", requires: heading, shortcut: "Alt Left", check: (target: OrgCommandEditorContext) => changeOrgHeadingLevelAt(target.content, target.cursor, -1) ? null : "Heading cannot be promoted" },
	{ id: "heading-demote", label: "Demote heading", icon: "files", scope: "editor", requires: heading, shortcut: "Alt Right" },
	{ id: "subtree-up", label: "Move subtree up", icon: "files", scope: "editor", requires: heading, shortcut: "Alt Up", check: (target: OrgCommandEditorContext) => moveOrgSubtreeAt(target.content, target.cursor, -1) ? null : "No preceding sibling subtree" },
	{ id: "subtree-down", label: "Move subtree down", icon: "files", scope: "editor", requires: heading, shortcut: "Alt Down", check: (target: OrgCommandEditorContext) => moveOrgSubtreeAt(target.content, target.cursor, 1) ? null : "No following sibling subtree" },
	{ id: "insert-item", label: "Insert heading or list item", icon: "files", scope: "editor", requires: writable, shortcut: "Alt Enter" },
	...orgTableCommandDefinitions.map(({ id, label }) => ({ id, label, icon: "files" as const, scope: "editor" as const, requires: writable })),
] as const satisfies readonly CommandMetadata[]
export type OrgCommandId = (typeof orgCommandDefinitions)[number]["id"]
export interface OrgCommandDefinition extends CommandMetadata { readonly id: OrgCommandId }
export interface OrgCommandEntry extends OrgCommandDefinition {
	readonly disabled: boolean
	readonly disabledReason: string | null
}
const definitions: readonly OrgCommandDefinition[] = orgCommandDefinitions
export const isOrgCommandId = (id: unknown): id is OrgCommandId => definitions.some((definition) => definition.id === id)
export const getOrgParameterCommand = (id: OrgCommandId, defaultDate: string, now: () => Date = systemOrgNow, configuration: OrgBehaviorConfiguration = DEFAULT_ORG_BEHAVIOR_CONFIGURATION): OrgBufferCommand | null =>
	definitions.find((definition) => definition.id === id)?.parameter?.(defaultDate, now, configuration) ?? null

export const getOrgCommandDisabledReason = (id: unknown, context: OrgCommandContext): string | null => {
	const definition = definitions.find((entry) => entry.id === id)
	if (!definition) return "Unknown command"
	for (const requirement of definition.requires) {
		switch (requirement) {
			case "workspace": if (!context.hasWorkspace) return "No workspace open"; break
			case "document": if (!context.hasDocument) return "No note open"; break
			case "buffers": if (!(context.hasBuffers ?? context.hasDocument)) return "No open buffers"; break
			case "dirty": if (!context.isDirty) return "No unsaved changes"; break
			case "dirty-buffers": if (!(context.hasDirtyBuffers ?? context.isDirty)) return "No unsaved changes"; break
			case "editor": if (!context.editor?.available) return "No current editor target"; break
			case "writable": if (context.editor?.readOnly) return "Editor is read-only"; break
			case "heading": {
				const rejected = context.editor && guardOrgHeadingCommand(context.editor)
				if (rejected) return rejected.message
				break
			}
			case "saved": if (context.isDirty) return "Save the current document before archiving a subtree"; break
		}
	}
	if (!definition.whileBusy && context.blockedReason) return context.blockedReason
	if (!definition.whileBusy && context.isBusy) return "Workspace is busy"
	return context.editor && definition.check ? definition.check(context.editor) : null
}
export const deriveOrgCommands = (context: OrgCommandContext): readonly OrgCommandEntry[] => definitions.map((definition) => {
	const label = definition.id === "toggle-sidebar" && context.sidebarVisible ? "Hide file sidebar" : definition.id === "toggle-inspector" && context.inspectorVisible ? "Hide note inspector" : definition.label
	const disabledReason = getOrgCommandDisabledReason(definition.id, context)
	return { ...definition, label, disabled: disabledReason !== null, disabledReason }
})
export interface OrgCommandDispatcher {
	readonly getContext: () => OrgCommandContext
	readonly execute: (id: OrgCommandId) => boolean | void
	/** UI feedback only; denial never invokes the command effect executor. */
	readonly onRejected?: (id: OrgCommandId, reason: string) => void
}
/** Re-read the current authority immediately before invoking its one effect executor. */
export const dispatchOrgCommand = (id: unknown, dispatcher: OrgCommandDispatcher): boolean => {
	if (!isOrgCommandId(id)) return false
	const reason = getOrgCommandDisabledReason(id, dispatcher.getContext())
	if (reason !== null) {
		dispatcher.onRejected?.(id, reason)
		return false
	}
	return dispatcher.execute(id) !== false
}
