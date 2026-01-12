# Requirements Document: ESLint Violations Fix

## Introduction

This document defines requirements for systematically fixing all 5,466 ESLint violations in the Grain desktop application codebase. The fixes are organized by priority to address critical issues first while maintaining code quality and functional programming principles.

## Glossary

- **System**: The Grain desktop application codebase
- **Violation**: An ESLint rule violation detected in the code
- **P0**: Priority 0 (Critical) - Architecture and type safety issues
- **P1**: Priority 1 (High) - Functional programming violations
- **P2**: Priority 2 (Medium) - Code style and conventions
- **Readonly**: TypeScript readonly modifier for immutability
- **TaskEither**: fp-ts type for functional error handling
- **Pure Layer**: Code layers (pipes/, utils/) that must be side-effect free

## Requirements

### Requirement 1: Type Safety Violations (P0)

**User Story:** As a developer, I want all undefined variables to be properly typed and imported, so that the code is type-safe and prevents runtime errors.

#### Acceptance Criteria

1. WHEN the System encounters `no-undef` violations, THE System SHALL add proper imports or type definitions
2. WHEN the System encounters `@typescript-eslint/no-explicit-any` violations, THE System SHALL replace `any` types with specific types
3. WHEN all type safety fixes are applied, THE System SHALL have zero `no-undef` and `no-explicit-any` violations
4. THE System SHALL maintain existing functionality after type fixes

### Requirement 2: Architecture Layer Dependencies (P0)

**User Story:** As a developer, I want proper layer separation, so that the architecture remains clean and maintainable.

#### Acceptance Criteria

1. WHEN the System detects `grain/layer-dependencies` violations, THE System SHALL refactor imports to follow architecture rules
2. WHEN flows/ imports from utils/, THE System SHALL create wrapper functions in pipes/
3. WHEN pipes/ imports from io/, THE System SHALL move the logic to flows/
4. THE System SHALL ensure all layers follow the dependency hierarchy: views → hooks → flows → pipes → io/utils

### Requirement 3: Unused Code Cleanup (P0)

**User Story:** As a developer, I want to remove unused code, so that the codebase is clean and maintainable.

#### Acceptance Criteria

1. WHEN the System encounters `@typescript-eslint/no-unused-vars` violations, THE System SHALL remove unused variables, imports, and parameters
2. WHEN removing unused code, THE System SHALL verify no other code depends on it
3. THE System SHALL maintain all used functionality after cleanup

### Requirement 4: Side Effects in Pure Layers (P0)

**User Story:** As a developer, I want pure layers to remain side-effect free, so that functions are predictable and testable.

#### Acceptance Criteria

1. WHEN the System detects `grain/no-side-effects-in-pipes` violations, THE System SHALL move side effects to flows/
2. WHEN pipes/ contains API calls or state mutations, THE System SHALL refactor to flows/
3. THE System SHALL ensure pipes/ and utils/ contain only pure functions

### Requirement 5: Readonly Type Modifiers (P1)

**User Story:** As a developer, I want all data structures to use readonly types, so that immutability is enforced at compile time.

#### Acceptance Criteria

1. WHEN the System encounters `functional/prefer-readonly-type` violations, THE System SHALL add readonly modifiers to arrays, objects, and parameters
2. WHEN arrays are declared, THE System SHALL use `readonly T[]` or `ReadonlyArray<T>`
3. WHEN object properties are declared, THE System SHALL use `readonly` modifier
4. THE System SHALL maintain type compatibility after adding readonly modifiers

### Requirement 6: Immutable Data Operations (P1)

**User Story:** As a developer, I want all data operations to be immutable, so that state changes are predictable and traceable.

#### Acceptance Criteria

1. WHEN the System encounters `functional/immutable-data` violations, THE System SHALL replace mutable operations with immutable alternatives
2. WHEN arrays are modified, THE System SHALL use methods like `map`, `filter`, `concat` instead of `push`, `splice`, `sort`
3. WHEN objects are modified, THE System SHALL use spread operators or Immer instead of direct property assignment
4. THE System SHALL maintain functional equivalence after immutability fixes

### Requirement 7: Direct Mutation Prevention (P1)

**User Story:** As a developer, I want to prevent direct mutations, so that data integrity is maintained.

#### Acceptance Criteria

1. WHEN the System encounters `grain/no-mutation` violations, THE System SHALL replace direct mutations with immutable updates
2. WHEN variables are reassigned, THE System SHALL use new variable declarations or functional transformations
3. WHEN object properties are mutated, THE System SHALL use spread operators or Immer
4. THE System SHALL ensure no direct mutations remain in the codebase

### Requirement 8: This Expression Removal (P1)

**User Story:** As a developer, I want to eliminate `this` keyword usage, so that code follows functional programming principles.

#### Acceptance Criteria

1. WHEN the System encounters `functional/no-this-expressions` violations, THE System SHALL refactor to use function parameters or closures
2. WHEN classes use `this`, THE System SHALL consider refactoring to functional components or pure functions
3. THE System SHALL maintain object-oriented patterns only where necessary (React components)

