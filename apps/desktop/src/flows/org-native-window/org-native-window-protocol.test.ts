import { EditorSelection, EditorState, Text, Transaction } from "@codemirror/state"
import { describe, expect, it } from "vitest"
import { orgSemanticHistory } from "@/flows/org-editor-runtime"
import { decodeOrgNativeSelection, decodeOrgNativeTransaction, encodeOrgNativeSelection, encodeOrgNativeTransaction, isOrgNativeIntent } from "./org-native-window-protocol"

 describe("native Source public codecs", () => {
 it("admits only data-only captured workflow commands with exact representable selection and presentation", () => {
  const capture = { selection: encodeOrgNativeSelection(EditorSelection.create([EditorSelection.range(8, 2, 11, 1, -1), EditorSelection.cursor(14, 1, 2, 37)], 1)),
   folds: [{ from: 2, to: 8 }], visibleRanges: [{ from: 0, to: 16 }], scrollTop: 29.5, scrollLeft: 0,
   inputConfiguration: "", behaviorConfiguration: "" }
  const intent = { kind: "workflow", generation: 1, revision: 0, sequence: 2, command: "capture", capture }
  expect(isOrgNativeIntent(intent)).toBe(true)
  for (const malformed of [
   { ...intent, command: "write_org_document" },
   { ...intent, capture: { ...capture, selection: { ...capture.selection, main: 2 } } },
   { ...intent, capture: { ...capture, selection: { ...capture.selection, ranges: [...capture.selection.ranges].reverse() } } },
   { ...intent, capture: { ...capture, selection: { ...capture.selection, ranges: [{ ...capture.selection.ranges[0], assoc: 5 }] } } },
   { ...intent, capture: { ...capture, folds: [{ from: 8, to: 2 }] } },
   { ...intent, capture: { ...capture, visibleRanges: [{ from: -1, to: 16 }] } },
   { ...intent, capture: { ...capture, scrollTop: Infinity } },
   { ...intent, capture: { ...capture, inputConfiguration: { grant: "forged" } } },
  ]) expect(isOrgNativeIntent(malformed)).toBe(false)
 })
 it("preserves directed multi-range selection, primary range, cursor association, bidi and vertical goal", () => {
  const selection = EditorSelection.create([EditorSelection.range(8, 2, 11, 1, -1), EditorSelection.cursor(14, 1, 2, 37)], 1)
  const encoded = encodeOrgNativeSelection(selection)
  const restored = decodeOrgNativeSelection(encoded)
  expect(restored.mainIndex).toBe(1)
  expect(restored.ranges.map(range => [range.anchor, range.head, range.assoc, range.bidiLevel, range.goalColumn])).toEqual(selection.ranges.map(range => [range.anchor, range.head, range.assoc, range.bidiLevel, range.goalColumn]))
  expect(restored.eq(selection, true)).toBe(true)
 })
 it("preserves raw structural separators, literal newlines and native history grouping timestamps through deltas", () => {
  const state = EditorState.create({ doc: "a\r\nb\nc\r\nd", extensions: EditorState.lineSeparator.of("\r\n") })
  const transaction = state.update({ changes: { from: 0, insert: Text.of(["literal\nLF", "structural"]) }, selection: EditorSelection.create([EditorSelection.range(10, 2), EditorSelection.cursor(18, -1, 1, 29)], 1), annotations: [Transaction.time.of(123456), Transaction.userEvent.of("input.paste")] })
  const restored = decodeOrgNativeTransaction(state, encodeOrgNativeTransaction(transaction, () => false))
  expect(restored.state.sliceDoc()).toBe(transaction.state.sliceDoc())
  expect(restored.state.selection.eq(transaction.state.selection, true)).toBe(true)
  expect(restored.annotation(Transaction.time)).toBe(123456)
  expect(restored.annotation(Transaction.userEvent)).toBe("input.paste")
 })
 it("retains exact pre-operator origin instead of transient operator selection", () => {
  const source = "甲\r\none\0two\n尾\r"
  const origin = EditorSelection.create([EditorSelection.range(6, 3, 17, 1, -1), EditorSelection.cursor(10, 1, 2, 31)], 1)
  const state = EditorState.create({ doc: source, selection: origin, extensions: [EditorState.allowMultipleSelections.of(true), EditorState.lineSeparator.of("\n")] })
  const transaction = state.update({ changes: { from: 3, to: 9 }, selection: EditorSelection.cursor(3), annotations: orgSemanticHistory.of({ selection: origin, group: "window-incarnation:operator-1" }) })
  const restored = decodeOrgNativeTransaction(state, encodeOrgNativeTransaction(transaction, () => false))
  expect(restored.annotation(orgSemanticHistory)?.selection.eq(origin, true)).toBe(true)
  expect(restored.annotation(orgSemanticHistory)?.group).toBe("window-incarnation:operator-1")
  expect(restored.state.sliceDoc()).toBe(transaction.state.sliceDoc())
 })
 it("rejects unsupported wire effects before any projected source/history can advance", () => {
  const state = EditorState.create({ doc: "abc" })
  const encoded = encodeOrgNativeTransaction(state.update({ changes: { from: 0, insert: "X" } }), () => false)
  const payload: unknown = { ...encoded, effects: [{ kind: "private-reconfigure", extension: "untrusted" }] }
  expect(() => decodeOrgNativeTransaction(state, payload as typeof encoded)).toThrow("Unknown or invalid native effect codec")
  expect(state.sliceDoc()).toBe("abc")
 })
 it("refuses merged or unordered ranges rather than silently changing the primary selection", () => {
  const selection = encodeOrgNativeSelection(EditorSelection.create([EditorSelection.range(1, 3), EditorSelection.range(5, 7)], 1))
  expect(() => decodeOrgNativeSelection({ ...selection, ranges: [...selection.ranges].reverse() })).toThrow("ordered and nonoverlapping")
  expect(() => decodeOrgNativeSelection({ ...selection, ranges: [selection.ranges[0], { ...selection.ranges[1], anchor: 2 }] })).toThrow("ordered and nonoverlapping")
 })
})
