# Detailed Failure Analysis

## 1. Naming Rules Failures (6 tests)

### 1.1 File Naming in pipes/ Layer

**Test:** `should detect all invalid file names in pipes/ layer`  
**Counterexample:** `["a.ts"]`

**Expected Behavior:**
- Files in `pipes/` should end with `.pipe.ts` or `.fn.ts`
- File `a.ts` should be flagged as invalid

**Actual Behavior:**
- Rule is not detecting the invalid filename
- Test returns `false` instead of detecting the error

**Likely Cause:**
- Rule `file-naming` may not be properly checking the layer
- Pattern matching might not be working
- Rule might not be triggered for the test file path

**Debug Steps:**
```typescript
// Check if rule is being triggered
const code = `const x = 1;`;
const fullPath = `/src/pipes/a.ts`;
const errors = runLint(code, { 'grain/file-naming': 'error' }, fullPath);
console.log('Errors:', errors);
```

### 1.2 File Naming in flows/ Layer

**Test:** `should detect invalid file names in flows/ layer`  
**Counterexample:** `["a.ts"]`

**Expected Behavior:**
- Files in `flows/` should end with `.flow.ts` or `.action.ts`
- File `a.ts` should be flagged as invalid

**Actual Behavior:**
- Same issue as pipes/ layer

**Likely Cause:**
- Same root cause as 1.1

### 1.3 Variable Name Length

**Test:** `should detect all variables shorter than minimum length`  
**Counterexample:** `["A"]`

**Expected Behavior:**
- Variables shorter than 3 characters should be flagged
- Single letter `A` should be detected

**Actual Behavior:**
- Rule not detecting short variable names

**Likely Cause:**
- Rule `variable-naming` may have incorrect length check
- Might be checking `name.length < 3` but not triggering
- Could be an issue with uppercase letters

**Debug Steps:**
```typescript
const code = `const A = 123;`;
const errors = runLint(code, { 'grain/variable-naming': 'error' });
console.log('Errors:', errors);
// Check if rule is even running
```

### 1.4 Function Name Verb Prefix

**Test:** `should warn for functions not starting with verb`  
**Counterexample:** `["a00"]`

**Expected Behavior:**
- Functions should start with a verb (get, set, create, etc.)
- Function `a00` should be flagged

**Actual Behavior:**
- Rule not detecting non-verb function names

**Likely Cause:**
- Rule `function-naming` may not be checking verb prefixes correctly
- Verb list might not be loaded
- Pattern matching might be broken

### 1.5 Boolean Naming

**Test:** `should detect booleans without proper prefix`  
**Counterexample:** `["A00"]`

**Expected Behavior:**
- Boolean variables should start with is/has/can/should
- Variable `A00` with type `boolean` should be flagged

**Actual Behavior:**
- Rule not detecting improper boolean names

**Likely Cause:**
- Rule `boolean-naming` may not be checking type annotations
- Prefix check might not be working

### 1.6 Constant Naming

**Test:** `should detect constants not in SCREAMING_SNAKE_CASE`  
**Counterexample:** `["a00"]`

**Expected Behavior:**
- Constants should be in SCREAMING_SNAKE_CASE
- Constant `a00` should be flagged

**Actual Behavior:**
- Rule not detecting non-SCREAMING_SNAKE_CASE constants

**Likely Cause:**
- Rule `constant-naming` may not be checking pattern correctly
- Regex might be wrong

---

## 2. React Rules Failures (9 tests)

### 2.1 Component Without memo

**Test:** `should detect components without memo wrapper`  
**Counterexample:** `["Button"]`

**Code Being Tested:**
```typescript
const Button = () => <button>Click</button>;
```

**Expected Behavior:**
- Rule should detect component not wrapped with `memo()`
- Should report error

**Actual Behavior:**
- Rule returns no errors
- Test assertion fails: `expected false to be true`

**Likely Cause:**
- Rule `require-memo` may not be detecting function components
- Could be an issue with JSX detection
- Parser might not be configured for TSX

**Debug Steps:**
```typescript
// Check if rule is triggered
const code = `const Button = () => <button>Click</button>;`;
const errors = runLint(code, { 'grain/require-memo': 'error' }, '/test.tsx');
console.log('Errors:', errors);
console.log('Parser:', linter.parserOptions);
```

### 2.2 Inline Arrow Functions in JSX

**Test:** `should detect inline arrow functions in JSX props`  
**Counterexample:** `["onClick","doSomething"]`

**Code Being Tested:**
```typescript
<Button onClick={() => doSomething()} />
```

**Expected Behavior:**
- Rule should detect inline arrow function in JSX prop
- Should suggest using useCallback

