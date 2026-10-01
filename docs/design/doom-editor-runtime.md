# Doom-oriented editor runtime: incremental reconstruction

## Decision

Preserve Tauri, capability-scoped Rust filesystem access, revision-checked writes,
raw Org files, disposable indexes, and migration/recovery isolation. Reconstruct
the editor runtime incrementally rather than rewrite the entire application.

The product direction is Doom-style workflows, not a claim of ELisp/package
compatibility. Evil defaults, scripting privileges, recovery journals, and the
scope of general-purpose editing remain decision gates.

The full goal report is the Org-roam node `4212813a-27e4-4f70-9fb8-c2c6867a9741`,
“Grain面向Doom工作环境的编辑器重构目标”, dated 2026-09-30.

## Target boundaries

```text
Keyboard / views -> command intent -> applicability guard
  -> parameter session -> fresh context guard -> pure Org edit
  -> buffer transaction -> existing revision-checked save -> echo
```

- **Minibuffer:** parameter entry, completion, history, validation and cancellation.
- **Which-Key:** unfinished key-sequence discovery; not a parameter form.
- **Popup:** a temporary tool buffer/window, such as Capture or search results.
- **Buffer:** content, undo, selection, revision and conflict state.
- **Window:** display of a buffer; not document ownership.
- **Workspace:** approved filesystem capability and layout context.

No component should independently serialize a document after parsing it. No new
runtime may become a competing canonical writer alongside the old controller.

## S1: Heading Tags vertical slice

Implemented as an initial slice, not a completed command kernel:

- `flows/org-command/org-tags.command.ts`: pure preparation/execution protocol.
  Rejects preamble/block contexts and stale path/content; distinguishes no-op.
- `hooks/use-org-command-minibuffer.ts`: shared session orchestration and buffer commit (formerly Tags-specific).
  Revision-only autosave does not invalidate a prompt. Loading/saving prevents
  commit but retains input for retry. Workspace/document switches cancel it.
- `types/editor/minibuffer.interface.ts`: parameter-session contract.
- `views/org-workspace/org-minibuffer.view.fn.tsx`: bottom, non-modal surface.
  Multi-value tag completion at the caret; history; IME guard; inline errors.
- `OrgEditorCommandTarget`: exact-source, readonly and range-checked CodeMirror
  transaction boundary. Command edits are isolated undo steps and report through
  the existing controlled editor path; they do not write files themselves.

Heading Tags no longer uses the centered modal. Both menu and `C-c C-q` enter
the same workflow. Candidate tags currently come from the active document only.
History is memory-only while the pane is mounted. The panel currently belongs to
the main document pane, not a complete application-wide minibuffer host.

Keys: Enter accepts; Tab completes; arrows/C-n/C-p select; M-p/M-n browse history;
Esc/C-g cancels. Shift-Tab retains reverse focus navigation. Empty input removes
tags; removing nonexistent tags is a successful no-op. Cancellation restores
editor focus without changing content.

Automated acceptance includes CRLF/lone-CR source preservation, malformed blocks,
menu-focus handoff, undo/redo/selection restoration, revision-only saves, busy
retry, changed content, workspace switch and IME composition. User acceptance is
still required; unit tests are not proof of Doom-equivalent ergonomics.

## S2a: shared parameter commands and planning dates

Tags, Schedule, Deadline and Property now share a typed `OrgBufferCommand` contract and one
session/transaction host. Captured workspace, file path, source, editor target and
session generation are checked before commit. Superseded or unmounted sessions
cannot commit or cancel a newer command. No file IO is added to this host.

Schedule (`C-c C-s`) and Deadline (`C-c C-d`) use the bottom minibuffer. Existing
dates are prefilled; absent dates default to the caller-supplied local date.
Whole-value completion does not insert tag separators. Memory histories are
isolated by command ID. Invalid dates retain input with specific feedback.
Accepting an unchanged date preserves all timestamp bytes, including weekday,
time and repeater/warning details. Changed dates remove the possibly incorrect
weekday while preserving other details. Common Chinese/Japanese weekdays are
recognized; unsupported weekday formats are rejected rather than retained with
a changed date. Empty input is invalid, not date removal.

