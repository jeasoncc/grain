# Requirements Document

## Introduction

本规范定义了 Grain 项目的 ESLint 代码审查插件增强需求。目标是实现**最严苛的代码审查、最严厉的代码规范、最完整的错误提示**，确保代码质量符合函数式编程架构和项目 steering 文件中定义的所有规范。

**设计原则：零容忍**
- 所有规则默认为 `error` 级别
- 任何违规都将阻塞提交
- 宁可误报，不可漏报
- 强制执行所有 steering 文件中的规范

## Glossary

- **ESLint_Plugin**: 自定义 ESLint 插件，用于强制执行 Grain 项目的代码规范
- **Architecture_Layer**: 项目的架构层级（views, hooks, flows, pipes, io, state, utils, types）
- **Pure_Function**: 无副作用的函数，相同输入总是产生相同输出
- **TaskEither**: fp-ts 库中用于处理异步错误的函数式类型
- **Pipe**: fp-ts 中的函数组合操作符
- **Container_Component**: 连接 hooks/stores 的容器组件（.container.fn.tsx）
- **View_Component**: 只接收 props 的纯展示组件（.view.fn.tsx）
- **Side_Effect**: 副作用，包括 IO 操作、状态修改、日志输出等

## Requirements

### Requirement 1: 函数式编程规则强化

**User Story:** As a developer, I want strict functional programming enforcement, so that the codebase maintains pure functions and immutable data patterns.

#### Acceptance Criteria

1. WHEN a developer uses try-catch statement THEN the ESLint_Plugin SHALL report an error with TaskEither migration guidance
2. WHEN a developer uses throw statement THEN the ESLint_Plugin SHALL report an error suggesting Either.left() or TaskEither.left()
3. WHEN a developer uses Promise.catch() THEN the ESLint_Plugin SHALL report an error suggesting TaskEither.orElse()
4. WHEN a developer uses async/await without TaskEither THEN the ESLint_Plugin SHALL report a warning suggesting TaskEither pattern
5. WHEN a developer mutates an array using push/pop/shift/unshift/splice/reverse THEN the ESLint_Plugin SHALL report an error with immutable alternatives
6. WHEN a developer mutates an object property directly THEN the ESLint_Plugin SHALL report an error with spread operator alternative
7. WHEN a developer uses Object.assign() to mutate first argument THEN the ESLint_Plugin SHALL report an error
8. WHEN a developer uses delete operator on object property THEN the ESLint_Plugin SHALL report an error with destructuring alternative
9. WHEN a developer defines a function without explicit return type THEN the ESLint_Plugin SHALL report a warning
10. WHEN a developer uses let instead of const THEN the ESLint_Plugin SHALL report a warning suggesting const

### Requirement 2: 架构层级依赖规则

**User Story:** As a developer, I want architecture layer dependency enforcement, so that the codebase maintains proper separation of concerns.

#### Acceptance Criteria

1. WHEN views/ imports from flows/ directly THEN the ESLint_Plugin SHALL report an error (must use hooks/)
2. WHEN views/ imports from io/ directly THEN the ESLint_Plugin SHALL report an error
3. WHEN views/ imports from pipes/ directly THEN the ESLint_Plugin SHALL report an error
4. WHEN hooks/ imports from io/ directly THEN the ESLint_Plugin SHALL report an error (must use flows/)
5. WHEN pipes/ imports from io/ THEN the ESLint_Plugin SHALL report an error (pipes must be pure)
6. WHEN pipes/ imports from state/ THEN the ESLint_Plugin SHALL report an error
7. WHEN pipes/ imports from flows/ THEN the ESLint_Plugin SHALL report an error
8. WHEN utils/ imports from any layer except types/ THEN the ESLint_Plugin SHALL report an error
9. WHEN io/ imports from flows/ THEN the ESLint_Plugin SHALL report an error
10. WHEN state/ imports from flows/ THEN the ESLint_Plugin SHALL report an error
11. WHEN a container component (.container.fn.tsx) imports from flows/ THEN the ESLint_Plugin SHALL allow it
12. WHEN a view component (.view.fn.tsx) imports from state/ directly THEN the ESLint_Plugin SHALL report an error

### Requirement 3: 纯函数层副作用检测

**User Story:** As a developer, I want side effect detection in pure layers, so that pipes/ and utils/ remain pure functions.

#### Acceptance Criteria

