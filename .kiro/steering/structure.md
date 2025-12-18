# Project Structure

## Monorepo Layout

```
grain-editor-monorepo/
├── apps/
│   ├── desktop/          # Tauri desktop app (main application)
│   ├── web/              # Next.js marketing/landing site
│   ├── mobile/           # Expo React Native app
│   ├── admin/            # Admin panel (Vite + React)
│   └── api/              # Elysia API server (Bun)
├── packages/
│   └── editor/           # Shared Lexical editor package
├── docs/                 # Documentation
├── scripts/              # Build and release scripts
├── aur/                  # Arch Linux AUR package files
├── flatpak/              # Flatpak package files
├── snap/                 # Snap package files
└── winget-manifests/     # Windows Package Manager manifests
```

## Desktop App Structure (`apps/desktop/src/`)

```
src/
├── components/           # React components
│   ├── blocks/          # Feature-specific components
│   ├── ui/              # shadcn/ui components (do not modify)
│   ├── panels/          # Panel components
│   └── file-tree/       # File tree components
├── db/                   # Database layer (Dexie/IndexedDB)
│   └── models/          # Data models and repositories
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and configurations
├── routes/               # TanStack Router file-based routes
│   └── settings/        # Settings sub-routes
├── services/             # Business logic services
├── stores/               # Zustand state stores
└── utils/                # Helper utilities
```

## Shared Editor Package (`packages/editor/src/`)

```
src/
├── components/           # Editor React components
├── nodes/                # Custom Lexical nodes (mention, tag)
├── plugins/              # Lexical plugins
├── themes/               # Editor themes and CSS
└── types/                # TypeScript types
```

## Data Architecture

- **UI State**: Zustand stores (persisted to localStorage)
- **Persistent Data**: Dexie (IndexedDB wrapper)
- **Key Models**: Workspace, Node (file/folder/diary/canvas), Drawing, User, Settings

## File Conventions

- Components: PascalCase (`ActivityBar.tsx`)
- Hooks: camelCase with `use-` prefix (`use-theme.ts`)
- Stores: camelCase (`ui.ts`, `selection.ts`)
- Services: camelCase (`backup.ts`, `export.ts`)
- Routes: kebab-case matching URL paths

## Import Aliases

- `@/*` → `./src/*` (in all apps)
- `@grain/editor` → shared editor package
