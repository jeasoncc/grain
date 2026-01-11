# 函数式编程规则指南

本项目严格遵循函数式编程原则，**禁止使用 `try-catch` 语句**。

## 🚫 禁止的模式

### ❌ 不要使用 try-catch

```typescript
// ❌ 错误：使用 try-catch
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('操作失败:', error);
  return null;
}
```

### ❌ 不要使用 Promise.catch()

```typescript
// ❌ 错误：使用 .catch()
fetchData()
  .then(data => processData(data))
  .catch(error => handleError(error));
```

### ❌ 不要使用 throw 语句

```typescript
// ❌ 错误：抛出异常
function validateInput(input: string) {
  if (!input) {
    throw new Error('输入不能为空');
  }
  return input;
}
```

## ✅ 正确的函数式模式

### ✅ 使用 TaskEither 处理异步错误

```typescript
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";

// ✅ 正确：使用 TaskEither
const riskyOperationFlow = (): TE.TaskEither<AppError, string> =>
  TE.tryCatch(
    () => riskyOperation(),
    (error) => ({
      type: "OPERATION_ERROR",
      message: String(error),
    })
  );

// ✅ 正确：组合多个操作
const complexFlow = (input: string): TE.TaskEither<AppError, Result> =>
  pipe(
    validateInput(input),
    TE.chain(processData),
    TE.chain(saveResult),
    TE.orElse((error) => 
      pipe(
        logError(error),
        TE.fromTask,
        TE.map(() => getDefaultResult())
      )
    )
  );
```

### ✅ 使用 Either 处理同步错误

```typescript
import * as E from "fp-ts/Either";

// ✅ 正确：使用 Either 进行验证
const validateInput = (input: string): E.Either<ValidationError, string> => {
  if (!input) {
    return E.left({
      type: "VALIDATION_ERROR",
      message: "输入不能为空",
      field: "input"
    });
  }
  return E.right(input);
};
```

### ✅ 使用 Option 处理可能为空的值

```typescript
import * as O from "fp-ts/Option";

// ✅ 正确：使用 Option
const findUser = (id: string): O.Option<User> => {
  const user = users.find(u => u.id === id);
  return user ? O.some(user) : O.none;
};

// ✅ 正确：处理 Option
const getUserName = (id: string): string =>
  pipe(
    findUser(id),
    O.map(user => user.name),
    O.getOrElse(() => "未知用户")
  );
```

## 📁 目录特殊规则

### pipes/ 目录 - 纯函数

```typescript
// ✅ pipes/ 中只能有纯函数
export const formatLogEntry = (
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): LogEntry => ({
  id: generateId(),
  timestamp: new Date().toISOString(),
  level,
  message,
  context,
});

// ❌ pipes/ 中禁止副作用
// console.log() ❌
// localStorage.setItem() ❌
// window.location.href ❌
```

### io/ 目录 - IO 操作

```typescript
// ✅ io/ 中处理所有副作用
export const saveToStorage = (key: string, value: unknown): TE.TaskEither<AppError, void> =>
  TE.tryCatch(
    async () => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    (error) => ({
      type: "STORAGE_ERROR",
      message: `Failed to save ${key}: ${String(error)}`,
    })
  );
```

### flows/ 目录 - 业务流程

```typescript
// ✅ flows/ 中组合 pipes + io
export const saveUserFlow = (user: User): TE.TaskEither<AppError, void> =>
  pipe(
    validateUser(user), // pipe
    TE.fromEither,
    TE.chain(validUser => saveUserToAPI(validUser)), // io
    TE.chain(() => logSuccess("用户保存成功")), // io
  );
```

## 🛠️ 开发工具

### 检查命令

```bash
# 检查函数式编程规则
npm run lint:functional

# 检查所有规则（Biome + 函数式）
npm run lint:all

# 自动修复格式问题
npm run check:all
```

### Git Hook

项目已配置 pre-commit hook，会自动检查：
- 禁止 `try-catch` 语句
- 禁止 `.catch()` 方法
- 禁止 pipes/ 目录中的副作用

```bash
# 如需临时跳过检查
git commit --no-verify
```

### VS Code 集成

1. 安装 ESLint 扩展
2. 复制 `.vscode/settings.functional.json` 到 `.vscode/settings.json`
3. 实时检查函数式编程规则

## 🔧 错误处理模式

### 日志记录

```typescript
// ✅ 使用函数式日志系统
import { logError, logInfo } from "@/io/log/logger.api";

const processDataFlow = (data: unknown): TE.TaskEither<AppError, Result> =>
  pipe(
    validateData(data),
    TE.fromEither,
    TE.chain(processValidData),
    TE.orElse((error) =>
      pipe(
        logError("数据处理失败", { error: error.message }),
        TE.fromTask,
        TE.chain(() => TE.left(error))
      )
    )
  );
```

### 错误恢复

```typescript
// ✅ 优雅的错误恢复
const fetchWithFallback = (url: string): TE.TaskEither<never, Data> =>
  pipe(
    fetchFromAPI(url),
    TE.orElse(() => fetchFromCache(url)),
    TE.orElse(() => TE.right(getDefaultData()))
  );
```

## 📚 学习资源

- [fp-ts 官方文档](https://gcanti.github.io/fp-ts/)
- [函数式编程指南](https://github.com/MostlyAdequate/mostly-adequate-guide)
- [TaskEither 使用指南](https://dev.to/gcanti/getting-started-with-fp-ts-either-vs-validation-5eja)

## 🆘 常见问题

**Q: 为什么禁止 try-catch？**
A: try-catch 是命令式编程模式，会破坏函数的纯净性和可组合性。TaskEither 提供了更好的错误处理和组合能力。

**Q: 如何处理第三方库的异常？**
A: 使用 `TE.tryCatch()` 包装第三方库调用。

**Q: 测试文件可以使用 try-catch 吗？**
A: 可以，测试文件已在 ESLint 配置中排除。

**Q: 如何调试 TaskEither 的错误？**
A: 使用 `TE.mapLeft()` 添加调试信息，或使用日志系统记录错误。