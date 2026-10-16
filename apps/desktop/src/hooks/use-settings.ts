import { create } from "zustand"
import type { CountMode } from "@/types/word-count"

/** Validated, memory-only projection of config.json. Never a preference authority. */
interface SettingsState {
	readonly autoSave: boolean
	readonly autoSaveInterval: number
	readonly wordCountMode: CountMode
	readonly showWordCountBadge: boolean
	readonly orgCaptureConfigurationJson: string
	readonly orgKeymapConfigurationJson: string
	readonly orgBehaviorConfigurationJson: string
	readonly orgAgendaConfigurationJson: string
	readonly applicationPopupConfigurationJson: string
}

export const useSettings = create<SettingsState>(() => ({
	autoSave: false,
	autoSaveInterval: 3,
	wordCountMode: "chinese",
	showWordCountBadge: true,
	orgCaptureConfigurationJson: "",
	orgKeymapConfigurationJson: "",
	orgBehaviorConfigurationJson: "",
	orgAgendaConfigurationJson: "",
	applicationPopupConfigurationJson: "",
}))
