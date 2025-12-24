---
inclusion: manual
---

# 函数式编程高级模式

基于《Mostly Adequate Guide to Functional Programming》补充的高级概念和模式。

## 一、Currying（柯里化）

### 概念

柯里化是将多参数函数转换为一系列单参数函数的技术。这是函数式编程的基石之一。

```typescript
// ❌ 普通多参数函数
const add = (a: number, b: number): number => a + b;

// ✅ 柯里化版本
const curriedAdd = (a: number) => (b: number): number => a + b;

// 使用
const add5 = curriedAdd(5);
add5(3); // 8
```

### 实际应用

```typescript
import { pipe } from "fp-ts/function";

// 柯里化的过滤函数
const filterBy = <T>(predicate: (item: T) => boolean) => 
  (items: T[]): T[] => items.filter(predicate);

// 柯里化的映射函数
const mapWith = <A, B>(fn: (a: A) => B) => 
  (items: A[]): B[] => items.map(fn);

// 组合使用
const getActiveUserNames = pipe(
  filterBy<User>(user => user.active),
  mapWith(user => user.name)
);

// 调用
const names = getActiveUserNames(users);
```

### 项目中的应用场景

```typescript
// 柯里化的节点过滤器
const filterNodesByType = (type: NodeType) => 
  (nodes: Node[]): Node[] => nodes.filter(n => n.type === type);

const filterNodesByWorkspace = (workspaceId: string) => 
  (nodes: Node[]): Node[] => nodes.filter(n => n.workspace === workspaceId);

// 组合过滤器
const getWorkspaceFiles = (workspaceId: string) => pipe(
  filterNodesByWorkspace(workspaceId),
  filterNodesByType("file")
);
```

## 二、Pointfree Style（无参风格）

### 概念

无参风格是指函数定义时不显式提及其操作的数据参数。

```typescript
// ❌ 有参风格
const getNames = (users: User[]): string[] => 
  users.map(user => user.name);

// ✅ 无参风格
const getName = (user: User): string => user.name;
const getNames = mapWith(getName);
```

### 实际应用

```typescript
import { pipe, flow } from "fp-ts/function";
import * as A from "fp-ts/Array";

// 定义基础操作
const isActive = (user: User): boolean => user.active;
const getName = (user: User): string => user.name;
const toUpperCase = (s: string): string => s.toUpperCase();

// 无参风格组合
const getActiveUserNamesUpperCase = flow(
  A.filter(isActive),
  A.map(getName),
  A.map(toUpperCase)
);

// 使用
const result = getActiveUserNamesUpperCase(users);
```

### flow vs pipe

```typescript
// pipe: 立即执行，第一个参数是数据
const result = pipe(
  users,
  A.filter(isActive),
  A.map(getName)
);

// flow: 返回组合后的函数，延迟执行
const processUsers = flow(
  A.filter(isActive),
  A.map(getName)
);
const result = processUsers(users);
```

## 三、Functor（函子）

### 概念

Functor 是实现了 `map` 方法的容器类型，允许我们在不离开容器的情况下对内部值进行转换。

```typescript
// Array 是 Functor
[1, 2, 3].map(x => x * 2); // [2, 4, 6]

// Option 是 Functor
import * as O from "fp-ts/Option";
pipe(
  O.some(5),
  O.map(x => x * 2)
); // some(10)

// Either 是 Functor
import * as E from "fp-ts/Either";
pipe(
  E.right(5),
  E.map(x => x * 2)
); // right(10)
```

### Functor 定律

```typescript
// 1. 恒等律：map(id) === id
pipe(O.some(5), O.map(x => x)) === O.some(5);

// 2. 组合律：map(f . g) === map(f) . map(g)
const f = (x: number) => x * 2;
const g = (x: number) => x + 1;

pipe(O.some(5), O.map(x => f(g(x)))) === 
pipe(O.some(5), O.map(g), O.map(f));
```

## 四、Monad（单子）

### 概念

Monad 是实现了 `chain`（也叫 `flatMap` 或 `bind`）方法的 Functor。它解决了嵌套容器的问题。

```typescript
import * as O from "fp-ts/Option";
import { pipe } from "fp-ts/function";

// 问题：map 会产生嵌套
const findUser = (id: string): O.Option<User> => /* ... */;
const getEmail = (user: User): O.Option<string> => /* ... */;

// ❌ 使用 map 会产生 Option<Option<string>>
const nestedResult = pipe(
  findUser("1"),
  O.map(user => getEmail(user))
); // Option<Option<string>> 😱

// ✅ 使用 chain 扁平化
const flatResult = pipe(
  findUser("1"),
  O.chain(user => getEmail(user))
); // Option<string> ✅
```

### 项目中的应用

