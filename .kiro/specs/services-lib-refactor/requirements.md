# Requirements Document

## Introduction

This specification defines the requirements for auditing and refactoring the `services/` and `lib/` directories in the Grain desktop application to align with the established architecture patterns: Flux Architecture, pure functions extraction, Repository pattern, and domain module organization.

The current codebase has evolved organically, resulting in inconsistent patterns across services and lib files. This audit will identify violations and provide a clear path to conformance with the established domain-driven architecture.

## Glossary

- **Pure Function**: A function that produces the same output for the same input and has no side effects
- **Repository**: A data access abstraction layer that encapsulates database operations
- **Domain Module**: A self-contained module with interface, store, utils, and index files following the pattern in `src/domain/`
- **Service**: Business logic layer that orchestrates operations across repositories and domains
- **Flux Architecture**: Unidirectional data flow pattern (Action → Dispatcher → Store → View)
- **Hook**: A React hook function that provides reactive access to state or data
- **Config File**: A file containing configuration constants and presets
- **Utils File**: A file containing pure utility functions, named with `.utils.ts` suffix

## Requirements

### Requirement 1: Service Layer Consistency

**User Story:** As a developer, I want services to follow a consistent pattern, so that the codebase is maintainable and predictable.

#### Acceptance Criteria

1. WHEN a service contains pure functions THEN the System SHALL extract them to a `{name}.utils.ts` file
2. WHEN a service directly accesses the database THEN the System SHALL delegate to the appropriate Repository from `@/db/models`
3. WHEN a service contains React hooks THEN the System SHALL move them to the corresponding model's `.hooks.ts` file or domain module
4. WHEN a service file exceeds 300 lines THEN the System SHALL consider splitting it into smaller modules
5. WHEN a service has multiple unrelated responsibilities THEN the System SHALL split it into separate services
6. WHEN a service is created or modified THEN the System SHALL include a JSDoc comment describing its purpose and requirements reference

### Requirement 2: Lib Directory Organization

**User Story:** As a developer, I want lib utilities to be organized by purpose, so that I can easily find and reuse them.

#### Acceptance Criteria

1. WHEN a lib file contains configuration constants THEN the System SHALL use a descriptive naming convention (e.g., `diagram-presets.ts`, `ui-config.ts`)
2. WHEN a lib file contains pure utility functions THEN the System SHALL name it with `.utils.ts` suffix
3. WHEN a lib file is domain-specific THEN the System SHALL move it to the appropriate domain module under `src/domain/`
4. WHEN a lib file is shared across domains THEN the System SHALL keep it in the lib directory with clear documentation
5. WHEN a lib file contains React hooks THEN the System SHALL move them to `src/hooks/` directory
6. WHEN a lib file has unused imports THEN the System SHALL remove them

### Requirement 3: Pure Function Standards

**User Story:** As a developer, I want all pure functions to be testable, so that I can verify correctness through property-based testing.

#### Acceptance Criteria

1. WHEN a pure function is extracted THEN the System SHALL ensure it has no side effects
2. WHEN a pure function is extracted THEN the System SHALL ensure it produces consistent output for the same input
3. WHEN a pure function operates on data structures THEN the System SHALL ensure it does not mutate input parameters
4. WHEN a pure function is extracted THEN the System SHALL place it in a `.utils.ts` file
5. WHEN a utils file is created THEN the System SHALL name it `{domain}.utils.ts` or `{feature}.utils.ts`

### Requirement 4: Import Pattern Consistency

**User Story:** As a developer, I want consistent import patterns, so that I can easily navigate the codebase.

#### Acceptance Criteria

1. WHEN importing from db/models THEN the System SHALL use the unified `@/db/models` import
2. WHEN importing from domain modules THEN the System SHALL use the `@/domain/{module}` import
3. WHEN importing utilities THEN the System SHALL import from the source `.utils.ts` file directly
4. WHEN importing hooks THEN the System SHALL import from `@/hooks/` or the domain module

### Requirement 5: Service Audit Checklist

**User Story:** As a developer, I want a clear audit checklist for each service, so that I can systematically review and refactor them.

#### Acceptance Criteria

1. WHEN auditing a service THEN the System SHALL check for direct database access that should use Repository
2. WHEN auditing a service THEN the System SHALL check for pure functions that should be extracted to `.utils.ts`
3. WHEN auditing a service THEN the System SHALL check for React hooks that should be moved
4. WHEN auditing a service THEN the System SHALL check for proper JSDoc documentation
5. WHEN auditing a service THEN the System SHALL check for proper error handling patterns

### Requirement 6: Lib Audit Checklist

**User Story:** As a developer, I want a clear audit checklist for each lib file, so that I can systematically review and organize them.

#### Acceptance Criteria

1. WHEN auditing a lib file THEN the System SHALL check if it belongs in a domain module
2. WHEN auditing a lib file THEN the System SHALL check for side effects in utility functions
3. WHEN auditing a lib file THEN the System SHALL check for proper TypeScript types and exports
4. WHEN auditing a lib file THEN the System SHALL check for React hooks that should be in `src/hooks/`
5. WHEN auditing a lib file THEN the System SHALL verify naming conventions match file purpose
6. WHEN auditing a lib file THEN the System SHALL check for unused imports and exports
