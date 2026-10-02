import type {
	EditorState,
	Extension,
	StateEffect,
	StateEffectType,
	Transaction,
} from "@codemirror/state"
import type { EditorView } from "@codemirror/view"

export interface OrgBufferKey {
	readonly workspaceSessionId: string
	readonly bufferId: string
}
export interface OrgBufferCommitReceipt {
	readonly key: OrgBufferKey
	readonly previousSource: string
	readonly source: string
	readonly revision: number
	readonly originWindowId: string | null
}
export type OrgBufferErrorCode =
	| "closed"
	| "reentrant"
	| "disabled"
	| "stale-window"
	| "stale-source"
	| "invalid-window"
	| "unknown-effect"
	| "commit-denied"
	| "callback-failed"
	| "projection-failed"
export class OrgBufferRuntimeError extends Error {
	constructor(
		readonly code: OrgBufferErrorCode,
		message: string,
		readonly cause?: unknown,
	) {
		super(message)
		this.name = "OrgBufferRuntimeError"
	}
}
export interface OrgBufferRuntimeOptions {
	readonly key: OrgBufferKey
	readonly source: string
	readonly canCommit: (previousSource: string, nextSource: string) => boolean
	readonly onCommit: (receipt: OrgBufferCommitReceipt) => void
	readonly onError?: (error: OrgBufferRuntimeError) => void
}
export interface OrgBufferWindowOptions {
	readonly windowId: string
	readonly view: EditorView
	readonly knownLocalEffects?: readonly StateEffectType<unknown>[]
	/** Only approve effects created by this window's registered configuration/scroll API.
	 * Root reconfiguration is always forbidden. Resulting states are checked again. */
	readonly knownReconfigure?: (effect: StateEffect<unknown>) => boolean
}
export interface OrgBufferWindowHandle {
	dispatchTransactions(transactions: readonly Transaction[]): void
	undo(): boolean
	redo(): boolean
	detach(): void
}
export interface OrgBufferRuntime {
	readonly key: OrgBufferKey
	readonly source: string
	readonly state: EditorState
	readonly revision: number
	readonly closed: boolean
	/** Include these in each new view, never history(). Re-read after source separator changes. */
	readonly historyFreeSourceExtensions: Extension
	adoptLegacyState(state: EditorState): boolean
	attachWindow(options: OrgBufferWindowOptions): OrgBufferWindowHandle
	applyControllerSource(previousExpectedSource: string, nextSource: string): boolean
	close(): void
}
