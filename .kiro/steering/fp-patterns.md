
# 函数式编程模式指南

fp-ts 实践模式和函数式编程最佳实践。

## 核心概念

### Option - 处理可空值

```typescript
import * as O from "fp-ts/Option";
import { pipe } from "fp-ts/function";

const findUser = (id: string): O.Option<User> =>
  O.fromNullable(users.find(u => u.id === id));

const getUserName = (id: string): string =>
  pipe(
    findUser(id),
    O.map(user => user.name),
    O.getOrElse(() => "Unknown")
  );
```

### Either - 显式错误处理

```typescript
import * as E from "fp-ts/Either";

type AppError = 
  | { type: "VALIDATION_ERROR"; message: string }
  | { type: "DB_ERROR"; message: string };

const validateUser = (data: unknown): E.Either<AppError, User> => {
  if (!data) return E.left({ type: "VALIDATION_ERROR", message: "Invalid" });
  return E.right(data as User);
};

// 错误处理
pipe(
  validateUser(data),
  E.match(
    (error) => logger.error("Failed:", error),
    (user) => logger.success("Success:", user.id)
  )
);
```

### TaskEither - 异步错误处理

```typescript
import * as TE from "fp-ts/TaskEither";

const fetchUser = (id: string): TE.TaskEither<AppError, User> =>
  TE.tryCatch(
    () => api.getUser(id),
    (error): AppError => ({ type: "DB_ERROR", message: String(error) })
  );

// 链式异步操作
const processUser = (id: string): TE.TaskEither<AppError, User> =>
  pipe(
    fetchUser(id),
    TE.chain(validateUser),
    TE.map(enrichUser)
  );

// 执行
const result = await processUser("1")();
```

## 高级模式

### Currying（柯里化）

```typescript
// 柯里化的过滤函数
const filterBy = <T>(predicate: (item: T) => boolean) => 
  (items: T[]): T[] => items.filter(predicate);

// 组合使用
const getActiveUserNames = pipe(
  filterBy<User>(user => user.active),
  mapWith(user => user.name)
);
```

### flow vs pipe

```typescript
// pipe: 立即执行，第一个参数是数据
const result = pipe(users, A.filter(isActive), A.map(getName));

// flow: 返回组合后的函数，延迟执行（用于可复用管道）
const processUsers = flow(A.filter(isActive), A.map(getName));
const result = processUsers(users);
```

### Do notation

```typescript
// 复杂管道使用 Do notation
const createNode = (params: CreateNodeParams): TE.TaskEither<AppError, Node> =>
  pipe(
    TE.Do,
    TE.bind("validated", () => validateParams(params)),
    TE.bind("order", ({ validated }) => getNextOrder(validated.parentId)),
    TE.bind("node", ({ validated, order }) => buildNode({ ...validated, order })),
    TE.chain(({ node }) => saveNode(node))
  );
```

### sequenceS - 并行操作

```typescript
import { sequenceS } from "fp-ts/Apply";

// 并行获取多个资源
const fetchAllData = (workspaceId: string): TE.TaskEither<AppError, WorkspaceData> =>
  sequenceS(TE.ApplyPar)({
    nodes: getNodesByWorkspace(workspaceId),
    settings: getWorkspaceSettings(workspaceId),
    tags: getWorkspaceTags(workspaceId)
  });
```

### 错误处理最佳实践

```typescript
// mapLeft: 转换错误类型
pipe(
  fetchData(id),
  TE.mapLeft((error): AppError => ({ type: "FETCH_ERROR", message: error.message }))
);

// orElse: 降级方案
pipe(
  fetchFromPrimary(id),
  TE.orElse(() => fetchFromBackup(id))
);

// match: 处理最终结果
pipe(
  result,
  E.match(
    (error) => showErrorToast(error.message),
    (data) => updateUI(data)
  )
);
```

## Functor 和 Monad

### Functor（函子）

实现了 `map` 方法的容器，允许在不离开容器的情况下转换内部值。

```typescript
// Array, Option, Either 都是 Functor
pipe(O.some(5), O.map(x => x * 2)); // some(10)
pipe(E.right(5), E.map(x => x * 2)); // right(10)
```

### Monad（单子）

实现了 `chain` 方法的 Functor，解决嵌套容器问题。

```typescript
// ❌ map 会产生嵌套
pipe(findUser("1"), O.map(getEmail)); // Option<Option<string>>

// ✅ chain 扁平化
pipe(findUser("1"), O.chain(getEmail)); // Option<string>
```

## 常见反模式

```typescript
// ❌ 混合副作用和纯函数
const badFunction = (user: User): User => {
  console.log("Processing");  // 副作用
  saveToDatabase(user);       // 副作用
  return { ...user, processed: true };
};

// ❌ 直接修改输入参数
const badUpdate = (users: User[], id: string, name: string): User[] => {
  const user = users.find(u => u.id === id);
  if (user) user.name = name;  // 直接修改
  return users;
};

// ✅ 正确做法
const goodUpdate = (users: User[], id: string, name: string): User[] =>
  users.map(u => u.id === id ? { ...u, name } : u);
```

## 参考资料

- [Mostly Adequate Guide to FP](https://mostly-adequate.gitbook.io/mostly-adequate-guide)
- [fp-ts Documentation](https://gcanti.github.io/fp-ts/)
