# Agent Guidelines for Novel Editor

This document provides essential information for AI coding agents working in this codebase.

## Project Overview

Novel Editor is a Turborepo monorepo with multiple applications (desktop, web, mobile, admin, api) and shared packages. The codebase follows strict functional programming principles enforced by custom ESLint rules.

**Tech Stack**: React, TypeScript, fp-ts, Zustand, TanStack, Electron, Tauri, Biome, Vitest

## Prerequisites

- Node.js >= 20
- Bun >= 1.1.0

## Build & Development Commands

### Monorepo Commands (from root)
```bash
# Development
turbo run dev                    # Start all apps
turbo run dev --filter=desktop   # Start specific app (desktop/web/mobile/admin/api)

# Build
turbo run build                  # Build all
turbo run build --filter=desktop # Build specific app

# Code Quality
turbo run lint                   # Lint all workspaces
turbo run format                 # Format all workspaces
turbo run check                  # Type check all workspaces

# Testing
turbo run test                   # Run all tests
turbo run test --filter=desktop  # Run tests for specific workspace
```

### Running Single Test File
```bash
# From workspace directory (e.g., apps/desktop)
bun test src/path/to/file.test.ts

# Or with Vitest directly
vitest run src/path/to/file.test.ts
```

### Workspace-Specific Commands
```bash
cd apps/desktop  # or apps/web, apps/mobile, etc.
bun run dev
bun run build
bun run lint
bun run format
bun run test
```

## Architecture & File Organization

### Layered Architecture

The codebase follows a strict layered architecture enforced by ESLint:

1. **Types Layer** (`src/types/`): Type definitions, interfaces
2. **Pipes Layer** (`src/pipes/`): Pure functions, data transformations
3. **IO Layer** (`src/io/`): External interactions (API, file system, database)
4. **Flows Layer** (`src/flows/`): Business logic orchestration
5. **State Layer** (`src/state/`): Global state management (Zustand)
6. **Hooks Layer** (`src/hooks/`): React hooks
7. **Views Layer** (`src/views/`): React components

**Dependency Rules**: Lower layers cannot import from higher layers. Views can import from all layers.

### File Naming Conventions

All files use **kebab-case** with specific suffixes:

- `.pipe.ts` - Pure transformation functions
- `.flow.ts` - Business logic flows (fp-ts TaskEither)
- `.api.ts` - API client functions
- `.state.ts` - Zustand stores
- `.view.fn.tsx` - React functional components
- `use-*.ts` - Custom React hooks
- `.interface.ts` - Type definitions
- `.test.ts` / `.spec.ts` - Test files
- `.property.test.ts` - Property-based tests

**Examples**: `flatten-tree.pipe.ts`, `create-file.flow.ts`, `file-tree.view.fn.tsx`, `use-file-tree.ts`

## Code Style Guidelines

### Formatting (Biome)

- **Indentation**: Tabs (width 2)
- **Line width**: 100 characters
- **Quotes**: Double quotes
- **Semicolons**: As needed
- **Trailing commas**: Always
- **Arrow parentheses**: Always

### TypeScript Rules

- **Strict mode**: Enabled
- **Target**: ES2020
- **Module resolution**: Bundler
- **Path alias**: `@/*` maps to `./src/*`
- **JSX**: react-jsx

### Import Conventions

```typescript
// Use path alias for internal imports
import { NodeInterface } from '@/types/node/node.interface'
import { flattenTree } from '@/pipes/node/flatten-tree.pipe'
import { createFileFlow } from '@/flows/file/create-file.flow'

// External imports first, then internal
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import { useFileTreeState } from '@/state/file-tree.state'
```

### Functional Programming Rules (ESLint @grain/eslint-plugin)

**CRITICAL**: This codebase enforces strict functional programming. The following are **FORBIDDEN**:

1. **No try-catch blocks** - Use `TaskEither` from fp-ts instead
2. **No console.log** - Use logger (info, success, error, warn)
3. **No Date constructor** - Use date utilities
4. **No lodash** - Use native methods or fp-ts
5. **No mutations** - All data structures must be immutable
6. **No React in pure layers** - React imports only in views/hooks

**Rule strictness by layer**:
- `pipes/`: Strictest - pure functions only
- `flows/`: TaskEither required, no try-catch
- `io/`: No React imports
- `views/`: Relaxed rules
- `test/`: All rules disabled

