# Novel Editor

Novel Editor is a modern, cross-platform writing environment built with **Tauri**, **React**, and **Shadcn UI**. It focuses on long-form fiction projects, blending a distraction-free editor with powerful project organization, research management, and release-ready packaging for Linux, Windows, and macOS.

> 🇨🇳 Read this document in Chinese: [`README.zh-CN.md`](./README.zh-CN.md)

---

## Highlights

- ✍️ **Immersive writing**: Rich Lexical-based editor with formatting, keyboard shortcuts, and an optional focus mode.
- 📂 **Project structure**: Chapters, scenes, characters, and world-building assets live side by side with search and tagging.
- 🔍 **Global search**: Fast full-text search across scenes, characters, and world-building with keyboard navigation.
- 💾 **Auto backup**: Automatic daily backups with manual export/restore in JSON or ZIP format.
- 🧠 **Knowledge workspace**: Link notes, references, and research; visualize timelines and relationships.
- ⚙️ **Reliable storage**: IndexedDB + Dexie keep drafts safe offline; optional cloud sync keeps devices aligned.
- 🧪 **Quality pipeline**: Automated linting, testing, and desktop packaging through CI and Tauri.
- 🚢 **Production ready**: One command to build installers (AppImage, DEB, RPM, MSI, DMG) with signing hooks.

---

## Key Capabilities

### Writing Experience
- Rich-text editor with styling, markdown shortcuts, templates, and dark/light themes.
- Immersive full-screen mode, customizable layouts, and distraction controls.
- Inline comments, version history, and compare views for safe iteration.

### Project Organization
- Tree-based project navigator covering books → chapters → scenes.
- Character, location, and lore databases with custom fields and tags.
- **Global search** (`Ctrl+Shift+F`): Fast full-text search with keyword highlighting and smart ranking.
- **Backup & restore**: Automatic daily backups + manual export in JSON/ZIP format.
- Import/export (Markdown, DOCX, PDF, EPUB) to keep work portable.

### Productivity Toolkit
- Daily writing goals, progress dashboards, and timeline visualizations.
- Scene cards, outline boards, and plot arc planning widgets.
- Optional AI-assisted brainstorming, synopsis generation, and editing helpers.

### Platform & Packaging
- Offline-first desktop app powered by Tauri.
- Multi-platform packaging with preconfigured icons, updater hooks, and signing scripts.
- Structured logging (in-app log viewer + Dexie persistence) for debugging and support.

---

## Roadmap Snapshot

- **Near term**: project templates, Create/Import dialogs, autosave & snapshots, per-entity metadata, lint/test coverage.
- **Mid term**: collaborative sync backend (WebDAV/Supabase), AI-assisted features, extended export formats, spell/grammar tooling.
- **Long term**: plugin system, mobile companion, real-time collaboration, community content marketplace.

Follow progress in [`docs/roadmap.md`](docs/roadmap.md) (coming soon) and on issue labels (`status:planned`, `status:in-progress`).

---

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn UI, Lexical.
- **State & Data**: Dexie.js (IndexedDB), TanStack Query & Router, Zustand for local state.
- **Desktop Shell**: Tauri (Rust), Consola logging, cross-platform packaging assets.
- **Tooling**: Biome (format/lint), Vitest, Playwright (E2E), GitHub Actions CI.

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- Rust & Cargo (Tauri toolchain)
- Optional: Bun for faster scripts
- Platform-specific [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)

### Install Dependencies

```bash
# using npm
npm install

# or using bun
bun install
```

### Development

```bash
npm run dev         # Start Vite + Tauri dev in watch mode
npm run tauri dev   # Run only the Tauri shell with live reload
```

The frontend dev server lives at `http://localhost:1420`.

### Production Build

```bash
npm run build       # Type-check, bundle frontend, and prepare Tauri artifacts
npm run preview     # Preview the built frontend
npm run tauri build # Produce platform installers (AppImage, DEB, RPM, MSI, DMG)
```

> Linux packaging requires `patchelf`, `appimagetool`, `desktop-file-utils`, and `fuse2`.

---

## Development Scripts

| Script       | Description                                      |
|--------------|--------------------------------------------------|
| `dev`        | Start Vite + Tauri development environment       |
| `build`      | Run `tsc`, bundle frontend, prepare Tauri output |
| `preview`    | Serve production build locally                   |
| `tauri`      | Proxy command to the Tauri CLI                   |
| `format`     | Format with Biome                                 |
| `lint`       | Lint with Biome                                   |
| `check`      | Type + lint checks via Biome                      |
| `test`       | Run unit and component tests (Vitest)             |
| `test:e2e`   | Run Playwright end-to-end suite                   |
| `diff`       | Save staged diff to `diff.txt`                    |

---

## Architecture Overview

```
src/
├─ components/         Reusable UI primitives and blocks
│  ├─ ui/              Shadcn-derived primitives
│  └─ blocks/          Feature-level components (EmptyProject, dialogs, etc.)
├─ routes/             TanStack router tree
├─ db/                 Dexie schema + CRUD helpers
├─ lib/                Cross-cutting utilities (logging, helpers)
├─ assets/             Static assets bundled by Vite
└─ styles.css          Tailwind layers & global styles

src-tauri/
├─ src/main.rs         Tauri entrypoint & command handlers
├─ src/lib.rs          Shared Rust utilities
├─ icons/              Platform-specific icon sets
└─ tauri.conf.json     Tauri configuration
```

Key flows:

- React + TanStack Router orchestrate UI layout, with state fetched via TanStack Query.
- Dexie schemas define books, chapters, scenes, and research entities; hooks expose typed CRUD operations.
- Tauri commands bridge to filesystem, sync services, and OS-level integrations.
- Consola-powered logs stream to a `log` route for diagnostics.

---

## Quality & Testing

- **Type safety**: Strict TypeScript + Biome checks in CI.
- **Unit/component tests**: Vitest + React Testing Library for logic and UI.
- **End-to-end**: Playwright covers project lifecycle smoke tests.
- **Rust**: `cargo test` for Tauri-side logic; Clippy and rustfmt keep code consistent.
- **Continuous integration**: GitHub Actions (or your preferred CI) runs lint, tests, build, and packaging checks on each PR.

---

## Contributing

1. Fork and create a feature branch.
2. Run `npm run lint` and `npm run test` before opening a PR.
3. Include screenshots or demo videos for UI-facing changes.
4. For desktop changes, note your OS and packaging steps tested.

Issue templates and contribution guidelines live under `.github/` (coming soon). Discussions and roadmap feedback are welcome.

---

## License

This project is released under the MIT License. See [`LICENSE`](./LICENSE) for details.