1. WHEN pipes/ contains console.log/warn/error THEN the ESLint_Plugin SHALL report an error
2. WHEN pipes/ contains fetch or XMLHttpRequest THEN the ESLint_Plugin SHALL report an error
3. WHEN pipes/ contains localStorage/sessionStorage access THEN the ESLint_Plugin SHALL report an error
4. WHEN pipes/ contains async function THEN the ESLint_Plugin SHALL report an error
5. WHEN pipes/ contains await expression THEN the ESLint_Plugin SHALL report an error
6. WHEN pipes/ contains new Promise() THEN the ESLint_Plugin SHALL report an error
7. WHEN pipes/ contains setTimeout/setInterval THEN the ESLint_Plugin SHALL report an error
8. WHEN pipes/ contains DOM manipulation (document.*) THEN the ESLint_Plugin SHALL report an error
9. WHEN utils/ contains any side effect THEN the ESLint_Plugin SHALL report an error
10. WHEN pipes/ imports React THEN the ESLint_Plugin SHALL report an error

### Requirement 4: 文件命名规范

**User Story:** As a developer, I want file naming convention enforcement, so that the codebase maintains consistent naming patterns.

#### Acceptance Criteria

1. WHEN a file in pipes/ does not end with .pipe.ts or .fn.ts THEN the ESLint_Plugin SHALL report a warning
2. WHEN a file in flows/ does not end with .flow.ts or .action.ts THEN the ESLint_Plugin SHALL report a warning
3. WHEN a file in io/api/ does not end with .api.ts THEN the ESLint_Plugin SHALL report a warning
4. WHEN a file in io/storage/ does not end with .storage.ts THEN the ESLint_Plugin SHALL report a warning
5. WHEN a file in state/ does not end with .state.ts THEN the ESLint_Plugin SHALL report a warning
6. WHEN a file in hooks/ does not start with use- THEN the ESLint_Plugin SHALL report a warning
7. WHEN a view component does not end with .view.fn.tsx THEN the ESLint_Plugin SHALL report a warning
8. WHEN a container component does not end with .container.fn.tsx THEN the ESLint_Plugin SHALL report a warning
9. WHEN a file in utils/ does not end with .util.ts THEN the ESLint_Plugin SHALL report a warning
10. WHEN a file in types/ does not end with .interface.ts or .schema.ts or .types.ts THEN the ESLint_Plugin SHALL report a warning

### Requirement 5: 禁止使用的库和模式

**User Story:** As a developer, I want deprecated library detection, so that the codebase uses modern alternatives.

#### Acceptance Criteria

1. WHEN a developer imports from lodash THEN the ESLint_Plugin SHALL report an error suggesting es-toolkit
2. WHEN a developer imports from moment THEN the ESLint_Plugin SHALL report an error suggesting dayjs
3. WHEN a developer uses new Date() THEN the ESLint_Plugin SHALL report an error suggesting dayjs
4. WHEN a developer uses Date.now() THEN the ESLint_Plugin SHALL report a warning suggesting dayjs
5. WHEN a developer uses console.log in non-test files THEN the ESLint_Plugin SHALL report an error suggesting logger
6. WHEN a developer uses hand-written debounce/throttle THEN the ESLint_Plugin SHALL report a warning suggesting es-toolkit
7. WHEN a developer uses hand-written deep clone THEN the ESLint_Plugin SHALL report a warning suggesting es-toolkit

### Requirement 6: React 组件规范

**User Story:** As a developer, I want React component pattern enforcement, so that components follow the container/view separation pattern.

#### Acceptance Criteria

1. WHEN a view component uses useStore/useState for business state THEN the ESLint_Plugin SHALL report an error
2. WHEN a view component is not wrapped with memo() THEN the ESLint_Plugin SHALL report a warning
3. WHEN a container component does not pass data through props to view THEN the ESLint_Plugin SHALL report a warning
4. WHEN a component uses inline function in JSX props THEN the ESLint_Plugin SHALL report a warning suggesting useCallback
5. WHEN a component creates new object/array in render THEN the ESLint_Plugin SHALL report a warning suggesting useMemo
6. WHEN a component uses key={index} in list rendering THEN the ESLint_Plugin SHALL report a warning
7. WHEN a component uses conditional rendering with && for falsy values THEN the ESLint_Plugin SHALL report a warning

### Requirement 7: 导入规范

**User Story:** As a developer, I want import organization enforcement, so that imports are consistent and organized.

#### Acceptance Criteria

