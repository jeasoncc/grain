# Doom-oriented editor runtime: incremental reconstruction

## Decision

Preserve Tauri, capability-scoped Rust filesystem access, revision-checked writes,
raw Org files, disposable indexes, and migration/recovery isolation. Reconstruct
the editor runtime incrementally rather than rewrite the entire application.

The user-confirmed product direction is Doom experience consistency: keyboard
interaction, command composition, buffers/windows and practical workflows.
ELisp/Doom package binary/runtime compatibility is explicitly **not a goal or a
decision gate**. Implement required behaviors natively; evaluate controlled tool
bridges only for concrete needs, not ecosystem emulation. Evil defaults, scripting
privileges, recovery journals and general-purpose editing scope remain separate
product/security decisions. Continue implementation and verification without
waiting for user approval at ordinary phase commits.

The authoritative implementation goal is now the Org-roam node
`f46e42b4-809e-454f-abff-3e37f79473c9`,
“Grain面向Doom体验一致性的工作环境架构与实施目标”, dated 2026-10-03:
`~/org-roam/report/year-2026-Horse/month-10-October/day-03-Saturday/Grain面向Doom体验一致性的工作环境架构与实施目标.org`.
Continue implementation, verification and goal updates against this new document.
The previous September 30 goal is historical only; do not append work to it.
Changing the document does not reset progress, reduce requirements or complete the goal.

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
opened editor only if its workspace/path remain current. S2b path tabs initially
were navigation only; the S4a memory buffer handoff below now retains independent
source/history. Buffer Switch, multi-window ownership and
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

## S4a: independent memory buffers and real native grant authority

The active controller/editor path remains the only active writer. Successful
navigation atomically parks the previous baseline/working source; the parked
snapshot is the sole inactive body authority. Navigation does not force-save.
Reactivation preserves dirty source even when disk changed or disappeared. Clean
reactivation reads fresh disk source. All callbacks bind grant, activation and path;
request/edit generations also guard async commits and ABA cases.

Each logical buffer keeps an immutable CodeMirror EditorState/undo/selection plus
scroll in a memory-only rendering cache. Exact raw-source equality is required to
reuse it; public reconfiguration installs fresh closures, compartments and labels.
Cache contents never commit body or write files. Grants/closed buffers prune it;
no prefix, focus, timer, modal-engine state or recovery journal is retained. Scroll
restoration yields to reveal, replacement and newer interaction.

Native approvals now mint exact leases. Every filesystem/index/watch operation
validates its originating live token **before** acquiring the retained descriptor.
An acquired descriptor never retargets after revocation; a stale queued token
cannot acquire a new same-root grant. Multiple same-inode approvals share an
immutable retained root; inode replacement is rejected while leases exist.
Releasing a stale lease cannot revoke another grant or its watches. Linux watches
bind descriptors; non-Linux watching fails closed, with active-document polling
and manual workspace refresh retained.

Native close checks live aggregate dirty/busy state. Editing/mutations wait until
close-listener registration succeeds; failed registration leaves editing blocked
with an error. Discard confirmation is explicit; an ongoing file operation is not
cancelled by close. Every owned mutation uses owner-checked exception cleanup;
uncertain failures preserve source and require review, not rollback/blind retry.
Capability tokens belong to the approved Org target, never legacy DB metadata.

Six real hook/pane/CodeMirror integration cases verify independent A/B dirty
source, history/cursor/scroll, save callback rebinding, Agenda-style remount,
failed inactive close, external conflict and same-root new-grant isolation.
Full desktop suite: 137 files / 2024 cases; Rust: 201 cases; typecheck/build pass.
These are automated evidence, not Chinese IME or native desktop UX acceptance.

The S4a checkpoint did not yet include Buffer Switch/save-all (added in S4b
below). Background inactive autosave, shared-buffer windows/projection effects,
restart recovery and modal-engine adoption remain missing. The pure buffer lifecycle protocol is tested separately; it is not a
claim that the full canonical multi-window engine has replaced this handoff.

## S4b: buffer commands and nonblocking captured saves

`buffer-switch` and `save-all` join the guarded shell catalog (Mod-Shift-B/S).
The shared navigation picker backs both Quick Open and Buffer Switch; it owns
nonmodal bottom input, fuzzy path ranking, Tab completion, stable-ID selection,
IME/consumed-event priority, focus and abort generations. Buffer candidates come
from the memory registry, not only files: deleted dirty buffers stay selectable.
Switching validates the live logical ID; close/delete/implicit clean removal
retire IDs, while explicit rename retains them. Old IDs cannot reopen replacements.

