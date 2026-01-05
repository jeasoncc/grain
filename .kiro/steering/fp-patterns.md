---
inclusion: manual
---

# 函数式编程模式

## Option - 处理可空值

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

## Either - 显式错误处理

```typescript
import * as E from "fp-ts/Either";

const validateUser = (data: unknown): E.Either<AppError, User> => {
  if (!data) return E.left({ type: "VALIDATION_ERROR", message: "Invalid" });
  return E.right(data as User);
};

pipe(
  validateUser(data),
  E.match(
    (error) => logger.error("Failed:", error),
    (user) => logger.success("Success:", user.id)
  )
);
```

## TaskEither - 异步错误处理

```typescript
import * as TE from "fp-ts/TaskEither";

const fetchUser = (id: string): TE.TaskEither<AppError, User> =>
  TE.tryCatch(
    () => api.getUser(id),
    (error): AppError => ({ type: "DB_ERROR", message: String(error) })
  );

// 链式异步操作
const processUser = (id: string) =>
  pipe(
    fetchUser(id),
    TE.chain(validateUser),
    TE.map(enrichUser)
  );

// 执行
const result = await processUser("1")();
```

## Do notation

```typescript
const createNode = (params: CreateNodeParams): TE.TaskEither<AppError, Node> =>
  pipe(
    TE.Do,
    TE.bind("validated", () => validateParams(params)),
    TE.bind("order", ({ validated }) => getNextOrder(validated.parentId)),
    TE.bind("node", ({ validated, order }) => buildNode({ ...validated, order })),
    TE.chain(({ node }) => saveNode(node))
  );
```

## sequenceS - 并行操作

```typescript
import { sequenceS } from "fp-ts/Apply";

const fetchAllData = (workspaceId: string) =>
  sequenceS(TE.ApplyPar)({
    nodes: getNodesByWorkspace(workspaceId),
    settings: getWorkspaceSettings(workspaceId),
    tags: getWorkspaceTags(workspaceId)
  });
```

## flow vs pipe

```typescript
// pipe: 立即执行
const result = pipe(users, A.filter(isActive), A.map(getName));

// flow: 返回组合后的函数
const processUsers = flow(A.filter(isActive), A.map(getName));
const result = processUsers(users);
```

## 错误处理

```typescript
// mapLeft: 转换错误类型
pipe(fetchData(id), TE.mapLeft(toAppError));

// orElse: 降级方案
pipe(fetchFromPrimary(id), TE.orElse(() => fetchFromBackup(id)));

// match: 处理最终结果
pipe(result, E.match(showError, updateUI));
```

## 常见反模式

```typescript
// ❌ 混合副作用
const bad = (user: User): User => {
  console.log("Processing");  // 副作用
  saveToDatabase(user);       // 副作用
  return { ...user, processed: true };
};

// ❌ 直接修改
const badUpdate = (users: User[], id: string, name: string) => {
  const user = users.find(u => u.id === id);
  if (user) user.name = name;  // 直接修改
  return users;
};

// ✅ 正确
const goodUpdate = (users: User[], id: string, name: string) =>
  users.map(u => u.id === id ? { ...u, name } : u);
```
