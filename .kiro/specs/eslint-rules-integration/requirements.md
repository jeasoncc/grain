# Requirements Document

## Introduction

This specification defines the integration of all agent hooks and steering file rules into ESLint configuration to enforce Grain's functional programming architecture automatically during development.

## Glossary

- **Agent_Hook**: Automated code quality checks triggered by file edits
- **Steering_Rules**: Architectural guidelines from .kiro/steering/ files
- **ESLint_Plugin**: Custom ESLint plugin to enforce Grain-specific rules
- **Architecture_Layer**: Specific directory with defined responsibilities (views/, hooks/, flows/, pipes/, io/, state/, utils/, types/)
- **Functional_Programming**: Programming paradigm emphasizing pure functions, immutability, and explicit error handling
- **TaskEither**: fp-ts type for handling asynchronous operations with explicit error handling

## Requirements

### Requirement 1: Agent Hook Rules Integration

**User Story:** As a developer, I want agent hook rules automatically enforced by ESLint, so that I get immediate feedback during coding without waiting for file save triggers.

#### Acceptance Criteria

1. WHEN I use try-catch statements THEN ESLint SHALL report an error suggesting TaskEither usage
2. WHEN I use console.log THEN ESLint SHALL report an error suggesting logger usage with proper format
3. WHEN I use Date() or Date.now() THEN ESLint SHALL report an error suggesting dayjs usage
4. WHEN I use lodash imports THEN ESLint SHALL report an error suggesting es-toolkit usage
5. WHEN I use array.push() or direct object mutation THEN ESLint SHALL report an error suggesting immutable operations
6. WHEN I import from wrong architecture layers THEN ESLint SHALL report dependency violation errors

### Requirement 2: Architecture Layer Enforcement

**User Story:** As a developer, I want ESLint to enforce directory-specific rules, so that I maintain proper separation of concerns across architecture layers.

#### Acceptance Criteria

1. WHEN files are in pipes/ directory THEN ESLint SHALL prohibit React imports, IO operations, and side effects
2. WHEN files are in views/ directory THEN ESLint SHALL prohibit direct imports from io/, flows/, pipes/, state/ (except containers)
3. WHEN files are in hooks/ directory THEN ESLint SHALL prohibit imports from views/ and routes/
4. WHEN files are in flows/ directory THEN ESLint SHALL prohibit React imports and UI layer dependencies
5. WHEN files are in io/ directory THEN ESLint SHALL prohibit React imports and UI layer dependencies
6. WHEN files are in state/ directory THEN ESLint SHALL prohibit React imports (except type definitions)
7. WHEN files are in utils/ directory THEN ESLint SHALL only allow dependencies on types/
8. WHEN files are in types/ directory THEN ESLint SHALL prohibit runtime dependencies

### Requirement 3: File Naming Convention Enforcement

**User Story:** As a developer, I want ESLint to enforce file naming conventions, so that the codebase maintains consistent naming patterns.

#### Acceptance Criteria

1. WHEN files are in pipes/ directory THEN ESLint SHALL require .pipe.ts suffix
2. WHEN files are in flows/ directory THEN ESLint SHALL require .flow.ts suffix
3. WHEN files are in io/api/ directory THEN ESLint SHALL require .api.ts suffix
4. WHEN files are in io/storage/ directory THEN ESLint SHALL require .storage.ts suffix
5. WHEN files are in state/ directory THEN ESLint SHALL require .state.ts suffix
6. WHEN files are in hooks/ directory THEN ESLint SHALL require use-*.ts naming pattern
7. WHEN files are in views/ directory THEN ESLint SHALL require .view.fn.tsx or .container.fn.tsx suffix
8. WHEN files are in utils/ directory THEN ESLint SHALL require .util.ts suffix

### Requirement 4: Functional Programming Pattern Enforcement

**User Story:** As a developer, I want ESLint to enforce functional programming patterns, so that I write consistent, maintainable code following fp-ts conventions.

#### Acceptance Criteria

