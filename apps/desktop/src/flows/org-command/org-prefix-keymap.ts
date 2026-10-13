import { orgCommandDefinitions, type OrgCommandDefinition } from "./org-workspace-command"
import type {
	OrgPrefixBinding,
	OrgPrefixKeyInput,
	OrgPrefixSession,
	OrgKeymapConfiguration,
	OrgKeymapScope,
	OrgInputResolution,
} from "@/types/editor/org-keymap.interface"

export const ORG_PREFIX_TIMEOUT_MS: number | null = null
/** Browser timers accept signed 32-bit millisecond delays. */
export const MAX_ORG_PREFIX_TIMEOUT_MS = 2_147_483_647

// A declined binding is still a completed resolution. Do not let a later DOM
// listener reinterpret explicit null (or ordinary fallback) in a lower scope.
const resolvedEvents = new WeakSet<KeyboardEvent>()
export const claimOrgInputEvent = (event: KeyboardEvent): boolean => {
	if (resolvedEvents.has(event)) return false
	resolvedEvents.add(event)
	return true
}

interface NativeKeyState {
	readonly pressed: Set<string | number>
	readonly repeats: WeakMap<KeyboardEvent, boolean>
	readonly keydown: (event: KeyboardEvent) => void
	readonly keyup: (event: KeyboardEvent) => void
	readonly blur: () => void
	owners: number
}
const nativeKeys = new WeakMap<Window, NativeKeyState>()
const nativeKey = (event: KeyboardEvent) =>
	event.code && event.code !== "Unidentified" ? event.code : event.keyCode || event.key

/** Observe physical key cycles once per webview, across readers and listener order. */
export const retainOrgInputKeys = (realm: Window): (() => void) => {
	let state = nativeKeys.get(realm)
	if (!state) {
		const pressed = new Set<string | number>()
		const repeats = new WeakMap<KeyboardEvent, boolean>()
		state = {
			pressed, repeats, owners: 0,
			keydown: (event) => {
				const key = nativeKey(event)
				// GTK/XIM can mark the very first keydown as repeated. A false flag
				// still identifies a fresh physical down when a keyup was missed.
				repeats.set(event, event.repeat && pressed.has(key))
				pressed.add(key)
			},
			keyup: (event) => { pressed.delete(nativeKey(event)) },
			blur: () => { pressed.clear() },
		}
		nativeKeys.set(realm, state)
		realm.addEventListener("keydown", state.keydown, true)
		realm.addEventListener("keyup", state.keyup, true)
		realm.addEventListener("blur", state.blur)
	}
	state.owners++
	const owned = state
	let released = false
	return () => {
		if (released) return
		released = true
		if (--owned.owners !== 0) return
		realm.removeEventListener("keydown", owned.keydown, true)
		realm.removeEventListener("keyup", owned.keyup, true)
		realm.removeEventListener("blur", owned.blur)
		nativeKeys.delete(realm)
	}
}

export const isOrgRepeatedKeyEvent = (event: KeyboardEvent): boolean => {
	const realm = event.view ?? (event.target instanceof Node ? event.target.ownerDocument?.defaultView : null)
		?? window
	return nativeKeys.get(realm)?.repeats.get(event) ?? event.repeat
}

/** Hint labels and command routes are projections of the command authority. */
const prefixBindings = (map: string): readonly OrgPrefixBinding[] =>
	(orgCommandDefinitions as readonly OrgCommandDefinition[]).flatMap((definition) =>
		definition.prefix?.map === map
			? [{ keyLabel: definition.prefix.key, label: definition.label, commandId: definition.id }]
			: [],
	)
export const ORG_PREFIX_BINDINGS: readonly OrgPrefixBinding[] = [
	...prefixBindings("C-c"),
	{ keyLabel: "C-x", label: "Extra commands", prefixLabel: "C-c C-x" },
]
export const ORG_EXTRA_PREFIX_BINDINGS = prefixBindings("C-c C-x")

export const ORG_PREFIX_MAPS: Readonly<Record<string, readonly OrgPrefixBinding[]>> = {
	"C-c": ORG_PREFIX_BINDINGS,
	"C-c C-x": ORG_EXTRA_PREFIX_BINDINGS,
}


