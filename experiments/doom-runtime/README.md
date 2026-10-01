# Doom runtime feasibility probes (S3)

These are **disposable correctness experiments**, not application implementations.
They contain synthetic in-memory fixtures only. They do not read Org workspaces,
use Tauri, save real documents, or provide a recovery journal.

## Run independently

```sh
cd experiments/doom-runtime
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

Use Node 26 or later (verification used Node 26.10.0). The isolated package/lock
pins CM state 6.7.5, view 6.43.12, commands 6.11.1, Vim 6.4.0 and jsdom 30.1.1.
The CM versions match the installed desktop runtime at the time of the probes.
This folder is outside the application's workspace package globs. No production
package or lockfile was changed and Vim is **not** enabled in Grain.

Each process installs synthetic DOM globals/geometry stubs and exits after its
checks. Results are written to ignored `*.results.json` files. Vim actions/maps
are process-global, so tests intentionally run in separate Node processes.

Fresh pinned `npm ci` reproduction on 2026-10-02 passed all three scripts:

| Probe | Passing test cases | What they establish |
| --- | --- | --- |
| `vim-raw-source.probe.mjs` | 16/16 | Mount/mode transitions, narrow commands, raw-string undo preservation, mode/register ownership observations |
| `buffer-window.probe.mjs` | 18/18 | Canonical buffer history with selection-owning windows, stale offset rejection, synthetic revision/save races |
| `vim-ownership.probe.mjs` | 14/14 | Ordinary Vim undo ownership gap, bounded public custom route, explicit policy/extension hazards |

An expected limitation can be a passing assertion. These counts are **not** a
claim of 48 supported Doom features.

## Separate Vim probe

- Public `vim()`, `getCM`, and `Vim.handleKey` mount and operate with the pinned CM
  versions. Synthetic DOM keys exercise normal/insert transitions and `dd`/`u`.
- Raw fixtures cover LF, CRLF, lone CR, mixed endings, NUL, Unicode, and empty or
  no-final-newline source. `sliceDoc()` is required; `doc.toString()` normalizes
  CodeMirror's internal line boundaries.
- Two saved EditorStates retain independent histories, **but Vim mode resets**
  when `view.setState` recreates the view plugin. Two live views keep separate
  modes. Named registers cross views; register/macro state is engine-global.
- Narrow public register, dot and `dd` macro checks pass. Controlled CM insertion
  during insert mode is not browser typing or real IME validation.

## Buffer/window probe

```text
window selection + fresh change -> guard -> canonical buffer transaction/history
                                            |                  |
                                    project to windows    captured save + revision CAS
```

One canonical immutable EditorState/history per buffer; windows have history-free
projection states and independent selections. They are derived document values,
not competing editable authorities. Dispatch checks exact starting view state,
canonical document equality, and an in-memory generation (including ABA cases).
Undo/redo route to canonical public StateCommands, never to a projection's stack.

Public `StateEffect`/`invertedEffects` record an origin window's selection;
`EditorSelection.map` maps other windows. Tests restore original multi-range
selection even after the origin cursor moves. A/B buffers remain independently
dirty and undoable. Selection-only moves add no text history.

A synthetic adapter checks revisions at write completion. External changes do not
overwrite dirty source. Saving captured source while newer edits arrive advances
the saved baseline to the captured text and leaves the new live source dirty.
Synthetic workspace/file IDs are distinct from path labels; this is **not** real
inode/capability identity or external-rename discovery.

## Combined Vim + ownership probe: important qualifications

Ordinary Vim `u`/`C-r` reads a projection's nonexistent undo stack and does **not**
reach canonical history. A public custom `Vim.defineAction`/`Vim.mapCommand` route
uses adapter-to-window registration to call canonical undo/redo. Shared-window
`dd`/undo/redo, independent A/B buffers and narrow counts pass.

That combination initially failed: `dd` creates a transient operator selection.
Restoring it causes visual mode, rather than restoring the original normal cursor.
The final **normal-mode-only** probe reduces that selection to its range-start
cursor. This is an explicit, lossy cursor policy, **not a production decision**.
Exact intra-line cursor restoration and visual/block semantics remain unproven.
The general multi-range ownership result cannot be imported unchanged into Vim.

Custom mappings/actions are global. An unregistered Vim adapter reaches the same
mapping and fails closed in the probe. A production override must solve lifecycle,
foreign-view fallback, user mapping priority and teardown; process exit is not a
production configuration policy.

Foreign plugin effects on document transactions are deliberately dropped by the
projection translator, and a test proves this. Arbitrary CM StateFields/effects,
filters, diagnostics, completions and plugin history are **not losslessly supported**.
Do not replay foreign transactions wholesale or advertise general extension
compatibility from these results.

## Gates before production runtime adoption

1. Preserve one buffer authority and one explicit writer; do not bolt an extra
   body store beside the existing controller/editor ownership.
2. Define typing groups, undo origins, detached-window restoration, cached inactive
   selection mapping, reentrancy and projection/plugin failure behavior.
3. Resolve original cursor/operator-selection fidelity before broad Vim support;
   do not ship the probe's range-start policy as full Evil compatibility.
4. Validate extension-effect ownership and view-local/global mapping boundaries.
5. Design EOL/source offset encoding. Ownership probes keep CR as literal text
   with an explicit LF separator. Exact preservation is proven, **not correct
   mixed/lone-CR logical-line editing**. The current editor's separator heuristic
   is a different policy.
6. Exercise real browser/Tauri input: Chinese IME candidates, Enter/Escape, mode
   transitions, clipboard/register insertion and differing source separators.
7. Measure realistic memory/latency/large-file behavior. jsdom stubs cannot prove
   layout, focus/OS input, accessibility, performance or ergonomics.
8. Connect real capability/revision/file-conflict boundaries only after those
   correctness gates. Journal, default Evil, ELisp compatibility and configuration
   execution privileges are not decided by these experiments.

The evidence supports further native-runtime prototyping, not automatic Evil
adoption or completion of the buffer/window migration.