1. WHEN I use nested function calls THEN ESLint SHALL suggest pipe() usage for better readability
2. WHEN I use Promise.catch() THEN ESLint SHALL suggest TaskEither.tryCatch() usage
3. WHEN I use throw statements THEN ESLint SHALL suggest returning TaskEither.left() instead
4. WHEN I use async/await with try-catch THEN ESLint SHALL suggest TaskEither pipeline usage
5. WHEN I access global objects in pure function directories THEN ESLint SHALL report side effect violations

### Requirement 5: Component Pattern Enforcement

**User Story:** As a developer, I want ESLint to enforce component separation patterns, so that I maintain clean architecture between container and view components.

#### Acceptance Criteria

1. WHEN view components access stores directly THEN ESLint SHALL report architecture violation
2. WHEN view components have business logic THEN ESLint SHALL suggest moving logic to containers or flows
3. WHEN container components have JSX rendering logic THEN ESLint SHALL suggest extracting to view components
4. WHEN components don't follow memo() pattern THEN ESLint SHALL suggest performance optimization

### Requirement 6: Testing Requirements Enforcement

**User Story:** As a developer, I want ESLint to enforce testing requirements, so that all pure functions and business logic have corresponding tests.

#### Acceptance Criteria

1. WHEN I create .fn.ts files THEN ESLint SHALL require corresponding .fn.test.ts files
2. WHEN I create .flow.ts files THEN ESLint SHALL require corresponding .flow.test.ts files
3. WHEN I create .pipe.ts files THEN ESLint SHALL require corresponding .pipe.test.ts files
4. WHEN I create view components THEN ESLint SHALL suggest corresponding test files
5. WHEN test files are missing THEN ESLint SHALL provide clear guidance on test file location and naming

### Requirement 7: Import Organization and Validation

**User Story:** As a developer, I want ESLint to organize and validate imports, so that dependencies are clean and follow architectural constraints.

#### Acceptance Criteria

1. WHEN I import from external libraries THEN ESLint SHALL group them separately from internal imports
2. WHEN I import from internal modules THEN ESLint SHALL enforce alias usage (@/ prefix)
3. WHEN I have unused imports THEN ESLint SHALL automatically remove them
4. WHEN I import deprecated modules THEN ESLint SHALL suggest modern alternatives
5. WHEN I import from restricted paths THEN ESLint SHALL provide specific architectural guidance

### Requirement 8: Error Message Quality and Guidance

**User Story:** As a developer, I want ESLint error messages to provide clear guidance, so that I can quickly understand and fix architectural violations.

#### Acceptance Criteria

1. WHEN ESLint reports errors THEN messages SHALL include specific examples of correct usage
2. WHEN architecture violations occur THEN messages SHALL explain the architectural principle being violated
3. WHEN suggesting alternatives THEN messages SHALL provide code snippets showing the correct pattern
4. WHEN multiple fixes are possible THEN messages SHALL prioritize the most appropriate solution
5. WHEN errors relate to fp-ts patterns THEN messages SHALL include relevant fp-ts documentation links

### Requirement 9: Performance and Developer Experience

**User Story:** As a developer, I want ESLint rules to run efficiently, so that my development workflow is not slowed down by linting.

#### Acceptance Criteria

1. WHEN ESLint runs THEN it SHALL complete within 2 seconds for typical file changes
2. WHEN multiple files are linted THEN rules SHALL be optimized for batch processing
3. WHEN IDE integration is used THEN rules SHALL provide real-time feedback without lag
4. WHEN false positives occur THEN rules SHALL provide escape hatches with clear documentation
5. WHEN rules conflict THEN the system SHALL prioritize architectural correctness over style preferences

### Requirement 10: Configuration Management and Extensibility

**User Story:** As a developer, I want ESLint configuration to be maintainable and extensible, so that new architectural patterns can be easily added.

#### Acceptance Criteria

1. WHEN new steering rules are added THEN they SHALL be easily integrated into ESLint configuration
2. WHEN architectural patterns evolve THEN ESLint rules SHALL be updated through configuration changes
3. WHEN team-specific rules are needed THEN the system SHALL support custom rule extensions
4. WHEN rules need debugging THEN the system SHALL provide detailed rule execution information
5. WHEN configuration changes THEN the system SHALL validate rule consistency and completeness