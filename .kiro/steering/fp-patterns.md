---
inclusion: manual
---

# 函数式编程模式指南

记录函数式编程的经典思想和 fp-ts 实践模式，为项目提供统一的函数式编程范式。

## 核心思想

### 1. 纯函数 (Pure Functions)

**原则**：相同输入总是产生相同输出，无副作用

```typescript
// ✅ 纯函数
const add = (a: number, b: number): number => a + b;
const formatUser = (user: User): string => `${user.name} (${user.email})`;

// ❌ 非纯函数（副作用）
let counter = 0;
const impureAdd = (a: number): number => {
  counter++; // 副作用
  return a + counter;
};

// ❌ 非纯函数（依赖外部状态）
const getCurrentUser = (): User => globalState.currentUser;
```

### 2. 不可变性 (Immutability)

**原则**：数据一旦创建就不可修改，更新产生新对象

```typescript
// ✅ 不可变更新
const updateUser = (user: User, name: string): User => ({
  ...user,
  name,
  updatedAt: new Date().toISOString(),
});

const addItem = <T>(items: T[], newItem: T): T[] => [...items, newItem];

// ❌ 可变更新
const mutateUser = (user: User, name: string): void => {
  user.name = name; // 直接修改
  user.updatedAt = new Date().toISOString();
};
```

### 3. 函数组合 (Function Composition)

**原则**：将简单函数组合成复杂功能

```typescript
import { pipe } from "fp-ts/function";

// ✅ 使用 pipe 组合
const processUser = (rawData: unknown) =>
  pipe(
    rawData,
    validateUserData,
    normalizeUserData,
    enrichWithDefaults,
    saveToDatabase
  );

// ❌ 嵌套调用
const processUserNested = (rawData: unknown) =>
  saveToDatabase(
    enrichWithDefaults(
      normalizeUserData(
        validateUserData(rawData)
      )
    )
  );
```

## fp-ts 核心模式

### 1. Option - 处理可能为空的值

```typescript
import * as O from "fp-ts/Option";
import { pipe } from "fp-ts/function";

// ✅ 使用 Option 处理可空值
const findUser = (id: string): O.Option<User> => {
  const user = users.find(u => u.id === id);
  return O.fromNullable(user);
};

const getUserName = (id: string): string =>
  pipe(
    findUser(id),
    O.map(user => user.name),
    O.getOrElse(() => "Unknown User")
  );

// 链式操作
const getUserEmail = (id: string): O.Option<string> =>
  pipe(
    findUser(id),
    O.chain(user => O.fromNullable(user.email)),
    O.filter(email => email.includes("@"))
  );

// ❌ 传统 null 检查
const getUserNameOld = (id: string): string => {
  const user = users.find(u => u.id === id);
  if (user && user.name) {
    return user.name;
  }
  return "Unknown User";
};
```

### 2. Either - 显式错误处理

```typescript
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";

type AppError = 
  | { type: "VALIDATION_ERROR"; message: string }
  | { type: "DB_ERROR"; message: string }
  | { type: "NOT_FOUND"; message: string };

// ✅ 使用 Either 显式处理错误
const validateUser = (data: unknown): E.Either<AppError, User> => {
  if (!data || typeof data !== "object") {
    return E.left({ type: "VALIDATION_ERROR", message: "Invalid data" });
  }
  // ... 校验逻辑
  return E.right(data as User);
};

const saveUser = (user: User): E.Either<AppError, User> => {
  try {
    // 保存逻辑
    return E.right(user);
  } catch (error) {
    return E.left({ 
      type: "DB_ERROR", 
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  }
};

// 组合 Either 操作
const processUser = (rawData: unknown): E.Either<AppError, User> =>
  pipe(
    rawData,
    validateUser,
    E.chain(saveUser),
    E.map(user => ({ ...user, processed: true }))
  );

// 错误处理
const handleResult = (result: E.Either<AppError, User>): void =>
  pipe(
    result,
    E.match(
      (error) => logger.error("Process failed:", error),
      (user) => logger.success("User processed:", user.id)
    )
  );
```

