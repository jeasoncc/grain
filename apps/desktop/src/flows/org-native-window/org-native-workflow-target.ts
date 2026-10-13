import { isolateHistory } from "@codemirror/commands"
import { EditorSelection, Transaction, type EditorState } from "@codemirror/state"
import type { OrgBufferRuntime, OrgBufferWindowHandle } from "@/flows/org-editor-runtime"
import { rawSourceBatch } from "@/flows/org-editor-runtime/org-buffer-runtime.helpers"
import { getOrgInputConfiguration } from "@/hooks/use-org-input-configuration"
import { editorOffsetFromSource } from "@/views/org-editor/org-source-offset.pipe"
import type { OrgEditorCommandTarget } from "@/views/org-editor/org-editor.types"
import type { OrgTextEditBatch } from "@/pipes/org/org-text.pipe"

/** Root-issued native registration, with the canonical coordinator's real handle. */
export function createOrgNativeWorkflowTarget(ports: {
 readonly runtime: OrgBufferRuntime
 readonly windowId: string
 readonly path: string
 readonly ownership: object
 readonly state: () => EditorState
 readonly handle: () => OrgBufferWindowHandle | null
 readonly isLive: () => boolean
 readonly isWritable: () => boolean
 readonly restore: () => boolean
 readonly visibleRanges: readonly { readonly from: number; readonly to: number }[]
 readonly commandCursor?: number
}): OrgEditorCommandTarget {
 const { runtime } = ports
 const rawOffset = (state: EditorState, offset: number) => offset + (state.doc.lineAt(offset).number - 1) * (state.lineBreak.length - 1)
 const applyEdits = (source: string, batch: OrgTextEditBatch, policy: "cursor" | "preserve" = "cursor"): boolean => {
  if (!ports.isLive() || !ports.isWritable() || runtime.source !== source || !ports.handle()) return false
  if (!batch || !Array.isArray(batch.changes) || (batch.requiredVisibleRanges !== undefined && !Array.isArray(batch.requiredVisibleRanges))) return false
  if ((batch.requiredVisibleRanges ?? []).some(range => !range || !Number.isSafeInteger(range.from) || !Number.isSafeInteger(range.to) ||
   range.from < 0 || range.to < range.from || range.to > source.length || (source[range.from - 1] === "\r" && source[range.from] === "\n") ||
   (source[range.to - 1] === "\r" && source[range.to] === "\n") ||
   !ports.visibleRanges.some(visible => range.from >= visible.from && range.to <= visible.to))) return false
  const state = ports.state(), revision = runtime.revision
  const prepared = rawSourceBatch(source, batch.changes)
  if (policy === "cursor" && (!Number.isSafeInteger(batch.cursor) || batch.cursor < 0 || batch.cursor > prepared.nextSource.length ||
   (prepared.nextSource[batch.cursor - 1] === "\r" && prepared.nextSource[batch.cursor] === "\n"))) return false
  const next = state.update({ changes: prepared.changes,
   ...(policy === "cursor" ? { selection: EditorSelection.cursor(editorOffsetFromSource(prepared.nextSource, batch.cursor, state.lineBreak)) } : {}),
   annotations: [isolateHistory.of("full"), Transaction.userEvent.of("input.org.native-workflow")], scrollIntoView: policy === "cursor" })
  try { ports.handle()!.dispatchTransactions([next]) }
  catch (cause) {
   // Canonical acceptance is irrevocable even when a projection observer throws.
   if (runtime.revision === revision || runtime.source !== prepared.nextSource) throw cause
  }
  return runtime.source === prepared.nextSource && (next.changes.empty || runtime.revision > revision)
 }
 const target: OrgEditorCommandTarget = {
  getCommandContext: () => {
   const state = ports.state(), selection = state.selection.main
   return { available: ports.isLive(), ownership: ports.ownership, revision: runtime.revision,
    content: runtime.source, relativePath: ports.path, windowId: ports.windowId, readOnly: !ports.isWritable(),
    cursor: ports.commandCursor ?? rawOffset(state, selection.head), selectionFrom: rawOffset(state, selection.from), selectionTo: rawOffset(state, selection.to),
    selectionRangeCount: state.selection.ranges.length }
  },
  subscribeCommandContext: listener => runtime.subscribeCommits(listener),
  captureSourceTransform: () => {
   if (!ports.isLive()) return null
   const context = target.getCommandContext(), state = ports.state(), selection = state.selection
   const configurationGeneration = getOrgInputConfiguration().generation
   const snapshot = Object.freeze({ content: context.content, relativePath: ports.path, windowId: ports.windowId,
    revision: context.revision, configurationGeneration, readOnly: context.readOnly, cursor: context.cursor,
    selection: Object.freeze({ mainIndex: selection.mainIndex, ranges: Object.freeze(selection.ranges.map(range => Object.freeze({
     anchor: rawOffset(state, range.anchor), head: rawOffset(state, range.head), assoc: range.assoc,
     bidiLevel: range.bidiLevel, goalColumn: range.goalColumn, undirectional: range.undirectional,
    }))) }) })
   const isCurrent = () => ports.isLive() && runtime.revision === snapshot.revision && runtime.source === snapshot.content &&
    getOrgInputConfiguration().generation === configurationGeneration
   let submitted = false
   return { snapshot, isCurrent, apply: async (batch, policy = "preserve") => {
    if (submitted || !isCurrent() || !ports.state().selection.eq(selection, true) ||
     ports.state().selection.ranges.some((range, index) => range.bidiLevel !== selection.ranges[index].bidiLevel ||
      range.goalColumn !== selection.ranges[index].goalColumn || range.undirectional !== selection.ranges[index].undirectional)) return false
    submitted = true
    return applyEdits(snapshot.content, batch, policy)
   } }
  },
  executeCommand: () => false,
  captureCommand: () => null,
  captureFocus: () => ports.isLive() ? () => ports.restore() : null,
  restoreFocus: () => { ports.restore() },
  applyEdit: (source, edit) => applyEdits(source, { changes: [edit], cursor: edit.cursor }),
  applyEdits,
  getVisibleSourceRanges: () => ports.isLive() ? ports.visibleRanges : [],
  revealSourcePosition: (source, position) => {
   if (!ports.isLive() || runtime.source !== source || !Number.isSafeInteger(position) || position < 0 || position > source.length ||
    (source[position - 1] === "\r" && source[position] === "\n")) return false
   const state = ports.state()
   ports.handle()?.dispatchTransactions([state.update({ selection: { anchor: editorOffsetFromSource(source, position, state.lineBreak) }, annotations: Transaction.addToHistory.of(false), scrollIntoView: true })])
   return true
  },
 }
 return target
}
