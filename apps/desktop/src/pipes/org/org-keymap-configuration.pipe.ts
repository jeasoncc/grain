import * as E from "fp-ts/Either"
import { orgCommandDefinitions, type OrgCommandDefinition } from "@/flows/org-command/org-workspace-command"
import { getOrgInputCommandMetadata } from "@/flows/org-command/org-input-command-metadata"
import { ORG_PREFIX_MAPS, MAX_ORG_PREFIX_TIMEOUT_MS, isOrgKeyLabel, parseOrgKeyStroke } from "@/flows/org-command/org-prefix-keymap"
import type { OrgKeymapConfiguration, OrgKeymapScope, OrgScopedBinding, OrgTransientMap, OrgPrefixBinding } from "@/types/editor/org-keymap.interface"

const scopes: readonly OrgKeymapScope[] = ["application", "workspace", "org-source", "org-capture", "org-roam", "org-agenda", "org-todo-note", "org-remark"]
const shortcutParts: Readonly<Record<string, string>> = { Ctrl: "Mod", Alt: "A", Shift: "S", Left: "ArrowLeft", Right: "ArrowRight", Up: "ArrowUp", Down: "ArrowDown" }
const defaultBindings: OrgScopedBinding[] = (orgCommandDefinitions as readonly OrgCommandDefinition[]).flatMap((definition) =>
	definition.shortcut && !definition.shortcut.startsWith("C-c ") ? [{
		scope: definition.scope === "editor" ? "org-source" : "workspace",
		key: definition.shortcut.split(" ").map((part) => shortcutParts[part] ?? part.toLowerCase()).join("-"),
		command: definition.id,
	}] : [])
const defaultMaps: Record<string, OrgTransientMap> = Object.create(null)
for (const [id, bindings] of Object.entries(ORG_PREFIX_MAPS)) defaultMaps[id] = Object.freeze({ id, label: id, scope: "org-source", timeoutMs: null, bindings })
for (const toolScope of ["org-capture", "org-roam"] as const) {
	for (const [id, sourceBindings] of Object.entries(ORG_PREFIX_MAPS)) {
		const bindings: OrgPrefixBinding[] = sourceBindings.map((binding) => binding.prefixLabel !== undefined
			? { ...binding, prefixLabel: `${toolScope}:${binding.prefixLabel}` }
			: binding.keyLabel === "C-c" && id === "C-c"
				? { keyLabel: "C-c", commandId: `${toolScope}.finish`, label: toolScope === "org-capture" ? "Finish Capture" : "Finish Org-roam capture" }
				: binding)
		if (id === "C-c") bindings.push(
			{ keyLabel: "C-k", commandId: `${toolScope}.cancel`, label: "Cancel capture" },
			{ keyLabel: "C-g", commandId: `${toolScope}.cancel`, label: "Cancel capture" },
		)
		defaultMaps[`${toolScope}:${id}`] = Object.freeze({ id: `${toolScope}:${id}`, label: id, scope: toolScope, timeoutMs: null, bindings: Object.freeze(bindings) })
	}
	defaultBindings.push({ scope: toolScope, key: "C-c", command: null, map: `${toolScope}:C-c` },
		{ scope: toolScope, key: "Mod-s", command: `${toolScope}.finish` },
		{ scope: toolScope, key: "C-g", command: `${toolScope}.cancel` })
}
defaultMaps["org-todo-note:C-c"] = Object.freeze({
	id: "org-todo-note:C-c", label: "C-c", scope: "org-todo-note", timeoutMs: null,
	bindings: Object.freeze([
		{ keyLabel: "C-c", commandId: "org-todo-note.finish", label: "Finish note" },
		{ keyLabel: "C-k", commandId: "org-todo-note.cancel", label: "Cancel note" },
		{ keyLabel: "C-g", commandId: "org-todo-note.cancel", label: "Cancel note" },
	]),
})
defaultBindings.push(
	{ scope: "org-todo-note", key: "C-c", command: null, map: "org-todo-note:C-c" },
	{ scope: "org-todo-note", key: "C-g", command: "org-todo-note.cancel" },
	{ scope: "org-todo-note", key: "Mod-s", command: "org-todo-note.finish" },
	{ scope: "org-agenda", key: "Mod-s", command: "org-agenda.save" },
	{ scope: "org-remark", key: "Mod-s", command: "org-remark.save" },
)
for (const [key, command] of [
	["n", "org-agenda.next"], ["ArrowDown", "org-agenda.next"],
	["p", "org-agenda.previous"], ["ArrowUp", "org-agenda.previous"],
	["Enter", "org-agenda.open"], ["t", "org-agenda.cycle-todo"],
	["s", "org-agenda.schedule"], ["d", "org-agenda.deadline"],
	["Escape", "org-agenda.cancel"], ["C-g", "org-agenda.cancel"],
] as const) defaultBindings.push({ scope: "org-agenda", key, command })
export const DEFAULT_ORG_KEYMAP_CONFIGURATION: OrgKeymapConfiguration = Object.freeze({
	version: 1,
	modalEngine: null,
	bindings: Object.freeze([...defaultBindings,
		{ scope: "application", key: "A-x", command: "execute-command" },
		{ scope: "application", key: "Mod-p", command: "execute-command" },
		{ scope: "application", key: "Mod-k", command: "execute-command" },
		{ scope: "org-source", key: "C-c", command: null, map: "C-c" },
	] as OrgScopedBinding[]),
	maps: Object.freeze(defaultMaps),
})
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)
const closed = (value: Record<string, unknown>, allowed: readonly string[]) => Object.keys(value).every((key) => allowed.includes(key))
const scope = (value: unknown): value is OrgKeymapScope => scopes.includes(value as OrgKeymapScope)
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0
const timeout = (value: unknown): value is number | null => value === null || (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_ORG_PREFIX_TIMEOUT_MS)
const commandLabel = (id: string) => getOrgInputCommandMetadata().find((definition) => definition.id === id)?.label ?? id

