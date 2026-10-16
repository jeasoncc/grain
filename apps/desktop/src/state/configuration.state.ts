import { create } from "zustand"

export interface ConfigurationFileState {
	readonly status: "idle" | "loading" | "ready" | "error"
	readonly path: string | null
	readonly error: string | null
	readonly notice: string | null
	/** Every attempted read retires prior producers, including equal-text reloads and ABA. */
	readonly generation: object
}

/** Lifecycle only. Preferences live in the native file and their validated memory projections. */
export const useConfigurationState = create<ConfigurationFileState>(() => ({
	status: "idle", path: null, error: null, notice: null, generation: {},
}))
export const getConfigurationError = (): string | null => useConfigurationState.getState().error
export const subscribeConfiguration = (listener: () => void): (() => void) =>
	useConfigurationState.subscribe(listener)
