export type OrgWorkspaceCommandId =
	| "quick-open"
	| "buffer-switch"
	| "save-all"
	| "save"
	| "refresh"
	| "agenda"
	| "capture"
	| "diary"
	| "editor"
	| "toggle-sidebar"
	| "toggle-inspector"

/** Keys into the palette's icon map; the pure flow does not import React or views. */
export type OrgWorkspaceCommandIcon =
	| "quickOpen"
	| "save"
	| "refresh"
	| "agenda"
	| "capture"
	| "diary"
	| "files"
	| "sidebar"
	| "inspector"

export interface OrgWorkspaceCommandDefinition {
	readonly id: OrgWorkspaceCommandId
	readonly label: string
	readonly icon: OrgWorkspaceCommandIcon
	readonly shortcut?: string
}

export interface OrgWorkspaceCommandEntry extends OrgWorkspaceCommandDefinition {
	readonly disabled: boolean
}

export interface OrgWorkspaceCommandContext {
	readonly hasWorkspace: boolean
	readonly hasDocument: boolean
	readonly hasBuffers?: boolean
	readonly hasDirtyBuffers?: boolean
	readonly isDirty: boolean
	readonly isBusy: boolean
	readonly sidebarVisible: boolean
	readonly inspectorVisible: boolean
}

export const orgWorkspaceCommandDefinitions: readonly OrgWorkspaceCommandDefinition[] = [
	{ id: "quick-open", label: "Quick open", icon: "quickOpen", shortcut: "Ctrl O" },
	{ id: "save", label: "Save current note", icon: "save", shortcut: "Ctrl S" },
	{ id: "buffer-switch", label: "Switch buffer", icon: "files", shortcut: "Ctrl Shift B" },
	{ id: "save-all", label: "Save all buffers", icon: "save", shortcut: "Ctrl Shift S" },
	{ id: "refresh", label: "Refresh workspace", icon: "refresh" },
	{ id: "agenda", label: "Open agenda", icon: "agenda" },
	{ id: "capture", label: "Quick capture", icon: "capture" },
	{ id: "diary", label: "New diary (today)", icon: "diary" },
	{ id: "editor", label: "Show editor", icon: "files" },
	{ id: "toggle-sidebar", label: "Show file sidebar", icon: "sidebar" },
	{ id: "toggle-inspector", label: "Show note inspector", icon: "inspector" },
]

export const deriveOrgWorkspaceCommands = (
	context: OrgWorkspaceCommandContext,
): readonly OrgWorkspaceCommandEntry[] =>
	orgWorkspaceCommandDefinitions.map((definition) => {
		let label = definition.label
		let disabled = false
		switch (definition.id) {
			case "buffer-switch":
				disabled =
					!context.hasWorkspace || !(context.hasBuffers ?? context.hasDocument) || context.isBusy
				break
			case "save-all":
				disabled =
					!context.hasWorkspace || !(context.hasDirtyBuffers ?? context.isDirty) || context.isBusy
				break
			case "save":
				disabled =
					!context.hasWorkspace || !context.hasDocument || !context.isDirty || context.isBusy
				break
			case "refresh":
			case "capture":
			case "diary":
				disabled = !context.hasWorkspace || context.isBusy
				break
			case "quick-open":
			case "agenda":
				disabled = !context.hasWorkspace
				break
			case "toggle-sidebar":
				label = context.sidebarVisible ? "Hide file sidebar" : "Show file sidebar"
				break
			case "toggle-inspector":
				label = context.inspectorVisible ? "Hide note inspector" : "Show note inspector"
				disabled = !context.hasWorkspace || !context.hasDocument
				break
			case "editor":
				break
		}
		return { ...definition, label, disabled }
	})

export const isOrgWorkspaceCommandId = (id: unknown): id is OrgWorkspaceCommandId =>
	orgWorkspaceCommandDefinitions.some((definition) => definition.id === id)

/** Recheck at dispatch time rather than trusting a rendered command's old disabled state. */
export const guardOrgWorkspaceCommand = (
	id: unknown,
	context: OrgWorkspaceCommandContext,
): boolean =>
	deriveOrgWorkspaceCommands(context).some((entry) => entry.id === id && !entry.disabled)

export interface OrgWorkspaceKeyboardInput {
	readonly key: string
	readonly ctrlKey: boolean
	readonly metaKey: boolean
	readonly altKey: boolean
	readonly shiftKey: boolean
	readonly isComposing: boolean
	readonly keyCode: number
	readonly defaultPrevented: boolean
	/** Supplied by the boundary for minibuffer and dialog parameter inputs. */
	readonly isParameterInput: boolean
}

export type OrgWorkspaceKeyboardCommand =
	| "quick-open"
	| "execute-command"
	| "save"
	| "buffer-switch"
	| "save-all"

/** Resolve only; the window boundary owns preventDefault and command dispatch. */
export const resolveOrgWorkspaceKeyboardCommand = (
	input: OrgWorkspaceKeyboardInput,
): OrgWorkspaceKeyboardCommand | null => {
	if (
		input.defaultPrevented ||
		input.isComposing ||
		input.keyCode === 229 ||
		input.isParameterInput ||
		input.altKey ||
		(!input.ctrlKey && !input.metaKey)
	) {
		return null
	}
	if (input.shiftKey) {
		if (input.key.toLowerCase() === "b") return "buffer-switch"
		if (input.key.toLowerCase() === "s") return "save-all"
		return null
	}
	// CodeMirror-consumed chord suffixes and Mod-S must arrive defaultPrevented.
	switch (input.key.toLowerCase()) {
		case "o":
			return "quick-open"
		case "p":
		case "k":
			return "execute-command"
		case "s":
			return "save"
		default:
			return null
	}
}