/** Closed v1 overrides merge by scope/key and map ID. Invalid persisted input never becomes defaults. */
export const parseOrgKeymapConfiguration = (raw: string): E.Either<{ readonly message: string }, OrgKeymapConfiguration> => {
	const invalid = (message: string) => E.left({ message })
	const commands = getOrgInputCommandMetadata()
	if (typeof raw !== "string") return invalid("Keymap configuration must be JSON text.")
	if (!raw.trim()) return E.right(DEFAULT_ORG_KEYMAP_CONFIGURATION)
	let value: unknown
	try { value = JSON.parse(raw) } catch (error) { return invalid(`Keymap configuration must be valid JSON: ${error instanceof Error ? error.message : "invalid JSON"}`) }
	if (!object(value) || !closed(value, ["version", "bindings", "leaders", "transients", "modalEngine"]) || value.version !== 1) return invalid("Keymap configuration only accepts version (1), bindings, leaders, transients and modalEngine.")
	if (value.modalEngine !== undefined && value.modalEngine !== null && value.modalEngine !== "vim") return invalid("modalEngine must be null or \"vim\".")
	for (const field of ["bindings", "leaders", "transients"] as const) if (value[field] !== undefined && !Array.isArray(value[field])) return invalid(`${field} must be an array.`)
	const maps: Record<string, OrgTransientMap> = Object.assign(Object.create(null), DEFAULT_ORG_KEYMAP_CONFIGURATION.maps)
	const mapIds = new Set<string>()
	for (const entry of (value.transients ?? []) as unknown[]) {
		if (!object(entry) || !closed(entry, ["id", "label", "scope", "timeoutMs", "bindings"]) || !text(entry.id) || !text(entry.label) || !scope(entry.scope) || !timeout(entry.timeoutMs) || !Array.isArray(entry.bindings)) return invalid("Each transient requires id, label, scope, timeoutMs (null or integer milliseconds), and bindings; no other fields are accepted.")
		if (mapIds.has(entry.id)) return invalid(`Duplicate transient ID: ${entry.id}.`)
		mapIds.add(entry.id)
		const bindings: OrgPrefixBinding[] = []
		const keys = new Set<string>()
		for (const binding of entry.bindings) {
			if (!object(binding) || !closed(binding, ["key", "command", "map"]) || !isOrgKeyLabel(binding.key) || (Object.hasOwn(binding, "command") === Object.hasOwn(binding, "map"))) return invalid(`Transient ${entry.id}: each binding requires a valid key and exactly one command or map.`)
			const identity = parseOrgKeyStroke(binding.key)!.identity
			if (keys.has(identity)) return invalid(`Transient ${entry.id}: duplicate key ${binding.key}.`)
			keys.add(identity)
			if (Object.hasOwn(binding, "command")) {
				if (typeof binding.command !== "string" || !commands.some((command) => command.id === binding.command)) return invalid(`Transient ${entry.id}: unknown trusted command.`)
				bindings.push(Object.freeze({ keyLabel: binding.key, commandId: binding.command, label: commandLabel(binding.command) }))
			} else {
				if (!text(binding.map)) return invalid(`Transient ${entry.id}: map must be a nonblank ID.`)
				bindings.push(Object.freeze({ keyLabel: binding.key, prefixLabel: binding.map, label: binding.map }))
			}
		}
		maps[entry.id] = Object.freeze({ id: entry.id, label: entry.label, scope: entry.scope, timeoutMs: entry.timeoutMs, bindings: Object.freeze(bindings) })
	}
	const bindings = [...DEFAULT_ORG_KEYMAP_CONFIGURATION.bindings]
	const keys = new Set<string>()
	for (const [field, entries] of [["bindings", value.bindings ?? []], ["leaders", value.leaders ?? []]] as const) {
		for (const entry of entries as unknown[]) {
			if (!object(entry) || !closed(entry, field === "leaders" ? ["scope", "key", "map"] : ["scope", "key", "command"]) || !scope(entry.scope) || !isOrgKeyLabel(entry.key)) return invalid(`${field}: each entry requires a scope and valid key; unknown fields are rejected.`)
			const identity = `${entry.scope}:${parseOrgKeyStroke(entry.key)!.identity}`
			if (keys.has(identity)) return invalid(`Duplicate scoped binding ${identity}.`)
			keys.add(identity)
			let binding: OrgScopedBinding
			if (field === "leaders") {
				if (!text(entry.map) || !Object.hasOwn(maps, entry.map) || maps[entry.map].scope !== entry.scope) return invalid(`Leader ${entry.key}: map must exist in the same scope.`)
				binding = Object.freeze({ scope: entry.scope, key: entry.key, command: null, map: entry.map })
			} else {
				if (entry.command !== null && (typeof entry.command !== "string" || !commands.some((command) => command.id === entry.command))) return invalid(`Binding ${entry.key}: unknown trusted command (use null to unbind).`)
				binding = Object.freeze({ scope: entry.scope, key: entry.key, command: entry.command })
			}
			const index = bindings.findIndex((candidate) => `${candidate.scope}:${parseOrgKeyStroke(candidate.key)!.identity}` === identity)
			if (index < 0) bindings.push(binding); else bindings[index] = binding
		}
	}
	for (const binding of bindings) if (binding.map !== undefined && (!Object.hasOwn(maps, binding.map) || maps[binding.map].scope !== binding.scope)) return invalid(`Leader ${binding.key}: map must exist in the same scope.`)
	for (const map of Object.values(maps)) for (const binding of map.bindings) {
		if (binding.prefixLabel !== undefined && (!Object.hasOwn(maps, binding.prefixLabel) || maps[binding.prefixLabel].scope !== map.scope)) return invalid(`Transient ${map.id}: child ${binding.prefixLabel} must exist in the same scope.`)
	}
	for (const map of Object.values(maps)) {
		maps[map.id] = Object.freeze({ ...map, bindings: Object.freeze(map.bindings.map((binding) => binding.prefixLabel === undefined ? binding : Object.freeze({ ...binding, label: maps[binding.prefixLabel].label }))) })
	}
	return E.right(Object.freeze({ version: 1, modalEngine: value.modalEngine === "vim" ? "vim" : null, bindings: Object.freeze(bindings), maps: Object.freeze(maps) }))
}