Save All snapshots dirty bodies/base revisions, owns one batch mutation token and
writes sequentially through the existing grant/revision flow. Confirmed writes
advance only their own baselines; newer source input remains dirty. The first
failure retires the batch with saved/remaining paths; no rollback or blind retry.
Affected autosave pauses latch across further edits until explicit confirmed
save/reconciliation. Ordinary and batch captures keep native editor input enabled;
loading/transfer still locks editing. This avoids save-driven readonly transitions
interrupting composition, without claiming real Chinese IME acceptance.

Command results use bounded, grant/generation-scoped echo; opened-editor focus
also carries grant identity. Four additional real hook/pane/CM integration cases
cover multi-buffer capture, editable deferred saves, ID switching/cancel and the
real deleted-buffer picker. Desktop 139 files / 2090 cases, typecheck/build pass.

## S5a: Capture parameter → popup tool buffer → explicit effect

Capture no longer uses the TODO argument Dialog or window prompts. A bottom
minibuffer chooses literal `todo`/`note` data; a separate nonmodal scratch Org
editor owns multiline draft text and target input. It is a tool window, not a
fake argument minibuffer or another writer for the originating file buffer.
C-c C-c / Mod-S finish, C-c C-k / C-g abort before write; IME, consumed events,
accepted editor prefixes, multiple-selection copying and held-key repeats take
priority. Template acceptance focuses scratch once at its declared raw cursor.

Draft dirty contributions are workspace-grant scoped, synchronous before React
publication, memory-only, and included in close/route/root-discard checks. File
mutations block route exit until their owned effect finishes; dismissal cannot
cancel or roll back an already-started write. `captureOrgEntryFlow` validates
exact RPC file identities and nonempty revisions, preserves existing/raw entry
bytes, rejects unclosed target blocks, and writes through the same grant/CAS port.
Every failed or malformed post-write confirmation is uncertain: keep a copyable
readonly draft, retire acceptance and require reread/reconciliation, no retry.

Capture target dirty buffers are rejected before effects. Confirmed results
advance only the target baseline; newer input is retained and autosave paused.
Unresolved buffers remain protected after undo to their old baseline, through
watch/poll/refresh and parking. Source caret/history preservation uses minimal
external changes and, for inactive clean buffers, defensive same-ID append-only
cached-state projection with unchanged separator policy followed by public
reconfigure. Unknown body replacements/new grants cannot adopt old cached history.

Eight production-root cases plus real-CM keyboard integration verify the complete
sequence and parked target path with exact EOF semantics. Desktop 143 files /
2255 cases, typecheck/build pass; static review found no remaining scoped issues.
No real native/Chinese IME acceptance, shared-file multi-window runtime, full
capture configuration/interpolation or persistent draft recovery is implied.

## S5b: snapshot-bound heading Refile

Refile has a cancellable, read-only file lookup followed by a separate heading
parameter session. `(file root)` is explicit; heading labels include outline and
line number so duplicate titles do not become identity. The immutable snapshot
binds revision, UTF-16 source offset and complete heading line. Lookup holds no
mutation owner/global loading state, abort returns immediately, and source/grant/
activation/generation guards reject late or busy-ABA results.

`planOrgRefileInsertion` enumerates only headings outside shared raw block ranges,
inserts at the chosen subtree end before its peer and changes only legitimate
incoming heading star runs to child level. Existing bytes, mixed endings, NUL,
Unicode and raw EOF survive; unsafe unclosed block cases reject before effects.
The flow validates exact RPC identities/revisions, rechecks live protected-path
and source guards immediately before first write and after target confirmation.
Any target post-write failure is uncertain; source failure leaves a known target
copy as partial. Neither rollback nor automatic retry is performed.

Both affected paths latch protection after uncertain/partial/throw outcomes;
undo-to-baseline or saving only the source cannot unlock the target. Subsequent
lookups/transfers, automatic import/save, root discard and close obey the latch.
The minibuffer honors native/synthetic consumed input and filters held Enter so
one keypress cannot accept both phases. Archive retains its yes/no root-only flow.

Four real hook/pane/CM/flow cases use a synthetic repository to verify IO ordering,
exact tokens/revisions/raw bytes, stale targets, both-path latching and immediate
read cancellation. Desktop 146 files / 2362 cases, typecheck/build pass; scoped
review has no remaining critical/warnings. Same-file refile, full Org target
configuration, multi-window runtime and native/user acceptance remain pending.

## S4c: production canonical buffer and same-buffer split

Main-file views now attach to `flows/org-editor-runtime`: one public CodeMirror
state owns text/history; window states contain no history. The controller's live
source mirror drives existing dirty/baseline/CAS ports but is not another editable
history owner. Canonical preflight guards live grant, logical buffer, expected
source and readonly mutation state; receipt commits update the mirror once.
Confirmed filesystem source installations use a separate explicit inlet. Older
save acknowledgments never overwrite newer text. Parked runtimes retain history.

