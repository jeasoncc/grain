# Quick Fix Guide for ESLint Violations

This guide provides quick reference for fixing the most common ESLint violations in the codebase.

## 1. Console.log → Logger API

### ❌ Before
```typescript
console.log('User logged in:', userId);
console.error('Failed to save:', error);
console.warn('Deprecated API used');
console.debug('Debug info:', data);
```

### ✅ After
```typescript
import { logger } from '@/io/log/logger.api';

logger.info('User logged in', { userId });
logger.error('Failed to save', { error });
logger.warn('Deprecated API used');
logger.debug('Debug info', { data });
```

## 2. Date Constructor → dayjs

### ❌ Before
```typescript
const now = new Date();
const timestamp = Date.now();
const specificDate = new Date('2023-01-01');
const time = date.getTime();
```

### ✅ After
```typescript
import dayjs from 'dayjs';

const now = dayjs();
const timestamp = dayjs().valueOf();
const specificDate = dayjs('2023-01-01');
const time = dayjs(date).valueOf();
```

## 3. Try-Catch → TaskEither

### ❌ Before
```typescript
async function fetchData() {
  try {
    const result = await api.getData();
    return result;
  } catch (error) {
    console.error(error);
    return null;
  }
}
```

### ✅ After
```typescript
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

const fetchData = (): TE.TaskEither<AppError, Data> =>
  pipe(
    TE.tryCatch(
      () => api.getData(),
      (error) => ({
        type: 'FETCH_ERROR' as const,
        message: String(error),
      })
    )
  );
```

## 4. Object Mutation → Immutable Updates

### ❌ Before
```typescript
const user = { name: 'John', age: 30 };
user.age = 31; // ❌ Mutation

const items = [1, 2, 3];
items.push(4); // ❌ Mutation
```

### ✅ After
```typescript
// Using spread operator
const user = { name: 'John', age: 30 };
const updatedUser = { ...user, age: 31 }; // ✅

const items = [1, 2, 3];
const newItems = [...items, 4]; // ✅

// Using Immer for complex updates
import { produce } from 'immer';

const updatedUser = produce(user, draft => {
  draft.age = 31;
}); // ✅
```

## 5. Lodash → es-toolkit

### ❌ Before
```typescript
import _ from 'lodash';

const debounced = _.debounce(fn, 300);
const cloned = _.cloneDeep(obj);
const equal = _.isEqual(a, b);
```

### ✅ After
```typescript
import { debounce, cloneDeep, isEqual } from 'es-toolkit';

const debounced = debounce(fn, 300);
const cloned = cloneDeep(obj);
const equal = isEqual(a, b);
```

## 6. Readonly Arrays

### ❌ Before
```typescript
interface Config {
  items: string[];
  values: number[];
}

function process(items: string[]) {
  // ...
}
```

### ✅ After
```typescript
interface Config {
  readonly items: readonly string[];
  readonly values: readonly number[];
}

function process(items: readonly string[]) {
  // ...
}
```

## 7. Arrow Function Body Style

### ❌ Before
```typescript
const double = (x: number) => { return x * 2; };
const getName = (user: User) => { return user.name; };
```

### ✅ After
```typescript
const double = (x: number) => x * 2;
const getName = (user: User) => user.name;
```

## 8. Layer Dependencies

### ❌ Before
```typescript
// In flows/example.flow.ts
import { formatDate } from '@/utils/date.util'; // ❌ flows → utils
```

### ✅ After
```typescript
// Create a pipe in pipes/date/format.pipe.ts
export const formatDatePipe = (date: Date): string => {
  // formatting logic
};

// In flows/example.flow.ts
import { formatDatePipe } from '@/pipes/date/format.pipe'; // ✅ flows → pipes
```

## 9. File Naming Conventions

### ❌ Before
```
src/pipes/transform.ts          # Missing .pipe.ts
src/flows/create-user.ts        # Missing .flow.ts
src/io/api/workspace.ts         # Missing .api.ts
```

### ✅ After
```
src/pipes/transform.pipe.ts     # ✅
src/flows/create-user.flow.ts   # ✅
src/io/api/workspace.api.ts     # ✅
```

## 10. Browser Globals

### ❌ Before
```typescript
const data = localStorage.getItem('key'); // ❌ no-undef
window.addEventListener('resize', handler); // ❌ no-undef
```

### ✅ After
```typescript
// Add type declarations or use proper imports
const data = window.localStorage.getItem('key'); // ✅
globalThis.window.addEventListener('resize', handler); // ✅

// Or create a storage API in io/storage/
import { getItem } from '@/io/storage/local.storage';
const data = getItem('key'); // ✅
```

## Automated Fix Commands

### Auto-fix what can be fixed
```bash
npm run lint:grain -- --fix
```

### Fix specific file
```bash
npx eslint --config eslint.config.grain.js --fix src/path/to/file.ts
```

### Check specific rule
```bash
npx eslint --config eslint.config.grain.js --rule 'grain/no-console-log: error' src/**/*.ts
```

## Batch Replacement Scripts

### Replace console.log (use with caution)
```bash
# Dry run first
find src -name "*.ts" -type f -exec grep -l "console\\.log" {} \;

# Then replace
find src -name "*.ts" -type f -exec sed -i 's/console\.log(/logger.info(/g' {} \;
```

### Replace Date.now()
```bash
find src -name "*.ts" -type f -exec sed -i 's/Date\.now()/dayjs().valueOf()/g' {} \;
```

## Tips

1. **Start with auto-fixable issues**: Run `--fix` first to handle easy cases
2. **Fix by priority**: P0 (architecture) → P1 (functional) → P2 (types) → P3 (style)
3. **Test after each fix**: Run tests to ensure no regressions
4. **Commit frequently**: Small commits make it easier to revert if needed
5. **Use IDE refactoring**: Many IDEs can help with renaming and refactoring

## Common Pitfalls

1. **Don't blindly replace**: Understand the context before fixing
2. **Test thoroughly**: Especially for try-catch → TaskEither conversions
3. **Check dependencies**: File renaming requires updating all imports
4. **Preserve behavior**: Ensure fixes don't change functionality
5. **Review auto-fixes**: Some auto-fixes may not be semantically correct

## Getting Help

- Check the full report: `ESLINT_VIOLATIONS_REPORT.md`
- Review architecture: `.kiro/steering/architecture.md`
- Functional programming guide: `FUNCTIONAL_PROGRAMMING_GUIDE.md`
- ESLint rules: `eslint-plugin-grain/src/rules/`