### Requirement 9: Date Constructor Replacement (P1)

**User Story:** As a developer, I want consistent date handling using dayjs, so that date operations are reliable and testable.

#### Acceptance Criteria

1. WHEN the System encounters `grain/no-date-constructor` violations, THE System SHALL replace `new Date()` with `dayjs()`
2. WHEN date operations are performed, THE System SHALL use dayjs methods
3. THE System SHALL import dayjs where needed
4. THE System SHALL maintain date functionality after replacement

### Requirement 10: Try-Catch to TaskEither (P1)

**User Story:** As a developer, I want functional error handling using TaskEither, so that errors are handled explicitly and type-safely.

#### Acceptance Criteria

1. WHEN the System encounters `grain/no-try-catch` violations, THE System SHALL refactor to use TaskEither from fp-ts
2. WHEN async operations can fail, THE System SHALL wrap them in TaskEither
3. WHEN errors are caught, THE System SHALL use `tryCatch` or `fromPromise` from fp-ts
4. THE System SHALL maintain error handling behavior after refactoring

### Requirement 11: File Naming Conventions (P2)

**User Story:** As a developer, I want consistent file naming, so that the codebase is organized and discoverable.

#### Acceptance Criteria

1. WHEN the System encounters `check-file/filename-naming-convention` violations, THE System SHALL rename files to follow conventions
2. WHEN files are in io/api/, THE System SHALL use `.api.ts` suffix
3. WHEN files are in pipes/, THE System SHALL use `.pipe.ts` or `.fn.ts` suffix
4. WHEN files are in flows/, THE System SHALL use `.flow.ts` suffix
5. WHEN files are in views/, THE System SHALL use `.view.tsx` or `.container.fn.tsx` suffix
6. THE System SHALL update all imports after renaming files

### Requirement 12: Arrow Function Style (P2)

**User Story:** As a developer, I want consistent arrow function style, so that code is readable and maintainable.

#### Acceptance Criteria

1. WHEN the System encounters `arrow-body-style` violations, THE System SHALL use consistent arrow function syntax
2. WHEN arrow functions have single expressions, THE System SHALL use implicit returns
3. WHEN arrow functions have multiple statements, THE System SHALL use explicit blocks
4. THE System SHALL maintain function behavior after style fixes

### Requirement 13: Console Log Replacement (P2)

**User Story:** As a developer, I want structured logging instead of console.log, so that logs are manageable and filterable.

#### Acceptance Criteria

1. WHEN the System encounters `grain/no-console-log` violations, THE System SHALL replace console.log with logger
2. WHEN logging is needed, THE System SHALL use the functional logger from `@/io/log/logger.api`
3. WHEN debug logging is needed, THE System SHALL use appropriate log levels
4. THE System SHALL maintain logging functionality after replacement

### Requirement 14: Progress Tracking

**User Story:** As a developer, I want to track fix progress, so that I can monitor improvement over time.

#### Acceptance Criteria

1. WHEN fixes are applied, THE System SHALL run ESLint to verify violation count reduction
2. WHEN a phase is completed, THE System SHALL generate a progress report
3. THE System SHALL track violations by rule and priority
4. THE System SHALL provide before/after comparison

### Requirement 15: Automated Fix Scripts

**User Story:** As a developer, I want automated fix scripts for repetitive violations, so that fixes can be applied efficiently.

#### Acceptance Criteria

1. WHEN violations follow patterns, THE System SHALL provide automated fix scripts
2. WHEN scripts are run, THE System SHALL apply fixes safely without breaking code
3. WHEN scripts complete, THE System SHALL report number of fixes applied
4. THE System SHALL support dry-run mode for preview

### Requirement 16: Manual Fix Guidelines

**User Story:** As a developer, I want clear guidelines for manual fixes, so that complex violations can be fixed correctly.

#### Acceptance Criteria

1. WHEN violations require manual intervention, THE System SHALL provide fix examples
2. WHEN architecture refactoring is needed, THE System SHALL provide step-by-step guides
3. THE System SHALL document common patterns and anti-patterns
4. THE System SHALL provide before/after code examples

### Requirement 17: Regression Prevention

**User Story:** As a developer, I want to prevent regressions, so that fixed violations don't reappear.

#### Acceptance Criteria

1. WHEN violations are fixed, THE System SHALL run tests to verify functionality
2. WHEN fixes are committed, THE System SHALL include ESLint in CI/CD
3. THE System SHALL fail builds on new violations
4. THE System SHALL maintain zero violations after all fixes are complete

### Requirement 18: Documentation Updates

**User Story:** As a developer, I want updated documentation, so that the team understands the new patterns.

#### Acceptance Criteria

1. WHEN fixes introduce new patterns, THE System SHALL update code standards documentation
2. WHEN architecture changes are made, THE System SHALL update architecture documentation
3. THE System SHALL provide migration guides for common patterns
4. THE System SHALL document all automated fix scripts