**Actual Behavior:**
- Rule not detecting inline functions

**Likely Cause:**
- Rule `no-inline-functions` may not be checking JSX attributes
- JSX parsing might not be working
- Rule might only check certain prop names

### 2.3 Inline Function Expressions

**Test:** `should detect inline function expressions in JSX props`  
**Counterexample:** `["onClick"]`

**Code Being Tested:**
```typescript
<Button onClick={function() { doSomething(); }} />
```

**Expected Behavior:**
- Rule should detect inline function expression

**Actual Behavior:**
- Rule not detecting function expressions

**Likely Cause:**
- Same as 2.2, but for function expressions instead of arrow functions

### 2.4 Conditional Hook Calls

**Test:** `should detect conditional hook calls`  
**Counterexample:** `["useState"]`

**Code Being Tested:**
```typescript
if (condition) {
  const [state, setState] = useState(0);
}
```

**Expected Behavior:**
- Rule should detect hook called inside conditional

**Actual Behavior:**
- Rule not detecting conditional hooks

**Likely Cause:**
- Rule `hooks-patterns` may not be checking parent nodes
- Might not be detecting if statements wrapping hooks

### 2.5 useEffect Empty Deps

**Test:** `should detect useEffect with empty deps without comment`  
**Counterexample:** `["initApp"]`

**Code Being Tested:**
```typescript
useEffect(() => {
  initApp();
}, []);
```

**Expected Behavior:**
- Rule should detect useEffect with empty deps array
- Should require justification comment

**Actual Behavior:**
- Rule not detecting empty deps

**Likely Cause:**
- Rule might not be checking array length
- Comment detection might not be working

### 2.6 key={index} Usage

**Test:** `should detect key={index} usage`  
**Counterexample:** `["index","Item"]`

**Code Being Tested:**
```typescript
items.map((item, index) => <Item key={index} />)
```

**Expected Behavior:**
- Rule should detect key prop using index

**Actual Behavior:**
- Rule not detecting key={index}

**Likely Cause:**
- Rule `component-patterns` may not be checking key prop
- JSX attribute checking might not be working

### 2.7 Conditional Rendering with &&

**Test:** `should detect conditional rendering with && for numeric values`  
**Counterexample:** `["count"]`

**Code Being Tested:**
```typescript
{count && <div>Items</div>}
```

**Expected Behavior:**
- Rule should detect numeric value in && expression
- Should warn about potential 0 rendering

**Actual Behavior:**
- Rule not detecting numeric &&

**Likely Cause:**
- Rule might not be checking type of left operand
- Might not be detecting && in JSX

### 2.8 Business State in View Components

**Test:** `should detect business state hooks in view components`  
**Counterexample:** `["useWorkspace"]`

**Code Being Tested:**
```typescript
// In file: /src/views/test.view.fn.tsx
const Component = () => {
  const workspace = useWorkspace();
  return <div>{workspace.name}</div>;
};
```

**Expected Behavior:**
- Rule should detect business hook in view component
- View components should only use UI state

**Actual Behavior:**
- Rule not detecting business hooks

**Likely Cause:**
- Rule might not be checking filename
- Might not be detecting hook calls
- Business hook list might not be configured

### 2.9 Multiple Violations Integration

**Test:** `should detect multiple violations in a single component`

**Expected Behavior:**
- Should detect all violations in one component

**Actual Behavior:**
- Not detecting any violations

**Likely Cause:**
- If individual rules aren't working, integration won't work either

---

## 3. Security Rule Failure (1 test)

### 3.1 Safe Logging Pattern False Positive

**Test:** `should not flag safe logging patterns`  
**Counterexample:** `["console.log({ hasAuth: !!token })"]`

**Code Being Tested:**
```typescript
console.log({ hasAuth: !!token })
```

**Expected Behavior:**
- Should NOT flag this as sensitive
- `!!token` is a boolean, not the actual token

**Actual Behavior:**
- Rule is flagging this as sensitive data
- False positive

**Likely Cause:**
- Regex pattern is too aggressive
- Pattern: `/\b(token|password|key|secret|credential|auth)\b/i`
- Matches "token" even when it's just checking existence

**Fix:**
```typescript
// Need to check if it's just a boolean check
// Allow patterns like: !!token, Boolean(token), hasToken
// Disallow: token, user.token, getToken()
```

---

## 4. Zustand Rules Failures (2 tests)

### 4.1 Selector Usage Detection

**Test:** `should report error when not using selector`

**Code Being Tested:**
```typescript
const store = useStore();  // Getting entire store
```

**Expected Behavior:**
- Should detect accessing entire store without selector