1. WHEN imports are not grouped (external, internal, relative) THEN the ESLint_Plugin SHALL report a warning with auto-fix
2. WHEN internal imports do not use @/ alias THEN the ESLint_Plugin SHALL report an error with auto-fix
3. WHEN there are unused imports THEN the ESLint_Plugin SHALL report an error with auto-fix
4. WHEN there are duplicate imports from same module THEN the ESLint_Plugin SHALL report an error with auto-fix
5. WHEN type imports are not separated (import type) THEN the ESLint_Plugin SHALL report a warning with auto-fix
6. WHEN importing from deprecated internal paths (fn/, components/, actions/, stores/, lib/) THEN the ESLint_Plugin SHALL report an error with migration guidance

### Requirement 8: 错误处理规范

**User Story:** As a developer, I want error handling pattern enforcement, so that errors are handled consistently using fp-ts patterns.

#### Acceptance Criteria

1. WHEN a function returns Promise without TaskEither wrapper THEN the ESLint_Plugin SHALL report a warning
2. WHEN TaskEither is not properly folded at the end of a pipe THEN the ESLint_Plugin SHALL report a warning
3. WHEN Either.left is used without proper error type THEN the ESLint_Plugin SHALL report a warning
4. WHEN error handling uses string instead of AppError type THEN the ESLint_Plugin SHALL report a warning
5. WHEN async function does not use TE.tryCatch for error handling THEN the ESLint_Plugin SHALL report a warning

### Requirement 9: 日志规范

**User Story:** As a developer, I want logging pattern enforcement, so that logs are consistent and traceable.

#### Acceptance Criteria

1. WHEN console.log is used THEN the ESLint_Plugin SHALL report an error suggesting logger.info
2. WHEN console.error is used THEN the ESLint_Plugin SHALL report an error suggesting logger.error
3. WHEN console.warn is used THEN the ESLint_Plugin SHALL report an error suggesting logger.warn
4. WHEN logger is used without module prefix [ModuleName] THEN the ESLint_Plugin SHALL report a warning
5. WHEN logger.debug is used in production code THEN the ESLint_Plugin SHALL report a warning

### Requirement 10: 测试文件规范

**User Story:** As a developer, I want test file pattern enforcement, so that tests are properly organized and named.

#### Acceptance Criteria

1. WHEN a .fn.ts file does not have corresponding .fn.test.ts THEN the ESLint_Plugin SHALL report a warning
2. WHEN a .flow.ts file does not have corresponding .flow.test.ts THEN the ESLint_Plugin SHALL report a warning
3. WHEN a .pipe.ts file does not have corresponding .pipe.test.ts THEN the ESLint_Plugin SHALL report a warning
4. WHEN test file is not co-located with source file THEN the ESLint_Plugin SHALL report a warning
5. WHEN test uses mock for pure function THEN the ESLint_Plugin SHALL report a warning (pure functions should be tested directly)

### Requirement 11: 注释规范

**User Story:** As a developer, I want comment pattern enforcement, so that comments are consistent and in Chinese.

#### Acceptance Criteria

1. WHEN a public function lacks JSDoc comment THEN the ESLint_Plugin SHALL report a warning
2. WHEN a comment is in English (except technical terms) THEN the ESLint_Plugin SHALL report a warning suggesting Chinese
3. WHEN there is commented-out code THEN the ESLint_Plugin SHALL report an error
4. WHEN TODO/FIXME comment lacks author or date THEN the ESLint_Plugin SHALL report a warning

### Requirement 12: 类型安全规范

**User Story:** As a developer, I want type safety enforcement, so that the codebase maintains strict typing.

#### Acceptance Criteria

1. WHEN any type is used THEN the ESLint_Plugin SHALL report an error
2. WHEN unknown type is not narrowed before use THEN the ESLint_Plugin SHALL report an error
3. WHEN type assertion (as) is used without justification comment THEN the ESLint_Plugin SHALL report a warning
4. WHEN non-null assertion (!) is used THEN the ESLint_Plugin SHALL report an error suggesting Option type
5. WHEN function parameter lacks type annotation THEN the ESLint_Plugin SHALL report an error
6. WHEN function return type is implicit THEN the ESLint_Plugin SHALL report a warning

### Requirement 13: 错误消息格式规范

**User Story:** As a developer, I want comprehensive error messages, so that I can quickly understand and fix issues.

#### Acceptance Criteria