```typescript
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";

// 链式异步操作
const processNode = (nodeId: string): TE.TaskEither<AppError, ProcessedNode> =>
  pipe(
    getNodeById(nodeId),           // TaskEither<AppError, Node>
    TE.chain(validateNode),        // TaskEither<AppError, ValidNode>
    TE.chain(enrichNode),          // TaskEither<AppError, EnrichedNode>
    TE.chain(saveNode),            // TaskEither<AppError, SavedNode>
    TE.map(toProcessedNode)        // TaskEither<AppError, ProcessedNode>
  );
```

### Monad 定律

```typescript
// 1. 左恒等律：chain(of(a), f) === f(a)
pipe(TE.of(5), TE.chain(f)) === f(5);

// 2. 右恒等律：chain(m, of) === m
pipe(m, TE.chain(TE.of)) === m;

// 3. 结合律：chain(chain(m, f), g) === chain(m, x => chain(f(x), g))
pipe(m, TE.chain(f), TE.chain(g)) === 
pipe(m, TE.chain(x => pipe(f(x), TE.chain(g))));
```

## 五、Applicative Functor（应用函子）

### 概念

Applicative 允许我们将包装在容器中的函数应用到包装在容器中的值。

```typescript
import * as O from "fp-ts/Option";
import * as A from "fp-ts/Apply";
import { pipe } from "fp-ts/function";

// 当有多个 Option 值需要组合时
const maybeA: O.Option<number> = O.some(1);
const maybeB: O.Option<number> = O.some(2);
const maybeC: O.Option<number> = O.some(3);

// 使用 sequenceS 组合多个 Option
import { sequenceS } from "fp-ts/Apply";

const result = sequenceS(O.Apply)({
  a: maybeA,
  b: maybeB,
  c: maybeC
}); // Option<{ a: number, b: number, c: number }>
```

### 项目中的应用

```typescript
import * as TE from "fp-ts/TaskEither";
import { sequenceS } from "fp-ts/Apply";

// 并行获取多个资源
const fetchAllData = (workspaceId: string): TE.TaskEither<AppError, WorkspaceData> =>
  sequenceS(TE.ApplyPar)({
    nodes: getNodesByWorkspace(workspaceId),
    settings: getWorkspaceSettings(workspaceId),
    tags: getWorkspaceTags(workspaceId)
  });

// 结果类型：TaskEither<AppError, { nodes: Node[], settings: Settings, tags: Tag[] }>
```

## 六、Declarative vs Imperative（声明式 vs 命令式）

### 概念

声明式编程关注"做什么"，命令式编程关注"怎么做"。

```typescript
// ❌ 命令式：描述每一步怎么做
const getActiveUserNames = (users: User[]): string[] => {
  const result: string[] = [];
  for (let i = 0; i < users.length; i++) {
    if (users[i].active) {
      result.push(users[i].name.toUpperCase());
    }
  }
  return result;
};

// ✅ 声明式：描述要做什么
const getActiveUserNames = (users: User[]): string[] =>
  pipe(
    users,
    A.filter(user => user.active),
    A.map(user => user.name.toUpperCase())
  );
```

### 项目规范

```typescript
// ✅ 声明式数据处理
const processNodes = (nodes: Node[]): ProcessedNode[] =>
  pipe(
    nodes,
    A.filter(isValidNode),
    A.map(enrichNode),
    A.sort(byCreatedDate)
  );

// ❌ 避免命令式循环
const processNodes = (nodes: Node[]): ProcessedNode[] => {
  const result = [];
  for (const node of nodes) {
    if (isValidNode(node)) {
      result.push(enrichNode(node));
    }
  }
  result.sort((a, b) => /* ... */);
  return result;
};
```

## 七、Referential Transparency（引用透明）

### 概念

如果一个表达式可以被它的值替换而不改变程序的行为，那么这个表达式就是引用透明的。

```typescript
// ✅ 引用透明
const add = (a: number, b: number): number => a + b;
// add(2, 3) 可以被 5 替换

// ❌ 非引用透明
let counter = 0;
const increment = (): number => ++counter;
// increment() 不能被替换，因为每次调用结果不同
```

### 好处

- 可缓存（Memoization）
- 可并行化
- 易于测试
- 易于推理

```typescript
// 因为引用透明，可以安全地缓存
const memoize = <A extends string | number, B>(
  fn: (a: A) => B
): (a: A) => B => {
  const cache = new Map<A, B>();
  return (a: A): B => {
    if (!cache.has(a)) {
      cache.set(a, fn(a));
    }
    return cache.get(a)!;
  };
};

const expensiveCalculation = memoize((n: number) => {
  // 复杂计算
  return fibonacci(n);
});
```

## 八、Hindley-Milner 类型签名

### 概念

函数式编程中常用的类型签名表示法。