Preparation, no-op detection and mutation share `parseOrgPlanningLine` source
ranges. Mismatched/unterminated timestamps and duplicate fields are rejected,
not silently guessed or duplicated. Opaque text is retained; nested field names
are not mistaken for top-level planning fields. Existing malformed planning lines
remain editable as raw Org text.

This is **not** a full Org date reader: relative dates, calendar navigation,
time editing and repeater editing are not provided by these prompts. Refile and Archive have since migrated in S2c below. The overall S2 phase is not complete.

Property (`C-c C-p`) uses whole-value `KEY=VALUE` input and completion from the
current heading's properties. Existing ID values are prefilled rather than
silently cleared. Empty VALUE sets an empty value; it does not delete a property.
Preparation and mutation use the same complete-drawer source ranges. Missing
`:END:`, nested drawers, duplicate case-insensitive keys and reserved marker keys
(`END`, `PROPERTIES`) are rejected. Unknown lines and existing whitespace remain
untouched. The pane no longer splices metadata edits into a React-owned string.

## S2b: workspace command inlet and bottom navigation parameters

A pure workspace command catalog defines stable IDs, context availability, labels
and icon keys for the existing shell commands. Ribbon actions and Execute command
use the same guarded dispatcher. This is a shell catalog, not yet a complete
registry of every Org editing operation or plugin command.

Execute command (`Mod-P` / `Mod-K`) now uses the bottom minibuffer. Quick Open
(`Mod-O`) is a nonmodal bottom picker with preserved fuzzy ranking, IME-safe keys,
inline errors and one pending selection at a time. Both support Esc/C-g. Workspace
keyboard routing honors `defaultPrevented` and parameter-surface ownership, so
Org chord suffixes no longer also open shell prompts. Metadata sessions suspend
while workspace parameter surfaces own input; Note actions cannot open conflicting
transfer parameter surfaces.

Quick Open owns a cancellable session and passes an AbortSignal to navigation.
Abort releases request-owned loading immediately and prevents late document
commit, but cannot undo a save already started. Closing the active tab also
invalidates a pending read and releases its loading state. Older aborts/results
must not clear a newer request's loading/error state. Failed opens retain input;
candidate navigation alone never previews or switches the real buffer.

Cancellation restores origin focus. Successful command execution restores origin
before handing off to the selected action; successful Quick Open focuses the
opened editor only if its workspace/path remain current. Path tabs still do not
constitute independent buffers. Buffer Switch, multi-window ownership and
asynchronous workspace-wide completion remain unfinished; initial Org prefix
Which-Key discovery is implemented in S2d below.

## S2c: Refile/Archive effect parameters

Refile and Archive now share parameter ownership with metadata commands, but their
filesystem effects remain explicit controller/flow calls, not buffer transactions.
Refile completes safe workspace-relative Org file paths, excluding source aliases.
Creating a new safe target remains supported by the existing transfer flow. Heading
target completion is **not** implemented yet. Cursor must be on the heading line.
Archive defaults to `no`; only explicit `yes` starts transfer.

Both reject unsaved source input, stale source/path/root and a replaced editor
before invoking effects. The controller also checks latest content against the
committed document, including same-render input not yet reflected in `isDirty`.
Async acceptance locks duplicate submissions and cancellation once effects begin.
Pure validation errors retain input; every filesystem outcome retires the prompt,
including unexpected controller rejection, so it cannot be blindly resubmitted.
Failure/reconciliation echo is persistent, with the full message in its title.

The controller reports success/rejection/partial outcomes. Target-write errors
are marked uncertain even if an API reports failure: atomic publication can have
happened before cleanup/fsync returned an error. The source was not removed by
that failed target-write step. The warning directs users to reread both files and
reconcile possible duplicates, not retry or perform pathname rollback. Existing
confirmed-target partial-success recovery wording remains intact.

