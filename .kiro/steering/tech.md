# Tech Stack & Build System

## Monorepo Structure

- **Package Manager**: bun (with workspaces)
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
- **State Management**: Zustand + Immer (immutable state), Dexie (IndexedDB persistence)
- **Routing**: TanStack Router (desktop/admin), Next.js App Router (web), Expo Router (mobile)
- **Data Access**: Dexie React Hooks (IndexedDB 响应式绑定)
- **Forms**: TanStack Form + Zod
- **UI Components**: Radix UI primitives, Lucide icons
- **Charts**: Mermaid, PlantUML
- **Drawing**: Excalidraw
- **Linting/Formatting**: Biome

## Functional Programming Libraries

- **fp-ts**: 函数式核心 (pipe, Option, Either, Task)
- **es-toolkit**: 实用工具函数 (替代 lodash)
- **Immer**: 不可变数据更新
- **Zod**: 运行时数据校验
- **dayjs**: 时间处理

## Performance Libraries

- **Million.js**: React 编译优化，自动优化组件渲染
- **@tanstack/react-virtual**: 虚拟列表，大量数据高性能渲染

## Architecture Patterns

- **Immutable State**: Immer for safe state mutations
- **Functional Programming**: Pure functions, higher-order functions, function composition
- **Builder Pattern**: Complex object construction with method chaining
- **Repository Pattern**: Data access abstraction layer

## Common Commands

```bash
# Install dependencies
bun install

# Development
bun run desktop:dev    # Desktop app
bun run web:dev        # Web app
bun run mobile:dev     # Mobile app
bun run admin:dev      # Admin panel
bun run api:dev        # API server

# Build
bun run build                    # Build all
bun run build:prod:desktop       # Production desktop build
bun run build:prod:web           # Production web build

# Linting & Formatting
bun run lint           # Lint all packages
bun run format         # Format all packages
bun run check          # Check all packages

# Version & Release
bun run version:bump   # Bump version across packages
bun run tag:desktop    # Create desktop release tag
bun run tag:all        # Create all release tags
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
