# Implementation Plan: ESLint Violations Fix

## Overview

Systematic execution plan for fixing 5,466 ESLint violations across 512 files, organized by priority (P0 → P1 → P2).

## Tasks

### Phase 1: P0 - Critical Issues (Week 1)

**Goal**: Fix 1,043 violations (19.1%)

- [-] 1. Fix Type Safety Violations (417 violations)
  - [x] 1.1 Create automated script for no-undef fixes
    - Write `scripts/fix-no-undef.ts` to add missing imports
    - Use TypeScript compiler API to resolve undefined references
    - Add proper type imports from @/types/
    - _Requirements: 1.1_
  
  - [x] 1.2 Run no-undef fix script
    - Execute script on all source files
    - Verify no compilation errors
    - Run tests to ensure functionality
    - _Requirements: 1.1_
  
  - [x] 1.3 Manually fix @typescript-eslint/no-explicit-any violations
    - Review 9 files with `any` types
    - Replace with specific types
    - Update type definitions as needed
    - _Requirements: 1.2_

- [x] 2. Fix Architecture Layer Dependencies (225 violations)
  - [x] 2.1 Run architecture analysis script
    - Execute `scripts/analyze-layer-dependencies.ts`
    - Generate report of all violations
    - Categorize by fix type (wrapper vs move)
    - _Requirements: 2.1, 2.2_
  
  - [x] 2.2 Create pipe wrappers for flows→utils violations
    - For each flows/ file importing utils/
    - Create corresponding wrapper in pipes/
    - Update flows/ to import from pipes/
    - _Requirements: 2.2_
  
  - [x] 2.3 Move logic from pipes→io violations to flows
    - Identify pipes/ files with IO operations
    - Move logic to appropriate flows/ file
    - Update imports and call sites
    - _Requirements: 2.3_
  
  - [x] 2.4 Verify architecture compliance
    - Run ESLint to check grain/layer-dependencies
    - Ensure zero violations
    - Run tests
    - _Requirements: 2.4_

- [x] 3. Fix Unused Code (103 violations)
  - [x] 3.1 Create automated unused code removal script
    - Write `scripts/fix-unused-vars.ts`
    - Use TypeScript compiler API to find unused exports
    - Safely remove unused variables, imports, parameters
    - _Requirements: 3.1_
  
  - [x] 3.2 Run unused code removal
    - Execute script on all files
    - Review changes for safety
    - Run tests to verify no breakage
    - _Requirements: 3.2, 3.3_

- [ ] 4. Fix Side Effects in Pure Layers (98 violations)
  - [ ] 4.1 Run side effects analysis
    - Execute `scripts/analyze-side-effects.ts`
    - Identify all side effects in pipes/ and utils/
    - Generate refactoring plan
    - _Requirements: 4.1_
  
  - [ ] 4.2 Move side effects to flows layer
    - For each violation, move side effect code to flows/
    - Keep pure logic in pipes/
    - Update call sites
    - _Requirements: 4.2, 4.3_
  
  - [ ] 4.3 Verify pure layers
    - Run ESLint to check grain/no-side-effects-in-pipes
    - Ensure zero violations
    - Run tests
    - _Requirements: 4.3_

- [ ] 5. Phase 1 Checkpoint
  - Verify all P0 violations fixed (target: 0 remaining)
  - Run full test suite
  - Generate Phase 1 completion report
  - Commit changes with message: "fix: resolve all P0 ESLint violations"

### Phase 2: P1 - Functional Programming (Weeks 2-3)

**Goal**: Fix 3,827 violations (70.0%)

- [ ] 6. Fix Readonly Type Modifiers (1,488 violations)
  - [ ] 6.1 Create readonly types fix script
    - Write `scripts/fix-readonly-types.ts`
    - Use TypeScript compiler API to parse AST
    - Add readonly to arrays: `T[]` → `readonly T[]`
    - Add readonly to object properties
    - Add readonly to function parameters
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ] 6.2 Run readonly types fix on types/ directory
    - Execute script on src/types/**/*.ts
    - Verify type compatibility
    - Run tests
    - _Requirements: 5.4_
  
  - [ ] 6.3 Run readonly types fix on remaining directories
    - Execute script on src/pipes/, src/flows/, src/io/
    - Verify no compilation errors
    - Run tests
    - _Requirements: 5.4_

