import { describe, expect, it } from "vitest"
import {
	deriveOrgWorkspaceCommands,
	guardOrgWorkspaceCommand,
	isOrgWorkspaceCommandId,
	orgWorkspaceCommandDefinitions,
	resolveOrgWorkspaceKeyboardCommand,
	type OrgWorkspaceCommandContext,
	type OrgWorkspaceKeyboardInput,
} from "./org-workspace-command"

const context: OrgWorkspaceCommandContext = {
	hasWorkspace: true,
	hasDocument: true,
	isDirty: true,
	isBusy: false,
	sidebarVisible: false,
	inspectorVisible: false,
}
const keyboard: OrgWorkspaceKeyboardInput = {
	key: "o",
	ctrlKey: true,
	metaKey: false,
	altKey: false,
	shiftKey: false,
	isComposing: false,
	keyCode: 79,
	defaultPrevented: false,
	isParameterInput: false,
}

const ids = [
	"quick-open",
	"save",
	"refresh",
	"agenda",
	"capture",
	"diary",
	"editor",
	"toggle-sidebar",
	"toggle-inspector",
]

describe("workspace command definitions and guards", () => {
	it("provides stable ordered IDs, existing labels/icon keys and optional shortcuts", () => {
		expect(orgWorkspaceCommandDefinitions).toEqual([
			{ id: "quick-open", label: "Quick open", icon: "quickOpen", shortcut: "Ctrl O" },
			{ id: "save", label: "Save current note", icon: "save", shortcut: "Ctrl S" },
			{ id: "refresh", label: "Refresh workspace", icon: "refresh" },
			{ id: "agenda", label: "Open agenda", icon: "agenda" },
			{ id: "capture", label: "Quick capture", icon: "capture" },
			{ id: "diary", label: "New diary (today)", icon: "diary" },
			{ id: "editor", label: "Show editor", icon: "files" },
			{ id: "toggle-sidebar", label: "Show file sidebar", icon: "sidebar" },
			{ id: "toggle-inspector", label: "Show note inspector", icon: "inspector" },
		])
		expect(deriveOrgWorkspaceCommands(context).every((entry) => !entry.disabled)).toBe(true)
	})

	it("derives visibility labels without mutating context or definitions", () => {
		const frozenContext = Object.freeze({
			...context,
			sidebarVisible: true,
			inspectorVisible: true,
		})
		const original = structuredClone(orgWorkspaceCommandDefinitions)
		const entries = deriveOrgWorkspaceCommands(frozenContext)
		expect(entries.find((entry) => entry.id === "toggle-sidebar")?.label).toBe("Hide file sidebar")
		expect(entries.find((entry) => entry.id === "toggle-inspector")?.label).toBe(
			"Hide note inspector",
		)
		expect(orgWorkspaceCommandDefinitions).toEqual(original)
		expect(
			deriveOrgWorkspaceCommands(context).find((entry) => entry.id === "toggle-sidebar")?.label,
		).toBe("Show file sidebar")
		expect(entries).toEqual(deriveOrgWorkspaceCommands(frozenContext))
	})

	it("exhaustively derives guards across all context flag combinations", () => {
		for (let mask = 0; mask < 64; mask++) {
			const current: OrgWorkspaceCommandContext = {
				hasWorkspace: Boolean(mask & 1),
				hasDocument: Boolean(mask & 2),
				isDirty: Boolean(mask & 4),
				isBusy: Boolean(mask & 8),
				sidebarVisible: Boolean(mask & 16),
				inspectorVisible: Boolean(mask & 32),
			}
			const expectedEnabled = {
				"quick-open": current.hasWorkspace,
				save: current.hasWorkspace && current.hasDocument && current.isDirty && !current.isBusy,
				refresh: current.hasWorkspace && !current.isBusy,
				agenda: current.hasWorkspace,
				capture: current.hasWorkspace && !current.isBusy,
				diary: current.hasWorkspace && !current.isBusy,
				editor: true,
				"toggle-sidebar": true,
				"toggle-inspector": current.hasWorkspace && current.hasDocument,
			}
			for (const entry of deriveOrgWorkspaceCommands(current)) {
				expect(entry.disabled).toBe(!expectedEnabled[entry.id])
				expect(guardOrgWorkspaceCommand(entry.id, current)).toBe(expectedEnabled[entry.id])
			}
		}
	})

	it("recognizes only exact own command IDs and rejects unknown dispatches", () => {
		for (const id of ids) expect(isOrgWorkspaceCommandId(id)).toBe(true)
		for (const id of [
			undefined,
			null,
			1,
			{},
			"",
			"SAVE",
			"execute-command",
			"metadata",
			"toString",
			"__proto__",
		]) {
			expect(isOrgWorkspaceCommandId(id)).toBe(false)
			expect(guardOrgWorkspaceCommand(id, context)).toBe(false)
		}
	})

	it("rechecks guards against current rather than stale rendered state", () => {
		expect(guardOrgWorkspaceCommand("save", context)).toBe(true)
		expect(guardOrgWorkspaceCommand("save", { ...context, isBusy: true })).toBe(false)
	})
})

describe("workspace keyboard routing", () => {
	it("routes both Ctrl and Meta variants, including uppercase event keys", () => {
		for (const modifier of [
			{ ctrlKey: true, metaKey: false },
			{ ctrlKey: false, metaKey: true },
			{ ctrlKey: true, metaKey: true },
		]) {
			for (const [key, expected] of [
				["o", "quick-open"],
				["p", "execute-command"],
				["k", "execute-command"],
				["s", "save"],
			]) {
				for (const variant of [key, key.toUpperCase()]) {
					expect(
						resolveOrgWorkspaceKeyboardCommand({ ...keyboard, ...modifier, key: variant }),
					).toBe(expected)
				}
			}
		}
	})

	it("ignores every supported key when any event ownership/modifier guard applies", () => {
		const guards: Partial<OrgWorkspaceKeyboardInput>[] = [
			{ defaultPrevented: true },
			{ isComposing: true },
			{ keyCode: 229 },
			{ isParameterInput: true },
			{ altKey: true },
			{ shiftKey: true },
			{ ctrlKey: false, metaKey: false },
		]
		for (const key of ["o", "p", "k", "s"]) {
			for (const guard of guards) {
				expect(resolveOrgWorkspaceKeyboardCommand({ ...keyboard, key, ...guard })).toBeNull()
			}
		}
	})

	it("does not double-dispatch CodeMirror C-c C-p/C-o suffixes or Mod-S", () => {
		for (const key of ["p", "o", "s"]) {
			expect(
				resolveOrgWorkspaceKeyboardCommand({ ...keyboard, key, defaultPrevented: true }),
			).toBeNull()
		}
	})

	it("ignores unrelated keys and does not mutate event-like input", () => {
		for (const key of ["c", "Escape", "Enter", "Dead", "Process", "", "F1"]) {
			expect(resolveOrgWorkspaceKeyboardCommand({ ...keyboard, key })).toBeNull()
		}
		const input = Object.freeze({ ...keyboard })
		expect(resolveOrgWorkspaceKeyboardCommand(input)).toBe("quick-open")
		expect(input).toEqual(keyboard)
	})
})
