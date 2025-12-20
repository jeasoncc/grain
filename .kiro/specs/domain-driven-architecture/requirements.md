# Requirements Document

## Introduction

This document defines the requirements for refactoring the Grain desktop application to adopt a consistent Domain-Driven Architecture. The current codebase has a mix of architectural patterns:

1. **New Pattern** (`src/domain/editor-tabs/`): Clean separation with interface, store, builder, utils, and index files
2. **Legacy Pattern** (`src/stores/`): Monolithic Zustand stores with mixed concerns
3. **Repository Pattern** (`src/db/models/`): Well-structured data access layer with builder, repository, interface, hooks, and schema

The goal is to unify these patterns into a consistent domain-driven architecture that separates concerns, improves testability, and maintains the existing functionality.

## Glossary

- **Domain Module**: A self-contained module representing a business domain (e.g., editor-tabs, selection, ui-settings)
- **Interface File**: TypeScript type definitions and interfaces for a domain
- **Store File**: Zustand store implementation with Immer for immutable state management
- **Builder File**: Builder pattern implementation for complex object construction
- **Utils File**: Pure utility functions with no side effects
- **Repository**: Data access layer for persistent storage (Dexie/IndexedDB)
- **Hook File**: React hooks for consuming domain state and actions
- **Flux Architecture**: Unidirectional data flow pattern (Action → Dispatcher → Store → View)
- **LRU Cache**: Least Recently Used cache eviction strategy

## Requirements

### Requirement 1: Domain Module Structure

**User Story:** As a developer, I want a consistent module structure across all domains, so that I can easily navigate and understand the codebase.

#### Acceptance Criteria

1. WHEN a new domain module is created THEN the Domain_Module SHALL contain an interface file defining all types and interfaces
2. WHEN a new domain module is created THEN the Domain_Module SHALL contain a store file implementing Zustand with Immer middleware
3. WHEN a domain requires complex object construction THEN the Domain_Module SHALL contain a builder file implementing the Builder pattern
4. WHEN a domain has pure utility functions THEN the Domain_Module SHALL contain a utils file with no side effects
5. WHEN a domain module is created THEN the Domain_Module SHALL contain an index file exporting all public APIs
6. WHEN a domain requires React integration THEN the Domain_Module SHALL provide selector hooks for optimized re-renders

### Requirement 2: Store Migration

**User Story:** As a developer, I want to migrate legacy stores to the new domain structure, so that the codebase follows a consistent pattern.

#### Acceptance Criteria

1. WHEN migrating the selection store THEN the System SHALL create a domain module at `src/domain/selection/` with interface, store, and index files
2. WHEN migrating the ui store THEN the System SHALL create a domain module at `src/domain/ui/` with interface, store, and index files
3. WHEN migrating the theme store THEN the System SHALL create a domain module at `src/domain/theme/` with interface, store, utils, and index files
4. WHEN migrating the font store THEN the System SHALL create a domain module at `src/domain/font/` with interface, store, and index files
5. WHEN migrating the writing store THEN the System SHALL create a domain module at `src/domain/writing/` with interface, store, utils, and index files
6. WHEN migrating the unified-sidebar store THEN the System SHALL create a domain module at `src/domain/sidebar/` with interface, store, and index files
7. WHEN a store is migrated THEN the System SHALL preserve all existing functionality and state persistence
8. WHEN a store is migrated THEN the System SHALL delete the original store file from `src/stores/`

### Requirement 3: Interface Definitions

**User Story:** As a developer, I want clear interface definitions for each domain, so that I can understand the data structures and contracts.

#### Acceptance Criteria

1. WHEN defining domain interfaces THEN the Interface_File SHALL use readonly modifiers for immutable properties
2. WHEN defining domain interfaces THEN the Interface_File SHALL separate state interfaces from action payload interfaces
3. WHEN defining domain interfaces THEN the Interface_File SHALL include configuration interfaces with default values
4. WHEN defining domain interfaces THEN the Interface_File SHALL use TypeScript strict mode compatible types

### Requirement 4: Builder Pattern Implementation

**User Story:** As a developer, I want to use the Builder pattern for complex object construction, so that I can create objects with a fluent API.

#### Acceptance Criteria

1. WHEN implementing a builder THEN the Builder SHALL provide a static `create()` factory method
2. WHEN implementing a builder THEN the Builder SHALL support method chaining for all property setters
3. WHEN implementing a builder THEN the Builder SHALL provide a `from()` method for copying existing objects
4. WHEN implementing a builder THEN the Builder SHALL validate required fields in the `build()` method
5. WHEN implementing a builder THEN the Builder SHALL return immutable objects using `Object.freeze()`

### Requirement 5: Pure Utility Functions

**User Story:** As a developer, I want pure utility functions separated from store logic, so that I can test them in isolation.

#### Acceptance Criteria

1. WHEN implementing utility functions THEN the Utils_File SHALL contain only pure functions with no side effects
2. WHEN implementing utility functions THEN the Utils_File SHALL not modify input parameters
3. WHEN implementing utility functions THEN the Utils_File SHALL return new objects for immutable updates
4. WHEN implementing utility functions THEN the Utils_File SHALL be independently testable without store dependencies

### Requirement 6: Store Implementation

**User Story:** As a developer, I want stores to follow a consistent implementation pattern, so that state management is predictable.

#### Acceptance Criteria

1. WHEN implementing a store THEN the Store SHALL use Zustand with Immer middleware for immutable updates
2. WHEN implementing a store THEN the Store SHALL separate state from actions in the type definition
3. WHEN implementing a store THEN the Store SHALL use the persist middleware for state that needs persistence
4. WHEN implementing a store THEN the Store SHALL provide selector hooks for optimized component re-renders
5. WHEN implementing a store THEN the Store SHALL use the `partialize` option to control persisted state

### Requirement 7: Code Organization

**User Story:** As a developer, I want clear code organization guidelines, so that the team follows consistent patterns.

#### Acceptance Criteria

1. WHEN organizing domain code THEN the Domain_Module SHALL follow the naming convention `{domain-name}.{file-type}.ts`
2. WHEN organizing domain code THEN the Domain_Module SHALL use kebab-case for folder names
3. WHEN organizing domain code THEN the Domain_Module SHALL use PascalCase for builder class names
4. WHEN organizing domain code THEN the Domain_Module SHALL use camelCase for utility function names
5. WHEN organizing domain code THEN the Domain_Module SHALL group related exports in the index file with section comments

### Requirement 8: Remove Legacy Code

**User Story:** As a developer, I want to remove legacy store files and update all imports, so that the codebase is clean and maintainable.

#### Acceptance Criteria

1. WHEN the migration is complete THEN the System SHALL delete all files in `src/stores/` directory
2. WHEN the migration is complete THEN the System SHALL update all component imports to use the new `@/domain/*` paths
3. WHEN the migration is complete THEN the System SHALL remove the duplicate `src/stores/editor-tabs.ts` file
4. WHEN removing legacy code THEN the System SHALL verify no functionality is lost through testing
