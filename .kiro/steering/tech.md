# Tech Stack & Build System

## Monorepo Structure

- **Package Manager**: npm (with workspaces)
- **Build Orchestration**: Turborepo
- **Node.js**: >= 20
- **Bun**: >= 1.1.0 (for API server)

## Core Technologies

| App | Framework | Build Tool | UI |
|-----|-----------|------------|-----|
| Desktop | Tauri 2.x + React 19 | Vite 7 | shadcn/ui + Tailwind 4 |
| Web | Next.js 15 | Next.js | shadcn/ui + Tailwind 4 |
| Mobile | Expo + React Native | Expo | Custom |
| Admin | React 19 | Vite 7 | shadcn/ui + Tailwind 4 |
| API | Elysia | Bun | - |
| Editor Package | React | Vite | Lexical |

## Key Libraries

- **Editor**: Lexical (rich text)
- **State Management**: Zustand (UI state), Dexie (IndexedDB persistence)
- **Routing**: TanStack Router (desktop/admin), Next.js App Router (web), Expo Router (mobile)
- **Data Fetching**: TanStack Query
- **Forms**: TanStack Form + Zod
- **UI Components**: Radix UI primitives, Lucide icons
- **Charts**: Mermaid, PlantUML
- **Drawing**: Excalidraw
- **Linting/Formatting**: Biome

## Common Commands

```bash
# Install dependencies
bun install

# Development
npm run desktop:dev    # Desktop app
npm run web:dev        # Web app
npm run mobile:dev     # Mobile app
npm run admin:dev      # Admin panel
npm run api:dev        # API server

# Build
npm run build                    # Build all
npm run build:prod:desktop       # Production desktop build
npm run build:prod:web           # Production web build

# Linting & Formatting
npm run lint           # Lint all packages
npm run format         # Format all packages
npm run check          # Check all packages

# Version & Release
npm run version:bump   # Bump version across packages
npm run tag:desktop    # Create desktop release tag
npm run tag:all        # Create all release tags
```

## TypeScript Configuration

- Target: ES2020
- Module: ESNext with bundler resolution
- Strict mode enabled
- Path alias: `@/*` → `./src/*`

## Biome Configuration

- Indent: Tabs (desktop), Spaces (API)
- Quote style: Double quotes (desktop), Single quotes (API)
- Organize imports: Enabled
- Recommended linting rules
