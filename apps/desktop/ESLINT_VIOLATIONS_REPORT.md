# ESLint Violations Report

**Generated**: 2026-01-12
**Total Problems**: 5,513 (5,070 errors, 443 warnings)
**Potentially Auto-fixable**: 1,703 (1,567 errors, 136 warnings)

## Summary

The codebase currently has significant violations across multiple categories. This report provides a breakdown of the issues and the path forward.

## Violation Categories

### 1. Architecture Violations (grain/layer-dependencies)
- **Issue**: Layers depending on incorrect layers (e.g., flows → utils)
- **Impact**: High - Breaks architectural principles
- **Priority**: P0
- **Example**: `flows/backup/backup.flow.ts` depends on `utils` layer

### 2. Functional Programming Violations

#### 2.1 Console Usage (grain/no-console-log)
- **Issue**: Direct console.log/error/warn usage
- **Impact**: Medium - Should use logger API
- **Priority**: P1
- **Auto-fixable**: Partially

#### 2.2 Date Constructor (grain/no-date-constructor)
- **Issue**: Using `new Date()` or `Date.now()`
- **Impact**: Medium - Should use dayjs
- **Priority**: P1
- **Auto-fixable**: Yes
- **Examples**:
  - `new Date()` → `dayjs()`
  - `Date.now()` → `dayjs().valueOf()`

#### 2.3 Try-Catch (grain/no-try-catch)
- **Issue**: Using try-catch instead of TaskEither
- **Impact**: High - Breaks functional error handling
- **Priority**: P1
- **Auto-fixable**: No (requires manual refactoring)

#### 2.4 Mutation (grain/no-mutation)
- **Issue**: Direct object/array mutation
- **Impact**: High - Breaks immutability
- **Priority**: P1
- **Auto-fixable**: Partially

#### 2.5 Lodash Usage (grain/no-lodash)
- **Issue**: Using lodash instead of es-toolkit
- **Impact**: Low - Performance and bundle size
- **Priority**: P2
- **Auto-fixable**: Yes

### 3. Type Safety Violations

#### 3.1 Readonly Arrays (functional/prefer-readonly-type)
- **Issue**: Arrays without readonly modifier
- **Impact**: Medium - Type safety
- **Priority**: P2
- **Auto-fixable**: Yes

#### 3.2 Immutable Data (functional/immutable-data)
- **Issue**: Modifying existing objects/arrays
- **Impact**: High - Breaks immutability
- **Priority**: P1
- **Auto-fixable**: No

### 4. Code Style Violations

#### 4.1 Arrow Body Style (arrow-body-style)
- **Issue**: Unnecessary braces in arrow functions
- **Impact**: Low - Code readability
- **Priority**: P3
- **Auto-fixable**: Yes

#### 4.2 File Naming (check-file/filename-naming-convention)
- **Issue**: Files not following naming conventions
- **Impact**: Medium - Consistency
- **Priority**: P2
- **Auto-fixable**: No (requires file renaming)

### 5. Environment Violations

#### 5.1 Undefined Globals (no-undef)
- **Issue**: Using browser globals without declaration
- **Impact**: Medium - Runtime errors
- **Priority**: P1
- **Examples**: `window`, `localStorage`, `clearInterval`

#### 5.2 This Expressions (functional/no-this-expressions)
- **Issue**: Using `this` in classes
- **Impact**: Medium - Should use functions
- **Priority**: P2

## Breakdown by File Type

### Most Affected Files
1. `flows/backup/backup.flow.ts` - 40+ violations
2. `flows/export/*.flow.ts` - Multiple violations
3. `flows/migration/*.flow.ts` - Multiple violations
4. Various other flow and pipe files

## Recommended Fix Order

### Phase 1: Critical Architecture Fixes (P0)
1. Fix layer dependency violations
2. Refactor files that violate architecture rules
3. **Estimated**: 2-3 days

### Phase 2: Functional Programming Fixes (P1)
1. Replace console.* with logger API (automated)
2. Replace Date constructor with dayjs (automated)
3. Convert try-catch to TaskEither (manual)
4. Fix mutation violations (manual)
5. **Estimated**: 3-5 days

### Phase 3: Type Safety Improvements (P2)
1. Add readonly modifiers (automated)
2. Fix immutable data violations (manual)
3. Rename files to match conventions (manual)
4. **Estimated**: 2-3 days

### Phase 4: Code Style Cleanup (P3)
1. Simplify arrow functions (automated)
2. Other style fixes (automated)
3. **Estimated**: 1 day

## Auto-fix Potential

**Can be auto-fixed**: ~1,703 violations (31%)
**Require manual fix**: ~3,810 violations (69%)

### Auto-fixable Rules
- `arrow-body-style`
- `functional/prefer-readonly-type` (partially)
- `grain/no-date-constructor` (with codemod)
- `grain/no-console-log` (with codemod)

### Manual Fix Required
- `grain/layer-dependencies`
- `grain/no-try-catch`
- `grain/no-mutation`
- `functional/immutable-data`
- `check-file/filename-naming-convention`

## Next Steps

1. **Immediate**: Review this report with the team
2. **Week 1**: Start with Phase 1 (Architecture fixes)
3. **Week 2**: Continue with Phase 2 (Functional programming)
4. **Week 3**: Phase 3 (Type safety)
5. **Week 4**: Phase 4 (Code style) + Final verification

## Success Criteria

- [ ] ESLint errors = 0
- [ ] ESLint warnings < 50
- [ ] All tests passing
- [ ] Build successful
- [ ] No regression in functionality

## Notes

- Some violations may be false positives and need rule configuration adjustments
- The backup.flow.ts file has significant issues and may need complete refactoring
- Consider creating a "legacy" directory for files that can't be immediately fixed
- Set up pre-commit hooks to prevent new violations