- [ ] 7. Fix Immutable Data Operations (735 violations)
  - [ ] 7.1 Create immutable operations fix script
    - Write `scripts/fix-immutable-operations.ts`
    - Replace `arr.push(x)` with `[...arr, x]`
    - Replace `arr.splice(i, 1)` with `arr.filter((_, idx) => idx !== i)`
    - Replace `arr.sort()` with `[...arr].sort()`
    - Replace `arr.reverse()` with `[...arr].reverse()`
    - _Requirements: 6.1, 6.2_
  
  - [ ] 7.2 Run immutable operations fix
    - Execute script on all source files
    - Verify functional equivalence
    - Run tests
    - _Requirements: 6.3, 6.4_

- [ ] 8. Fix Direct Mutations (667 violations)
  - [ ] 8.1 Create mutation fix script
    - Write `scripts/fix-mutations.ts`
    - Replace direct property assignments with spread
    - Replace variable reassignments with new declarations
    - Use Immer for complex object updates
    - _Requirements: 7.1, 7.2_
  
  - [ ] 8.2 Run mutation fix script
    - Execute on all source files
    - Verify no mutations remain
    - Run tests
    - _Requirements: 7.3, 7.4_

- [ ] 9. Fix This Expressions (337 violations)
  - [ ] 9.1 Analyze this expression usage
    - Identify classes using `this`
    - Categorize: React components vs services
    - Plan refactoring approach for each
    - _Requirements: 8.1_
  
  - [ ] 9.2 Refactor services to functional style
    - Convert classes to factory functions with closures
    - Or convert to pure functions with state parameters
    - Update call sites
    - _Requirements: 8.2_
  
  - [ ] 9.3 Verify React components only
    - Ensure `this` only remains in React class components
    - Consider converting to functional components
    - Run tests
    - _Requirements: 8.3_

- [ ] 10. Fix Date Constructor Usage (311 violations)
  - [ ] 10.1 Create date constructor fix script
    - Write `scripts/fix-date-constructor.ts`
    - Replace `new Date()` with `dayjs()`
    - Replace Date methods with dayjs equivalents
    - Add dayjs imports where needed
    - _Requirements: 9.1, 9.2_
  
  - [ ] 10.2 Run date constructor fix
    - Execute on all source files
    - Verify date functionality preserved
    - Run tests
    - _Requirements: 9.3, 9.4_

- [ ] 11. Fix Try-Catch to TaskEither (288 violations)
  - [ ] 11.1 Document TaskEither migration pattern
    - Create guide in FUNCTIONAL_PROGRAMMING_GUIDE.md
    - Provide before/after examples
    - Document common patterns
    - _Requirements: 10.1_
  
  - [ ] 11.2 Refactor high-priority try-catch blocks
    - Start with flows/ layer (most critical)
    - Convert to TaskEither pattern
    - Update call sites to handle TaskEither
    - _Requirements: 10.2, 10.3_
  
  - [ ] 11.3 Refactor remaining try-catch blocks
    - Continue with pipes/, io/ layers
    - Ensure consistent error handling
    - Run tests
    - _Requirements: 10.4_

- [ ] 12. Phase 2 Checkpoint
  - Verify all P1 violations fixed (target: 0 remaining)
  - Run full test suite
  - Generate Phase 2 completion report
  - Commit changes with message: "refactor: apply functional programming patterns"

### Phase 3: P2 - Code Style (Week 4)

**Goal**: Fix 596 violations (10.9%)

- [ ] 13. Fix File Naming Conventions (476 violations)
  - [ ] 13.1 Create file renaming script
    - Write `scripts/fix-file-naming.ts`
    - Detect correct suffix based on directory
    - Rename files with proper suffix
    - Update all imports using TypeScript language service
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [ ] 13.2 Run file renaming script
    - Execute on all source files
    - Verify no broken imports
    - Run tests
    - _Requirements: 11.6_