**Actual Behavior:**
- Rule not detecting non-selector usage

**Likely Cause:**
- Rule `zustand-patterns` may not be checking call arguments
- Might not be detecting useStore calls

### 4.2 Store Size Detection

**Test:** `should report error when store has > 10 state properties`

**Code Being Tested:**
```typescript
create((set) => ({
  prop1: 1,
  prop2: 2,
  // ... 11 properties total
}))
```

**Expected Behavior:**
- Should detect store with more than 10 properties

**Actual Behavior:**
- Rule not detecting large stores

**Likely Cause:**
- Rule might not be counting properties correctly
- Might not be detecting create() calls

---

## 5. Integration Test Failures (3 tests)

### 5.1 Version Mismatch

**Test:** `should export plugin with correct structure`

**Expected:** `1.0.0`  
**Actual:** `2.0.0`

**Cause:**
- package.json has version 2.0.0
- Test expects 1.0.0

**Fix:**
- Update test to expect 2.0.0
- OR update package.json to 1.0.0

### 5.2 Missing Rule in Config

**Test:** `should have rules in configs`

**Expected:** `grain/no-console-log` to be 'error'  
**Actual:** undefined

**Cause:**
- Rule `no-console-log` is not exported
- OR rule is not in the config

**Fix:**
- Check if rule exists in `src/rules/`
- Ensure it's exported from index.ts
- Add to configs

### 5.3 Null Safety in Utility

**Test:** `should have all rules callable`

**Error:** `Cannot read properties of undefined (reading 'includes')`  
**Location:** `isViewComponent` function

**Code:**
```typescript
export function isViewComponent(filename: string): boolean {
  return filename.includes('.view.fn.tsx');
}
```

**Cause:**
- `filename` is undefined
- Function called without proper context

**Fix:**
```typescript
export function isViewComponent(filename: string | undefined): boolean {
  return filename?.includes('.view.fn.tsx') ?? false;
}
```

---

## Root Cause Analysis

### Primary Issues

1. **Parser Configuration**
   - React rules failing suggests JSX/TSX parsing issues
   - Need to verify parser is configured for TypeScript + JSX

2. **Rule Registration**
   - Some rules may not be properly exported
   - Rules might not be in the configs

3. **Test Setup**
   - Tests might not be providing correct context
   - Filename paths might not be set correctly

4. **Rule Implementation**
   - Some rules may have logic errors
   - Pattern matching might not be working

### Recommended Investigation Order

1. **Check Parser Configuration**
   ```typescript
   // In test setup
   const linter = new Linter();
   linter.defineParser('@typescript-eslint/parser', parser);
   // Verify parserOptions include jsx: true
   ```

2. **Verify Rule Exports**
   ```typescript
   // Check src/index.ts
   import * as rules from './rules';
   console.log(Object.keys(rules));
   // Should include all rule names
   ```

3. **Test Individual Rules**
   ```bash
   # Run one test file at a time
   npm test -- naming-rules.property.test.ts
   npm test -- react-rules.property.test.ts
   ```

4. **Add Debug Logging**
   ```typescript
   // In rule implementation
   create(context) {
     console.log('Rule triggered for:', context.getFilename());
     return {
       // ...
     };
   }
   ```

---

## Quick Fixes

### Fix 1: Version Mismatch
```typescript
// In tests, change:
expect(plugin.meta.version).toBe('2.0.0');
```

### Fix 2: Null Safety
```typescript
// In src/utils/architecture.ts
export function isViewComponent(filename: string | undefined): boolean {
  return filename?.includes('.view.fn.tsx') ?? false;
}

export function isContainerComponent(filename: string | undefined): boolean {
  return filename?.includes('.container.fn.tsx') ?? false;
}
```

### Fix 3: Security Rule Refinement
```typescript
// In no-sensitive-logging.ts
// Allow boolean checks
if (node.type === 'UnaryExpression' && node.operator === '!') {
  return; // Allow !!token
}
if (node.type === 'CallExpression' && 
    node.callee.name === 'Boolean') {
  return; // Allow Boolean(token)
}
```

---

## Next Steps

1. **Immediate Fixes** (Low hanging fruit)
   - Fix version mismatch in tests
   - Add null safety to utility functions
   - Refine security rule regex

2. **Investigation Required** (Need more info)
   - Debug why React rules aren't triggering
   - Debug why Naming rules aren't detecting
   - Check parser configuration

3. **Systematic Approach**
   - Fix one category at a time
   - Start with easiest (integration tests)
   - Then tackle React rules
   - Then naming rules
   - Finally polish security and Zustand

Would you like me to start fixing these issues systematically?
