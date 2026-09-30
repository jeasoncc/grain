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
- `hooks/use-org-tags-minibuffer.ts`: session orchestration and buffer commit.
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
