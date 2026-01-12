# Design Document: ESLint Violations Fix

## Overview

This document outlines the technical approach for systematically fixing 5,466 ESLint violations across 512 files in the Grain desktop application. The design emphasizes automated fixes where possible, clear manual fix patterns, and regression prevention.

## Architecture

### Fix Strategy Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    Fix Strategy Layers                       │
└─────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────┐
    │   1. Automated Scripts (70% of fixes) │
    │   - Pattern-based replacements        │
    │   - AST transformations               │
    │   - Batch operations                  │
    └──────────────┬───────────────────────┘
                   │
    ┌──────────────▼───────────────────────┐
    │   2. Semi-Automated (20% of fixes)    │
    │   - Script generates candidates       │
    │   - Manual review required            │
    │   - Apply with confirmation           │
    └──────────────┬───────────────────────┘
                   │
    ┌──────────────▼───────────────────────┐
    │   3. Manual Fixes (10% of fixes)      │
    │   - Complex refactoring               │
    │   - Architecture changes              │
    │   - Case-by-case analysis             │
    └──────────────────────────────────────┘
```

### Priority-Based Execution

```
Phase 1 (P0) → Phase 2 (P1) → Phase 3 (P2)
   ↓              ↓              ↓
Critical      Functional      Style
1,043 fixes   3,827 fixes    596 fixes
```

## Components and Interfaces

### 1. Automated Fix Scripts

#### Script: `fix-readonly-types.ts`

**Purpose**: Add readonly modifiers to arrays and object properties

**Strategy**:
- Use TypeScript Compiler API to parse AST
- Identify array types without readonly
- Identify object properties without readonly
- Add readonly modifiers
- Preserve formatting

**Example**:
```typescript
// Before
const items: string[] = [];
interface User { name: string; }

// After
const items: readonly string[] = [];
interface User { readonly name: string; }
```

#### Script: `fix-immutable-operations.ts`

**Purpose**: Replace mutable array operations with immutable alternatives

**Strategy**:
- Pattern matching for mutable operations
- Replace with immutable equivalents
- Handle common patterns:
  - `arr.push(x)` → `[...arr, x]`
  - `arr.splice(i, 1)` → `arr.filter((_, idx) => idx !== i)`
  - `arr.sort()` → `[...arr].sort()`

**Example**:
```typescript
// Before
items.push(newItem);
items.splice(index, 1);

// After
items = [...items, newItem];
items = items.filter((_, i) => i !== index);
```

#### Script: `fix-date-constructor.ts`

**Purpose**: Replace `new Date()` with `dayjs()`

**Strategy**:
- Find all `new Date()` expressions
- Replace with `dayjs()` equivalent
- Add dayjs import if missing
- Handle Date methods → dayjs methods

**Example**:
```typescript
// Before
const now = new Date();
const formatted = now.toISOString();

// After
import dayjs from 'dayjs';
const now = dayjs();
const formatted = now.toISOString();
```

#### Script: `fix-console-log.ts`

**Purpose**: Replace console.log with functional logger

**Strategy**:
- Find all console.log statements
- Replace with logger.info()
- Add logger import
- Preserve log message and context

**Example**:
```typescript
// Before
console.log('User created:', user);

// After
import { logger } from '@/io/log/logger.api';
logger.info('User created', { user });
```

#### Script: `fix-arrow-body-style.ts`

**Purpose**: Enforce consistent arrow function style

**Strategy**:
- Single expression → implicit return
- Multiple statements → explicit block
- Use ESLint --fix for this rule

**Example**:
```typescript
// Before
const double = (x) => { return x * 2; };