Subtree extraction now shares Org block ranges. Fake headings and mismatched end
markers inside source blocks cannot truncate the copied subtree. LF/CRLF/lone-CR,
Unicode, NUL and original EOF remain source-range operations.

## S2d: Org prefix routing and Which-Key discovery

`org-prefix-keymap.ts` now resolves immutable prefix snapshots with caller-supplied
time and identity. Routing and hint labels share readonly keymap tables. It is a
small Org prefix mechanism, not an Evil engine or a complete configuration API.

The `C-c` table retains existing commands and adds `C-c C-w` Refile. `C-c C-x`
transitions to a nested map with `C-a` Archive; both delegate to guarded transfer
parameters. Unknown suffixes clear the prefix and fall through; recognized
commands consume the browser shortcut even when their applicability guard rejects.
Selected idle Ctrl-C remains native copy. Modifier-only keydowns do not destroy
an unfinished prefix. IME/composing events never trigger an Org command.

Which-Key is a passive region, delayed by 350 ms, with no inputs/buttons/focus
capture. It explains a pending prefix; it is neither parameter entry nor a popup
tool buffer. Minibuffer and workspace parameter ownership hide it. Prefix sessions
wait indefinitely by default, permitting time to read hints. Optional finite
`prefixTimeoutMs` values are bounded by the browser's signed-32-bit timer limit;
this prop is not yet a persisted/user-editable configuration layer.

Esc/C-g, editor/window blur, pointer navigation, composition, file/workspace
context changes, readonly transitions and same-document programmatic reveal clear
pending prefixes. Timers are identity-checked and removed on unmount. These
behaviors are covered through real CodeMirror/pane integration, not only pure
router tests. Leader maps, Vim operators/motions/registers and arbitrary keymap
configuration remain pending feasibility work.

## S3: disposable ownership/Vim evidence (not runtime adoption)

Reproducible probes are preserved in
[`experiments/doom-runtime`](../../experiments/doom-runtime/README.md), outside the
application workspace packages. A fresh pinned `npm ci` on 2026-10-02 passed
16/16 Vim/raw-source cases, 18/18 canonical-buffer/window cases and 14/14 combined
ownership cases. Production dependencies and modes are unchanged.

The canonical-buffer prototype uses public history/StateEffect APIs with
history-free, selection-owning window projections. A/B dirty buffers, shared text
and undo across windows, stale/ABA rejection, external CAS conflict and saved
capture/new-edit races pass with synthetic files. This does not establish real
filesystem identity, watcher behavior, plugin-effect forwarding or typing groups.

Composition is **not automatic**: ordinary Vim undo/redo does not reach canonical
history. A public custom route passes narrow normal-mode cases, but needs global
mapping/adapter ownership policy. A transient Vim operator range caused initial
failures; the final probe intentionally restores its range-start cursor. That
lossy policy is not accepted as production cursor semantics. Exact intra-line
cursor, visual/block editing and arbitrary extension effects remain gates.

Vim modes live in view plugins and reset on saved-state switch; registers/maps are
global. Ownership probes use literal CR with an LF separator, preserving source
strings without proving native mixed/lone-CR line editing. Real Chinese IME,
Tauri input/focus, extension compatibility and measured workload performance remain
unverified. Neither Evil defaults nor a full buffer/window architecture are
approved by passing synthetic probes alone.

## Next decision gates and work

1. Inventory actual Doom workflows and non-negotiable behaviors.
2. Validate existing Vim extensions, IME, undo/registers/macros and text-object APIs.
3. Validate independent dirty buffers, multiple windows and revision conflicts.
4. Establish shared source-range Org semantics and measured large-file behavior.
5. Promote the command/session host; migrate planning/properties, Quick Open,
   Refile and Capture one workflow at a time.
6. Introduce keymap/Which-Key and buffer/window models after experiments.
7. Add declarative configuration before arbitrary high-privilege scripts.

Do not equate outline filtering with body sparse-tree visibility, basic TODO
cycling with state logging, or timestamp insertion with a complete date reader.
A recovery journal, if approved, is explicitly non-authoritative and must never
silently overwrite the real Org file on restart.