### Immutability Patterns

```typescript
// ✅ CORRECT: readonly parameters and return types
export const flattenTree = (
  nodes: readonly NodeInterface[]
): readonly FlatNode[] => {
  // Pure transformation
}

// ❌ WRONG: mutable parameters
export const flattenTree = (nodes: NodeInterface[]): FlatNode[] => {
  nodes.push(newNode) // Mutation forbidden
}

// ✅ CORRECT: readonly interface properties
export interface NodeInterface {
  readonly id: UUID
  readonly name: string
  readonly children: readonly NodeInterface[]
}

// ❌ WRONG: mutable properties
export interface NodeInterface {
  id: UUID
  name: string
  children: NodeInterface[]
}
```

### Error Handling with TaskEither

```typescript
// ✅ CORRECT: Use TaskEither for error handling
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'

export const createFileFlow = (input: CreateFileInput) =>
  pipe(
    validateInput(input),
    TE.chain(createFileInDb),
    TE.chain(updateFileTree),
    TE.map(logSuccess)
  )

// ❌ WRONG: try-catch blocks
export const createFileFlow = async (input: CreateFileInput) => {
  try {
    const result = await createFile(input)
    return result
  } catch (error) {
    // Forbidden in flows/
  }
}
```

## Component Patterns

### View Components (.view.fn.tsx)

Components should be **pure presentation** - all logic goes in custom hooks:

```typescript
export const FileTreeView = () => {
  // All logic in hook
  const { nodes, handlers, state } = useFileTree()
  
  // UI event handlers only
  const handleCreate = useCallback(() => {
    const name = prompt('Enter name')
    if (name) handlers.createFile(name)
  }, [handlers])
  
  return <div>{/* Pure JSX */}</div>
}
```

### Custom Hooks (use-*.ts)

Hooks encapsulate all component logic with structured sections:

```typescript
export const useFileTree = () => {
  // 1. State & Refs
  const state = useFileTreeState()
  const ref = useRef<HTMLDivElement>(null)
  
  // 2. Computed Values
  const flatNodes = useMemo(() => flattenTree(state.nodes), [state.nodes])
  
  // 3. Handlers
  const createFile = useCallback((name: string) => {
    // Business logic
  }, [])
  
  // 4. Effects
  useEffect(() => {
    // Side effects
  }, [])
  
  // 5. Return
  return { nodes: flatNodes, handlers: { createFile }, state }
}
```

## Type Definitions

```typescript
// Separate read/write types
export interface NodeInterface {
  readonly id: UUID
  readonly name: string
  readonly createdAt: ISODateString
}

export interface NodeCreateInput {
  readonly name: string
  readonly parentId?: UUID
}

export interface NodeUpdateInput {
  readonly id: UUID
  readonly name?: string
}
```

## Documentation

- **JSDoc required** for public APIs
- **Bilingual comments**: Chinese and English
- Include algorithm explanations for complex logic
- Provide usage examples in JSDoc

```typescript
/**
 * 将树形结构扁平化为数组
 * Flatten tree structure into array
 * 
 * @param nodes - 树形节点数组 / Tree nodes array
 * @returns 扁平化后的节点数组 / Flattened nodes array
 * 
 * @example
 * const flat = flattenTree([{ id: '1', children: [{ id: '2' }] }])
 * // Returns: [{ id: '1', depth: 0 }, { id: '2', depth: 1 }]
 */
```

## Testing

- **Framework**: Vitest with jsdom
- **Test patterns**: `src/**/*.{test,spec}.{ts,tsx}`
- **Setup file**: `src/test/setup.ts`
- **All ESLint rules disabled** in test files

## Common Pitfalls

1. **Don't use `any`** - Biome warns on explicit any
2. **Don't mutate data** - Use spread operators, map, filter
3. **Don't use try-catch in flows** - Use TaskEither
4. **Don't import React in pipes/flows/io** - Layer violation
5. **Don't forget readonly** - All interfaces and function params
6. **Don't use console.log** - Use logger utilities
7. **Don't suppress type errors** - Fix the root cause

## When Making Changes

1. Run `turbo run lint` to check ESLint violations
2. Run `turbo run format` to auto-format code
3. Run `turbo run check` for TypeScript errors
4. Run `turbo run test --filter=<workspace>` for affected tests
5. Verify layer dependencies are respected
6. Ensure all new code follows immutability patterns