// After
const double = (x) => x * 2;
```

### 2. Semi-Automated Fixes

#### Script: `analyze-layer-dependencies.ts`

**Purpose**: Identify and suggest fixes for architecture violations

**Strategy**:
1. Parse all imports in flows/, pipes/, io/
2. Check against architecture rules
3. Generate fix suggestions:
   - flows → utils: Create pipe wrapper
   - pipes → io: Move to flows
4. Output report with suggested changes
5. Manual review and apply

**Output Format**:
```json
{
  "file": "src/flows/backup/backup.flow.ts",
  "violation": "flows importing from utils",
  "suggestion": "Create pipe wrapper in pipes/backup/",
  "autoFixable": false
}
```

#### Script: `analyze-side-effects.ts`

**Purpose**: Detect side effects in pure layers

**Strategy**:
1. Parse pipes/ and utils/ files
2. Detect side effect patterns:
   - API calls (fetch, invoke)
   - State mutations (zustand)
   - Console/logging
   - File I/O
3. Suggest moving to flows/
4. Generate refactoring plan

### 3. Manual Fix Patterns

#### Pattern 1: Try-Catch to TaskEither

**Complexity**: High  
**Frequency**: 288 occurrences

**Before**:
```typescript
async function loadUser(id: string): Promise<User> {
  try {
    const response = await fetch(`/api/users/${id}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to load user:', error);
    throw error;
  }
}
```

**After**:
```typescript
import { TaskEither, tryCatch } from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

function loadUser(id: string): TaskEither<AppError, User> {
  return pipe(
    tryCatch(
      () => fetch(`/api/users/${id}`).then(r => r.json()),
      (error) => createAppError('FETCH_ERROR', 'Failed to load user', error)
    )
  );
}
```

**Steps**:
1. Identify try-catch block
2. Extract async operation
3. Wrap in `tryCatch` from fp-ts
4. Convert error to AppError
5. Return TaskEither
6. Update call sites to handle TaskEither

#### Pattern 2: This Expression Removal

**Complexity**: Medium  
**Frequency**: 337 occurrences

**Before**:
```typescript
class UserService {
  private users: User[] = [];
  
  addUser(user: User) {
    this.users.push(user);
  }
  
  getUsers() {
    return this.users;
  }
}
```

**After**:
```typescript
// Option 1: Functional with closure
function createUserService() {
  let users: readonly User[] = [];
  
  return {
    addUser: (user: User) => {
      users = [...users, user];
    },
    getUsers: () => users
  };
}

// Option 2: Pure functions with state parameter
function addUser(users: readonly User[], user: User): readonly User[] {
  return [...users, user];
}

function getUsers(users: readonly User[]): readonly User[] {
  return users;
}
```

#### Pattern 3: File Renaming

**Complexity**: Low  
**Frequency**: 476 occurrences

**Strategy**:
1. Identify file naming violations
2. Determine correct suffix based on directory:
   - `io/api/` → `.api.ts`
   - `pipes/` → `.pipe.ts` or `.fn.ts`
   - `flows/` → `.flow.ts`
   - `views/` → `.view.tsx` or `.container.fn.tsx`
3. Rename file
4. Update all imports (use TypeScript language service)

**Script**: `fix-file-naming.ts`
```typescript
// Automated with import updates
```

## Data Models

### Violation Record

```typescript
interface ViolationRecord {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly severity: 'error' | 'warning';
  readonly rule: string;
  readonly message: string;
  readonly fixType: 'auto' | 'semi-auto' | 'manual';
}
```

### Fix Report

```typescript
interface FixReport {
  readonly timestamp: string;
  readonly phase: 'P0' | 'P1' | 'P2';
  readonly violationsBefore: number;
  readonly violationsAfter: number;
  readonly violationsFixed: number;
  readonly fixesByRule: ReadonlyMap<string, number>;
  readonly filesModified: readonly string[];
}
```

### Progress Tracker

```typescript
interface ProgressTracker {
  readonly totalViolations: number;
  readonly fixedViolations: number;
  readonly remainingViolations: number;
  readonly percentComplete: number;
  readonly phaseProgress: {
    readonly P0: ProgressPhase;
    readonly P1: ProgressPhase;
    readonly P2: ProgressPhase;
  };
}

interface ProgressPhase {
  readonly total: number;
  readonly fixed: number;
  readonly remaining: number;
}
```

## Error Handling

All fix scripts follow functional error handling:

```typescript
import { TaskEither } from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

function applyFix(file: string): TaskEither<FixError, FixResult> {
  return pipe(
    readFile(file),
    TE.chain(parseAST),
    TE.chain(applyTransformation),
    TE.chain(writeFile),
    TE.mapLeft(error => ({
      type: 'FIX_ERROR',
      file,
      message: error.message
    }))
  );
}
```

## Testing Strategy

### Unit Tests

Test individual fix functions:

```typescript
describe('fixReadonlyTypes', () => {
  it('should add readonly to array types', () => {
    const input = 'const items: string[] = [];';
    const expected = 'const items: readonly string[] = [];';
    expect(fixReadonlyTypes(input)).toBe(expected);
  });
  
  it('should add readonly to object properties', () => {
    const input = 'interface User { name: string; }';
    const expected = 'interface User { readonly name: string; }';
    expect(fixReadonlyTypes(input)).toBe(expected);
  });
});
```

### Integration Tests

Test fix scripts on real files:

```typescript
describe('fix-readonly-types script', () => {
  it('should fix all readonly violations in test file', async () => {
    const testFile = 'test-fixtures/readonly-violations.ts';
    await runFixScript('fix-readonly-types', testFile);
    
    const violations = await runESLint(testFile);
    const readonlyViolations = violations.filter(
      v => v.rule === 'functional/prefer-readonly-type'
    );
    
    expect(readonlyViolations).toHaveLength(0);
  });
});
```

### Regression Tests

Ensure fixes don't break functionality:

```typescript
describe('Regression tests', () => {
  beforeAll(async () => {
    await runAllFixScripts();
  });
  
  it('should pass all existing unit tests', async () => {
    const result = await runTests();
    expect(result.failed).toBe(0);
  });
  
  it('should have zero ESLint violations', async () => {
    const violations = await runESLint('src/**/*.{ts,tsx}');
    expect(violations.length).toBe(0);
  });
});
```

## Implementation Phases

### Phase 1: P0 - Critical (Week 1)

**Goal**: Fix 1,043 violations

1. **Day 1-2**: Type Safety
   - Fix `no-undef` (408) - Automated script
   - Fix `@typescript-eslint/no-explicit-any` (9) - Manual

2. **Day 3-4**: Architecture
   - Fix `grain/layer-dependencies` (225) - Semi-automated
   - Fix `grain/no-side-effects-in-pipes` (98) - Manual

3. **Day 5**: Cleanup
   - Fix `@typescript-eslint/no-unused-vars` (103) - Automated
   - Verify all P0 fixes
   - Run tests

### Phase 2: P1 - Functional Programming (Weeks 2-3)

**Goal**: Fix 3,827 violations

1. **Week 2, Day 1-2**: Immutability
   - Fix `functional/prefer-readonly-type` (1,488) - Automated
   - Fix `functional/immutable-data` (735) - Automated

2. **Week 2, Day 3-5**: Mutations
   - Fix `grain/no-mutation` (667) - Automated
   - Fix `functional/no-this-expressions` (337) - Manual

3. **Week 3, Day 1-2**: Date Handling
   - Fix `grain/no-date-constructor` (311) - Automated

4. **Week 3, Day 3-5**: Error Handling
   - Fix `grain/no-try-catch` (288) - Manual
   - Fix `no-param-reassign` (1) - Manual

### Phase 3: P2 - Code Style (Week 4)

**Goal**: Fix 596 violations

1. **Day 1-2**: File Naming
   - Fix `check-file/filename-naming-convention` (476) - Automated

2. **Day 3**: Arrow Functions & Logging
   - Fix `arrow-body-style` (194) - Automated
   - Fix `grain/no-console-log` (108) - Automated

3. **Day 4**: Minor Fixes
   - Fix remaining style issues (18) - Automated

4. **Day 5**: Final Verification
   - Run full test suite
   - Verify zero violations
   - Generate final report

## Monitoring and Metrics

### Progress Dashboard

Track progress in real-time:

```bash
# Run progress check
./scripts/check-lint-progress.sh

# Output:
# ========================================
# ESLint Progress Report
# ========================================
# Total Violations: 5,466
# Fixed: 1,043 (19.1%)
# Remaining: 4,423 (80.9%)
#
# By Priority:
# P0: 0 / 1,043 (100% complete)
# P1: 0 / 3,827 (0% complete)
# P2: 0 / 596 (0% complete)
```

### Automated Reporting

Generate reports after each phase:

```typescript
interface PhaseReport {
  readonly phase: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly violationsBefore: number;
  readonly violationsAfter: number;
  readonly violationsFixed: number;
  readonly filesModified: number;
  readonly testsRun: number;
  readonly testsPassed: number;
  readonly testsFailed: number;
}
```

## Rollback Strategy

If fixes cause issues:

1. **Git-based rollback**: Each phase is a separate commit
2. **File-level rollback**: Revert specific files if needed
3. **Rule-level rollback**: Disable specific rules temporarily

```bash
# Rollback entire phase
git revert HEAD

# Rollback specific file
git checkout HEAD~1 -- src/path/to/file.ts

# Temporarily disable rule
# In eslint.config.grain.js
rules: {
  'functional/prefer-readonly-type': 'off' // Temporarily disabled
}
```

## Documentation Updates

After completion:

1. Update `FUNCTIONAL_PROGRAMMING_GUIDE.md` with new patterns
2. Update `architecture.md` with refined rules
3. Create `ESLINT_FIX_SUMMARY.md` with before/after metrics
4. Document all automated scripts in `scripts/README.md`
