import type {
	OrgPrefixBinding,
	OrgPrefixKeyInput,
	OrgPrefixKeyResult,
	OrgPrefixSession,
} from "@/types/editor/org-keymap.interface"

export const ORG_PREFIX_TIMEOUT_MS: number | null = null
/** Browser timers accept signed 32-bit millisecond delays. */
export const MAX_ORG_PREFIX_TIMEOUT_MS = 2_147_483_647

/** The router and prefix hints share these binding lists at every level. */
export const ORG_PREFIX_BINDINGS: readonly OrgPrefixBinding[] = [
	{ keyLabel: "C-t", label: "Cycle TODO", commandId: "todo" },
	{ keyLabel: "C-c", label: "Toggle checkbox", commandId: "checkbox" },
	{ keyLabel: "C-o", label: "Open link", commandId: "link" },
	{ keyLabel: "C-q", label: "Edit tags", commandId: "tags" },
	{ keyLabel: "C-s", label: "Schedule", commandId: "scheduled" },
	{ keyLabel: "C-d", label: "Set deadline", commandId: "deadline" },
	{ keyLabel: "C-p", label: "Set property", commandId: "property" },
	{ keyLabel: "/", label: "Sparse tree", commandId: "sparse-tree" },
	{ keyLabel: "C-w", label: "Refile", commandId: "refile" },
	{ keyLabel: "C-x", label: "Extra commands", prefixLabel: "C-c C-x" },
	{ keyLabel: ".", label: "Active timestamp", commandId: "timestamp-active" },
	{ keyLabel: "!", label: "Inactive timestamp", commandId: "timestamp-inactive" },
]

export const ORG_EXTRA_PREFIX_BINDINGS: readonly OrgPrefixBinding[] = [
	{ keyLabel: "C-a", label: "Archive", commandId: "archive" },
]

export const ORG_PREFIX_MAPS: Readonly<Record<string, readonly OrgPrefixBinding[]>> = {
	"C-c": ORG_PREFIX_BINDINGS,
	"C-c C-x": ORG_EXTRA_PREFIX_BINDINGS,
}

/** Time and session identity are provided by the caller; this does no IO. */
export const resolveOrgPrefixKey = (
	current: OrgPrefixSession | null,
	input: OrgPrefixKeyInput,
	now: number,
	selectionEmpty: boolean,
	nextId: number,
	timeoutMs: number | null = ORG_PREFIX_TIMEOUT_MS,
): OrgPrefixKeyResult => {
	const fallthrough: OrgPrefixKeyResult = {
		session: null,
		commandId: null,
		consumed: false,
	}
	if (input.isComposing || input.keyCode === 229 || input.defaultPrevented) {
		return fallthrough
	}
	const active = current && (current.expiresAt === null || current.expiresAt > now) ? current : null
	const key = input.key.toLowerCase()
	// Pressing modifiers while forming a chord must not discard its prefix.
	if (["control", "shift", "alt", "meta", "altgraph"].includes(key)) {
		return { ...fallthrough, session: active }
	}
	if (active) {
		if (key === "escape" || (key === "g" && input.ctrlKey && !input.altKey && !input.metaKey)) {
			return { ...fallthrough, consumed: true }
		}
		if (input.altKey || input.metaKey) return fallthrough
		// Shift is allowed for suffixes, as in the editor (notably Shift-1 => !).
		const keyLabel = input.ctrlKey ? `C-${key}` : key
		const binding = active.bindings.find((entry) => entry.keyLabel === keyLabel)
		if (!binding) return fallthrough
		if (binding.commandId !== undefined) {
			return { session: null, commandId: binding.commandId, consumed: true }
		}
		const bindings = Object.hasOwn(ORG_PREFIX_MAPS, binding.prefixLabel)
			? ORG_PREFIX_MAPS[binding.prefixLabel]
			: undefined
		if (
			!bindings ||
			(timeoutMs !== null &&
				(!Number.isFinite(timeoutMs) || timeoutMs < 0 || timeoutMs > MAX_ORG_PREFIX_TIMEOUT_MS))
		) {
			return fallthrough
		}
		return {
			session: {
				id: nextId,
				label: binding.prefixLabel,
				expiresAt: timeoutMs === null ? null : now + timeoutMs,
				bindings,
			},
			commandId: null,
			consumed: true,
		}
	}
	if (
		key === "c" &&
		input.ctrlKey &&
		!input.altKey &&
		!input.metaKey &&
		!input.shiftKey &&
		selectionEmpty
	) {
		if (
			timeoutMs !== null &&
			(!Number.isFinite(timeoutMs) || timeoutMs < 0 || timeoutMs > MAX_ORG_PREFIX_TIMEOUT_MS)
		) {
			return fallthrough
		}
		return {
			session: {
				id: nextId,
				label: "C-c",
				expiresAt: timeoutMs === null ? null : now + timeoutMs,
				bindings: ORG_PREFIX_MAPS["C-c"],
			},
			commandId: null,
			consumed: true,
		}
	}
	return fallthrough
}