1. WHEN an error is reported THEN the ESLint_Plugin SHALL include a clear description of the violation
2. WHEN an error is reported THEN the ESLint_Plugin SHALL include the correct alternative code example
3. WHEN an error is reported THEN the ESLint_Plugin SHALL include a reference to the relevant steering document
4. WHEN an error is reported THEN the ESLint_Plugin SHALL use Chinese for the main message
5. WHEN an error is reported THEN the ESLint_Plugin SHALL include emoji indicators for severity (❌ error, ⚠️ warning, 💡 suggestion)

### Requirement 14: 配置和预设

**User Story:** As a developer, I want configuration presets, so that I can enforce the strictest code quality standards.

#### Acceptance Criteria

1. THE ESLint_Plugin SHALL provide a "strict" preset as the default and only recommended preset
2. WHEN using strict preset THEN all rules SHALL be set to error level without exception
3. THE ESLint_Plugin SHALL NOT provide any "relaxed" or "recommended" preset that weakens rules
4. WHEN any rule is violated THEN the build SHALL fail immediately
5. THE ESLint_Plugin SHALL provide a "legacy" preset ONLY for migration purposes with deprecation warnings

### Requirement 15: 函数复杂度限制

**User Story:** As a developer, I want function complexity enforcement, so that functions remain simple and testable.

#### Acceptance Criteria

1. WHEN a function has more than 20 lines THEN the ESLint_Plugin SHALL report an error
2. WHEN a function has more than 3 parameters THEN the ESLint_Plugin SHALL report an error suggesting object parameter
3. WHEN a function has cyclomatic complexity greater than 5 THEN the ESLint_Plugin SHALL report an error
4. WHEN a function has more than 2 levels of nesting THEN the ESLint_Plugin SHALL report an error
5. WHEN a function has more than 1 return statement THEN the ESLint_Plugin SHALL report a warning suggesting early return pattern
6. WHEN a file has more than 200 lines THEN the ESLint_Plugin SHALL report an error suggesting file splitting

### Requirement 16: 严格的命名规范

**User Story:** As a developer, I want strict naming convention enforcement, so that code is self-documenting.

#### Acceptance Criteria

1. WHEN a variable name is less than 3 characters (except i, j, k in loops) THEN the ESLint_Plugin SHALL report an error
2. WHEN a function name does not start with a verb THEN the ESLint_Plugin SHALL report a warning
3. WHEN a boolean variable does not start with is/has/can/should THEN the ESLint_Plugin SHALL report an error
4. WHEN a constant is not in SCREAMING_SNAKE_CASE THEN the ESLint_Plugin SHALL report an error
5. WHEN a type/interface name does not start with uppercase THEN the ESLint_Plugin SHALL report an error
6. WHEN a private function/variable does not start with underscore THEN the ESLint_Plugin SHALL report a warning
7. WHEN an event handler does not start with handle/on THEN the ESLint_Plugin SHALL report an error

### Requirement 17: 严格的 Promise/Async 规范

**User Story:** As a developer, I want strict async pattern enforcement, so that all async code uses TaskEither.

#### Acceptance Criteria

1. WHEN async/await is used outside of io/ layer THEN the ESLint_Plugin SHALL report an error
2. WHEN Promise.then() is used THEN the ESLint_Plugin SHALL report an error suggesting TaskEither
3. WHEN Promise.catch() is used THEN the ESLint_Plugin SHALL report an error suggesting TE.orElse
4. WHEN Promise.all() is used THEN the ESLint_Plugin SHALL report an error suggesting TE.sequenceArray
5. WHEN Promise.race() is used THEN the ESLint_Plugin SHALL report an error
6. WHEN a function returns Promise without TaskEither THEN the ESLint_Plugin SHALL report an error
7. WHEN await is used without TE.tryCatch wrapper THEN the ESLint_Plugin SHALL report an error

### Requirement 18: 严格的数组操作规范

**User Story:** As a developer, I want strict array operation enforcement, so that all array operations are immutable.

#### Acceptance Criteria

1. WHEN array.push/pop/shift/unshift/splice is used THEN the ESLint_Plugin SHALL report an error
2. WHEN array.sort() is used without spread copy THEN the ESLint_Plugin SHALL report an error
3. WHEN array.reverse() is used without spread copy THEN the ESLint_Plugin SHALL report an error
4. WHEN array.fill() is used THEN the ESLint_Plugin SHALL report an error
5. WHEN for loop is used instead of map/filter/reduce THEN the ESLint_Plugin SHALL report a warning
6. WHEN forEach is used THEN the ESLint_Plugin SHALL report an error suggesting map/filter
7. WHEN array index assignment (arr[i] = x) is used THEN the ESLint_Plugin SHALL report an error

