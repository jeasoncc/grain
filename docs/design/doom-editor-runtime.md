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
privileges, restart recovery of unsaved buffers and general-purpose editing scope
remain separate product/security decisions. Continue implementation and verification without
waiting for user approval at ordinary phase commits.

The active report is the complete Doom-experience goal
`f46e42b4-809e-454f-abff-3e37f79473c9` (“Grain面向Doom体验一致性的工作环境架构与实施目标”,
2026-10-03):
`~/org-roam/report/year-2026-Horse/month-10-October/day-03-Saturday/Grain面向Doom体验一致性的工作环境架构与实施目标.org`.
The diary/client-input iteration `4b551696-dbb7-432e-889b-fee1da3c08a8`
(2026-10-06) is completed within that goal, not a replacement for it. The
September 30 report remains historical. The ordinary-note/Roam/Remark chain
below advances selected workflows; unfinished A–F architecture, configuration
and external acceptance requirements remain active.

## Target boundaries

```text
Keyboard / views -> command intent -> applicability guard
  -> parameter session -> fresh context guard -> pure Org edit
  -> buffer transaction -> existing revision-checked save -> echo
```

- **Minibuffer:** parameter entry, completion, history, validation and cancellation.
- **Which-Key:** unfinished key-sequence discovery; not a parameter form.
- **Popup:** a temporary tool buffer/window, such as Capture or search results.
- **Buffer:** canonical raw content, shared undo, source generation/incarnation and confirmed disk baseline.
- **Window:** history-free projection, independent selection/folds/sparse view/scroll and input lease.
- **Workspace session:** exact approved capability, logical buffer registry, conflicts and aggregate transient dirty state.

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

## S4c: production canonical buffer and same-buffer split (historical milestone)

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

At the S4c milestone this was not different-buffer simultaneous windows (now
implemented in the independent split slice below), detached/native windows,
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

`guardOrgWorkingCopyBaseline` and `planOrgWorkingCopyAck` now share the pure
baseline contract across active save, inactive close and Save All. Path, revision
and baseline bytes must match; confirmed captured content advances the disk
baseline, never the live working source/history. Save All ACKs the current same-ID
parked snapshot rather than spreading its stale capture over newer input. Actual
batch IO uses frozen baseline copies, with per-member owner/ID/reference/baseline
checks before writing: a later member drifting while the first write awaits must
not start IO. Earlier confirmed paths remain acknowledged, with affected members
paused until explicit reconciliation.

`org-buffer-identity-registry.ts` owns path-to-logical-ID lifecycle without text,
history or filesystem authority. All hook allocation, lookup, reverse lookup,
approved rename and retirement now use this scope-bound reservoir. Matching
requires the exact grant object and session, not a root label; clearing an old
scope cannot clear G2. Rename retains ID, while close/delete/clean external
removal retire it, and reopen allocates a distinct identity/runtime. Reopen tests
assert successful navigation and non-null objects rather than accepting null as
merely different from a retired object.

`org-parked-working-copy-reservoir.ts` now owns immutable parked mirror/baseline
snapshots, exact scope/ID lifecycle and stable revision subscriptions. The hook
uses `useSyncExternalStore` for these snapshots rather than owning a mutable
parked Map. Park/mirror/confirmed-baseline/activation/rename/retirement are
explicit operations; pure plans remain outside the reservoir, and canonical
source/history remain runtime-owned. Listener failures cannot unwind committed
mirrors; reentrant mutations are rejected before commit. The runtime permit has
an independent notification fence, not a fake mutation flag that ordinary-save
or authorized-install exceptions could bypass. Production tests dispatch real
transactions, undo and installs during a Save All ACK notification to prove this.
Snapshot/subscription access is internal to the persistent React root, not an
extension-facing unscoped permission API.

This is the beginning, not completion, of splitting lifecycle/state reservoirs,
file effects and presentation. It does not weaken the experience target to avoid
larger window/config/workflow work. Full desktop verification: 157 files /2577
cases, typecheck/build pass (2026-10-03 16:09 +08:00).

## Independent split buffers: production window routing

Split starts with one shared buffer, then navigation changes only the focused
binding. Open-memory focus handoff is synchronous, without an asynchronous read
that loses the first command; `.org` remains the persistent authority, with
watch/refresh/CAS handling disk changes. Live snapshots expose canonical runtime
and mirror/baseline state, not a second body/history owner. Registered window
leases authorize active **and** parked edits. A null-origin direct source commit
is denied unless the trusted registry explicitly authorizes installation.

```text
Window primary -> scoped lease -> canonical A -> active/parked source mirror
Window secondary -> scoped lease -> canonical B -> active/parked source mirror
Focus -> memory-only context activation -> metadata / save / link / reveal
Undo caller lease -> history transaction; restored selection origin is separate
```

Busy cross-buffer focus is visibly deferred/read-only rather than invalidating
an in-flight save owner. Consumed/IME events cannot activate or trigger commands;
copy and navigation remain available. Once busy clears, toolbar availability and
commands use the fenced pending origin—even without another editor key/focus
event—and fresh controller/parameter refs. Pointer modifier-link navigation
activates its originating window rather than stealing the peer's context.

Actual container/CodeMirror regressions cover A/B independent editing/history,
focus Tags/Save, newer parked Save All input, close-focused-buffer peer survival,
close-all/reopen/close-split, rename identity, revoked/rebound leases, history
caller versus selection origin, pending copy→toolbar commands, links, consumed
and composition guards, and same-root G1/G2 cache fencing. Final automated
verification: 157 files /2601 tests, typecheck/build pass (2026-10-03 17:21 +08:00).
This does not claim detached/native windows, fully independent mutation owners,
real native Chinese IME or user workflow acceptance.

## Body Sparse Tree and guarded view commands

`OrgBufferCommandResult` distinguishes source edits from explicit view operations.
The shared minibuffer applies Sparse Tree through a fresh source/window target;
Execute-command requests retain the dispatch-time target/runtime/grant identity,
so a delayed same-buffer peer focus cannot redirect the operation. Toolbar view
commands do not use edit-specific selection-restoration wrappers.

```text
C-c / / catalog / menu -> guarded minibuffer query -> pure raw-source plan
  -> originating window's proven local effect -> body replacement decorations
Canonical .org source/history unchanged; peer filter state independent
```

Queries support `todo`, `todo:STATE`, local `tag:NAME` and title-only literal
`text:LITERAL`. Candidates reuse eligible headings/TODO declarations; no match
shows the document rather than trapping an empty view. Matched sections and
ancestor paths stay visible. Clear restores mapped full selections where
appropriate; ordinary movement supersedes the saved selection. Mixed raw
separators use exact heading-range marks, not invalid CM line decorations.

Lexical block protection stays distinct from sparse/TODO source eligibility:
COMMENT-subtree blocks still guard all existing Org transformations, while inert
markers in excluded comments/drawers cannot hide valid peer headings. Windows
recompute after edits and canonical projections without AST serialization.

Atomic navigation alone is insufficient: origin transaction preflight rejects
hidden-source edits and hidden-selection reveal attempts, including `filter:false`
batches. Runtime canonical history/projection has private authority; standalone
history is entered only by owned per-view key/DOM handlers. Caller-supplied
undo/redo/canonical annotations confer no exemption. Effect approval uses
instance provenance, rejecting forged or other-window sparse effects.

Production and local-editor tests cover visibility/source/history separation,
full multi-range relocation/Clear, Backspace/Delete/movement, peer undo/redo,
forged transactions/effects, mixed endings, source scopes, cancellation, IME,
held acceptance, stale catalog targets and source-derived completion. Verification:
166 files /2692 tests, typecheck/build pass (2026-10-03 19:08 +08:00).
This is bounded query support, not full Org sparse grammar/tag inheritance,
TODO logging, measured large-file performance or native IME acceptance.

## Same-file Refile: atomic buffer edit, not filesystem transfer

The exact current path is a file candidate, including when absent from the last
workspace scan; normalized aliases are not interchangeable local targets.
Current-file heading lookup uses a frozen canonical-source snapshot without
scan/read/write RPCs. Dirty local sources are valid, but unresolved pause/conflict,
busy state and changed source/window/grant/incarnation reject acceptance.
Cross-file Refile/Archive keep their saved-source/copy-first/dual-path protocol.

```text
Current file -> frozen local headings -> target / file root -> fresh guards
  -> pure remove/relevel/insert source ranges -> one origin-window transaction
  -> one canonical undo event -> normal later CAS save with original baseline
```

`planOrgSameFileRefile` returns an atomic edit batch in original raw coordinates,
not a whole-document replacement or two separate dispatches. The editor validates
ranges and visibility before committing; unchanged peer selections/folds keep
meaningful mappings through move, undo and redo. Toolbar transfer clears any
metadata-specific selection wrapper so the destination caret is retained.

Sparse hidden source/target cannot be modified indirectly; visible moves with
unrelated hidden intervening content remain usable. Boundary insertion has narrow
private per-view authority and validates complete actual CRLF/LF/lone-CR
separators. Safe whole-subtree removal must preserve the following heading's line
boundary; ordinary Backspace/Delete cannot borrow this authority. Unclosed
incoming or target drawers/blocks are rejected before edits/writes, including a
malformed drawer in a later destination peer.

Real production/editor regressions cover atomic two-range transactions,
same-buffer peer cursor/folds/history, dirty local workflow and later CAS,
visible/hidden sparse targets, raw EOF/separators, no-op/self/descendant targets,
late unresolved state, focus/IME/held acceptance and canonical/alias candidates.
Verification: 168 files /2741 tests, typecheck/build pass
(2026-10-03 20:16 +08:00). Full configurable targets and native/user acceptance
remain separate unfinished requirements.

## Agenda TODO action: derived tool → canonical command

Agenda row selection supports arrows/n/p, Enter navigation and repeat-safe `t`.
Cycling TODO stays in Agenda and updates the canonical source/history once;
there is no direct write RPC. An unopened target is explicitly read, validated
and parked without activating an editor or overwriting dirty working input.
Live snapshots overlay disk-derived rows, including unsaved states. Parked edits
remain memory-only until Save All/manual persistence; native close sees them.

```text
Derived row + complete scope/provenance + raw heading/timestamp anchors
 -> current live source OR validated explicit read -> fresh command guard
 -> scoped command permit (not window lease or no-history installation)
 -> isolated canonical source-range edit -> mirror -> refreshed live Agenda
```

The registry grants a temporary, exact expected-source command permit with
owner-checked cleanup. Loading/destructive mutation/notification fences precede
that exception. Direct null-origin runtime edits still have no command authority.
Malformed Either discriminants, path/revision payloads and incomplete provenance
reject before allocation or commit. Live actions require current session,
runtime incarnation and generation—even unrelated edit→undo invalidates a DTO.
Disk actions require current-session provenance and verified revisions/anchors.
Derived cache keys include the capability grant, not just filesystem root labels.

Pending rows use guarded aria-disabled behavior and retain actual focus; surviving
selected rows/root fallback restore only within the owned interaction. Navigation
completion is disposal/scope/request-fenced, including rejection and superseding
requests. Actual production-container/runtime tests cover focused deferred success,
rejection/refresh/empty/removal, outside-focus preservation, late G1 versus live G2,
source drift, malformed reads, failed-save pause after undo and canonical undo/CAS.
Verification: 169 files /2807 tests, typecheck/build pass
(2026-10-03 23:53 +08:00). Schedule/Deadline tool commands, unified global tool
registry, full TODO logging and native/user acceptance remain unfinished.

## Agenda Schedule / Deadline parameter workflow

`executeAgendaCommand` handles a typed TODO/planning union through the existing
validated canonical-command path; the TODO API is a wrapper, not a separate
permission system. Date validation precedes reads or allocation. Allocation-free
preparation retrieves the existing requested field—not just the selected row's
timestamp—and falls back to externally injected local today when absent.

`useOrgAgendaParameters` owns only a scoped immutable row/session snapshot.
The shared bottom `OrgMinibuffer` provides `s`/`d` parameter entry, strict ISO
validation, history, IME/consumed/repeat priority and cancellation. Existing
planning pipes preserve accepted format, time/repeater and unknown suffix rules;
an identical date is explicit unchanged, with no history or raw-source rewrite.
Changed dates create one canonical undo event and rebuild unsaved Agenda groups.

```text
s / d -> validated preparation (no allocation) -> scoped date minibuffer
 -> strict date + fresh provenance -> cancellable read
 -> synchronous onCommitStarted -> cancellation locked -> canonical command ACK
 -> original heading/action focus after regrouping; later normal CAS persistence
```

Root rechecks ownership after the lifecycle observer and before publication;
the observer never grants authority. Reads remain abortable, but cancelling after
canonical publication cannot suppress confirmed outcomes or display “cancelled”.
Disposal/new scope still suppresses foreign UI effects without undoing the edit.
Production and adapter tests cover field-specific prefill, no-op/date errors,
raw separators/repeaters, dirty/unopened targets, source/G2 drift, read cancellation,
commit/terminal-gap cancellation, same-heading selection/focus and later Save All.
Verification: 170 files /2880 tests, typecheck/build pass
(2026-10-04 01:06 +08:00). ISO-date entry is not the full Org date reader,
calendar/repeater UI, unified application tool host or TODO logging.

## TODO timestamp logging: shared source-range planner