- [ ] 14. Fix Arrow Function Style (194 violations)
  - [ ] 14.1 Run ESLint auto-fix for arrow-body-style
    - Execute `npm run lint:grain -- --fix`
    - Verify consistent style
    - Run tests
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 15. Fix Console Log Usage (108 violations)
  - [ ] 15.1 Create console.log replacement script
    - Write `scripts/fix-console-log.ts`
    - Replace console.log with logger.info
    - Replace console.error with logger.error
    - Replace console.warn with logger.warn
    - Add logger imports
    - _Requirements: 13.1, 13.2_
  
  - [ ] 15.2 Run console.log fix script
    - Execute on all source files
    - Verify logging functionality
    - Run tests
    - _Requirements: 13.3, 13.4_

- [ ] 16. Fix Remaining Style Issues (18 violations)
  - [ ] 16.1 Fix prefer-arrow-callback (6 violations)
    - Convert function callbacks to arrow functions
    - Run tests
    - _Requirements: 12.1_
  
  - [ ] 16.2 Fix functional/prefer-property-signatures (7 violations)
    - Convert method signatures to property signatures
    - Run tests
    - _Requirements: 12.1_
  
  - [ ] 16.3 Fix miscellaneous violations (5 violations)
    - Fix no-irregular-whitespace (2)
    - Fix prefer-const (1)
    - Fix no-empty (1)
    - Fix no-empty-pattern (1)
    - Run tests
    - _Requirements: 12.1_

- [ ] 17. Phase 3 Checkpoint
  - Verify all P2 violations fixed (target: 0 remaining)
  - Run full test suite
  - Generate Phase 3 completion report
  - Commit changes with message: "style: enforce code style conventions"

### Phase 4: Final Verification and Documentation

- [ ] 18. Final Verification
  - [ ] 18.1 Run complete ESLint check
    - Execute `npm run lint:grain`
    - Verify zero violations
    - _Requirements: 14.1_
  
  - [ ] 18.2 Run full test suite
    - Execute all unit tests
    - Execute all integration tests
    - Verify 100% pass rate
    - _Requirements: 17.1_
  
  - [ ] 18.3 Run type checking
    - Execute `npm run type-check`
    - Verify no type errors
    - _Requirements: 1.4_

- [ ] 19. Documentation Updates
  - [ ] 19.1 Update FUNCTIONAL_PROGRAMMING_GUIDE.md
    - Document new patterns used
    - Add TaskEither examples
    - Add immutability patterns
    - _Requirements: 18.1, 18.2_
  
  - [ ] 19.2 Update architecture.md
    - Refine layer dependency rules
    - Document pure layer requirements
    - _Requirements: 18.2_
  
  - [ ] 19.3 Create ESLINT_FIX_SUMMARY.md
    - Document before/after metrics
    - List all automated scripts
    - Provide migration guide
    - _Requirements: 18.3, 18.4_
  
  - [ ] 19.4 Update scripts/README.md
    - Document all fix scripts
    - Provide usage examples
    - Document dry-run mode
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 16.1, 16.2, 16.3, 16.4_

- [ ] 20. CI/CD Integration
  - [ ] 20.1 Add ESLint to CI pipeline
    - Update GitHub Actions workflow
    - Fail builds on ESLint violations
    - _Requirements: 17.2, 17.3_
  
  - [ ] 20.2 Add pre-commit hook
    - Run ESLint on staged files
    - Prevent commits with violations
    - _Requirements: 17.4_

- [ ] 21. Final Report
  - Generate comprehensive completion report
  - Document lessons learned
  - Archive all reports and scripts
  - Celebrate! 🎉

## Progress Tracking

Use the progress tracking script:

```bash
# Check current progress
./scripts/check-lint-progress.sh

# Generate detailed report
node scripts/generate-eslint-report.js
```

## Notes

- Each phase should be completed before moving to the next
- Run tests after each major change
- Commit frequently with descriptive messages
- Use dry-run mode for scripts before applying changes
- Keep backup of original files for critical changes
- Document any manual fixes that don't fit automated patterns
