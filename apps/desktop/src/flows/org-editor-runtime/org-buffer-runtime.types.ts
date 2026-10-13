import type {
	EditorState,
	Extension,
	StateEffect,
	StateEffectType,
	Transaction,
} from "@codemirror/state"
import type { OrgTextEdit } from "@/pipes/org/org-text.pipe"

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
	/** Exact canonical transactions, never window projections. */
	readonly transactions: readonly Transaction[]
	readonly operation: "edit" | "installation" | "command"
}
export type OrgBufferErrorCode =
	| "closed"
	| "reentrant"
	| "disabled"
	| "stale-window"
	| "stale-source"
	| "invalid-window"
	| "invalid-edit"
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
	readonly canCommit: (
		previousSource: string,
		nextSource: string,
		originWindowId: string | null,
		operation: "edit" | "installation" | "command",
	) => boolean
	readonly onCommit: (receipt: OrgBufferCommitReceipt) => void
	readonly onError?: (error: OrgBufferRuntimeError) => void
}
/** A real history-free projection endpoint. Native projections own only this state;
 * the canonical runtime still validates, commits and projects every transaction. */
export interface OrgBufferProjectionEndpoint {
	readonly state: EditorState
	update(transactions: readonly Transaction[]): void
}
export interface OrgBufferWindowProjectionSnapshot {
	readonly state: EditorState
	readonly scrollTop: number
	readonly scrollLeft: number
}
export interface OrgBufferWindowOptions {
	readonly windowId: string
	readonly view: OrgBufferProjectionEndpoint
	readonly readViewport?: () => { readonly scrollTop: number; readonly scrollLeft: number }
	/** Window-local source safety veto, evaluated for the entire user batch before commit.
	 * Never called for controller ACKs, peer projections, or canonical undo/redo. */
	readonly preflightSourceTransaction?: (transaction: Transaction) => boolean
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
	/** Read-only live window presentation, never a source/history installation. */
	captureWindowProjection(windowId: string): OrgBufferWindowProjectionSnapshot | null
	applyControllerSource(previousExpectedSource: string, nextSource: string): boolean
	/** Raw-source edit, committed as one isolated canonical history event, without a window origin. */
	applyCommandEdit(previousExpectedSource: string, edit: OrgTextEdit): boolean
	/** Sorted, nonoverlapping original raw-source ranges; one atomic isolated history event. */
	applyCommandEdits(previousExpectedSource: string, edits: readonly OrgTextEdit[]): boolean
	/** Document-changing commits (including net-zero batches), after onCommit before projections. */
	subscribeCommits(listener: (receipt: OrgBufferCommitReceipt) => void): () => void
	close(): void
}