Editor (runtime and standalone) and Agenda use `planOrgTodoTransition` with an
explicit validated local timestamp. State `!` / outgoing `/!` flags and final
ordered file STARTUP policy govern state logs and CLOSED. No implicit logging
default is enabled. `logdrawer` selects a valid log drawer; ordinary non-drawer
logs remain source lines. Note `@` and a final `lognotedone` prepare a note request only when the
chosen transition actually requires a note, without changing state before Finish.

```text
TODO shortcut / Agenda t -> current source + injected local clock
 -> eligible sequence / applicable policy -> atomic original-coordinate edits
 -> heading + CLOSED + state log -> one canonical history event -> later CAS
```

Existing CLOSED colon spacing and date/weekday/time component shape remain
intact, with present known components updated truthfully. Other planning fields,
unknown source and raw newline payloads are preserved; one undo restores bytes.
Properties validation accepts empty values while rejecting nested/duplicate or
unclosed drawers. Unsupported heading-local LOGGING is evaluated only for the
target and applicable ancestors, not unrelated siblings or excluded source.

The registry's command-batch permit has exact scope/source and readonly/notify
fences, not no-history installation authority. Per-window editing uses the
existing atomic range/visibility contract. Clock failure, malformed policy,
required notes and sparse hidden edits are rejected before commit; production
Editor/Agenda tests assert rendered rejection messages, peer mapping/folds,
consumed/IME/repeat safety, full undo and timezone behavior.
Verification: 173 files /2988 tests, typecheck/build pass
(2026-10-04 02:15 +08:00). The multiline workflow is described below; full property inheritance
is implemented for the declared subset below; complete logging-policy compatibility remains unfinished.

## TODO notes: scoped request → retained scratch → atomic source commit

`OrgTodoNoteRequest` and its asynchronous Agenda specialization live in the
command flow layer, not view types. They carry validate/execute/abort behavior
with captured source identity; they do not serialize capabilities or persist
another document authority. The planner takes explicit literal note text and
finish-local timestamp; reversible Org-safe literal encoding prevents multiline
`:END:`, headings, blocks and directives from escaping the note/log structure.

```text
Editor TODO / Agenda t -> needs-note preparation (original state held)
 -> shell admission + acknowledged transient protection -> multiline scratch
 -> fresh grant/session/buffer/incarnation/generation/window lease/source checks
 -> cancellable read -> commit boundary -> one state/CLOSED/log/note history event
 -> owned origin focus; later normal CAS / Save All
```

The workspace shell owns the note across Editor/Agenda navigation. Only one
request is admitted; competing requests cannot replace a draft. Editor/standalone
source ownership remains canonical runtime/local CM, while the plain-text note
scratch has its own native input history. Source edits including edit→undo,
retired/rebound windows, conflict or paused autosave invalidate Finish without
throwing away the copyable draft. Root checks the exact active or parked buffer
again after the commit observer; unrelated flags are not authority.

Protection is acknowledged before editable publication. Retained old-scope
scratch may receive a separate current-scope dirty-close registration, never
current-scope commit authority; old callbacks cannot release another grant's
protection. Explicit abort or confirmed completion retires the request. Pending
reads can abort, but a committed result remains applied through terminal gaps.
Focus restoration requires the host still owns focus and the origin is current;
publication callbacks focusing another surface are not overridden.

Production tests cover Editor/standalone/Agenda notes, injected clock, raw undo,
no-write/read-only preparation, literal payload reversibility, dirty baseline/CAS,
lease/ABA/G2 drift, late active/parked pause/conflict, mode-switch retention,
acknowledged close protection, read/commit cancellation and external focus.
Verification: 175 files /3073 tests, typecheck/build pass
(2026-10-04 03:51 +08:00). Native textarea undo and Chinese IME require actual
browser/native acceptance; restart recovery and unified tool registry/complete
logging compatibility remain open, not silently declared complete.

## Declared logging inheritance: pure scopes → effective policy

`org-logging-scope.pipe.ts` snapshots applicable file/ancestor/target declarations;
`org-logging-policy.pipe.ts` resolves immutable policy and provenance. The source
transition planner consumes that data without new Root orchestration or mutable
policy caches. Editor, Agenda and note Finish therefore resolve the same policy
from current canonical source; edit→undo still invalidates captured note origins.

```text
eligible TODO flags + ordered STARTUP -> compatibility drawer directive
 -> file properties -> ancestors root-to-parent -> target properties
 -> effective state/done/drawer policy -> existing atomic TODO/note planner
```

Empty values inherit. Standalone `nil` clears state flags, done policy and drawer;
later overlays restore only explicit behavior, not hidden file defaults. A state
token replaces its entry/exit logging flags; `STATE()` clears them. `LOGGING+`
appends declarations; duplicate bases, mixed nil, unknown options/states and unsafe
drawers reject. Explicit drawer properties beat logging toggles at the same tier;
later tiers can override them. Inherited drawer names select the target's drawer,
never append logs to the ancestor. CLOSED reopening remains metadata cleanup.

Excluded COMMENT/block/drawer content cannot forge declarations or ancestry.
Unrelated sibling policies do not block a target; applicable malformed scopes
reject before any transaction. Production cases cover inherited note admission,
local nil/no popup, overrides/append/empty settings, custom target drawers,
raw undo, dirty working-source overlays and source-generation stale drafts.
Verification: 176 files /3112 tests, typecheck/build pass
(2026-10-04 15:41 +08:00). Unsupported repeat/reschedule/redeadline/refile logging
and complete Org policy semantics remain explicit future work; this is not a
claim of native/user acceptance or a Lisp runtime.

## Agenda command coordination: explicit flow, thin Root ports

`runOrgAgendaOperationFlow` owns capture, validation, cancellable reads, pure
planning, EDIT-only allocation, anchor freshness, publication and owner-checked
cleanup. `org-agenda-command-plan.pipe.ts` is the pure command/plan boundary;
public data types live in `types/org`, not the React hook. Capture freezes nested
entry/heading/timestamp origin and operation so caller mutation across an await
cannot retarget a command.

```text
Root snapshot + exact-reference grant/session + narrow ports
 -> frozen intent/calendar/clock guard -> owned read lease
 -> explicit Right/path/revision/body validation -> allocation-free plan
 -> EDIT-only park/runtime -> fresh ID/incarnation/generation/source fences
 -> observer -> recheck -> atomic publication -> actual confirmation -> finally
```

Root retains only current authority snapshots, owned busy/read state, local clock
capture, scoped identity/mirror/runtime adapters and the commit port. The flow is
not a service or another body/history owner. Preparation, note-needed and unchanged
outcomes allocate nothing. Cancelling a read releases its caller, observes the
late task and cannot clear a successor's owner. Publishing/notification abort or
throw after canonical commit remains confirmed; observer failure before it does
not manufacture success. UI disposal and scope guards still own UI completion.

New tests cover mutated DTO/operation inputs, malformed read contracts, late G1/G2,
read cancellation, edit/undo and logical/runtime drift, no-allocation branches,
post-observer readiness/pause/conflict changes and actual committed results.
Verification: 178 files /3170 tests, typecheck/build and diff checks pass
(2026-10-04 16:06 +08:00). ESLint remains unverified because its `@eslint/js`
configuration dependency is missing. Root lifecycle/mutation coordination beyond
Agenda and the full application command/tool host remain open requirements.

## Shared parameter lifecycle: adopted Editor and Agenda reservoir

`createParameterSession` holds immutable stable snapshots and opaque leases for
prepare/collect/read/commit/settle/retired stages. Both `useOrgCommandMinibuffer`
(metadata, Sparse Tree, local/cross-file Refile and Archive) and
`useOrgAgendaParameters` (date preparation/acceptance) adopt it. The core owns only
lifecycle law; origin guards, literal inputs, domain transformations, file effects,
body/history and DOM focus remain adapter/flow responsibilities.

```text
intent -> opaque lease -> prepare/read -> frozen prompt/candidates
 -> singleflight accept -> owned advance OR commit boundary
 -> settle real result -> owner-checked retire/cleanup
```

Session IDs do not alias between hosts. Stale callbacks cannot cancel a successor
heading prompt or release its read; candidates are captured, not caller arrays.
Abort clears the captured read before synchronous dispatch and fences lifecycle
reentry, independently of snapshot notification guards. Listener throws do not
roll back publication. Started commit locks drain through actual settlement even
when UI scope detaches, while old emissions remain suppressed; read cancellation
and Agenda's synchronous commit boundary remain distinct.

Completion captures the original minibuffer host before domain callbacks, then
requires that exact connected, same-ID host to contain current focus. Replacing a
child within it remains owned; removed/replacement hosts, generic body and foreign
focus do not. Pre-minibuffer Agenda errors separately preserve original source
focus ownership. Cancellation remains distinct from completion. Production tests
cover both adapters, owned multi-stage Refile, direct duplicate accepts, read vs
post-commit cancellation, reentrant abort/notification, StrictMode and focus cases.

Verification: 180 files /3240 tests, typecheck/build and diff checks pass
(2026-10-04 17:54 +08:00). This is shared parameter lifecycle, not a completed
application command registry: navigation pickers, capture/note tools, declarative
keymaps/transients and extension/configuration protocols remain separate work.

## Sparse Tree composition and explicit tag inheritance

Existing `todo`, `todo:STATE`, local `tag:NAME` and whole-tail `text:LITERAL`
remain unchanged. `itag:NAME` explicitly queries effective file/ancestor/own tags.
`match:` introduces bounded boolean composition: NOT > AND > OR, parentheses,
and quoted title literals with quote/backslash escapes. Example:

```text
match: todo AND (itag:work OR tag:urgent) AND NOT text:"Not now"
```

Parsing admits at most 8192 UTF-16 units, depth 32 and 128 nodes; malformed input
leaves the existing window view untouched. Effective tags use shared ancestry
metadata and requested-tag matching, not quadratic per-descendant copies of all
ancestor sets. Candidate generation scans declared/local tags once. Excluded
COMMENT/block/drawer source cannot forge tags or structural parents.

Runtime rejects unknown effects before CodeMirror filters can traverse an AST;
standalone and runtime presentation authority are both installed, and missing
authority fails closed. Cyclic forged ASTs are rejected before traversal, including
`filter:false`. Ordinary local edits relocate selections against newly computed
hidden sections when a heading stops matching; canonical peer/history reveal
remains separately trusted. Queries still change only window presentation, never
source/history; visible same-file Refile remains a canonical atomic range move.

Verification: 183 files /3270 tests, typecheck/build and diff checks pass
(2026-10-04 19:01 +08:00). Production cases cover composition/invalid queries,
independent split views, new-range caret relocation, forged ASTs, deep ancestry,
raw source preservation and undo/refile guards. Native large-file performance and
full Org query grammar/configurable inheritance remain separate open work.

## Shared bounded date reader

Editor and Agenda Schedule/Deadline use the same pure reader with explicit local
calendar context. Supported input: ISO date, today/tomorrow/yesterday and Chinese
aliases, signed integer days/weeks, and strictly-next English weekdays. Offset is
bounded to 36600 days, input to 128 UTF-16 units, years to 1–9999. Arithmetic is
calendar-based and independent of system timezone/DST; no Date.now in the core.

```text
raw parameter/history -> accept-time boundary clock (relative input only)
 -> pure date guard/resolve -> validated ISO -> existing source-range command
 -> one canonical transaction -> later ordinary CAS
```

ISO input remains usable without a clock context. Prepared contexts are copied
and frozen, while explicit acceptance context is fresh at midnight. Preparation
clock errors emit a visible rejection without allocating a session; malformed
input keeps the prompt. Root still accepts only validated ISO and checks it before
reads/allocation. Raw input, not normalized ISO, remains in parameter history.
Known noncanonical planning-field casing rejects instead of inserting duplicate
fields; unrelated prose and accepted raw suffix/component formatting remain intact.

Verification: 185 files /3381 tests, typecheck/build and diff checks pass
(2026-10-05 02:00 +08:00). Tests cover calendar boundaries/leap days, timezone,
clock failure, context mutation, midnight acceptance, both production workflows,
raw undo and malformed-source refusal. Full Org calendar/time/range/repeater
reader and native Chinese IME remain separate unfinished requirements.

## Existing Org path: architecture convergence (2026-10-05)

Unreleased architecture change record; historical feature-phase entries above
remain context, not additional scope for this cutover.

This cutover consolidates existing behavior; it adds no Org syntax or new completion
feature. Canonical runtime source is authoritative while editing, including parked
and failed-save buffers. Disk source remains the persistence baseline. Agenda,
Backlinks, Inspector and link resolution share the same live/disk query boundary;
queries do not activate buffers, write files or create history. A captured save ACK
advances only its confirmed baseline, retaining newer source and undo/redo.

| Owner | State and lifetime |
|---|---|
| `OrgBufferRuntime` | Raw source, canonical history, source generation and incarnation |
| `OrgWorkspaceSessionOwner` | Issued grant/session scope, synchronous source/baseline mirrors, buffer/window lifetimes, ACK/confirmed-source reconciliation, conflicts and transient dirty state; cached immutable snapshot |
| `OrgWorkspaceEffectOwner` | Explicit mutation/approval/save/save-close/save-all claims, cancellable latest read and captured native save; cached immutable snapshot and exact-owner cleanup |
| Mounted editor window | Selection, folds, sparse tree, scroll, prefix and parameter ownership; no local source history |
| Parameter/Capture/TODO tool | Input draft and bound origin; no independent file writer |

Synchronous parking publishes one authoritative source per path, never both active
and parked mirrors. Session disposal revokes source/window/runtime authority before
releasing its grant; the React lifetime separately disposes effect claims. An already
started native write still drains rather than being externally resolved or rolled back.
Save All retains captured references for truthful remaining-dirty reporting after
unmount; confirmed receipts survive, subsequent writes and UI publication stop.