/** Configuration keys use C-/M-/A-/S-/Mod- modifiers and DOM key names (Space for a space). */
export const parseOrgKeyStroke = (value: unknown) => {
	if (typeof value !== "string") return null
	const match = /^((?:(?:C|M|A|S|Mod)-)*)(Space|Enter|Escape|Tab|Backspace|Delete|ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Home|End|PageUp|PageDown|F(?:[1-9]|1[0-2])|[a-z0-9/.,!;:'\[\]\\=+`~?_-])$/i.exec(value)
	if (!match) return null
	const modifiers = match[1].toLowerCase().split("-").filter(Boolean)
	if (new Set(modifiers).size !== modifiers.length || modifiers.includes("mod") && (modifiers.includes("c") || modifiers.includes("m"))) return null
	const key = match[2].toLowerCase() === "space" ? " " : match[2].toLowerCase()
	return {
		key, ctrl: modifiers.includes("c"), meta: modifiers.includes("m"), alt: modifiers.includes("a"),
		shift: modifiers.includes("s"), mod: modifiers.includes("mod"),
		identity: `${["c", "m", "mod", "a", "s"].filter((modifier) => modifiers.includes(modifier)).join("-")}:${key}`,
	}
}
export const isOrgKeyLabel = (value: unknown): value is string => parseOrgKeyStroke(value) !== null

const matchesKey = (label: string, input: OrgPrefixKeyInput, suffix = false): boolean => {
	const stroke = parseOrgKeyStroke(label)
	if (!stroke) return false
	const shiftedSymbol = stroke.key.length === 1 && !/[a-z0-9 ]/.test(stroke.key)
	return input.key.toLowerCase() === stroke.key &&
		(stroke.mod ? (input.ctrlKey || input.metaKey)
			: input.ctrlKey === stroke.ctrl && input.metaKey === stroke.meta) &&
		input.altKey === stroke.alt &&
		((suffix || shiftedSymbol) && !stroke.shift || input.shiftKey === stroke.shift)
}

/** Native/IME input ownership blocks modal routing; repeat only guards command producers. */
export const orgInputIsProtected = (input: OrgPrefixKeyInput): boolean =>
	Boolean(input.isComposing || input.keyCode === 229 || input.defaultPrevented || input.altGraphKey || input.isParameterInput)

/** One resolver for Source, shell and application boundaries. Modal/fallback run only after this declines. */
export const resolveOrgInput = ({
	configuration, scope, current, input, now, selectionEmpty, nextId, owner, generation, timeoutMs,
}: {
	readonly configuration: OrgKeymapConfiguration | null
	readonly scope: OrgKeymapScope
	readonly current: OrgPrefixSession | null
	readonly input: OrgPrefixKeyInput
	readonly now: number
	readonly selectionEmpty: boolean
	readonly nextId: number
	readonly owner: object
	readonly generation: object
	readonly timeoutMs?: number | null
}): OrgInputResolution => {
	const idle: OrgInputResolution = { session: null, commandId: null, consumed: false, protected: false }
	const eligible = scope === "application" ? ["application"] : scope === "workspace" ? ["workspace", "application"]
		: scope === "org-source" ? ["org-source", "workspace", "application"] : [scope, "org-source", "workspace", "application"]
	if (orgInputIsProtected(input) || input.repeat) {
		// A held configured shortcut must not reopen a native Save dialog; never execute its producer.
		const heldBinding = input.repeat && !input.defaultPrevented && !input.isComposing && input.keyCode !== 229 &&
			!input.altGraphKey && !input.isParameterInput && configuration
			? eligible.flatMap((bindingScope) => configuration.bindings.filter((binding) => binding.scope === bindingScope))
				.find((binding) => matchesKey(binding.key, input))
			: null
		return { ...idle, protected: true, consumed: Boolean(heldBinding && (heldBinding.command !== null || heldBinding.map !== undefined) &&
			!(heldBinding.key.toLowerCase() === "c-c" && !selectionEmpty)) }
	}
	if (!configuration) return idle
	const active = current?.owner === owner && current.generation === generation &&
		(current.expiresAt === null || current.expiresAt > now) &&
		current.mapId !== undefined && Object.hasOwn(configuration.maps, current.mapId) &&
		eligible.includes(configuration.maps[current.mapId].scope) ? current : null
	if (["control", "shift", "alt", "meta", "altgraph"].includes(input.key.toLowerCase())) return { ...idle, session: active }
	const enter = (id: string): OrgInputResolution => {
		const map = configuration.maps[id]
		if (!map || !eligible.includes(map.scope)) return idle
		const duration = timeoutMs === undefined ? map.timeoutMs : timeoutMs
		if (duration !== null && (!Number.isFinite(duration) || duration < 0 || duration > MAX_ORG_PREFIX_TIMEOUT_MS)) return idle
		return { session: { id: nextId, mapId: id, label: map.label, bindings: map.bindings,
			expiresAt: duration === null ? null : now + duration, owner, generation }, commandId: null, consumed: true, protected: false }
	}
	if (active) {
		// Capture scratch copy remains native even if selection appeared after arming the tool map.
		if ((scope === "org-capture" || scope === "org-roam") && !selectionEmpty && matchesKey("C-c", input)) return idle
		// A lease references current authority, never a caller-supplied stale hints array.
		const bindings = configuration.maps[active.mapId!].bindings
		const binding = bindings.find((candidate) => matchesKey(candidate.keyLabel, input)) ??
			bindings.find((candidate) => matchesKey(candidate.keyLabel, input, true))
		if (input.key === "Escape" || !binding && matchesKey("C-g", input, true)) return { ...idle, consumed: true }
		if (binding) return binding.commandId !== undefined ? { ...idle, commandId: binding.commandId, consumed: true } : enter(binding.prefixLabel)
		// An unmatched transient releases its lease, then mode bindings precede modal/native input.
	}
	for (const bindingScope of eligible) {
		const binding = configuration.bindings.find((candidate) => candidate.scope === bindingScope && matchesKey(candidate.key, input))
		if (!binding) continue
		if (binding.map !== undefined) {
			// Preserve native copy with a selection, including custom maps reached by C-c.
			if (binding.key.toLowerCase() === "c-c" && !selectionEmpty) return idle
			return enter(binding.map)
		}
		// An explicit null overrides lower scopes, without consuming ordinary text.
		return binding.command === null ? idle : { ...idle, commandId: binding.command, consumed: true }
	}
	return idle
}