### Requirement 19: 严格的对象操作规范

**User Story:** As a developer, I want strict object operation enforcement, so that all object operations are immutable.

#### Acceptance Criteria

1. WHEN Object.assign() mutates first argument THEN the ESLint_Plugin SHALL report an error
2. WHEN delete operator is used THEN the ESLint_Plugin SHALL report an error
3. WHEN object property is directly assigned THEN the ESLint_Plugin SHALL report an error
4. WHEN Object.defineProperty is used THEN the ESLint_Plugin SHALL report an error
5. WHEN Object.setPrototypeOf is used THEN the ESLint_Plugin SHALL report an error
6. WHEN class with mutable state is defined THEN the ESLint_Plugin SHALL report an error
7. WHEN this keyword is used outside of React class components THEN the ESLint_Plugin SHALL report an error

### Requirement 20: 严格的条件语句规范

**User Story:** As a developer, I want strict conditional statement enforcement, so that code is predictable.

#### Acceptance Criteria

1. WHEN if statement without else is used THEN the ESLint_Plugin SHALL report a warning
2. WHEN nested ternary is used THEN the ESLint_Plugin SHALL report an error
3. WHEN switch without default is used THEN the ESLint_Plugin SHALL report an error
4. WHEN switch case falls through THEN the ESLint_Plugin SHALL report an error
5. WHEN == or != is used instead of === or !== THEN the ESLint_Plugin SHALL report an error
6. WHEN negation is used in condition (if (!x)) THEN the ESLint_Plugin SHALL report a warning suggesting positive condition
7. WHEN condition has side effects THEN the ESLint_Plugin SHALL report an error

### Requirement 21: 严格的 React Hooks 规范

**User Story:** As a developer, I want strict React hooks enforcement, so that hooks are used correctly.

#### Acceptance Criteria

1. WHEN useEffect has missing dependencies THEN the ESLint_Plugin SHALL report an error
2. WHEN useEffect has empty dependency array without justification comment THEN the ESLint_Plugin SHALL report a warning
3. WHEN useState is used in view component for business state THEN the ESLint_Plugin SHALL report an error
4. WHEN useCallback/useMemo is missing for function/object props THEN the ESLint_Plugin SHALL report an error
5. WHEN custom hook does not start with use THEN the ESLint_Plugin SHALL report an error
6. WHEN hook is called conditionally THEN the ESLint_Plugin SHALL report an error
7. WHEN useRef is used to store mutable state THEN the ESLint_Plugin SHALL report a warning

### Requirement 22: 严格的导出规范

**User Story:** As a developer, I want strict export enforcement, so that module boundaries are clear.

#### Acceptance Criteria

1. WHEN default export is used THEN the ESLint_Plugin SHALL report an error suggesting named export
2. WHEN more than 5 items are exported from a single file THEN the ESLint_Plugin SHALL report a warning
3. WHEN re-export (*) is used without explicit list THEN the ESLint_Plugin SHALL report an error
4. WHEN internal function is exported THEN the ESLint_Plugin SHALL report a warning
5. WHEN export is not at the end of file THEN the ESLint_Plugin SHALL report a warning

### Requirement 23: 严格的魔法值检测

**User Story:** As a developer, I want magic value detection, so that all values are properly named.

#### Acceptance Criteria

1. WHEN numeric literal (except 0, 1, -1) is used THEN the ESLint_Plugin SHALL report an error suggesting named constant
2. WHEN string literal is used in condition THEN the ESLint_Plugin SHALL report an error suggesting enum or constant
3. WHEN hardcoded URL/path is used THEN the ESLint_Plugin SHALL report an error suggesting config
4. WHEN hardcoded timeout/delay value is used THEN the ESLint_Plugin SHALL report an error
5. WHEN hardcoded color/size value is used in non-CSS file THEN the ESLint_Plugin SHALL report an error

### Requirement 24: 严格的安全规范

**User Story:** As a developer, I want security enforcement, so that code is secure by default.

#### Acceptance Criteria

1. WHEN eval() is used THEN the ESLint_Plugin SHALL report an error
2. WHEN Function() constructor is used THEN the ESLint_Plugin SHALL report an error
3. WHEN innerHTML/outerHTML is used THEN the ESLint_Plugin SHALL report an error
4. WHEN dangerouslySetInnerHTML is used without sanitization THEN the ESLint_Plugin SHALL report an error
5. WHEN document.write is used THEN the ESLint_Plugin SHALL report an error
6. WHEN sensitive data (password, token, key) is logged THEN the ESLint_Plugin SHALL report an error
7. WHEN hardcoded credentials are detected THEN the ESLint_Plugin SHALL report an error