`orgCommandDefinitions` owns existing command IDs, applicability, labels, shortcuts,
prefixes and parameter factories. M-x, ribbon/workspace actions, editor shortcuts,
Note actions and Which-Key use that authority. Dispatch rechecks the current target;
editor execution captures the originating mounted window before palette dismissal.
Planning availability is clock-free; valid source is checked before acquiring today's
default. Editor source-transaction subscriptions retire batched edit/undo ABA prompts.
Disk-revision-only saves retain an unchanged prompt.

Parameter cancellation restores the full original selection and both scroll axes
without history, including fencing pending CodeMirror scroll restoration. TODO
origin invalidation is observable across editor/Agenda teardown; a retained draft
becomes readonly and copyable until explicit abort. Capture returns to its original
Editor or Agenda surface, including Agenda with no open buffer, without replacing
the working source.

Native startup authority is immutable. Org mode rejects ambient filesystem and
historical database/backup commands; unknown commands fail closed. Legacy providers,
queries, migration picker and stylesheet effects are loaded only after native legacy
authorization. Returning to Org removes their presentation effects. Shared font
settings apply to raw Org; legacy paragraph/indent/fold settings do not.

Ordinary native saves retain staged source, old inode and durable journal identity.
Reopening an approved directory recovers before scan: interruption before publication
restores the old file; interruption after publication retains the new file. Foreign
same-byte inodes and unmanifested artifacts are preserved and rejected rather than
guessed away. This publication journal is not restart recovery for unsaved buffers
or tool drafts. Linux publication preflight proves descriptor-source linking with
owned scratch objects before capture. Darwin ordinary Save/Delete and unsupported
publication platforms refuse before preparation/capture; no replaceable named-source
fallback remains. Linux process interruption does not qualify power loss or parity.
Capturing the old pathname has an observable gap; this is not no-gap atomic CAS
and makes no durability promise for unacknowledged publication.

Acknowledged overwrites retain the captured original inode and provenance journal
under `.grain-original-*.tmp`; acknowledged deletes quarantine them under
`.grain-deleted-*.tmp`. Write receipts and workspace scans expose their recovery
paths, not a second body authority. Recovery does not replay or garbage-collect
these completed originals and does not require their changing bytes to remain
UTF-8. They are live inodes, not immutable backups: already-open external file
descriptors can still change them, so retaining them consumes disk indefinitely.
Real Linux Wry/native save and delete smoke wrote the original fd after ACK:
both retained `nlink=1`, named byte-exact recovery files and scan metadata; save
kept the replacement body and delete kept the original pathname absent. This
preservation closes the unlinked-original loss, not the separate in-place-write
atomic-CAS or macOS/power-loss acceptance gaps.

No recognized transaction object is automatically garbage-collected: stages,
journals, originals, legacy GC slots and publication probes remain named. New
writes use v3 publication identity/target provenance; active genuine v1/v2 journals
remain readable. Recovery inventory uses object identity, not its historic SHA or
UTF-8 validity, so late writes remain evidence rather than automatic Source.
The actual Linux bg166 v1 native smoke held a staged O_RDWR descriptor across
original restoration: original/staged/journal inventory remained three objects,
stage `nlink=1` and device/inode stayed exact, and late non-UTF8/NUL staged bytes
remained named and discoverable. Capability-scoped reads retained the exact restored
original; two same-process reopens neither replayed the stage nor erased names.
Evidence: `local://grain-native-staged-fd-after.json`; this smoke excludes probes,
v2/v3 journals, OS-process restart and crash/disk/fsync injection. Retention consumes
disk indefinitely; it is not an immutable backup or atomic in-place-write CAS.

Verification includes real Chromium save/rejection, parked backlinks, M-x Tags,
buffer switching, split shared undo/redo, literal-input preservation and Capture
return; its IPC boundary is an exact synthetic filesystem. Separate real Linux
production-module SIGKILL probes cover pre/post-publication recovery, byte preservation,
stale CAS, path/symlink refusal and ambiguity retention.

Window teardown captures the viewport in layout cleanup before React removes the
scroll container; detached Chromium elements report zero offsets. An untouched,
not-yet-restored StrictMode mount retains its pending bookmark, while newer DOM
scroll intent wins. The strengthened A/B regression models that connected/detached
boundary. Real wheel input now survives A → B → A with selection `120..180` and
vertical offset `620`; the secondary window stays independently at `0`. Capture
Finish and cancellation retain that source, range, viewport and primary focus.

Final affected checks: 70 Vitest files / 1613 tests pass, TypeScript check and
desktop production build pass; 227 rust-core lib tests pass and the native desktop
crate checks with locked offline dependencies. Root `bun run dev` was launched:
Turbo ran only desktop Vite, with no historical API service.

## Dependency maintenance and unused mobile removal (2026-10-06)

The desktop remains ReactDOM + Tauri; its Org path does not import Expo or React
Native. The unused mobile workspace contained placeholder screens, no external
component callers, and an unfinished migration checklist. It is removed together
with its scripts, documentation links, steering entries, and installed dependency
chain. Responsive desktop/web layouts and Tauri platform support remain intact.

JavaScript workspaces now use one root Bun 1.4.2 lockfile and isolated linking.
CI/install callers use frozen root installs; stale root npm and leaf Bun/npm locks
are removed. The independent Doom runtime probe retains its own npm lockfile.
React/DOM are 19.3.0, Vite 7.3.6, TypeScript 5.9.3, Vitest 4.1.11, and Tauri
JS/native 2.12.1. CodeMirror state/view/commands are aligned at 6.7.6/6.43.13/6.11.1.
The Monaco package retains the compatible PanelGroup API at panels 3.x, separately
from desktop panels 4.x; isolated peers prevent accidental cross-version imports.
Desktop declares ES2024 type libraries for existing APIs without changing its
ES2020 target. ESLint 9 fixtures use real TS flat-config matching, constant naming
checks the actual declaration ancestry, and Zustand traversal follows AST children
rather than parent backreferences. Radix's deferred unmount focus work finishes
before the sparse-tree integration fixture releases its jsdom environment.

Frozen installation, all seven shared package builds, desktop production build,
190 desktop Vitest files / 3469 tests (`--maxWorkers=4`), and 19 ESLint plugin files /
342 tests pass. An actual ESLint CLI consumer exercises 28 accepted/rejected cases
across six rules. Real Chromium verifies raw CRLF/NUL source, split typing and
shared undo/redo, exact save payload, rejected-save source retention, and A → B → A
selection `120..180` / primary scroll `620` with secondary scroll `0`. This UI proof
uses a synthetic scoped IPC filesystem; no user workspace is opened.

Separately, 227 rust-core tests, locked native desktop/API checks, and real Linux
production-library byte/CAS/symlink/fresh-process IO smoke pass. Web Next 15.5.27
build and live UI, API Elysia 1.4.30 HTTP/CORS, standalone Vim/ownership probes, and
installed Puppeteer 24.43.1 / Chrome 148 interaction were exercised. No installer
publication, native WebView launch, or new power-loss/macOS recovery proof is claimed.
The four paused Org completion/navigation files retain their original SHA-256.

Compatible Rust updates remove 14 previous lockfile advisory matches; five remain
for glib, h2, instant, proc-macro-error, and rsa. Lockfile presence does not establish
runtime reachability. Framework majors and feature-disabling security workarounds
are not part of this upgrade.

## Stable major dependency migration (2026-10-06)

The next maintenance pass migrates actual consumers rather than only changing
manifest ranges. Application release versions remain unchanged: root/desktop/web
`0.1.604`, JavaScript API `0.1.7`, shared SDKs `0.1.0`, and ESLint plugin `2.0.0`.
The four paused Org completion/navigation files retain their original SHA-256;
the removed mobile/Expo/React Native workspace is not restored.

The main toolchain is Vite 8.3, React plugin 6.1, Vitest 5.0, and TypeScript 6.0.3.
TypeScript 7 is not selected: stable typescript-eslint 8.71.1 requires `<6.1.0`,
and declaration generation still consumes the classic TypeScript compiler API.
Direct `unplugin-dts/vite` replaces the obsolete `vite-plugin-dts` wrapper across
all six editor libraries. ESM configuration uses `import.meta.dirname`; source
entry-point libraries no longer generate a conflicting facade declaration.
CodeMirror keeps Mermaid external instead of duplicating its runtime bundle.

Desktop and the custom plugin use ESLint 10.12 / functional 10.0 / globals 17.
Rules consume the current source-code/context API and presets self-register the
plugin. Web deliberately retains isolated ESLint 9.39.5 with Next's official
16.3.8 configuration: the upstream React/import/accessibility plugins do not
declare ESLint 10 compatibility. Callable documentation imports the real
`@grain/eslint-plugin` package rather than an unpublished alias or subpath.

Lexical packages are aligned at 0.52.0, including extension ownership and Prism
code registration; legacy mention/tag JSON remains readable. Tiptap packages are
aligned at 3.31.4, including moved menu/table APIs, silent content replacement,
and valid empty code/diagram documents. Monaco and desktop now both use panels
4.14.2. Desktop's stored sidebar percentage is read from the named layout field,
and its initial size is explicitly a percentage rather than accidental pixels.
Real keyboard resizing persists a 20% to 25% sidebar across reload.

Mermaid 12.1 uses the existing dagre/classic renderer and `securityLevel: "loose"`.
This does not harden imported markup or remove the existing untrusted-SVG risk.
The renderer needs ES2024 APIs (Safari 17.4+); Chromium proof does not establish
older native WebView compatibility. Browser acceptance exposed an asynchronous
Lexical preview race: an older parse failure could overwrite a newer SVG.
Only the current render request can now publish preview state or callbacks.
Two regression cases cover stale success/failure; real typing verifies automatic
rendering and invalid-to-valid recovery without a manual render call.

Web is Next 16.3.8 static export, served by `serve`, not a production Next SSR
server. Its canonical configuration replaces the obsolete export configuration.
Hydration, media-query and storage subscriptions replace mount-time state copies;
denied storage keeps a user choice in memory without claiming persistence.
Real browser checks cover cross-tab change/removal/clear, font preference/class updates,
sidebar/focus state, navigation and a complete error-boundary page reload.
Remote `s3.bmp.ovh` images failed connection/certificate checks during acceptance;
a real controlled PNG verifies the loading/decode/cache/error UI, not success of
that remote service. Existing overlapping desktop documentation controls were
exercised through their real keyboard actions without unrelated CSS changes.

Bun API uses Drizzle ORM 0.45.3 / Kit 0.31.11 and `@elysia/openapi` 1.4.16.
The existing `/swagger` and `/swagger/json` paths and OpenAPI 3.0.3 contract remain.
An isolated temporary PostgreSQL 18.6 database executes the generated DDL and
four indexes, then exercises real HTTP insertion, Unicode/nested JSON/date
round-trips, filtering, pagination and aggregate statistics. No user database
is opened or altered.

Rust consumers move to Warp 0.4 / Hyper 1, SeaORM 2.0, reqwest 0.13 and the
native-platform keyring providers. Linux retains the existing
`keyring-rs:database-key@grain-editor` identity rather than hiding stored keys
behind a new provider prefix. Real HTTP/1 and HTTP/2, malformed-body rejection,
SQLite CRUD, ZIP IO and temporary Linux credential create/read/reopen/delete pass.
The inactive SeaORM Arrow `2.0.0-rc.5` lock record is not an enabled dependency.
All three Rust lock audits remove the previous h2/instant/rsa matches but retain
glib `RUSTSEC-2024-0429` and proc-macro-error `RUSTSEC-2024-0370` from Tauri's GTK
dependency chain; no audit ignore or feature-disabling workaround is used.

Rust MSRV is 1.94.0. Node supports `^22.22.2 || ^24.15.0 || >=26.0.0`; CI uses
24.21.0 and Bun 1.4.2. Flatpak moves to Freedesktop 25.08: the official 24.08
Rust extension is 1.89.0 and cannot satisfy the new MSRV, while the 25.08 extension
provides Rust 1.98.1 and Node 24.21.0. AUR/OBS/Gentoo floors and canonical Flatpak
IDs are updated. AUR's generated `.SRCINFO` now matches its already-existing
0.1.604 PKGBUILD; this is metadata synchronization, not a release-version bump.
YAML parsing, Linux workflow shell syntax and real `makepkg --printsrcinfo` pass.
No Flatpak/AUR/Gentoo/OBS installer build or publication is claimed.

Major-migration acceptance passes root production build (9 targets), 20 Web static
pages with zero lint warnings, 191 desktop test files / 3452 tests, 17 plugin files /
336 tests, and 228 Rust core tests plus the explicit Linux credential smoke.
Actual production Org UI retains exact CRLF/NUL source, split/shared undo/redo,
exact save bytes, rejected-save retention and A → B → A selection `120..180` /
primary scroll `620`, independently from the secondary viewport. This UI uses
only the isolated synthetic IPC filesystem. Real SDK browser checks include
Markdown insertion without surrounding-content loss, Tiptap menus/tables,
Mermaid SVGs and Monaco worker-backed editing. Installed Puppeteer 25.12 launches
Chrome 154 and performs a real button interaction. No new macOS/Windows native
WebView, power-loss recovery or installer proof is implied.

### Source-vetted transitive security updates