### 3. TaskEither - 异步操作的错误处理

```typescript
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";

// ✅ 使用 TaskEither 处理异步操作
const fetchUser = (id: string): TE.TaskEither<AppError, User> =>
  TE.tryCatch(
    () => api.getUser(id),
    (error): AppError => ({
      type: "DB_ERROR",
      message: error instanceof Error ? error.message : "Fetch failed"
    })
  );

const validateUserAsync = (user: User): TE.TaskEither<AppError, User> =>
  user.email.includes("@")
    ? TE.right(user)
    : TE.left({ type: "VALIDATION_ERROR", message: "Invalid email" });

// 异步管道组合
const processUserAsync = (id: string): TE.TaskEither<AppError, User> =>
  pipe(
    fetchUser(id),
    TE.chain(validateUserAsync),
    TE.map(user => ({ ...user, processed: true }))
  );

// 执行异步操作
const runProcess = async (id: string): Promise<void> => {
  const result = await processUserAsync(id)();
  
  pipe(
    result,
    E.match(
      (error) => console.error("Failed:", error),
      (user) => console.log("Success:", user)
    )
  );
};
```

### 4. Array 操作

```typescript
import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/function";

const users: User[] = [/* ... */];

// ✅ 函数式数组操作
const processUsers = (users: User[]): User[] =>
  pipe(
    users,
    A.filter(user => user.active),
    A.map(user => ({ ...user, processed: true })),
    A.sort((a, b) => a.name.localeCompare(b.name))
  );

// 查找操作
const findActiveUser = (users: User[], id: string): O.Option<User> =>
  pipe(
    users,
    A.findFirst(user => user.id === id && user.active)
  );

// 分组操作
const groupUsersByRole = (users: User[]): Record<string, User[]> =>
  pipe(
    users,
    A.reduce({} as Record<string, User[]>, (acc, user) => ({
      ...acc,
      [user.role]: [...(acc[user.role] || []), user]
    }))
  );
```

## 高级模式

### 1. Reader - 依赖注入

```typescript
import * as R from "fp-ts/Reader";
import { pipe } from "fp-ts/function";

interface Dependencies {
  database: Database;
  logger: Logger;
  config: Config;
}

// ✅ 使用 Reader 进行依赖注入
const getUser = (id: string): R.Reader<Dependencies, Promise<User>> =>
  (deps) => deps.database.findUser(id);

const logUser = (user: User): R.Reader<Dependencies, void> =>
  (deps) => deps.logger.info("User:", user);

// 组合 Reader
const processUserWithDeps = (id: string): R.Reader<Dependencies, Promise<void>> =>
  pipe(
    getUser(id),
    R.chain(userPromise => 
      R.of(userPromise.then(user => 
        logUser(user)({ logger: deps.logger })
      ))
    )
  );
```

### 2. State - 状态管理

```typescript
import * as S from "fp-ts/State";
import { pipe } from "fp-ts/function";

interface AppState {
  counter: number;
  users: User[];
}

// ✅ 使用 State 管理状态变更
const increment: S.State<AppState, number> = (state) => [
  state.counter + 1,
  { ...state, counter: state.counter + 1 }
];

const addUser = (user: User): S.State<AppState, User[]> => (state) => {
  const newUsers = [...state.users, user];
  return [newUsers, { ...state, users: newUsers }];
};

// 组合状态操作
const processState = pipe(
  increment,
  S.chain(() => addUser(newUser)),
  S.map(users => users.length)
);
```

### 3. IO - 副作用管理

```typescript
import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/function";

// ✅ 使用 IO 封装副作用
const getCurrentTime: IO.IO<Date> = () => new Date();

const logMessage = (message: string): IO.IO<void> => 
  () => console.log(message);

const randomId: IO.IO<string> = 
  () => Math.random().toString(36);

// 组合 IO 操作
const createUserWithLog = (name: string): IO.IO<User> =>
  pipe(
    randomId,
    IO.chain(id => 
      pipe(
        getCurrentTime,
        IO.map(now => ({ id, name, createdAt: now })),
        IO.chainFirst(user => logMessage(`Created user: ${user.name}`))
      )
    )
  );
```