The production pane can display two projections of its same active buffer. Both
follow A/B handoff; independent selections, folds and scroll remain local, while
undo/redo use canonical history and exact origin multi-range selections. Focused
window routing owns metadata, prefix/reveal and opened-buffer focus; mounting or
updating a peer cannot steal the command target. Closing a secondary projection
does not close the buffer. Scratch/capture remain local engines.

The engine preflights complete chained transaction batches and every effect.
Unknown effects/configuration reject rather than silently disappear. Supported
local folding, registered compartment/scroll effects stay window-owned; source
transactions preserve userEvent/time/addToHistory/isolation and typing grouping.
Filters are not run twice. Stale/ABA, detached, closed and reentrant dispatches
fail before commit. Unexpected post-commit mirror/projection failures retain the
canonical source, disable/detach the failing participant and report the error.

Runtime replacement carries a pane mount-incarnation fence; cached runtime-owner
snapshots cannot resurrect retired history even for append-like unknown changes.
Legacy history/redo migration runs on callback-free public history seeds, not
cached filters or stale closures. Unknown clean inactive disk changes reset old
history; confirmed controller capture/refile/archive target changes install into
parked runtimes as known changes. Compatibility edits obey normal readonly guards.

Nine production-root split cases and engine/editor/pane tests cover raw newline/
NUL/Unicode/EOF, one body receipt, history-free projections, undo/redo and detach,
A/B handoff, focus/metadata, save/new-input races, coherent external changes and
incarnation reset. Desktop 150 files /2436 cases, typecheck/build pass; scoped
review found no remaining critical/warnings after the ownership fixes.

This is not different-buffer simultaneous windows, detached/native windows,
restart recovery, arbitrary extension support, Vim adoption or real IME/desktop
performance acceptance. Those remain explicit goal requirements/gates.

## Architecture convergence: owner rules leave React

The workspace hook still coordinates too many responsibilities. The first
convergence step extracts `guardOrgRuntimeCommit` into a pure data-shaped policy:
immutable owner snapshot → accepted active/parked installation or classified
rejection. The React boundary gathers current refs; it no longer invents permit
rules in the runtime factory closure. Exact lease/session/source and readonly
semantics remain unchanged, with exhaustive parity and regression evidence.

`org-workspace-runtime-registry.ts` then extracts the narrowly scoped lifecycle
reservoir: creation/get, authorized source installation, retirement and closure.
Install authorization clears in owner-checked `finally`; commit decisions still
use the pure guard. Snapshot/mirror adapters remain explicit in the controller,
including old-grant error fencing. This registry owns no filesystem or Org rules
and stores no competing body string.

`org-save-all.flow.ts` now owns sequential snapshot CAS writes, fresh/owner
checks, exact receipt validation, synchronous confirmed commits and classified
first-failure outcomes. The hook only captures inputs, supplies mirror/baseline
ports, maps pause/conflict/echo and releases its owner in `finally`; it does not
run the batch's write loop. Confirmed paths are retained after partial failure;
newer input remains dirty. A production-hook regression covers the terminal
flow-to-hook microtask gap: final commit followed by unmount must not return
success or emit into another origin. The hook rechecks ownership immediately
when the flow settles, even on success.

`org-save-working-copy.flow.ts` now handles one captured CAS effect for both
active saves and inactive close: fresh/current guards, exact confirmation,
nonrejecting navigation waiter, synchronous ACK and classified failures. Active
ACK never replaces newer input. Inactive ACK updates the surviving same-ID
baseline even if its body changed, but retirement still requires the exact owned
snapshot. Baseline drift retains the newer baseline and pauses reconciliation.
Old-grant results cannot mutate an already-live G2. A throwing write-start
notification drains the already-started effect before releasing Busy; handling
promise rejection alone is not enough to preserve native-close protection.

This is the beginning, not completion, of splitting lifecycle/state reservoirs,
file effects and presentation. It does not weaken the experience target to avoid
larger window/config/workflow work. Full desktop verification: 154 files /2527
cases, typecheck/build pass (2026-10-03 14:30 +08:00).

## Next decision gates and work

1. Inventory actual Doom workflows and non-negotiable behaviors.
2. Validate existing Vim extensions, IME, undo/registers/macros and text-object APIs.
3. Extend the production same-active-buffer split to independent buffer/window
   routing and detached windows, with extension effects/lifecycle gates.
4. Establish shared source-range Org semantics and measured large-file behavior.
5. Promote the command/session host; migrate planning/properties, Quick Open,
   Refile and Capture one workflow at a time.
6. Generalize the existing Org Which-Key layer into configurable scoped keymaps;
   finish buffer/window ownership without importing the lossy Vim probe policy.
7. Add declarative configuration before arbitrary high-privilege scripts.

Do not equate outline filtering with body sparse-tree visibility, basic TODO
cycling with state logging, or timestamp insertion with a complete date reader.
A recovery journal, if approved, is explicitly non-authoritative and must never
silently overwrite the real Org file on restart.