The final root lockfile is Bun format 3. Twelve immediate-provider overrides
replace vulnerable transitive pins without forcing every consumer onto one major:
Excalidraw keeps Nanoid 3.3.20, its Mermaid converter alone uses 5.1.16, and docx
keeps Nanoid 6.0.2. Both Mermaid versions use KaTeX 0.18.2; the converter retains
its supported Mermaid 11 rather than being forced onto the application's 12.
Chevrotain 11 and its GAST/CST helpers use Lodash ES 4.18.1. Solid uses Seroval and
plugins 1.6.8; Serve uses Compression 1.8.2; Functional uses DeepMerge TS 8.0.2.
Excalidraw's unused Sass compiler moves to 1.105.1, removing its old
Sass/Chokidar/Braces branch without changing precompiled application CSS.

These cross-range selections are checked against the symbols the published
providers actually use, not assumed compatible because an audit becomes clean.
Real Solid synchronous/streaming SSR restores Unicode, Date, BigInt, Headers and
URL hydration values. A typed Functional consumer verifies inherited option
arrays retain both exemptions while rejecting a third mutation. Actual strict
and legacy Grain presets accept a normal call and reject `eval` under ESLint 10.
The actual static server emits gzip HTML and remains usable after twelve aborted
compressed responses; this is not a claim that one smoke measures all leak risks.
Vitest 5 rejects a duplicated `--run`; desktop's health-check caller no longer
adds that flag to the already non-watching test script.

