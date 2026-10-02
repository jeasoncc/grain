# Canonical Org buffer runtime

This folder is independent of controllers, stores, persistence, and the production UI.
One runtime owns one `(workspaceSessionId, bufferId)` document and CodeMirror history.
`source` is always `state.sliceDoc()`, never a separately maintained string.

## Window factory contract

```ts
const runtime = createOrgBufferRuntime({
  key,
  source,
  canCommit: (previous, next) => /* synchronous owner/baseline guard */ true,
  onCommit: receipt => /* synchronous controller mirror, exactly once per source batch */ {},
  onError: error => /* report/recover outside the callback */ {},
})

let handle: OrgBufferWindowHandle | undefined
const view = new EditorView({
  state: EditorState.create({
    doc: runtime.state.doc,
    extensions: [runtime.historyFreeSourceExtensions, windowExtensions],
  }),
  dispatchTransactions: transactions => handle!.dispatchTransactions(transactions),
})
handle = runtime.attachWindow({ windowId, view })
```

Create the view first and attach afterward; dispatch closes over a mutable handle reference.
Do **not** put `history()`/`historyField` in window extensions. Route undo/redo buttons,
keybindings, and history beforeinput events to the handle, not CM's view-local commands.
Register custom local effect types with `knownLocalEffects`. Fold/unfold effects are
recognized automatically. For compartment configuration and scroll effects, use
`createOrgWindowEffectRegistry([windowCompartment])` and pass its `knownEffect` as
`knownReconfigure`. The helper approves only effects it issued, without private CM APIs.
Root reconfiguration and appendConfig are forbidden. A known effect may not install
history, alter the source separator, or remove the runtime source compartment.

## Semantics

- Initial raw source uses the existing Org separator choice: CRLF, else CR, else LF.
  Only that separator splits lines; other newline bytes remain literal. Views must
  match the canonical document, separator and source compartment exactly.
- Dispatch preflights complete, correctly chained transaction batches and all view
  projections before commit. Unknown effects reject the whole batch, including edits.
  Origin transactions are installed directly, so filters/extenders run only once;
  public peer replay uses `filter: false` and rejects extender-injected effects.
- Canonical replay forwards userEvent, addToHistory, isolateHistory and time. The
  original CM grouping delay is retained (400ms typing groups); changing origin
  isolates history. Origin selection is seeded without adding a history event.
- Peers map selections through the same ChangeSet. Local configuration/folds and
  explicit scrolling stay in the originating window. History restoration uses
  full selection snapshots, including every range and the main-range index.
- Undo/redo target a live originating window, or the requesting window after the
  origin detaches. No detached slot is resurrected. The inverse captures the live
  pre-command selection for exact redo restoration.
- Revision increments once per source-changing batch. `canCommit` runs synchronously
  before canonical advance; `onCommit` runs once after advance and before projection.
  A throwing `onCommit` retains the canonical commit, projects it, reports the error,
  and disables subsequent mutation. `detach()`/`close()` still permit cleanup.
- `applyControllerSource(expected, next)` returns false for no-op, true for accepted
  changes. Stale source/denied commits throw typed errors. Same-separator updates use
  a minimal text range and map history without adding an event. Separator changes
  perform a coherent full projection and reset canonical history to avoid invalid
  cross-coordinate history mappings. Source strings are never normalized.
- `adoptLegacyState` returns false unless raw source/separator match and no windows
  are attached. It retains the exported history field value (both branches), document
  and selection through a callback-free seed plus public root reconfiguration. No
  cached view callbacks, parser extensions, compartments or Vim state are adopted.
- Any detached/stale/ABA transaction baseline, closed entry or reentrant mutation
  throws `OrgBufferRuntimeError`. Dispatch batches require exact startState identity
  and succession, not merely equal source. A view projection failure detaches that
  view, reports it and continues healthy projections; canonical source is retained.
- The engine neither destroys nor recreates views. The caller owns their lifecycle.
  Recovery/replacement of a failed view happens outside the synchronous callback.

## Verification

From `apps/desktop`:

```sh
node_modules/.bin/vitest run src/flows/org-editor-runtime/org-buffer-runtime.test.ts
node_modules/.bin/tsc --noEmit -p tsconfig.json
```

Tests use real `EditorView` instances under jsdom, not view doubles.