## 实用工具模式

### 1. 管道调试

```typescript
import { pipe } from "fp-ts/function";

// ✅ 管道中间调试
const debugTap = <T>(label: string) => (value: T): T => {
  console.log(`[${label}]:`, value);
  return value;
};

const processWithDebug = (data: unknown) =>
  pipe(
    data,
    debugTap("Raw input"),
    validateData,
    debugTap("After validation"),
    transformData,
    debugTap("After transform"),
    saveData
  );
```

### 2. 条件执行

```typescript
import { pipe } from "fp-ts/function";

// ✅ 条件管道执行
const conditionalProcess = <T>(
  condition: (value: T) => boolean,
  process: (value: T) => T
) => (value: T): T =>
  condition(value) ? process(value) : value;

const processUser = (user: User): User =>
  pipe(
    user,
    conditionalProcess(
      user => user.role === "admin",
      user => ({ ...user, permissions: adminPermissions })
    ),
    conditionalProcess(
      user => !user.verified,
      user => ({ ...user, needsVerification: true })
    )
  );
```

### 3. 错误恢复

```typescript
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";

// ✅ 错误恢复模式
const withFallback = <A, B>(
  fallback: B
) => (either: E.Either<unknown, B>): B =>
  pipe(
    either,
    E.getOrElse(() => fallback)
  );

const safeProcess = (data: unknown): User =>
  pipe(
    validateUser(data),
    withFallback(defaultUser)
  );
```

## 性能优化模式

### 1. 惰性求值

```typescript
import * as L from "fp-ts/Lazy";

// ✅ 惰性计算
const expensiveComputation: L.Lazy<number> = () => {
  // 复杂计算
  return heavyCalculation();
};

// 只在需要时计算
const result = expensiveComputation();
```

### 2. 记忆化

```typescript
// ✅ 记忆化纯函数
const memoize = <A, B>(fn: (a: A) => B): (a: A) => B => {
  const cache = new Map<A, B>();
  return (a: A): B => {
    if (cache.has(a)) {
      return cache.get(a)!;
    }
    const result = fn(a);
    cache.set(a, result);
    return result;
  };
};

const expensiveFunction = memoize((n: number): number => {
  // 复杂计算
  return fibonacci(n);
});
```

## 测试模式

### 1. 纯函数测试

```typescript
import { describe, it, expect } from "vitest";
import * as E from "fp-ts/Either";

describe("validateUser", () => {
  it("should return Right for valid user", () => {
    const validUser = { name: "John", email: "john@example.com" };
    const result = validateUser(validUser);
    
    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.name).toBe("John");
    }
  });

  it("should return Left for invalid user", () => {
    const invalidUser = { name: "" };
    const result = validateUser(invalidUser);
    
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.type).toBe("VALIDATION_ERROR");
    }
  });
});
```

### 2. Property-Based Testing

```typescript
import { fc } from "fast-check";

describe("user processing properties", () => {
  it("should preserve user ID", () => {
    fc.assert(
      fc.property(
        fc.record({ 
          id: fc.uuid(), 
          name: fc.string({ minLength: 1 }) 
        }),
        (user) => {
          const result = processUser(user);
          return E.isRight(result) && result.right.id === user.id;
        }
      )
    );
  });
});
```

## 常见反模式

### ❌ 避免的模式

```typescript
// 1. 混合副作用和纯函数
const badFunction = (user: User): User => {
  console.log("Processing user"); // 副作用
  saveToDatabase(user); // 副作用
  return { ...user, processed: true }; // 纯函数部分
};

// 2. 忽略错误处理
const badAsyncFunction = async (id: string): Promise<User> => {
  const user = await fetchUser(id); // 可能抛出异常
  return user; // 没有错误处理
};

// 3. 直接修改输入参数
const badUpdate = (users: User[], id: string, name: string): User[] => {
  const user = users.find(u => u.id === id);
  if (user) {
    user.name = name; // 直接修改
  }
  return users;
};
```

---

**使用场景**：在编写函数式代码时参考此文件，确保遵循函数式编程最佳实践。