```typescript
// 类型签名格式：functionName :: inputType -> outputType

// add :: number -> number -> number
const add = (a: number) => (b: number): number => a + b;

// map :: (a -> b) -> [a] -> [b]
const map = <A, B>(fn: (a: A) => B) => (arr: A[]): B[] => arr.map(fn);

// filter :: (a -> boolean) -> [a] -> [a]
const filter = <A>(pred: (a: A) => boolean) => (arr: A[]): A[] => arr.filter(pred);

// chain :: (a -> Option<b>) -> Option<a> -> Option<b>
// 在 fp-ts 中已实现
```

### 项目中的类型签名注释

```typescript
/**
 * 获取节点内容
 * getNodeContent :: string -> TaskEither<AppError, Content>
 */
const getNodeContent = (nodeId: string): TE.TaskEither<AppError, Content> =>
  /* ... */;

/**
 * 过滤活跃节点
 * filterActiveNodes :: [Node] -> [Node]
 */
const filterActiveNodes = (nodes: Node[]): Node[] =>
  nodes.filter(n => n.active);
```

## 九、Natural Transformation（自然变换）

### 概念

自然变换是从一个 Functor 到另一个 Functor 的映射。

```typescript
import * as O from "fp-ts/Option";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";

// Option -> Either
const optionToEither = <E, A>(
  onNone: () => E
) => (opt: O.Option<A>): E.Either<E, A> =>
  pipe(
    opt,
    O.match(
      () => E.left(onNone()),
      (a) => E.right(a)
    )
  );

// Either -> TaskEither
const eitherToTaskEither = <E, A>(
  either: E.Either<E, A>
): TE.TaskEither<E, A> =>
  TE.fromEither(either);

// 使用
const result = pipe(
  findUser("1"),                                    // Option<User>
  optionToEither(() => ({ type: "NOT_FOUND" })),   // Either<AppError, User>
  eitherToTaskEither,                              // TaskEither<AppError, User>
  TE.chain(saveUser)                               // TaskEither<AppError, User>
);
```

## 十、项目规范补充

### 1. 优先使用 flow 定义可复用的管道

```typescript
// ✅ 使用 flow 创建可复用的处理管道
const processUserData = flow(
  validateUser,
  E.map(normalizeUser),
  E.map(enrichUser)
);

// 可以在多处复用
const result1 = processUserData(userData1);
const result2 = processUserData(userData2);
```

### 2. 使用 Do notation 简化复杂管道

```typescript
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";

// ✅ 使用 Do notation
const createNode = (params: CreateNodeParams): TE.TaskEither<AppError, Node> =>
  pipe(
    TE.Do,
    TE.bind("validated", () => validateParams(params)),
    TE.bind("order", ({ validated }) => getNextOrder(validated.parentId)),
    TE.bind("node", ({ validated, order }) => 
      buildNode({ ...validated, order })
    ),
    TE.chain(({ node }) => saveNode(node))
  );
```

### 3. 使用 sequenceT/sequenceS 处理并行操作

```typescript
import { sequenceT, sequenceS } from "fp-ts/Apply";
import * as TE from "fp-ts/TaskEither";

// sequenceT: 元组形式
const fetchData = sequenceT(TE.ApplyPar)(
  fetchUsers(),
  fetchSettings(),
  fetchTags()
); // TaskEither<Error, [User[], Settings, Tag[]]>

// sequenceS: 对象形式（推荐）
const fetchData = sequenceS(TE.ApplyPar)({
  users: fetchUsers(),
  settings: fetchSettings(),
  tags: fetchTags()
}); // TaskEither<Error, { users: User[], settings: Settings, tags: Tag[] }>
```

### 4. 错误处理最佳实践

```typescript
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";

// ✅ 使用 mapLeft 转换错误类型
const fetchWithErrorMapping = (id: string): TE.TaskEither<AppError, Data> =>
  pipe(
    fetchData(id),
    TE.mapLeft((error): AppError => ({
      type: "FETCH_ERROR",
      message: error.message,
      originalError: error
    }))
  );

// ✅ 使用 orElse 提供降级方案
const fetchWithFallback = (id: string): TE.TaskEither<AppError, Data> =>
  pipe(
    fetchFromPrimary(id),
    TE.orElse(() => fetchFromBackup(id))
  );

// ✅ 使用 fold/match 处理最终结果
const handleResult = async (id: string): Promise<void> => {
  const result = await fetchData(id)();
  
  pipe(
    result,
    E.match(
      (error) => showErrorToast(error.message),
      (data) => updateUI(data)
    )
  );
};
```

## 参考资料

- [Mostly Adequate Guide to Functional Programming](https://mostly-adequate.gitbook.io/mostly-adequate-guide)
- [fp-ts Documentation](https://gcanti.github.io/fp-ts/)
- [fp-ts Learning Resources](https://gcanti.github.io/fp-ts/learning-resources/)