### Requirement 25: 严格的性能规范

**User Story:** As a developer, I want performance enforcement, so that code is optimized.

#### Acceptance Criteria

1. WHEN inline function is passed to React component prop THEN the ESLint_Plugin SHALL report an error
2. WHEN new object/array is created in render THEN the ESLint_Plugin SHALL report an error
3. WHEN expensive computation is not memoized THEN the ESLint_Plugin SHALL report a warning
4. WHEN large component is not code-split THEN the ESLint_Plugin SHALL report a warning
5. WHEN image import is not optimized THEN the ESLint_Plugin SHALL report a warning
6. WHEN synchronous import is used for large module THEN the ESLint_Plugin SHALL report a warning


### Requirement 26: 严格的 fp-ts 使用规范

**User Story:** As a developer, I want fp-ts pattern enforcement, so that functional programming is used correctly.

#### Acceptance Criteria

1. WHEN pipe() has more than 10 functions THEN the ESLint_Plugin SHALL report a warning suggesting extraction
2. WHEN Either/Option is not properly folded THEN the ESLint_Plugin SHALL report an error
3. WHEN TaskEither is not executed with () THEN the ESLint_Plugin SHALL report an error
4. WHEN Option.fromNullable is not used for nullable values THEN the ESLint_Plugin SHALL report a warning
5. WHEN manual null/undefined check is used instead of Option THEN the ESLint_Plugin SHALL report an error
6. WHEN if-else is used instead of Either.match THEN the ESLint_Plugin SHALL report a warning
7. WHEN TE.tryCatch error handler returns string instead of AppError THEN the ESLint_Plugin SHALL report an error

### Requirement 27: 严格的 Zustand 使用规范

**User Story:** As a developer, I want Zustand pattern enforcement, so that state management is consistent.

#### Acceptance Criteria

1. WHEN store is accessed directly in view component THEN the ESLint_Plugin SHALL report an error
2. WHEN store action mutates state directly without Immer THEN the ESLint_Plugin SHALL report an error
3. WHEN store selector is not used (accessing entire store) THEN the ESLint_Plugin SHALL report an error
4. WHEN store is defined outside state/ directory THEN the ESLint_Plugin SHALL report an error
5. WHEN store has more than 10 state properties THEN the ESLint_Plugin SHALL report a warning suggesting split

### Requirement 28: 严格的文件结构规范

**User Story:** As a developer, I want file structure enforcement, so that project organization is consistent.

#### Acceptance Criteria

1. WHEN index.ts contains logic instead of re-exports THEN the ESLint_Plugin SHALL report an error
2. WHEN file has multiple exported components THEN the ESLint_Plugin SHALL report an error
3. WHEN test file is not co-located with source THEN the ESLint_Plugin SHALL report an error
4. WHEN types are defined in non-types file THEN the ESLint_Plugin SHALL report a warning
5. WHEN file imports from parent directory more than 2 levels THEN the ESLint_Plugin SHALL report an error suggesting @/ alias

### Requirement 29: 严格的废弃代码检测

**User Story:** As a developer, I want deprecated code detection, so that legacy patterns are eliminated.

#### Acceptance Criteria

1. WHEN importing from deprecated directories (fn/, components/, actions/, stores/, lib/) THEN the ESLint_Plugin SHALL report an error
2. WHEN using deprecated API patterns THEN the ESLint_Plugin SHALL report an error
3. WHEN TODO/FIXME comment is older than 7 days THEN the ESLint_Plugin SHALL report a warning
4. WHEN commented-out code is detected THEN the ESLint_Plugin SHALL report an error
5. WHEN unused variable/import exists THEN the ESLint_Plugin SHALL report an error

### Requirement 30: 严格的文档规范

**User Story:** As a developer, I want documentation enforcement, so that code is self-documenting.

#### Acceptance Criteria

1. WHEN exported function lacks JSDoc THEN the ESLint_Plugin SHALL report an error
2. WHEN JSDoc is incomplete (missing @param or @returns) THEN the ESLint_Plugin SHALL report an error
3. WHEN complex type lacks description comment THEN the ESLint_Plugin SHALL report a warning
4. WHEN public API lacks usage example in JSDoc THEN the ESLint_Plugin SHALL report a warning
5. WHEN JSDoc @deprecated is used without migration path THEN the ESLint_Plugin SHALL report an error
