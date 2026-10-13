import type { EditorView } from "@codemirror/view"
import type { OrgNativeSubmissionResult } from "./org-native-editor-projection"
import type { Extension, StateEffect, Transaction } from "@codemirror/state"

/** Separate async acceptance boundary, deliberately not an OrgBufferRuntime. */
export interface OrgNativeEditorProjection {
 readonly historyFreeExtensions: Extension
 /** A synchronous Source producer returns success only after its own queued canonical ACKs. */
 captureSubmission(run: () => boolean): Promise<OrgNativeSubmissionResult>
 attach(view: EditorView, knownLocalEffect: (effect: StateEffect<unknown>) => boolean, preflight: (transaction: Transaction) => boolean): OrgNativeEditorProjectionHandle
}
export interface OrgNativeEditorProjectionHandle {
 isCurrent(): boolean
 /** Retains native input locally while canonical acceptance is pending. */
 dispatchTransactions(transactions: readonly Transaction[]): void
 /** Resolves only after canonical acceptance and exact window projection. False is a no-op,
  * rejection, or retired owner; bridge delivery alone never acknowledges history. */
 requestHistory(operation: "undo" | "redo"): Promise<boolean>
 detach(): void
}