Official-registry npm audit now reports only
[Braces stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
and [legacy esbuild development-server exposure](https://github.com/advisories/GHSA-67mh-4wv8-2f99).
Braces 3.0.3 is still the latest published version with no fixed release.
Drizzle's deprecated esbuild-kit dependency still retains esbuild 0.18.20;
its inspected loader calls transform/transformSync, not serve/listen, and current
Drizzle CLI uses its own patched esbuild/tsx path. Directly starting that nested
old esbuild server would change exposure. No incompatible loader alias, forced
esbuild major, audit ignore, or feature removal conceals these residual records.

Monaco's external DOMPurify leaf is 3.4.16, but Monaco 0.57.0 embeds 3.4.15 inside
its executable distributions. A dependency override does not rewrite those bytes.
No newer stable Monaco provider was published. The observed sanitizer wrapper
does not use `IN_PLACE`, which the two new advisories require; this is a bounded
source finding, not a claim that the embedded library or every deep import is
patched. The [DOMPurify 3.4.16 fixes](https://github.com/cure53/DOMPurify/releases/tag/3.4.16)
and this distribution distinction remain explicit.

The two JavaScript prerelease records are Babel's requested
`gensync@1.0.0-beta.2` and the React/import ESLint providers' requested
`resolve@2.0.0-next.7`, not selected preview versions of the application frameworks.

### Final production path and editor acceptance

The final production sweep reproduces React hydration error 418 at slash aliases
such as `/docs/`, `/docs/tutorials/` and `/docs/manual/#editing`. Static export
prerenders the clean path, but the client pathname retains its terminal slash:
conditional share/search/metadata markup and exact breadcrumb lookups disagree.
`useDocPathname` synchronously canonicalizes that identity and replaces all 14
documentation pathname consumers. No mount-time workaround, hydration-warning
suppression, server rewrite or SSR/config change hides the divergence.
After Web lint/typecheck/build, eight canonical/slash/hash routes pass initial
load and reload with zero page errors; actual TOC scrolling, breadcrumbs and
sidebar navigation remain usable.

Existing documentation UI limits remain separate from this fix: child share/font
controls overlap and the sidebar pointer toggle is covered by the top navigation,
while keyboard actions work. Font controls update stored preference and prose
classes, but measured visible text does not resize: a representative paragraph
stays 20px/35px line-height and its heading stays 24px/31.2px for lg and xl.
No unrelated font/layout redesign or claim of successful visual resizing is made.

Patched editor acceptance uses actual Excalidraw dragging, text input, duplication,
grouping and Ctrl+S; official scene serialization/restore preserves all eight
opaque IDs, geometry and binding/group references across a browser reload.
This fixture's local storage is not native persistence. Both real Mermaid CORE
versions resolve external KaTeX 0.18.2 and render readable fractions; the old
Chevrotain 11 pie path rejects malformed input and recovers with the patched
Lodash dependency. Standalone Mermaid ESM embeds old KaTeX, but is not the
production CORE entrypoint used by these consumers.

The unchanged Excalidraw 0.18.1 / converter 2.2.2 / Mermaid 11.17.2 cohort has an
observed compatibility boundary: class/ER/state extraction logs DOM lookup errors
and uses its real SVG-image fallback. This is not native editable conversion proof
or evidence of a newly introduced regression. Flow math conversion keeps literal
TeX text, separately from working rendered MathML/SVG. At dependency acceptance,
invalid previews recovered while Mermaid left historical error banners appended
to the document body. The Lexical UI/adapter refinement below now contains its
rendering requests; the converter cohort remains unchanged.
No fake fallback, converter patch/downgrade or silent security-level change is used.



## Existing desktop and documentation UI refinement (2026-10-06)

Four parallel implementation slices refined the actual Org workspace, its
navigation, the Web documentation reader and the existing Lexical diagram SDK.
The primary `/org` surface remains an Org source editor with an optional second
source window. It does not claim an HTML preview or a new document renderer.

### Desktop content and feedback

- Workspace switching/tools, file-tree operations and current-note rename/delete
  are separate groups. The ribbon separates navigation, creation and settings;
  relative paths distinguish same-named notes.
- The command header is 36px, document toolbar 40px and icon targets 32px.
  The modeline has a 24px minimum height and wraps when operation feedback needs
  more room. Navigation heading defaults live in Tailwind's base layer so explicit
  11px/12px chrome typography wins. The Org gutter uses the active theme tokens.
- Each source window identifies its bound path, true active window, unsaved state,
  conflict and operation lock. A 194px window was exercised with dirty/read-only
  state: header and modeline wrap without clipping or overflowing the editor.
- IO errors remain in one persistent, readable workspace alert. Local command
  feedback wraps above the modeline. Saving, dirty, conflict and operation-lock
  feedback derives from existing controller/buffer state, not a parallel store.

### Documentation reader

- A single 48px reading-tools row below the global header replaces competing
  fixed controls. Sidebar, font, share, focus and help controls remain reachable
  at 1440px, 1024px and 390px, without overlap or horizontal page overflow.
- Reader-owned storage selection drives scoped typography. Paragraphs and lists
  use 16/18/20/22px for small/base/large/extra-large; H2 uses 24/27/30/33px, with
  proportional line height. Both font boundaries disable the unavailable action.
- Reload, document navigation and cross-tab storage changes preserve the choice.
  Denied storage still permits in-memory font and navigation changes; it is not
  reported as durable persistence.
- The existing SSR-first snapshots and canonical/slash pathname normalization
  remain intact. Share captures the current hash on click and emits the canonical
  document URL. Hidden navigation is inert; mobile navigation makes only the
  document content inert while open.
- Removed the child-identity-based delayed page copy. Reader controls now update
  immediately without fading the article or briefly showing stale content.

### Existing diagram preview

Mermaid exposes Source/Preview/Split without remounting its source editor.
Real browser interaction retained source, selection and undo across mode changes;
runtime read-only input was rejected. Source-only consumers remain source-only.
PlantUML shows its real missing server-renderer prerequisite and does not advertise
an available preview.

Each Mermaid request owns a UUID and a measurable off-screen staging container.
Success, parser failure, stale completion and unmount/destroy clean only owned
nodes. The current parse error remains in the preview; a successful current
render clears it. Component and adapter tests cover asynchronous publication and
cleanup boundaries. Actual Mermaid parsing verified invalid-source recovery and
superseded adapter requests with no surviving body error SVG or staging nodes.
Existing `loose` security level, `dagre` layout and `classic` look are unchanged.

### Exercised acceptance

- Full package production build: 9/9 tasks; final desktop production rebuild and
  Web lint/TypeScript/static export also passed.
- Desktop suite: 191 files, 3458 tests passed. The affected capture/TODO/buffer/
  diagram subset passed 91 tests. Obsolete wording/count/DOM-identity assertions
  were removed rather than pinned to the new layout.
- Real Chromium inspected production Org and Web surfaces plus the actual SDK
  component. Scoped synthetic Tauri IPC supplied two in-memory same-named files:
  exact CRLF/NUL/Unicode save, shared split undo/Ctrl+Y redo, rejected-save source
  retention, independent selection/scroll and operation-lock input were exercised.
- Eight canonical/slash/hash document routes produced no hydration or page errors.
  Actual paragraph/list/heading sizes, pointer reachability, mobile navigation,
  denied storage, cross-tab font updates and hash-preserving copy were observed.

This is browser UI/interaction evidence, not a new native Tauri window, OS
filesystem or platform WebView proof. No user documents or databases were used.
Product versions and the four paused completion/navigation files remain unchanged.

## Diary creation and quiet client text focus (2026-10-06)

This completes the diary/input iteration at Org node
`4b551696-dbb7-432e-889b-fee1da3c08a8`, not the broader Doom replacement goal.
Two implementation agents owned the diary and focus slices; two read-only
reviewers checked controller ownership and native publication safety.

### Fresh diary cutover

`planOrgDiary` uses the actual `~/.config/doom/diary.el` contract: Gregorian
zodiac year, local English month/weekday directories under `ا-diary/`,
`diary-<epoch-seconds>-HH-MM-SS.org`, a fresh UUID, and the exact LF header/body.
`createOrgFreshDocumentFlow` and `controller.createDiary()` replace the fixed-day
reopen helper. Ribbon, `M-x diary` and the `grain:create-org-diary` client event share
this flow. A successful entry opens at raw EOF. Legacy `diary/YYYY-MM-DD.org`
files are neither migrated nor changed.

Only a no-follow terminal-occupancy check **before staging** can produce
`CreationCollision` and the structured `{kind: "creation-collision", noWrite: true}`
receipt. It preserves occupied files, directories, binary bodies and symlinks
without reading their contents. The flow may try the next numeric suffix only
for this matching, proven-no-write receipt. Publication-time `RevisionConflict`
and other failures remain uncertain string errors, including `<missing>`
conflicts; they never authorize automatic retry or deletion of journal/stage
artifacts. Existing recovery owns those artifacts. No cross-process locking
framework or post-publication cleanup shortcut was added.

Exact capability, owner/generation, path safety and canonical dirty/history
guards remain on the creation route. A confirmed file cannot be reported as
opened after its original UI owner becomes stale.

### Text focus contract

Existing desktop base styles and Input/Textarea primitives remove outer text
outlines and ring shadows. Search/outline wrappers no longer duplicate the
focused field. Theme border/background/caret cues remain; non-text controls
retain keyboard focus. Invalid input retains its error text and destructive
border/background. Disabled/readonly behavior is not replaced by new handlers.
Forced colors use a 1px inset Highlight outline, Canvas background and
CanvasText caret; this is intentional, not a return of the normal outer halo.

### Exercised verification

- Desktop full suite: 191 files / 3470 tests passed. After removing remaining
  wording-only assertions, the affected 2 files / 21 tests also passed.
- Rust library: 232 passed / 1 ignored. The ignored case is the opt-in native
  temporary credential smoke, not diary coverage.
- `bun run tauri build --debug --no-bundle` passed, including `tsc`, Vite
  production build and the native executable. Chunk-size and ineffective
  dynamic-import warnings remain; no installer bundle was generated.
- The compiled production frontend/native backend ran through Wry/WebKitGTK in
  an isolated HOME/XDG/workspace. Actual ribbon, Alt-x and client-event actions
  created three same-second files with `-2`/`-3`, exact complete bytes, unique
  UUIDs and EOF caret. Directory occupancy selected `-2` without touching the
  directory; the legacy CRLF/Unicode file remained exact.
- Actual native dirty CRLF/NUL/Unicode source survived diary creation and
  switch-back; Ctrl-Z/Ctrl-Y restored the exact before/after source. Invalid
  paths and grants were rejected. Twenty-four native concurrent create requests
  produced one winner and 23 preflight collisions without overwriting.
- Actual native Light/Dark text focus, keyboard button focus and TODO textarea
  were observed. Production Chromium covered search/command/navigation,
  metadata/date, Capture and TODO fields, an accessible date error, readonly/
  disabled DOM-state probes and emulated forced colors. Chromium used a
  synthetic IPC fixture only for UI evidence, never as native filesystem proof.
- Native X11 smoke is not Chinese IME, native forced-colors, detached-window,
  cross-process crash recovery, macOS/Windows or measured performance proof.

Product versions and all four paused completion/navigation hashes are unchanged.
Own smoke windows, driver/preview services and isolated files were removed;
user documentation viewing services were retained. No user notes/databases were
used for smoke. The existing user client was not forcibly terminated.

## Ordinary notes, chronological Roam and source-side remarks (2026-10-07)

### Contracts and ownership

- Fresh ordinary `.org` creation uses the installed `org-note.el` header:
  property-drawer UUID, title/date/time, `:note:` tags, `elegant-book`, options,
  `* 内容`, and a trailing blank line. The editor opens at canonical EOF.
  Existing documents, symlinks and generated `-notes.org` files are not
  reinitialized as ordinary notes.
- Org-roam uses the installed chronological file+head contract under
  `ا-diary/year-YYYY-Zodiac/month-MM-English/day-DD-Weekday/`, with
  `note-<epoch-seconds>-<slug>.org`. The complete capture source is editable;
  the planned file UUID must remain unique. Editing TITLE or aliases does not
  retarget the captured filename. `C-c C-c` finishes, `C-g`/`C-c C-k` cancels.
  Invalid preparation stays editable; uncertain publication retains a
  copyable draft and confirmed files are never rolled back.
- One editor prefix authority consumes capture finish before validation.
  Repeated rejected/corrected finishes remain usable, modifier-only events
  do not break the chord, and any selected secondary range keeps native copy.
  Read-only CodeMirror content remains focusable with `tabindex="0"`.
  A confirmed capture resumes origin checks only after the owning Root's
  publication lock and writable editor projection have settled.
- Find/insert share file and heading nodes, aliases and live canonical source.
  IDs are literal, including `%`; descriptions follow the installed Org
  bracket rules. ID/CUSTOM_ID reveal targets are the entry/heading, not its
  property line. Narrowed marginal notes use the same file/ID link reader.
- Source-sibling `SOURCE-notes.org` owns every annotation edit and undo:
  mark region/word, zero-width line icon, important/idea/question/revise/quote,
  open, previous/next, change pen, remove and delete. Fresh sidecars use LF;
  existing raw layout, headings, drawers, custom properties and prose remain.
  Saved positions are one-based decoded-codepoint coordinates with CRLF
  normalized to LF, end-exclusive; live mapping uses the canonical source.
- Creation excerpt is immutable, not a checksum. Source-save synchronization
  updates only live coordinates and source line links. Valid stored anchors
  survive edited text and re-opening; a differing excerpt is diagnosed
  without guessing a relocation. Removing a highlight strips only
  `org-remark-*` properties, preserving CATEGORY and marginal prose. Deleting
  prose requires an explicit choice; cancellation changes neither file.
- Owned sidecar CAS receipts drain even if their preceding read was cancelled
  by Root busy transitions. A syncing slot cannot race its own metadata reload.
  A cached baseline whose revision differs from fresh workspace metadata is
  not installed as a fresh snapshot or repeatedly reloaded. Conflict/paused
  sidecars remain readable and copyable, but both mutation and save admission
  reject them until reconciliation. No retry, rollback or second writer.
- Popup close detaches only its window. Its canonical dirty buffer/history and
  close protection remain. Removing the currently displayed entry widens the
  existing notes window without remounting it or replaying old focus intent.
  Same-source split windows share anchors; fold visibility and navigation are
  window-local and cannot reveal hidden remarks.

### Exercised verification and limits

- Desktop full suite: **201 files / 3662 tests passed**. Permanent Root/real
  CodeMirror regressions cover repeated capture finish, publication settlement,
  heading-ID landing, narrowed link reading, deferred source-save synchronization,
  open-entry removal focus, stale sidecar metadata and paused-save admission.
  Obsolete property-line, excerpt-checksum and diagnostic-wording expectations
  were removed rather than repinned.
- `bun run tauri build --debug --no-bundle` passed, including TypeScript and Vite.
  The installed Emacs confirmed the ordinary/chronological and sidecar contracts;
  a heading ID resolved to its heading line 8 rather than property line 10.
- The compiled native Wry app ran in an isolated HOME/XDG/workspace, with real
  capability-qualified filesystem commands. Actual keyboard workflows exercised
  ordinary creation/EOF, capture cancel and rejected/corrected finish, edited
  TITLE/alias find and insertion, single source undo, ID follow/backlinks and
  `file::13` return, every remark command, marginal prose save/undo, source
  coordinate synchronization and immutable excerpt, split/fold navigation,
  remove/delete confirmation and focus preservation. Light-theme pen rendering
  and the actual read-only conflict surface were visually inspected.
- A real directory-permission write failure retained the canonical sidecar draft,
  dirty/paused/conflict flags, readable notes and unchanged source. Restoring the
  directory mode did not authorize another annotation command or `Mod-S`.
  A real native stale-revision CAS rejected publication after another sidecar
  version; metadata refresh remained interactive and preserved the old canonical
  draft instead of overwriting it. Closing/reopening the popup preserved that
  same protected buffer.
- This is not real Chinese IME, astral typing, native ACK-loss, detached-window,
  cross-platform/inode-race, crash-recovery or performance acceptance. Requested
  astral `sendKeys` input was absent in the observed source; its cause was not
  diagnosed. Existing astral source, accented/CJK text and codepoint boundaries
  were exercised. Lost-ACK behavior is covered by the existing controlled
  filesystem-boundary consumer regression, not claimed as a native transport
  fault. Rust tests were not rerun for these TypeScript changes.
- Versions, permanent permissions/dependencies and the four paused
  completion/navigation files remain unchanged. Real user Org/DB/auth data and
  the user's native/doc-viewing sessions were not used for smoke.


## Per-buffer inactive autosave (2026-10-07)

The active-only autosave restriction above is superseded for ordinary open Org
working copies. Each canonical runtime has a monotonic quiet-input deadline,
reset only when its source generation changes. Focus changes, another buffer's
typing and time spent behind a file effect do not reset that deadline. Retired,
clean, paused or conflicted candidates leave the schedule.

The existing workspace claim remains the serialization boundary. The earliest
eligible deadline admits one captured save; settlement allows the next eligible
buffer to proceed. This does **not** implement independent concurrent file-effect
owners, detached/native editor transport or a second body writer. Cross-buffer
focus during a busy effect still follows the existing defer/read-only policy.

`saveDocumentPathWithResult` routes active and parked ordinary saves through the
same `saveOrgWorkingCopyFlow` and pure baseline/ACK planner. Admission and terminal
checks bind the originating grant/session/activation, logical buffer ID and exact
runtime incarnation. A confirmed parked receipt advances its current baseline
without replacing later working input or canonical history. Inactive close keeps
its additional exact-retirement protocol; autosave never closes a buffer.

Ordinary save settlement now includes the captured path as well as source.
Navigation/new-file continuation compares source only when that save belongs to
its origin file; another buffer's captured body is not a checksum for the current
editor. Batch settlement remains distinct and uses `Promise.withResolvers`.

An automatic write failure latches conflict/pause only on its own path. Other
eligible buffers continue through the serial owner. Restoring directory mode or
typing again does not republish the paused draft; explicit successful save or
reconciliation is required. Aggregate close protection still includes inactive
and unresolved working copies. The schedule stores no restart body journal.

Exercised evidence:

- Four consumer regressions failed before the cutover, then passed: independent
  quiet deadlines, parked tail input/undo across a deferred ACK, per-path failure
  isolation, and navigation while a different file's save settles.
- Full desktop suite: **201 files / 3665 tests passed**, including existing
  grant/ABA, projection, baseline-drift and terminal/finally cases. The obsolete
  active-only policy test was removed; a global writer-count assertion was
  replaced by the actual protected-path no-retry boundary, not re-pinned to a
  new incidental count.
- `bun run tauri build --debug --no-bundle` passed TypeScript, Vite and native
  compilation. Rust source was unchanged; Rust tests were not rerun.
- Own compiled native profile: actual typing/switching left inactive A dirty on
  disk before the fix. After the fix, A saved while B continued receiving input;
  B remained dirty until its own quiet period, retained exact source and focus,
  and then saved. A's real one-step undo/redo after its ACK preserved B's body.
- A real read-only parent-directory failure retained A's dirty/conflicted draft,
  while B saved and retained focus. Original mode was restored in `finally`.
  More A typing across its deadline kept the old physical file; actual
  Ctrl-Shift-S confirmed Save All, cleared pause/conflict, preserved source
  generation/focus and exercised native batch settlement.
- The paused native surface was visually inspected. This is not real IME,
  native ACK-loss, detached-window, restart-recovery, latency/memory or
  cross-platform/inode-race acceptance. User data and user client/doc sessions
  were not used; versions, permanent permissions/dependencies and the four
  paused completion/navigation files were not changed.

## Declarative Capture and non-authoritative draft recovery (2026-10-07)

The D155 workflow now runs from user JSON configuration through ordered
minibuffer prompts, editable scratch, read-only target preview and scoped Finish.
It does not add a Lisp interpreter, shell/template includes, second body writer,
native permission, dependency or version change.

### Configuration and literal expansion

- Settings → Editor → Org Capture validates `{version: 1, templates, draftRecovery}` before
  storing it. Blank text retains the existing TODO/note inbox templates; invalid
  nonblank or malformed persisted data remains a discoverable error, not a
  fallback. Unknown fields, duplicate IDs and invalid paths/shapes are rejected.
- Each template declares `id`, `label`, `entryType`, `target`, and `source`.
  Entry types are `entry`, `plain`, `item`, `checkitem`, and `table-line`.
  Targets are an approved relative `.org` file, exact heading path, or datetree
  optionally beneath an exact heading path. Datetree date comes from the frozen
  local Capture context, not configuration or the later Finish/recovery clock.
- A single token scan supports `%?`, `%t/%T/%u/%U`, `%%`, `%i`,
  `%a/%l/%L`, `%f/%F`, sequential `%^{prompt|default|candidates}`, numbered
  answer references, and `%<FORMAT>`. Supported date directives are
  `%Y %y %m %d %e %H %I %M %S %a %A %b %B %p %F %R %T %%`.
  Inserted answers and Source bytes are literal, including percent forms.
  Functions, external includes, executable forms and unsupported escapes fail.
- Time, target-relative escaped annotation, file names, raw contiguous Source
  region and exact originating window are captured before the first prompt.
  `%i` retains LF/CRLF/CR and indentation; discontiguous Source selections are
  rejected only when the selected template requests `%i`.
- The first `%?` becomes a raw UTF-16 scratch caret, not text. Structural draft
  validation permits an empty entry title/list body/table cell while editing;
  Finish requires meaningful content. A native table prompt initially exposed
  a false row inserted by the validation probe; the zero-width caret now stays
  zero-width during both validation and rendering.

### Target and publication boundary

- Preview scans/reads only: no canonical buffer allocation, directory creation
  or content write. Exact heading ambiguity and invalid/unsorted datetrees
  reject. Entry insertion shifts legitimate heading stars only; literal blocks,
  existing raw bytes, line endings and EOF shape remain unchanged.
- File entry/plain targets append at file EOF. Heading-body list/table captures
  use the first eligible container before the first child heading; file
  list/table targets stop at the first real heading. Missing list containers do
  not invent a paragraph separator. Missing tables create Org's empty header
  and divider before the captured row; existing tables are not realigned.
  These container rules were compared with the installed Emacs 31.1 Org source
  and actual batch Capture output, not inferred from visual formatting.
- Finish rechecks current grant/session/origin, source and target revision,
  creates missing parent directories under that same native grant, and issues
  one captured CAS content write. Known prepublication rejection preserves an
  editable scratch; uncertain content publication preserves a readonly copy
  and disables keyboard/button retry. No rollback is claimed.

### Opt-in recovery and confirmation

- Default-off recovery touches no saved draft bodies. Enabled plaintext local
  storage is root-scoped and contains only validated template/target/body,
  cursor, time/status and optional revision metadata. No grant, callback,
  filesystem authority or automatic content replay is persisted.
- Explicit Resume after native restart uses a newly approved grant and fresh
  target preview. Frozen expanded time/target and literal edited body remain
  unchanged. Publishing/uncertain checkpoints cannot become editable by a
  failed update; invalid records remain visible errors rather than discarded
  data. Quota/checkpoint errors refuse publication before the native writer.
- Unknown ACK remains readonly after restart. Explicit journal deletion removes
  only recovery metadata; the copy and real target do not become rollbackable.
  Refreshing a recovered stale preview requires explicit reconciliation.
- Native smoke exposed Tauri's async replacement for `window.confirm`: treating
  its Promise as a boolean deleted saved drafts before any accepted decision.
  Capture recovery revocation, uncertain draft deletion and reconciliation now
  use the existing real application dialog. Cancellation changes no permission
  or journal; revocation deletes only owned keys without reading draft bodies
  and changes permission only after confirmed deletion succeeds.
  Workspace/router/delete/migration/index and native-close consumers now use the
  application confirmation protocol described below; no synchronous native fallback remains.

### Observed verification and limits

- `bun run test`: 206 files /3867 tests passed after the Capture dialog fixes.
  `bun run tauri build --debug --no-bundle` passed TypeScript/Vite/native build.
  Rust source was unchanged and Rust tests were not rerun.
- Isolated compiled-native UI and real Org files covered strict settings
  rejection, two sequential literal prompts, all five entry types,
  file/heading/datetree placement, raw CRLF/astral Source region, frozen clock,
  exact Source selection/focus and empty Source undo after Finish.
- Real native restart preserved editing metadata without auto-presenting or
  writing it. Explicit Resume obtained a different native capability; missing
  datetree parent directories remained absent until explicit Finish, then two
  native directory creates preceded one CAS.
- External target modification rejected Finish before the native writer;
  injected native Storage quota failure preserved the old editable checkpoint
  and body without a content write.
- ACK-loss smoke let a real native CAS finish once, observed its successful
  response, then replaced only that response with an error at the native IPC
  transport boundary. Readonly uncertain state survived a second real restart;
  Mod-S/C-c C-c did not retry and the physical target stayed at the one write.
- Real application-dialog cancellation retained recovery permission/journal;
  explicit revocation removed only owned metadata with zero journal-body reads.
  The readonly uncertain surface and permission dialog were visually inspected.
- WebDriver did not deliver astral prompt keystrokes; existing astral Source
  bytes and raw positions were exercised, not actual IME/astral typing.
  General buffer recovery, detached/native file owners, full Org table/Clock/
  Export/Babel semantics, full C/E configuration and extension ownership,
  authorized legacy DB, cross-platform/inode races, performance and daily Doom
  replacement remain open. User Org/DB/auth and user client/doc sessions were
  not accessed or closed; the four paused files remain protected.

## Verified session/effect snapshot and confirmation cutover

`useOrgWorkspace` subscribes to both owners with `useSyncExternalStore`. Source,
baseline document, dirty state, active runtime, session and loading/saving are no
longer independent React state mirrors. The session issues one frozen scope per
lifetime; reconstructing the same grant/session pair does not confer authority.
The remaining request IDs and UI/catalog state are adapter state, not body writers
or filesystem baselines. The render-time live-workspace ref has been removed.

All four save ACK adapters use `acknowledgeWorkingCopy`; active/parked baseline,
logical ID and canonical-source checks share that policy. Confirmed Capture,
transfer and external-refresh bodies use `installConfirmedTarget`. Concurrent
input/history remains canonical; confirmed baselines and reconciliation protection
are published atomically. Raw baseline/body setters are private to the session.
Registering a window grants a live, exact scope/runtime/path lease: only that path's
conflict/pause prevents its use, and confirmed reconciliation can restore it.
Discard approvals instead capture strict source/protection generations, including
ABA transitions, and cannot revive after state returns to the same visible value.

Captured-save publication notifies subscribers when typing becomes safe. A
save-close claim permits newer canonical input but cannot be borrowed by ordinary
save/navigation intents; retirement still checks the accepted copy's identity.
Stale finally handlers cannot release newer claims. A committing parameter may
publish its own source revision before its async result settles; revision drift
alone does not retire that commit, while grant/window/lifetime drift still does.
This keeps cross-file Refile completion/focus correct under synchronous snapshots.

`ConfirmProvider` has one abortable pending decision. Cancellation, Escape,
dismissal, lifetime retirement and provider disposal resolve false; only explicit
acceptance resolves true. Native WM close is synchronously prevented first,
singleflight while deciding, blocked while effects are Busy, and destroys the
window only after a fresh exact discard permit. Cancel returns to the surviving
Editor/scratch origin without stealing later external focus; Source selection is
not rewritten. No `window.confirm` fallback or new native permission is used.

Observed verification: **210 desktop test files / 3963 tests passed**, plus the
actual **0.1.604 debug native build** (`tsc`, Vite and native compilation). The
isolated Linux native smoke held one real successful filesystem CAS response:
its SHA-256 matched the captured receipt while later keyboard input remained
editable. Releasing the ACK retained that input and reverse selection; actual
canonical undo and Mod-Y redo retained the two input groups. A real WM-close
request during Busy made no dialog/write and retained the window. After a real
permission-denied autosave, restoring the owned directory caused no automatic
retry; Keep editing returned exact body, selection and Source focus with no write.
The application dialog was visually inspected.

The manual-retry observation harness failed after its native publication; that
frontend ACK is not claimed as proof. Instrumentation was removed and owned
permissions restored. The following continuation provides later native-window, IME and
modal-input evidence; full Org semantics and general unsaved-buffer recovery
are not claimed by this earlier snapshot/confirmation cutover.

## Native input, protected transfer and compiled-extension continuation

The production opt-in Vim adapter is selected by version-1 Org keymap
configuration, not the experiment's lossy editor adapter. Linux GTK/XIM delivered
`repeat: true` on the first X11-injected ASCII key. Combining repeat suppression with
native/IME input protection incorrectly bypassed Vim altogether. Repeat now
guards configured command producers separately: composition/229/AltGraph and
consumed events still protect input; repeated unbound modal keys reach Vim.

Earlier native X11-injected operator/register/macro/text-object/visual/block
evidence used targeted `xdotool --window` XSendEvent, not XTest. A later owned
compiled session verified window PID/focus, physically clicked Source, and used
`xdotool key/type` **without `--window`**: actual XTest `dw`, dot/count, named
registers, macro replay, `diw`, visual/block deletion, insert-session Undo and
whole-astral deletion all restored exact Source through canonical history.
First ASCII events still had `repeat: true`; modal handling did not discard them.
One native Undo took 170 ms to publish; an immediate observation is not an ACK.

Actual Fcitx5 Rime showed the native `o` preedit/candidate window while Source
stayed exact, committed `哦` through trusted `insertText` in verified Vim insert
mode, and one awaited canonical Undo restored Source. Cancellation emitted no
new Source input; Vim correctly remained in insert mode until a separate Escape.
GTK/XIM did not emit DOM composition events in this route. This proves real
preedit/commit/cancel, not synthetic composition or full `nihao` conversion.
Separate real two-webview X11 typing/clipboard/Chinese input and peer Undo/Redo
retained shared Source when closing the detached view. These observations do
not qualify macOS/Windows, all lifetimes or every modal command.

An owned cross-file Refile physically published its target copy before source
removal failed with a read-only parent directory. Disk Source stayed exact;
both paths were protected and the possible duplicate was reported without
rollback. Source Review cancellation restored all three canonical selection
ranges, direction/association/bidi/goal-column metadata and Source focus.
Explicitly adopting unchanged Source cleared only that path; the target stayed
protected. The multi-range fixture used CodeMirror's public selection API,
not a claimed physical multi-selection gesture.

A fresh target Review was immediately retired by unchanged native scans.
The scan adapter unnecessarily called `protect` again, incrementing protection
epoch despite an already-latched mismatch. Reobserving that same latch now
avoids a new protection event; genuine uncertain mutation still revokes consent.
The regression failed before and passed afterward. Actual post-fix target
reconciliation remains a separate native observation, not inferred from tests.

Trusted compiled extensions expose captured transforms, read snapshots and
revocable command/tool registrations through the existing authorities. They
are neither a sandbox nor a runtime TypeScript loader. Accepted canonical work
drains after unload; stale captures/configuration, Source ABA, retired origin
and unowned effects are rejected. Unloading cannot close a root grant or shared
buffer; dirty retired tool text remains copyable. GNU Babel result acceptance
awaits the actual canonical acknowledgment before reporting applied; held
accepted/refused acknowledgment was exercised through the real API. Independent
GNU Org fixtures cover headers/variables/noweb/cache and raw result replacement;
they do not authorize executing arbitrary historical or user code.

Verification in this continuation: three targeted editor/prefix files,
141 tests passed; seven targeted transfer/migration/codec files, 57 tests passed.
The physical Vim/IME observations used the successful native debug build
preceding the repeated-scan fix and exact workspace-graph recovery cutover.
A later full-suite/build and actual new-native observations are still required.

## Current native graph recovery and hot-path evidence

The completed pre-parameter-integration wave passed 232 desktop files/4,404 tests,
TypeScript/Vite compilation, 283 Rust tests including the installed GNU clock/NLS
oracles, and native debug compilation. Native collation now uses GNU's actual wide
`wcscoll_l` primitive: an owned PUA/noncharacter comparison that narrow `strcoll_l`
got wrong is equal in GNU, the native bridge and the actual Sparse Tree surface.
Native FILE values use the full approved Root plus relative path. Actual CLOCKSUM
query recomputation followed a Source endpoint edit and one canonical Undo.
Ambiguous/nonexistent local times remain visible refusals, not guessed exact GNU
encoding; normalized unambiguous calendar endpoints and 23/25-hour days were exercised.

The authorized newly copied historical profile completed the actual source chooser,
explicit Migrate confirmation, Verify and recovery drill in the sole shared host.
The native version-2 bundle reconstructed one workspace, six nodes and two raw rows;
its SQL executed in an initially empty private database and every selected workspace,
node/content tuple and content type compared equal. Reopening the owned native app
used the saved approved Root with a different grant. The old grant was rejected,
the recovered bundle was exact and native verification checked six artifacts with
zero mismatches. Historical original bytes were accessed only through pinned read-only
descriptors, never SQLite. Recorded hash/identity/size/mtime and absent sidecars were
unchanged; no unchanged-atime or entire-database/users/settings recovery claim is made.
Evidence: `local://grain-historical-native-graph-v2-recovery.json`.

True focused XTest on the same 2,096,567-byte/60,003-line/12,000-heading fixture,
20 additional buffers and 1,000 catalog files produced five serial samples
300/233/221/227/248 ms keydown-to-second-rAF, median about 233 ms and p95 300 ms.
All five characters and one canonical Undo were exact; maximum rAF gap was 294 ms.
The before median/p95 was 3,274/5,868 ms. This is still slow. WebKit process RSS was
828,832 KiB; no heap/leak, hardware-to-paint or longtask claim follows. The actual
engine `data-modal-mode` was insert while the shared status remained NORMAL:
presentation retirement/arbitration is being corrected, not used as mode proof.
Evidence: `local://grain-native-focused-xtest-performance-after.json`.

These physical observations predate the new native Source parameter/date/logging
wave. The old child still refused parameter commands; implementation and regression
fixtures are not a substitute for the new compiled child/window-local/cancellation
proof. Full GNU prompt/logging/Agenda behavior, all B–F lifetimes and daily acceptance
remain separate work, not completed by these bounded observations.

## Next decision gates and work

1. Inventory actual Doom workflows and non-negotiable behaviors.
2. Qualify native retired-producer/late-effect and cross-platform lifetimes beyond
   the now exercised independent A/B receipts, child rebind, exact multi-range
   history, Attach/Close and child-local folds. Rust IO remains globally serialized.
3. Complete the required command-ingress/input/Ex and Org workflow gaps:
   captured child-origin producers, Refile context/logging, identified Root Clock,
   table navigation/recalculation, GNU regexp atoms and inline/CALL execution.
4. Remeasure large-file/multi-buffer/large-workspace input, switching, completion,
   memory and event-loop stalls after the latest sidebar/inspector hot-path changes.
5. Expand native declarative Agenda/popup and compiled-extension acceptance without
   another dispatcher, writer or implicit shell permission.
6. Exercise current-version descriptor publication/recovery through the actual
   native process, including crash/restart. Retained mutable original/stage/journal
   objects remain recoverable names, not immutable or authenticated body backups.

Do not equate outline filtering with body sparse-tree visibility, basic TODO
cycling with state logging, or timestamp insertion with a complete date reader.
The opt-in Capture scratch journal above is explicitly non-authoritative;
general unsaved-buffer restart recovery remains open. Neither may silently
overwrite the real Org file. The native publication journal recovers only
identity-owned filesystem artifacts, not unsaved editor or Capture bodies.

## Independent file owners and literal tool output acceptance

The pre-command/Org completion wave passed 185 desktop files / 3,963 tests,
TypeScript/Vite and native debug build; Rust passed 283 tests, with four ignored.
These results do not qualify the subsequent required C/D integration edits.

Actual Linux/X11/WebKit Source acceptance kept a real A save receipt after native
publication while independent B completed. New A input survived its older ACK;
child/Main Undo/Redo, two ranges, rebind, Attach/Close and local folds were exact.
The held receipt was unmodified; there is no parallel native disk IO claim.
Evidence: `local://grain-native-independent-file-owners.json`.

An actual native readonly export preserved literal CRLF/NUL/astral text and its
bounded Ctrl-A selection after declining a dirty close. Plain clipboard output
was observed to truncate at NUL; Copy now refuses that lossy representation.
Explicit UTF-8 hex clipboard text decoded to all 60 original bytes. This exercises
live-producer close/selection, not native producer unload; real producer-unmount,
accepted draining and StrictMode retention are currently integration evidence.
Evidence: `local://grain-native-literal-clipboard-before.json`,
`local://grain-native-literal-output-after.json`.

The descriptor audit now rehashes retained and named original/stage objects and
journal meaning around preparation/publication/retention/ACK. Regression coverage
includes original drift/missing originals in v1/v2/v3, late stage drift, and
same-inode journal meaning changes. It does not authenticate a coherently replaced
unauthenticated journal before fresh discovery or prevent writes after the final
observation/ACK. Completed inventory retains names and introduces no replay/GC.


## Current command, Clock and literal native consent verification

The shared captured application command registry is the only ingress for M-x,
header actions, Source keys, Note actions, Which-Key and native-child workflow
dispatch. Application commands and parameter sessions share the single minibuffer
host; cancellable reads, draining accepted effects and unified results/echo retain
their actual origin. Real native Quick Open, Calendar acceptance, Clock and
historical command workflows exercised this ingress without SDK replacement.

A captured Clock report now compares the live grant/root/session and runtime,
not a newly materialized workspace metadata object's identity. Actual native
catalog discovery plus Refresh preserved the exact literal report and enabled
Return to the original raw Source, selection and focus. Source edits still
retire the report's return permit. Installed GNU `org-clock-cancel` also removes
an enclosing empty drawer; the shared planner now does this in one original-range
batch while preserving notes, completed rows, property metadata and raw body bytes.
Actual native cancellation removes that empty drawer; one focused Undo restores
the running clock and a second restores the exact original CRLF/NUL/astral Source.

Native Babel exposed a genuine `rfd 0.16.0` GTK varargs crash: the secondary-text
format argument was the disclosed data itself. The pinned MIT runtime source
in `patches/rfd-0.16.0` uses literal `"%s"` and is selected by all three Cargo
roots. Upstream provenance is commit `5d32eec3a7930eb43b7e864eb773831bbd3d91b4`;
the registry source was not modified. See the [GTK format contract](https://docs.gtk.org/gtk3/method.MessageDialog.format_secondary_text.html).
Actual GTK tests preserve `%s`, `%n`, `%%`, Unicode and complete long disclosure
text. Overflowing native message bodies are selectable scroll regions rather
than clipped data or off-screen actions. The real first post-format-fix Babel
prompt survived, but was 2,379px high on a 2,160px display; focused Escape produced
`cancelled-before-start`, with exact Source unchanged. After the layout fix,
actual 630×578px GTK prompts disclosed complete scrollable input and accepted
physical **Run exactly once** for a block, inline source, `#+CALL` and a table.
Each returned a real GNU Emacs exit-zero receipt without changing Source.
Explicit Apply changed only the reviewed raw range; one focused native Undo
restored the exact baseline. Dirty output close retained the draft until
explicit confirmation. These are native workflow results, not constructor tests.

Actual Settings validation also rejected an unknown keymap field, disabled Save
and exposed the diagnostic. A persisted `org-source` `A-t` binding changed a
TODO through the common command ingress; one native Undo restored exact Source.
The private test profile's previous configuration was then restored.

The fresh explicit-mode historical `/history` UI has now been exercised through
the actual compiled app and metadata selection: six graph rows, two raw-body
containers, one selected workspace, zero editing controls/forms/non-selection
buttons/alerts. Only numeric evidence was recorded; the authorized inode-isolated
copied source retained exact hash, size, inode and mtime, without SQLite sidecars.
This completes desktop legacy/Lexical exit verification, not whole-DB coverage.

Verification: desktop 191 files / 4,157 tests; core 297 passed / four unit tests
ignored (`--lib`); actual GTK literal/layout tests 2 passed. The earlier fourteen
ignored doc examples were not rerun by the current core command. TypeScript,
Vite and the embedded Tauri debug build also passed; native evidence below
belongs to the exercised build, not every later rebuild or cross-platform host.
Evidence: `local://grain-native-clock-return-cancel.json`,
`local://grain-native-babel-block-after.json`,
`local://grain-native-babel-inline-after.json`,
`local://grain-native-babel-call-after.json`,
`local://grain-native-org-table-after.json`,
`local://grain-native-declarative-keymap.json`,
`local://grain-historical-readonly-native-ui.json`.

## Current scoped-input, recovery and native-picker verification

An unmatched transient suffix now continues through the most-specific configured
mode binding before modal/native fallback. A provider-level popup A→B→A regression
also exposed lost batched policy transitions; the existing registry now receives
every saved transition synchronously, preserving the established close fences.
Both regressions failed before their fixes and passed afterward.

Actual native Refile refused an exact-path unpublished directory collision without
protecting either path or editing Source. A real target-copy/source-permission
failure protected both paths. Cancel and post-review occupation refused absence
acknowledgement; a fresh authorized missing-unopened review released only the target.
Missing retained Source likewise refused occupation, then native create-CAS preserved
CRLF/NUL/astral bytes and canonical typing Undo/Redo. Explicit manual CAS Save cleared
the remaining source protection. No transfer was retried or destructively rolled back.
Retained-Source copy now uses the existing NUL refusal/read-only UTF-8 hex pattern.
Native UI and exact hex decoding were exercised; the automation's GTK clipboard
consumer obtained no selection even for ASCII hex, so no OS clipboard round-trip
or pre-fix native NUL-truncation claim is made.

Public workspace selection exposed a genuine GTK main-thread deadlock in the
synchronous `blocking_pick_folder` command. Its blocking picker and approval/scan
now run in the existing owned-worker pattern. The rebuilt native picker appeared,
left the webview responsive, cancelled without changing Source or selection, and
explicitly approved the exact newly owned root. The capability policy is unchanged.

A throwaway real-API extension scenario exercised 24 assertions using production
`OrgEditor.captureSourceTransform`, real canonical buffer/history and both registries:
atomic edits/Undo, revision ABA, contributor ownership, cancelled reads, accepted
work drain, dirty read-only retention, and stale callbacks after same-ID replacement.
This is real-runtime/jsdom evidence, not a TypeScript sandbox, native IO or IME claim.

Evidence: `local://grain-native-refile-directory-nowrite.json`,
`local://grain-native-refile-real-partial.json`,
`local://grain-native-refile-missing-target-after.json`,
`local://grain-native-retained-source-create-after.json`,
`local://grain-native-retained-source-clipboard-control-limit.json`,
`local://grain-native-workspace-picker-before.json`,
`local://grain-native-workspace-picker-after.json`,
`local://grain-compiled-extension-runtime-after.json`.

Current configured native controls also exercised Source `C-c` → `Alt+t`
fallthrough to the most-specific mode binding, one exact canonical Undo,
`Ctrl+l s` opening the full Schedule reader, reader priority over `Alt+t`, and
unmatched printable suffix insertion/Undo. All four settings categories rejected
invalid drafts with disabled Save and discoverable errors; explicit valid saves
left all three owned Org files unchanged.

Configured Agenda actually docked at the side with Source visible and ran the
explicit named undated TODO view. Configured Capture opened a nonmodal popup with
an independent memory-only CodeMirror body. Keep draft retained its exact body,
window and backward selection; confirmed close from the focused tool restored
the exact Source selection and focus. A cancelled Settings route retained the
draft; after that user-selected navigation focus, close did not steal focus from
Settings. Numeric range comparisons are used; JSON object key order is not a
selection invariant. Evidence: `local://grain-native-current-keymap-priority-after.json`,
`local://grain-native-continuous-settings-after.json`,
`local://grain-native-current-popup-close-after.json`,
`local://grain-native-current-popup-route-cancel.json`. A real process restart
retained all five exact saved configuration values; evidence:
`local://grain-native-continuous-settings-persistence-after.json`. Real client
composition history is exercised below; full Vim/input and Org-chain acceptance
remain open.

## Native permission fence and durable transaction resolution

The native enable preflight previously raced a completed disable before `spawn`.
A runnable smoke including the production registry reproduced a real child,
marker and exact stdout/stderr after disable. The permission mutex now covers the
final enabled check, approved cwd lease, output reservation and actual spawn.
A completed disable rejects stale preflight without a child, receipt or outputs;
an already accepted spawn finishes that boundary before disable returns, then
drains outside the fence. Disabling is not cancellation. Poisoned state reports
failure rather than a successful enable. Evidence:
`local://grain-native-execution-fence-before-after.json`. This is production-component
runtime evidence, not a native Tauri consent-dialog claim.

An observed held-FD stage mutation after retention also reproduced a denied ACK
that recovery had incorrectly skipped. Save, recovery and delete now retain an
unresolved `.grain-retaining-*` directory until the shared final resolver has
observed the bodies/journal and constructed the response. Successful resolution
uses a `.grain-resolved-{original,deleted}-<device>-<inode>-<suffix>` identity witness;
reopen validates that directory identity without freezing legitimate later edits.
Rejected final validation/barriers preserve an unresolved guard instead of rolling
back, replaying or deleting the live target. The regression failed before the fix;
the integrated core run passed 297 tests with four ignored, including repeated
reopen, crash, held-FD mutation, delete reappearance and terminal substitution.
Evidence: `artifact://2777`, `artifact://2786`. Journal versions 1–3 remain readable.
Legacy terminal names cannot distinguish historical success from a historical
post-retention rejection; the fix does not retroactively resolve that ambiguity.
This is not immutable storage or atomic byte CAS: later held-FD writes and storage
failure while persisting an unresolved guard remain explicit physical limits.
Current rebuilt native held-FD/crash/restart scenarios still require their own proof.

With an owned window manager and working WebKit compositing, an XDamage/XGetImage
probe observed actual changed Source glyph pixels after guarded XTest input.
One small-file sample was 91.323 ms from X-server input request to drawable readback,
with exact Source acceptance and one exact canonical Undo. This upper bound includes
observation overhead; it is not hardware input, scanout, a second-rAF proxy, a p95,
or full large-workspace performance acceptance. Evidence:
`local://grain-first-native-source-raster.json`.

## Native client preedit and canonical composition history

The production GTK webviews now explicitly enable client preedit, including newly
created native Source windows. The actual non-automation WebKit inspector observed
trusted Fcitx5/Rime composition events, `ni hao` preedit, and committed `你好`.
Before this policy, engine candidates alone did not prove DOM composition priority.
During actual preedit the configured `C-l` leader no longer opens Planning.

Composition checkpoints use the same canonical Source state. Provisional accepted
text remains visible to mirrors but does not enter history; settlement records one
minimal net input against the checkpoint. A zero-net cancellation preserves both
prior Undo and Redo and restores the original selection. Canonical Undo/Redo, a
foreign operation and view retirement seal accepted Source; they never delete and
reinsert the body, grant a mirror authority, or create a second editor history.

The real main Source accepted ordinary `P`, cancelled `ni hao`, and kept `P` until
one Undo removed it. One Undo/Redo of committed `你好` restored exact baseline/commit;
an acknowledged following `S` had its own Undo, then the next Undo removed only the
IME commit. Selection, focus and INSERT remained exact. The independent native
child repeated commit/Undo and cancelled preedit without destroying Redo. Main
mirrored each accepted state. Closing only that child retained its committed Source,
then one main-window Undo restored baseline. Evidence:
`local://grain-real-native-composition-history-after.json`,
`local://grain-real-native-detached-composition-history-after.json`.

History correctness is not full Vim acceptance. A separate actual, untouched
`i` → `你好` → acknowledged NORMAL → `.` reproduced a no-op repeat, because the
adapter treated its own composition history group as a peer edit and discarded
upstream input recording. Evidence: `local://grain-real-native-ime-vim-repeat-ready.json`.
Rime can consume the first Escape; a period sent before the actual NORMAL gate is
ordinary inserted text, not a repeat oracle. The consumer fix must record only net
committed local input, exclude preedit/cancel/peer changes, and keep canonical
history separate. Its rebuilt native dot/macro proof remains open.

Native high-permission proof also exercised the literal GTK one-run consent:
explicit Deny produced no child/marker; a captured request approved only after
completed disable was refused without a spawn; an accepted child drained after
disable and retained its exact stdout/protocol receipt. Raw output remained readable
while disabled. Source was unchanged by Run; stale source revision correctly
disabled Apply even after body ABA. This does not prove a fresh Apply/Undo.
Evidence: `local://grain-literal-native-stale-consent-after.json`,
`local://grain-literal-native-accepted-drain-after.json`,
`local://grain-literal-native-retained-receipts-after-disable.json`.

The public Org behavior help no longer advertises parenthesized GNU tag terms as
grouping. In the actual Sparse Tree reader the old example displayed all three
owned headings, including an untagged one. `match:work+EFFORT>=2|home+EFFORT>=2`
and `match:(itag:work OR itag:home) AND EFFORT>=2` each displayed only the intended
`home` heading while retaining exact Source. GNU partial-tail behavior is unchanged;
only the help distinguishes the two existing grammars. Evidence:
`local://grain-native-sparse-help-before-after.json`.

## Default compiled bottom tools and current filesystem boundary

Unconfigured non-main compiled producers now use the same bounded dock as configured
tools, instead of accumulating unbounded inline bodies beside Source. Main producers
remain inline. The aggregate bottom dock is capped at 65% of the viewport; individual
frames scroll, preserving Source and the application footer.

The actual native surface opened two default Babel tools from distinct blocks.
With the first complete immutable disclosure expanded, Source retained a 124-pixel
viewport. Both interpreter/environment fields were physically edited; the second
field at y=720–774 had actual focus and its center hit the field, not a footer overlay.
Return source restored focus and exact selection with both tools open and Source
unchanged. No code was Run for this layout scenario. Evidence:
`local://grain-native-two-default-bottom-tools-after.json`,
`/tmp/grain-xvfb-native-isolation.3frApS/native-two-default-tools-after.png`.

An actual debugger fence on the original native migration reproduced two filesystem
failures without replacing the sealed SDK: its identity-checked temporary was retained
under another name and a foreign sole entry installed at the soon-to-be-unlinked name.
The production `unlinkat` deleted that foreign entry and migration still acknowledged
success. Separately, one staged installed inode was changed in place to different
same-length bytes at the final no-clobber root rename; success acknowledged the old
input-derived hash, while the actual native verifier reported the changed hash.
Evidence: `local://grain-native-migration-foreign-cleanup-before.json`,
`local://grain-native-migration-same-inode-false-ack-before.json`. The debugger changed
scheduling, not program logic; all roots and artifacts were private owned fixtures.

The source fix removes destructive migration cleanup/rollback, retains stages, binds
Linux publication to retained-file links (Darwin uses a bounded retained-file copy),
and observes reachable directory/file identities and actual expected hashes before
ACK. Raw artifact verification uses a fixed buffer and finite captured-length read;
acquisition rejects changed entries, symlinks and non-regular files with nonblocking
Unix opens. Active-write markers are classified before directory filtering in both
supported and unsupported recovery. The integrated core run passed 317 tests with
four ignored, including a genuine captured journal replaced by file/symlink and
retained-FD/namespace/body boundaries. The later eight-lane acceptance below supplies
actual Linux native race-after proof, not Darwin/Windows execution. Later held-FD writes
remain a physical, non-atomic observation limit, not byte CAS or immutable storage.

The IME consumer and quiescent-settlement repair passed 55 targeted tests; the
configured desktop suite passed 191 files/4173 tests with two workers. The unconstrained
default-worker attempt timed out and is not passing evidence. Host observation showed
5851 MiB available and all 4095 MiB swap used; a sole timeout cause was not established.
TypeScript/Vite built successfully; the existing >500 kB chunk warning remains.
The later eight-lane acceptance below supplies rebuilt native IME and filesystem proof.

## Eight-lane integration and native acceptance (2026-10-12)

Eight development owners ran concurrently: configuration/Capture, Diary/Roam/Remark,
Refile, Agenda, Clock/table/Sparse Tree, Export/Babel, Vim/IME, and runtime performance.
One integration owner retained the shared contracts and ran the unified checks.
Current desktop verification passed **195 files / 4267 tests** with two workers.
TypeScript/Vite and the embedded Tauri debug build passed. The filesystem source
changes passed **317 core tests / 4 ignored**; those Rust sources did not change in
the final frontend hot-path repair. Final native executable SHA-256:
`8f12823f91c6b64fc71fb366665c1589a04a4828a75d5d59a045c2d490720baf`.

### Integrated ownership and input boundaries

- Raw/stored/settings keymap transitions revoke the input generation even for A→B→A.
  Harmless metadata-label publication preserves a valid generation; a semantic
  availability change still revokes it. Five workflow values survived an actual
  native process restart. Invalid declarations remain discoverable, not fallbacks.
- A Source replaced by Agenda is inactive for command scope. Blur/read-only suspension
  preserves the Vim engine's INSERT/VISUAL/recording/cursor state rather than inventing
  a mode transition. Shared command progress does not retire an open parameter session.
- Native Remark receives the existing canonical tracker's bodyless metadata snapshot.
  Binding, generation, revision and version guard presentation; future snapshots wait
  for accepted input, and rebind/retirement clears the old projection. The child is not
  a second Remark parser or Source writer.
- Composition history settles an ended lifecycle before the next composition/Vim
  checkpoint and before an ordinary key. Actual Rime cancel→accepted ASCII→Chinese
  input reproduced the rapid handoff bug; the new composition started 38 ms after
  the prior end. Commit, dot/macro replay and ordered canonical Undo preserved accepted
  ASCII and net Chinese input, not preedit/cancel/peer text. No synthetic composition
  or SDK replacement was used.

### Exercised continuous Org and execution paths

Actual GTK controls and focused XTest completed configured Capture prompts/targets,
Refile file→heading→raw preview→confirmation, chronological Diary/Roam capture,
ID link/find/alias/backlinks, and native Remark edit/save. Refile's real copy-first
target publication/source-permission failure retained two separately reconciled
paths; it did not retry or roll back a published target.

Agenda ran from a native source origin, returned to the exact selected heading,
scheduled/removed planning and changed TODO through canonical commands. Three actual
Undo operations restored its baseline without changing the other dirty Source.
Inherited tag/property Sparse Tree showed only the expected work heading and left
Source/history unchanged. Clock used actual local time, accepted CLOCK/LOGBOOK through
Source, produced a read-only report, and preserved CRLF/NUL outside its planned ranges.

The table scenario disclosed the real GNU operation, required Run consent and fresh
Apply, and changed only the authorized table interval; one native Undo restored the
complete CRLF/NUL/astral fixture. Babel used the actual `/usr/bin/emacs`, explicit
environment/session authorization and an owned `(+ 2 3)` block: Run returned real
exit-zero output without editing Source; fresh Apply inserted result `5`, and one
native Undo restored exact Source. Denial, stale approval after disable, accepted-child
drain and source ABA remain separate authority boundaries.

Markdown/HTML export is a read-only snapshot contract, not a claim of GNU semantic
Org export. Markdown retains exact Source in its fenced representation with metadata;
HTML escapes content and uses a deny-by-default CSP. Actual native Save selected the
owned output path; Source/history stayed unchanged. Safety-retained export staging
objects are not silently unlinked. Trusted TypeScript extensions are not sandboxed
JSON and acquire no second body authority.

### Actual Linux filesystem race-after

The final native build ran four owned debugger-scheduled migration races through
the sealed production SDK:

1. Same installed inode and length, changed body byte: native publication rejected
   ACK, and native verification reported the changed actual hash rather than the
   expected input hash.
2. Captured temporary alias replaced with a foreign sole entry: ACK was refused;
   both the foreign entry and held original publication remained reachable.
3. Staging root replaced after its source check: final root/tree observation refused
   the substituted tree; held original and foreign trees were retained.
4. Installed root replaced immediately after successful no-clobber rename: the final
   observation refused ACK and preserved both trees without destructive rollback.

The cleanup operation has been removed, so the second after-case uses the final
publication fence, not the obsolete before-case `unlinkat` boundary. Actual native
verification also refused a FIFO artifact and a 1 GiB sparse manifest without hanging
or reading an unbounded manifest. File/symlink forms of active-write and retaining
markers were refused before type filtering; normal scanning succeeded after the
owned fixtures were retired. Genuine captured-journal substitution is additionally
covered by the core regressions. Evidence:
`local://grain-native-filesystem-race-after.json`.

These are Linux observations. Darwin bounded-copy source and unsupported-platform
fail-closed regressions are not non-Linux runtime proof. Windows migration/move stays
disabled until equivalent ACL, identity and atomic no-clobber guarantees are verified.
No final observation excludes a later held-descriptor write or storage failure.

### Native performance, without a speedup claim

The owned fixture contained 1021 files: a 2,097,361-byte / 2,077,739-UTF-16 /
9811-heading Org file, twenty 34,823-byte buffers and 1000 catalog files. All twenty
buffer owners were actually opened, switched and closed through the normal UI.
Later external-title changes made the final large Source 2,077,746 UTF-16 units /
49,057 lines. It is not the historical 12,000-heading fixture.

| Observed final-build scenario | Measured samples | p50 / p95 ms |
| --- | ---: | ---: |
| Large Source, two Main editor views, 20 additional open buffers; trusted key→second rAF | 30, after 3 warmups | 975 / 995 |
| Large Source, two Main views plus independent native peer; trusted key→second rAF | 30, after 3 warmups | 763 / 974 |
| Normal buffer picker Return→visible destination/second rAF; all 20 open | 20 | 264 / 377 |
| Roam warm Return→first newly visible node result | 20 | 307 / 325 |
| Roam warm Return→second rAF | 20 | 311 / 329 |
| Actual XTest request→stable Source-glyph X drawable readback | 5 | 893.073 / 1427.334 |

The first Roam request in the fresh final process took 353 ms to a new visible result,
357 ms to the second rAF. General workspace scanning/opening had already happened:
this is **not cold filesystem/index-cache latency**. The earlier `b651…` build also
measured five clean external edits and five dirty-source protections: arm-before-write
upper bounds p50/p95 702/878 and 1068/1086 ms. Clean Source matched each actual disk
hash; dirty Source stayed exact until explicit fresh review/adoption. Adoption retired
the old native child lease; those external groups do not claim live-child convergence.

All accepted input groups had whole-Source digest/mirror checks outside timed intervals,
and one actual peer Undo restored the baseline. The drawable probe compared glyph
interior pixels, excluded the caret, and required first changed pixels to equal later
stable readback. Its five actual `x` inputs and one Undo were separately proved in
both Source views. It is an X-server dispatch/render/readback upper bound, not hardware
scanout; second rAF remains a DOM/presentation proxy.

Across the two builds, 231 proxy attempts retain failed pilots rather than dropping
them. A failed glyph pilot matched a pre-existing body letter; the input was accepted
but the measurement was invalid. The normal buffer picker replaced the failed
horizontal-tab mouse pilot. Window/header/parked-buffer shapes differ between phases;
the tables are **not a controlled native before/after speedup**.

Actual old-build CPU sampling found 1747 `orgLines` and 1514 structural-line leaf
samples among 13,412 recorded stacks in subtree availability. Sample timestamps were
zero, so this is not a timed percentage. `org-subtree-refile.pipe.ts` now rejects a
non-heading locally before whole-source line/exclusion allocations. Existing 59
subtree/refile boundary tests and the full suite passed; actual final native input
above exercises this path. Large-file input nevertheless remains roughly 0.8–1 s.

Linux process-tree RSS was 1,766,612 KiB after the final large/peer phases and
2,323,652 KiB after node ABA/rebinding, more switches and all twenty buffer closes.
These are one-snapshot phase observations, not a controlled close-only delta or a
heap/leak conclusion; shared pages can be counted repeatedly. Older serial RSS
observations and complete raw attempts are retained in the earlier report.
WebKitGTK supplied neither Long Tasks nor heap APIs: both remain unavailable/null,
not zero. rAF gaps are not Long Tasks.

Dirty live `Node 0` became `LiveA 0` in real Roam completion. While that reader was
open, its same-file native peer changed A→B→A with one canonical Undo; the old session
was retired despite exact restored bytes. A fresh session navigated to exact heading
start 21 with Source focus and no body change. Fixture text was then restored.

Evidence:
- `local://grain-eight-native-performance.json`
- `local://grain-eight-native-final-performance.json`
- `local://grain-native-final-node-aba-and-buffer-switch.json`
- `local://grain-native-final-source-drawable.json`
- `local://grain-native-final-raster-source-witness.json`
- `local://grain-native-large-source-cpu.json`
- `local://grain-f181-measure-recipe.json`
- `/tmp/grain-eight-native.cq7URo/grain-final-native-source.png`

Observers, body witnesses and throwaway drivers were removed after proof. The eight
development lanes and Linux technical C–E acceptance are integrated; full F still
requires the user's real daily priorities/acceptance, unavailable strict performance
observability and non-Linux safety execution. No complete Doom replacement or latency
budget is claimed.

## Controlled large-Org input optimization (2026-10-13)

The remaining large-file hot paths were measured on the actual embedded
Tauri/WebKitGTK application, not a browser-only harness. The before executable was
`8f12823f91c6b64fc71fb366665c1589a04a4828a75d5d59a045c2d490720baf`;
the optimized executable is
`09842f1223b0f7d193d77f47caa4774eec5f3fc8cdf645489b84c7cba52acde8`.

Both processes used the same private profile, software Xvfb :96, 1400×900 viewport,
two Main Source views, twenty additional buffer owners actually reopened through
normal Quick open, and the 1000-document catalog. Both large Sources started at
2,077,746 UTF-16 units / 49,057 lines / 9811 headings with the same title and SHA-256:
`849c87aa877c5ae9cf252b5367c8574f1afdaf01aee1946ec719f4e3d0620321`.
No build/test jobs ran during either timing group. ASCII input was inactive in
Fcitx; this comparison is not a new IME latency measurement.

| Controlled trusted-key → second-rAF proxy | Measured keys | p50 / p95 ms |
| --- | ---: | ---: |
| Before (`8f1282…`) | 30, after 3 warmups | 828 / 854 |
| Optimized (`09842f…`) | 30, after 3 warmups | 230 / 241 |

All 30 measured keys in each group produced a newly matching visible EOF line;
neither group timed out. This fixed-shape comparison reduces p50 by 72.2% and p95
by 71.8%. It does not reinterpret the different-shape historical table above.

The code changes are bounded to the existing source readers:

- `org-text.pipe.ts`: current-line bounds no longer construct whole-source line
  arrays. Private raw lines stream; known line starts are read locally, and property
  drawer traversal begins at its body. Lexical heading lookup uses the existing
  grammar in one prefix traversal, preserving drawer/COMMENT heading inclusion and
  half-open block boundaries. Scans collect only the requested lines, drawers or
  blocks; absent TODO declarations no longer require eligibility fixed-point passes.
- `org-clock.pipe.ts`: a monotonic stack computes subtree boundaries in O(headings),
  including ineligible structural COMMENT headings. Body-owner lookup uses binary
  search over sorted intervals, retaining ownerless gaps and exclusive ends.
  Clock validation, logging policy, source coordinates and public APIs are unchanged.

There is no new body or command-authority cache. Consumer regressions cover mixed
CRLF/bare-CR/LF delimiters, UTF-16 offsets, EOF, literal/drawer/COMMENT boundaries,
clock ancestry, exact owners, subtree reports and missing-owner rejection precedence.
Unified verification passed **195 desktop files / 4281 tests**; TypeScript/Vite and
the embedded Tauri debug build passed. The existing >500 kB chunk warning remains.

Outside timed intervals, both builds' complete accepted 33-key Sources had SHA-256
`2a42d103e7ac8c86b44cec906e761a90af84d04d9647591e5c21b79d2ebde92f`.
Both Main views matched the complete baseline plus exactly 33 `a` characters; one
actual native Undo restored the complete baseline. A separate actual large-document
Clock command inserted only the LOGBOOK row under the final heading, after its
existing PROPERTIES drawer; one Undo restored every original byte. An independently
hosted native Source accepted `b`, converged to the same complete SHA-256 in both
Main views and the child, and one child Undo restored the baseline in all three views.
The peer was opened after the paired timing groups, not included in their shape.

Actual X-server screenshots show the optimized Source's accepted `zzz` input and
INSERT caret. Second rAF is still a DOM/presentation proxy, not compositor or hardware
key-to-paint. Long Tasks and heap APIs remain unavailable/null. Separate CPU captures
have zero sample timestamps: recorded stack counts are not timed percentages.
After sampling still contains Clock source parsing; 230 ms is not a completed
daily-use latency budget or full F acceptance.

Evidence:
- `local://grain-opt-native-before.json`
- `local://grain-opt-native-after.json`
- `local://grain-opt-current-native-cpu.json`
- `local://grain-opt-after-native-cpu.json`
- `local://grain-opt-native-behavior.json`
- `/tmp/grain-eight-native.cq7URo/grain-opt-before-source.png`
- `/tmp/grain-eight-native.cq7URo/grain-opt-after-source.png`

Measurement observers and the temporary body witness were removed after exact
restoration. The isolated test services were stopped. At the user's request, the
same optimized executable was also opened on the actual Hyprland desktop, using
the normal user profile without a remote inspector, and left running for inspection.

