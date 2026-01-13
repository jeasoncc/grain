# GRAIN-FUNCTIONAL 问题报告

共 366 个问题

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/examples/functional-logging-example.ts

共 1 个问题

### ❌ grain/no-mutation

**位置**: 第 85 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.forEach()

📝 问题代码：
  const results: string[] = [];
  items.forEach(item => {
    results.push(item.name);  // 副作用！
  });

🔍 错误原因：
  forEach 鼓励副作用编程：
  - 通常用于修改外部状态
  - 没有返回值，难以组合
  - 不如 map/filter/reduce 表达意图

🏗️ 架构原则：
  使用声明式数组方法：
    - map: 转换每个元素
    - filter: 筛选元素
    - reduce: 聚合为单个值
    - flatMap: 转换并展平

✅ 修复方案：
  步骤 1: 分析 forEach 的实际用途
  步骤 2: 如果是转换，使用 map
  步骤 3: 如果是筛选，使用 filter
  步骤 4: 如果是聚合，使用 reduce

📋 修复后的代码：
```typescript
// ❌ 错误做法
const results: string[] = [];
items.forEach(item => {
  results.push(item.name);
});

// ✅ 正确做法 - 使用 map
const results = items.map(item => item.name);

// ✅ 正确做法 - 使用 filter + map
const activeNames = items
  .filter(item => item.active)
  .map(item => item.name);

// ✅ 正确做法 - 使用 reduce
const total = items.reduce((sum, item) => sum + item.value, 0);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';

const results = pipe(
  items,
  A.map(item => item.name)
);
```

📚 参考文档：#fp-patterns - 数组操作
📋 Steering 文件：#code-standards - 声明式编程

🔗 相关规则：no-mutation, prefer-map

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/backup/backup.flow.ts

共 2 个问题

### ❌ grain/no-try-catch

**位置**: 第 303 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-mutation

**位置**: 第 321 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.unshift()

📝 问题代码：
  const items = [1, 2, 3];
  items.unshift(4);

🔍 错误原因：
  array.unshift() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 unshift() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到开头
const newArray = [newItem, ...array];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/backup/clear-data.flow.ts

共 6 个问题

### ❌ grain/no-mutation

**位置**: 第 150 行，第 6 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 157 行，第 6 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 164 行，第 6 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 171 行，第 6 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 178 行，第 6 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-try-catch

**位置**: 第 201 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/editor-tabs/editor-tabs.flow.ts

共 2 个问题

### ❌ grain/no-mutation

**位置**: 第 146 行，第 20 列

**消息**: ❌ 【错误】禁止使用 array.splice()

📝 问题代码：
  const items = [1, 2, 3];
  items.splice();

🔍 错误原因：
  array.splice() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 splice() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 删除元素
const newArray = array.filter((_, index) => index !== targetIndex);
// 插入元素
const newArray = [
  ...array.slice(0, insertIndex),
  newItem,
  ...array.slice(insertIndex)
];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 147 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.splice()

📝 问题代码：
  const items = [1, 2, 3];
  items.splice();

🔍 错误原因：
  array.splice() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 splice() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 删除元素
const newArray = array.filter((_, index) => index !== targetIndex);
// 插入元素
const newArray = [
  ...array.slice(0, insertIndex),
  newItem,
  ...array.slice(insertIndex)
];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/export/export-path.flow.ts

共 7 个问题

### ❌ grain/no-try-catch

**位置**: 第 104 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 146 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 183 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 210 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 235 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 321 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 337 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/export/export-project.flow.ts

共 28 个问题

### ❌ grain/no-try-catch

**位置**: 第 49 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-mutation

**位置**: 第 102 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 109 行，第 19 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 114 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 221 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 243 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 244 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 248 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 249 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 253 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 254 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 262 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 263 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 264 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 266 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 267 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 273 行，第 6 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 275 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 280 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 281 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 305 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 316 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 331 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 340 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 348 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 360 行，第 6 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 498 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 526 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/file/create-file.flow.ts

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 147 行，第 8 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/file/open-file.flow.ts

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 102 行，第 7 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/layout/init-layout.flow.ts

共 2 个问题

### ❌ grain/no-try-catch

**位置**: 第 39 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 70 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/log/async-log.flow.ts

共 6 个问题

### ❌ grain/no-mutation

**位置**: 第 172 行，第 29 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 187 行，第 7 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 190 行，第 7 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-try-catch

**位置**: 第 249 行，第 5 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-mutation

**位置**: 第 252 行，第 21 列

**消息**: ❌ 【错误】禁止使用 array.splice()

📝 问题代码：
  const items = [1, 2, 3];
  items.splice();

🔍 错误原因：
  array.splice() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 splice() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 删除元素
const newArray = array.filter((_, index) => index !== targetIndex);
// 插入元素
const newArray = [
  ...array.slice(0, insertIndex),
  newItem,
  ...array.slice(insertIndex)
];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 274 行，第 9 列

**消息**: ❌ 【错误】禁止使用 array.unshift()

📝 问题代码：
  const items = [1, 2, 3];
  items.unshift(4);

🔍 错误原因：
  array.unshift() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 unshift() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到开头
const newArray = [newItem, ...array];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/log/batch-log.flow.ts

共 2 个问题

### ❌ grain/no-mutation

**位置**: 第 85 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 148 行，第 7 列

**消息**: ❌ 【错误】禁止使用 array.unshift()

📝 问题代码：
  const items = [1, 2, 3];
  items.unshift(4);

🔍 错误原因：
  array.unshift() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 unshift() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到开头
const newArray = [newItem, ...array];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/log/config.flow.ts

共 10 个问题

### ❌ grain/no-mutation

**位置**: 第 241 行，第 9 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 249 行，第 11 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 255 行，第 11 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 262 行，第 11 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 268 行，第 11 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 421 行，第 9 列

**消息**: ❌ 【错误】禁止使用数组索引赋值

📝 问题代码：
  const items = [1, 2, 3];
  items[1] = 10;  // 直接修改数组

🔍 错误原因：
  数组索引赋值直接修改原数组：
  - 破坏不可变性
  - 难以追踪变化
  - 可能导致 React 不重新渲染

🏗️ 架构原则：
  使用不可变更新模式：
    - 使用 map 更新特定索引
    - 使用展开运算符创建新数组
    - 使用 Immer 进行复杂更新

✅ 修复方案：
  步骤 1: 确定要更新的索引
  步骤 2: 使用 map 或展开运算符创建新数组
  步骤 3: 复杂更新考虑使用 Immer

📋 修复后的代码：
```typescript
// ❌ 错误做法
items[1] = 10;

// ✅ 正确做法 - 使用 map
const updated = items.map((item, index) => 
  index === 1 ? 10 : item
);

// ✅ 正确做法 - 使用展开运算符
const updated = [
  ...items.slice(0, 1),
  10,
  ...items.slice(2)
];

// ✅ 正确做法 - 使用 Immer
import { produce } from 'immer';
const updated = produce(items, draft => {
  draft[1] = 10;
});

// ✅ 正确做法 - 使用 fp-ts
import * as A from 'fp-ts/Array';
const updated = pipe(
  items,
  A.updateAt(1, 10),
  O.getOrElse(() => items)
);
```

📚 参考文档：#fp-patterns - 不可变更新
📋 Steering 文件：#code-standards - 数组操作

🔗 相关规则：no-mutation, no-object-mutation

---

### ❌ grain/no-mutation

**位置**: 第 423 行，第 9 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-try-catch

**位置**: 第 506 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-mutation

**位置**: 第 532 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 537 行，第 7 列

**消息**: ❌ 【错误】禁止使用 array.splice()

📝 问题代码：
  const items = [1, 2, 3];
  items.splice();

🔍 错误原因：
  array.splice() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 splice() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 删除元素
const newArray = array.filter((_, index) => index !== targetIndex);
// 插入元素
const newArray = [
  ...array.slice(0, insertIndex),
  newItem,
  ...array.slice(insertIndex)
];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/log/query-optimization.flow.ts

共 2 个问题

### ❌ grain/no-mutation

**位置**: 第 71 行，第 18 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 117 行，第 23 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/migration/dexie-to-sqlite.migration.fn.test.ts

共 1 个问题

### ❌ grain/no-mutation

**位置**: 第 201 行，第 3 列

**消息**: ❌ 【错误】禁止使用数组索引赋值

📝 问题代码：
  const items = [1, 2, 3];
  items[1] = 10;  // 直接修改数组

🔍 错误原因：
  数组索引赋值直接修改原数组：
  - 破坏不可变性
  - 难以追踪变化
  - 可能导致 React 不重新渲染

🏗️ 架构原则：
  使用不可变更新模式：
    - 使用 map 更新特定索引
    - 使用展开运算符创建新数组
    - 使用 Immer 进行复杂更新

✅ 修复方案：
  步骤 1: 确定要更新的索引
  步骤 2: 使用 map 或展开运算符创建新数组
  步骤 3: 复杂更新考虑使用 Immer

📋 修复后的代码：
```typescript
// ❌ 错误做法
items[1] = 10;

// ✅ 正确做法 - 使用 map
const updated = items.map((item, index) => 
  index === 1 ? 10 : item
);

// ✅ 正确做法 - 使用展开运算符
const updated = [
  ...items.slice(0, 1),
  10,
  ...items.slice(2)
];

// ✅ 正确做法 - 使用 Immer
import { produce } from 'immer';
const updated = produce(items, draft => {
  draft[1] = 10;
});

// ✅ 正确做法 - 使用 fp-ts
import * as A from 'fp-ts/Array';
const updated = pipe(
  items,
  A.updateAt(1, 10),
  O.getOrElse(() => items)
);
```

📚 参考文档：#fp-patterns - 不可变更新
📋 Steering 文件：#code-standards - 数组操作

🔗 相关规则：no-mutation, no-object-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/migration/dexie-to-sqlite.migration.fn.ts

共 4 个问题

### ❌ grain/no-try-catch

**位置**: 第 100 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 115 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 126 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-mutation

**位置**: 第 318 行，第 24 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/save/save-service-manager.flow.ts

共 3 个问题

### ❌ grain/no-try-catch

**位置**: 第 139 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-mutation

**位置**: 第 293 行，第 6 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 306 行，第 6 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/save/unified-save.service.ts

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 137 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/search/search-engine.flow.ts

共 7 个问题

### ❌ grain/no-try-catch

**位置**: 第 86 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 193 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-mutation

**位置**: 第 220 行，第 6 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 234 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-try-catch

**位置**: 第 259 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-mutation

**位置**: 第 294 行，第 7 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 309 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/theme/init-theme.flow.ts

共 2 个问题

### ❌ grain/no-try-catch

**位置**: 第 39 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 112 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/updater/updater.fn.ts

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 61 行，第 4 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/wiki/get-wiki-files.flow.ts

共 1 个问题

### ❌ grain/no-mutation

**位置**: 第 32 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.unshift()

📝 问题代码：
  const items = [1, 2, 3];
  items.unshift(4);

🔍 错误原因：
  array.unshift() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 unshift() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到开头
const newArray = [newItem, ...array];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/wiki/get-wiki-preview.flow.ts

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 63 行，第 5 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/wiki/migrate-wiki.flow.ts

共 5 个问题

### ❌ grain/no-try-catch

**位置**: 第 66 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 100 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 129 行，第 4 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-mutation

**位置**: 第 134 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 147 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/queries/attachment.queries.ts

共 5 个问题

### ❌ grain/no-mutation

**位置**: 第 29 行，第 11 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 71 行，第 11 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 102 行，第 11 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 124 行，第 11 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 148 行，第 11 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/queries/user.queries.ts

共 1 个问题

### ❌ grain/no-mutation

**位置**: 第 31 行，第 11 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/use-backup-manager.ts

共 8 个问题

### ❌ grain/no-try-catch

**位置**: 第 77 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 114 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 132 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 164 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 185 行，第 4 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 228 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 251 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 276 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/use-drawing.ts

共 3 个问题

### ❌ grain/no-mutation

**位置**: 第 46 行，第 10 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 109 行，第 18 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 139 行，第 10 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/use-node-operations.ts

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 42 行，第 4 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/use-node.ts

共 2 个问题

### ❌ grain/no-mutation

**位置**: 第 86 行，第 10 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 106 行，第 10 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/use-tag.ts

共 1 个问题

### ❌ grain/no-mutation

**位置**: 第 143 行，第 9 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/use-update-checker.ts

共 2 个问题

### ❌ grain/no-try-catch

**位置**: 第 61 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 92 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/use-wiki.ts

共 1 个问题

### ❌ grain/no-mutation

**位置**: 第 33 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.unshift()

📝 问题代码：
  const items = [1, 2, 3];
  items.unshift(4);

🔍 错误原因：
  array.unshift() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 unshift() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到开头
const newArray = [newItem, ...array];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/use-workspace.ts

共 3 个问题

### ❌ grain/no-mutation

**位置**: 第 53 行，第 10 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 118 行，第 10 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 171 行，第 18 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/io/dom/theme.dom.ts

共 1 个问题

### ❌ grain/no-mutation

**位置**: 第 100 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.forEach()

📝 问题代码：
  const results: string[] = [];
  items.forEach(item => {
    results.push(item.name);  // 副作用！
  });

🔍 错误原因：
  forEach 鼓励副作用编程：
  - 通常用于修改外部状态
  - 没有返回值，难以组合
  - 不如 map/filter/reduce 表达意图

🏗️ 架构原则：
  使用声明式数组方法：
    - map: 转换每个元素
    - filter: 筛选元素
    - reduce: 聚合为单个值
    - flatMap: 转换并展平

✅ 修复方案：
  步骤 1: 分析 forEach 的实际用途
  步骤 2: 如果是转换，使用 map
  步骤 3: 如果是筛选，使用 filter
  步骤 4: 如果是聚合，使用 reduce

📋 修复后的代码：
```typescript
// ❌ 错误做法
const results: string[] = [];
items.forEach(item => {
  results.push(item.name);
});

// ✅ 正确做法 - 使用 map
const results = items.map(item => item.name);

// ✅ 正确做法 - 使用 filter + map
const activeNames = items
  .filter(item => item.active)
  .map(item => item.name);

// ✅ 正确做法 - 使用 reduce
const total = items.reduce((sum, item) => sum + item.value, 0);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';

const results = pipe(
  items,
  A.map(item => item.name)
);
```

📚 参考文档：#fp-patterns - 数组操作
📋 Steering 文件：#code-standards - 声明式编程

🔗 相关规则：no-mutation, prefer-map

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/io/file/dialog.file.ts

共 5 个问题

### ❌ grain/no-try-catch

**位置**: 第 85 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 126 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 145 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 164 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 183 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/io/storage/layout.storage.ts

共 4 个问题

### ❌ grain/no-try-catch

**位置**: 第 52 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 68 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 101 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 117 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/io/storage/settings.storage.ts

共 12 个问题

### ❌ grain/no-try-catch

**位置**: 第 51 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 67 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 83 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 98 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 124 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 153 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 170 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 192 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 220 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 235 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 253 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 268 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/content/content.extract.fn.ts

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 78 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/content/content.generate.fn.ts

共 51 个问题

### ❌ grain/no-mutation

**位置**: 第 293 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.forEach()

📝 问题代码：
  const results: string[] = [];
  items.forEach(item => {
    results.push(item.name);  // 副作用！
  });

🔍 错误原因：
  forEach 鼓励副作用编程：
  - 通常用于修改外部状态
  - 没有返回值，难以组合
  - 不如 map/filter/reduce 表达意图

🏗️ 架构原则：
  使用声明式数组方法：
    - map: 转换每个元素
    - filter: 筛选元素
    - reduce: 聚合为单个值
    - flatMap: 转换并展平

✅ 修复方案：
  步骤 1: 分析 forEach 的实际用途
  步骤 2: 如果是转换，使用 map
  步骤 3: 如果是筛选，使用 filter
  步骤 4: 如果是聚合，使用 reduce

📋 修复后的代码：
```typescript
// ❌ 错误做法
const results: string[] = [];
items.forEach(item => {
  results.push(item.name);
});

// ✅ 正确做法 - 使用 map
const results = items.map(item => item.name);

// ✅ 正确做法 - 使用 filter + map
const activeNames = items
  .filter(item => item.active)
  .map(item => item.name);

// ✅ 正确做法 - 使用 reduce
const total = items.reduce((sum, item) => sum + item.value, 0);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';

const results = pipe(
  items,
  A.map(item => item.name)
);
```

📚 参考文档：#fp-patterns - 数组操作
📋 Steering 文件：#code-standards - 声明式编程

🔗 相关规则：no-mutation, prefer-map

---

### ❌ grain/no-mutation

**位置**: 第 294 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 296 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 390 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 395 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 399 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 403 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 432 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 437 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 441 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 445 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 449 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 477 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 482 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 486 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 490 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 494 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 495 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 499 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 503 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 504 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 532 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 537 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 541 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 545 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 549 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 577 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 582 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 586 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 590 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 594 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 600 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 604 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 607 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 610 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 614 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 618 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 621 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 624 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 628 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 632 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 635 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 639 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-try-catch

**位置**: 第 690 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-mutation

**位置**: 第 711 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 743 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 745 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 753 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 756 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 758 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 762 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/content/excalidraw.content.fn.ts

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 188 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/editor-tab/editor-tab.pipe.ts

共 3 个问题

### ❌ grain/no-mutation

**位置**: 第 103 行，第 20 列

**消息**: ❌ 【错误】禁止使用 array.splice()

📝 问题代码：
  const items = [1, 2, 3];
  items.splice();

🔍 错误原因：
  array.splice() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 splice() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 删除元素
const newArray = array.filter((_, index) => index !== targetIndex);
// 插入元素
const newArray = [
  ...array.slice(0, insertIndex),
  newItem,
  ...array.slice(insertIndex)
];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 104 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.splice()

📝 问题代码：
  const items = [1, 2, 3];
  items.splice();

🔍 错误原因：
  array.splice() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 splice() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 删除元素
const newArray = array.filter((_, index) => index !== targetIndex);
// 插入元素
const newArray = [
  ...array.slice(0, insertIndex),
  newItem,
  ...array.slice(insertIndex)
];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 127 行，第 24 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/export/export.bundle.fn.ts

共 13 个问题

### ❌ grain/no-mutation

**位置**: 第 102 行，第 22 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 106 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 107 行，第 24 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 109 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 110 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 112 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 117 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 118 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-try-catch

**位置**: 第 122 行，第 4 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-mutation

**位置**: 第 126 行，第 6 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 127 行，第 6 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 130 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 131 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/export/export.json.fn.ts

共 2 个问题

### ❌ grain/no-try-catch

**位置**: 第 98 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-mutation

**位置**: 第 221 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/export/export.markdown.fn.ts

共 19 个问题

### ❌ grain/no-mutation

**位置**: 第 271 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 276 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 278 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 280 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 286 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 288 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 290 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 323 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 325 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 328 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 332 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 335 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 339 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 340 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 361 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 366 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 367 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 375 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 434 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/export/export.orgmode.fn.ts

共 15 个问题

### ❌ grain/no-mutation

**位置**: 第 281 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 286 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 288 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 290 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 296 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 298 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 300 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 326 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 330 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 334 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 340 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 345 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 369 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 378 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 437 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/export/export.path.fn.test.ts

共 1 个问题

### ❌ grain/no-mutation

**位置**: 第 24 行，第 4 列

**消息**: ❌ 【错误】禁止使用数组索引赋值

📝 问题代码：
  const items = [1, 2, 3];
  items[1] = 10;  // 直接修改数组

🔍 错误原因：
  数组索引赋值直接修改原数组：
  - 破坏不可变性
  - 难以追踪变化
  - 可能导致 React 不重新渲染

🏗️ 架构原则：
  使用不可变更新模式：
    - 使用 map 更新特定索引
    - 使用展开运算符创建新数组
    - 使用 Immer 进行复杂更新

✅ 修复方案：
  步骤 1: 确定要更新的索引
  步骤 2: 使用 map 或展开运算符创建新数组
  步骤 3: 复杂更新考虑使用 Immer

📋 修复后的代码：
```typescript
// ❌ 错误做法
items[1] = 10;

// ✅ 正确做法 - 使用 map
const updated = items.map((item, index) => 
  index === 1 ? 10 : item
);

// ✅ 正确做法 - 使用展开运算符
const updated = [
  ...items.slice(0, 1),
  10,
  ...items.slice(2)
];

// ✅ 正确做法 - 使用 Immer
import { produce } from 'immer';
const updated = produce(items, draft => {
  draft[1] = 10;
});

// ✅ 正确做法 - 使用 fp-ts
import * as A from 'fp-ts/Array';
const updated = pipe(
  items,
  A.updateAt(1, 10),
  O.getOrElse(() => items)
);
```

📚 参考文档：#fp-patterns - 不可变更新
📋 Steering 文件：#code-standards - 数组操作

🔗 相关规则：no-mutation, no-object-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/import/import.file.fn.ts

共 2 个问题

### ❌ grain/no-try-catch

**位置**: 第 53 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-mutation

**位置**: 第 104 行，第 20 列

**消息**: ❌ 【错误】禁止使用 array.pop()

📝 问题代码：
  const items = [1, 2, 3];
  items.pop();

🔍 错误原因：
  array.pop() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 pop() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 移除最后一个元素
const newArray = array.slice(0, -1);
// 获取最后一个元素
const lastItem = array[array.length - 1];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/import/import.json.fn.ts

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 95 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/import/import.markdown.fn.ts

共 21 个问题

### ❌ grain/no-try-catch

**位置**: 第 113 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-mutation

**位置**: 第 124 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 130 行，第 5 列

**消息**: ❌ 【错误】禁止使用数组索引赋值

📝 问题代码：
  const items = [1, 2, 3];
  items[1] = 10;  // 直接修改数组

🔍 错误原因：
  数组索引赋值直接修改原数组：
  - 破坏不可变性
  - 难以追踪变化
  - 可能导致 React 不重新渲染

🏗️ 架构原则：
  使用不可变更新模式：
    - 使用 map 更新特定索引
    - 使用展开运算符创建新数组
    - 使用 Immer 进行复杂更新

✅ 修复方案：
  步骤 1: 确定要更新的索引
  步骤 2: 使用 map 或展开运算符创建新数组
  步骤 3: 复杂更新考虑使用 Immer

📋 修复后的代码：
```typescript
// ❌ 错误做法
items[1] = 10;

// ✅ 正确做法 - 使用 map
const updated = items.map((item, index) => 
  index === 1 ? 10 : item
);

// ✅ 正确做法 - 使用展开运算符
const updated = [
  ...items.slice(0, 1),
  10,
  ...items.slice(2)
];

// ✅ 正确做法 - 使用 Immer
import { produce } from 'immer';
const updated = produce(items, draft => {
  draft[1] = 10;
});

// ✅ 正确做法 - 使用 fp-ts
import * as A from 'fp-ts/Array';
const updated = pipe(
  items,
  A.updateAt(1, 10),
  O.getOrElse(() => items)
);
```

📚 参考文档：#fp-patterns - 不可变更新
📋 Steering 文件：#code-standards - 数组操作

🔗 相关规则：no-mutation, no-object-mutation

---

### ❌ grain/no-mutation

**位置**: 第 146 行，第 6 列

**消息**: ❌ 【错误】禁止使用数组索引赋值

📝 问题代码：
  const items = [1, 2, 3];
  items[1] = 10;  // 直接修改数组

🔍 错误原因：
  数组索引赋值直接修改原数组：
  - 破坏不可变性
  - 难以追踪变化
  - 可能导致 React 不重新渲染

🏗️ 架构原则：
  使用不可变更新模式：
    - 使用 map 更新特定索引
    - 使用展开运算符创建新数组
    - 使用 Immer 进行复杂更新

✅ 修复方案：
  步骤 1: 确定要更新的索引
  步骤 2: 使用 map 或展开运算符创建新数组
  步骤 3: 复杂更新考虑使用 Immer

📋 修复后的代码：
```typescript
// ❌ 错误做法
items[1] = 10;

// ✅ 正确做法 - 使用 map
const updated = items.map((item, index) => 
  index === 1 ? 10 : item
);

// ✅ 正确做法 - 使用展开运算符
const updated = [
  ...items.slice(0, 1),
  10,
  ...items.slice(2)
];

// ✅ 正确做法 - 使用 Immer
import { produce } from 'immer';
const updated = produce(items, draft => {
  draft[1] = 10;
});

// ✅ 正确做法 - 使用 fp-ts
import * as A from 'fp-ts/Array';
const updated = pipe(
  items,
  A.updateAt(1, 10),
  O.getOrElse(() => items)
);
```

📚 参考文档：#fp-patterns - 不可变更新
📋 Steering 文件：#code-standards - 数组操作

🔗 相关规则：no-mutation, no-object-mutation

---

### ❌ grain/no-mutation

**位置**: 第 153 行，第 4 列

**消息**: ❌ 【错误】禁止使用数组索引赋值

📝 问题代码：
  const items = [1, 2, 3];
  items[1] = 10;  // 直接修改数组

🔍 错误原因：
  数组索引赋值直接修改原数组：
  - 破坏不可变性
  - 难以追踪变化
  - 可能导致 React 不重新渲染

🏗️ 架构原则：
  使用不可变更新模式：
    - 使用 map 更新特定索引
    - 使用展开运算符创建新数组
    - 使用 Immer 进行复杂更新

✅ 修复方案：
  步骤 1: 确定要更新的索引
  步骤 2: 使用 map 或展开运算符创建新数组
  步骤 3: 复杂更新考虑使用 Immer

📋 修复后的代码：
```typescript
// ❌ 错误做法
items[1] = 10;

// ✅ 正确做法 - 使用 map
const updated = items.map((item, index) => 
  index === 1 ? 10 : item
);

// ✅ 正确做法 - 使用展开运算符
const updated = [
  ...items.slice(0, 1),
  10,
  ...items.slice(2)
];

// ✅ 正确做法 - 使用 Immer
import { produce } from 'immer';
const updated = produce(items, draft => {
  draft[1] = 10;
});

// ✅ 正确做法 - 使用 fp-ts
import * as A from 'fp-ts/Array';
const updated = pipe(
  items,
  A.updateAt(1, 10),
  O.getOrElse(() => items)
);
```

📚 参考文档：#fp-patterns - 不可变更新
📋 Steering 文件：#code-standards - 数组操作

🔗 相关规则：no-mutation, no-object-mutation

---

### ❌ grain/no-mutation

**位置**: 第 216 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 242 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 252 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 261 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 264 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 272 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 278 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 380 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 388 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 405 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 417 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.forEach()

📝 问题代码：
  const results: string[] = [];
  items.forEach(item => {
    results.push(item.name);  // 副作用！
  });

🔍 错误原因：
  forEach 鼓励副作用编程：
  - 通常用于修改外部状态
  - 没有返回值，难以组合
  - 不如 map/filter/reduce 表达意图

🏗️ 架构原则：
  使用声明式数组方法：
    - map: 转换每个元素
    - filter: 筛选元素
    - reduce: 聚合为单个值
    - flatMap: 转换并展平

✅ 修复方案：
  步骤 1: 分析 forEach 的实际用途
  步骤 2: 如果是转换，使用 map
  步骤 3: 如果是筛选，使用 filter
  步骤 4: 如果是聚合，使用 reduce

📋 修复后的代码：
```typescript
// ❌ 错误做法
const results: string[] = [];
items.forEach(item => {
  results.push(item.name);
});

// ✅ 正确做法 - 使用 map
const results = items.map(item => item.name);

// ✅ 正确做法 - 使用 filter + map
const activeNames = items
  .filter(item => item.active)
  .map(item => item.name);

// ✅ 正确做法 - 使用 reduce
const total = items.reduce((sum, item) => sum + item.value, 0);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';

const results = pipe(
  items,
  A.map(item => item.name)
);
```

📚 参考文档：#fp-patterns - 数组操作
📋 Steering 文件：#code-standards - 声明式编程

🔗 相关规则：no-mutation, prefer-map

---

### ❌ grain/no-mutation

**位置**: 第 422 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 438 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 444 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-try-catch

**位置**: 第 473 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-mutation

**位置**: 第 559 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/log/log-creation.pipe.ts

共 4 个问题

### ❌ grain/no-mutation

**位置**: 第 108 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 113 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 118 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 123 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/log/log.format.pipe.ts

共 2 个问题

### ❌ grain/no-mutation

**位置**: 第 271 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 338 行，第 22 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/node/node.tree.fn.ts

共 8 个问题

### ❌ grain/no-mutation

**位置**: 第 70 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 103 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.unshift()

📝 问题代码：
  const items = [1, 2, 3];
  items.unshift(4);

🔍 错误原因：
  array.unshift() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 unshift() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到开头
const newArray = [newItem, ...array];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 157 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 174 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 192 行，第 21 列

**消息**: ❌ 【错误】禁止使用 array.shift()

📝 问题代码：
  const items = [1, 2, 3];
  items.shift();

🔍 错误原因：
  array.shift() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 shift() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 移除第一个元素
const newArray = array.slice(1);
// 获取第一个元素
const firstItem = array[0];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 201 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 202 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 272 行，第 32 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/search/search.filter.fn.ts

共 1 个问题

### ❌ grain/no-mutation

**位置**: 第 205 行，第 23 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/search/search.highlight.fn.ts

共 1 个问题

### ❌ grain/no-mutation

**位置**: 第 180 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/tag/tag.extract.fn.ts

共 2 个问题

### ❌ grain/no-mutation

**位置**: 第 110 行，第 27 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-mutation

**位置**: 第 119 行，第 27 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/wiki/wiki.resolve.fn.ts

共 1 个问题

### ❌ grain/no-mutation

**位置**: 第 289 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.unshift()

📝 问题代码：
  const items = [1, 2, 3];
  items.unshift(4);

🔍 错误原因：
  array.unshift() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 unshift() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到开头
const newArray = [newItem, ...array];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/word-count/word-count.fn.ts

共 2 个问题

### ❌ grain/no-mutation

**位置**: 第 139 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 144 行，第 4 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/routes/settings/export.tsx

共 3 个问题

### ❌ grain/no-try-catch

**位置**: 第 27 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 72 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 100 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/routes/settings/logs.tsx

共 2 个问题

### ❌ grain/no-mutation

**位置**: 第 73 行，第 9 列

**消息**: ❌ 【错误】禁止使用 array.reverse()

📝 问题代码：
  const items = [1, 2, 3];
  items.reverse();

🔍 错误原因：
  array.reverse() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 reverse() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 反转（不修改原数组）
const reversed = [...array].reverse();
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-try-catch

**位置**: 第 102 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/state/diagram.state.ts

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 37 行，第 5 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/state/editor-history.state.ts

共 6 个问题

### ❌ grain/no-mutation

**位置**: 第 44 行，第 6 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 48 行，第 7 列

**消息**: ❌ 【错误】禁止使用 array.shift()

📝 问题代码：
  const items = [1, 2, 3];
  items.shift();

🔍 错误原因：
  array.shift() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 shift() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 移除第一个元素
const newArray = array.slice(1);
// 获取第一个元素
const firstItem = array[0];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 69 行，第 19 列

**消息**: ❌ 【错误】禁止使用 array.pop()

📝 问题代码：
  const items = [1, 2, 3];
  items.pop();

🔍 错误原因：
  array.pop() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 pop() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 移除最后一个元素
const newArray = array.slice(0, -1);
// 获取最后一个元素
const lastItem = array[array.length - 1];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 76 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 95 行，第 19 列

**消息**: ❌ 【错误】禁止使用 array.pop()

📝 问题代码：
  const items = [1, 2, 3];
  items.pop();

🔍 错误原因：
  array.pop() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 pop() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 移除最后一个元素
const newArray = array.slice(0, -1);
// 获取最后一个元素
const lastItem = array[array.length - 1];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 102 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/state/editor-tabs.state.ts

共 4 个问题

### ❌ grain/no-mutation

**位置**: 第 65 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 75 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 85 行，第 6 列

**消息**: ❌ 【错误】禁止使用 array.splice()

📝 问题代码：
  const items = [1, 2, 3];
  items.splice();

🔍 错误原因：
  array.splice() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 splice() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 删除元素
const newArray = array.filter((_, index) => index !== targetIndex);
// 插入元素
const newArray = [
  ...array.slice(0, insertIndex),
  newItem,
  ...array.slice(insertIndex)
];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 113 行，第 5 列

**消息**: ❌ 【错误】禁止使用数组索引赋值

📝 问题代码：
  const items = [1, 2, 3];
  items[1] = 10;  // 直接修改数组

🔍 错误原因：
  数组索引赋值直接修改原数组：
  - 破坏不可变性
  - 难以追踪变化
  - 可能导致 React 不重新渲染

🏗️ 架构原则：
  使用不可变更新模式：
    - 使用 map 更新特定索引
    - 使用展开运算符创建新数组
    - 使用 Immer 进行复杂更新

✅ 修复方案：
  步骤 1: 确定要更新的索引
  步骤 2: 使用 map 或展开运算符创建新数组
  步骤 3: 复杂更新考虑使用 Immer

📋 修复后的代码：
```typescript
// ❌ 错误做法
items[1] = 10;

// ✅ 正确做法 - 使用 map
const updated = items.map((item, index) => 
  index === 1 ? 10 : item
);

// ✅ 正确做法 - 使用展开运算符
const updated = [
  ...items.slice(0, 1),
  10,
  ...items.slice(2)
];

// ✅ 正确做法 - 使用 Immer
import { produce } from 'immer';
const updated = produce(items, draft => {
  draft[1] = 10;
});

// ✅ 正确做法 - 使用 fp-ts
import * as A from 'fp-ts/Array';
const updated = pipe(
  items,
  A.updateAt(1, 10),
  O.getOrElse(() => items)
);
```

📚 参考文档：#fp-patterns - 不可变更新
📋 Steering 文件：#code-standards - 数组操作

🔗 相关规则：no-mutation, no-object-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/state/sidebar.state.ts

共 1 个问题

### ❌ grain/no-mutation

**位置**: 第 141 行，第 6 列

**消息**: ❌ 【错误】禁止使用数组索引赋值

📝 问题代码：
  const items = [1, 2, 3];
  items[1] = 10;  // 直接修改数组

🔍 错误原因：
  数组索引赋值直接修改原数组：
  - 破坏不可变性
  - 难以追踪变化
  - 可能导致 React 不重新渲染

🏗️ 架构原则：
  使用不可变更新模式：
    - 使用 map 更新特定索引
    - 使用展开运算符创建新数组
    - 使用 Immer 进行复杂更新

✅ 修复方案：
  步骤 1: 确定要更新的索引
  步骤 2: 使用 map 或展开运算符创建新数组
  步骤 3: 复杂更新考虑使用 Immer

📋 修复后的代码：
```typescript
// ❌ 错误做法
items[1] = 10;

// ✅ 正确做法 - 使用 map
const updated = items.map((item, index) => 
  index === 1 ? 10 : item
);

// ✅ 正确做法 - 使用展开运算符
const updated = [
  ...items.slice(0, 1),
  10,
  ...items.slice(2)
];

// ✅ 正确做法 - 使用 Immer
import { produce } from 'immer';
const updated = produce(items, draft => {
  draft[1] = 10;
});

// ✅ 正确做法 - 使用 fp-ts
import * as A from 'fp-ts/Array';
const updated = pipe(
  items,
  A.updateAt(1, 10),
  O.getOrElse(() => items)
);
```

📚 参考文档：#fp-patterns - 不可变更新
📋 Steering 文件：#code-standards - 数组操作

🔗 相关规则：no-mutation, no-object-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/utils/file-tree-navigation.util.ts

共 4 个问题

### ❌ grain/no-mutation

**位置**: 第 74 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.unshift()

📝 问题代码：
  const items = [1, 2, 3];
  items.unshift(4);

🔍 错误原因：
  array.unshift() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 unshift() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到开头
const newArray = [newItem, ...array];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-try-catch

**位置**: 第 115 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 164 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 210 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/utils/keyboard.util.ts

共 5 个问题

### ❌ grain/no-mutation

**位置**: 第 36 行，第 21 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 37 行，第 21 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 38 行，第 22 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 39 行，第 20 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 41 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/activity-bar/activity-bar.container.fn.tsx

共 7 个问题

### ❌ grain/no-try-catch

**位置**: 第 123 行，第 5 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-mutation

**位置**: 第 147 行，第 30 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

### ❌ grain/no-try-catch

**位置**: 第 154 行，第 5 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 177 行，第 4 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 193 行，第 4 列

**消息**: ❌ 【错误】禁止使用 try-catch 语��

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 393 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 413 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/activity-bar/activity-bar.view.fn.tsx

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 226 行，第 4 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/backup-manager/backup-manager.view.fn.tsx

共 1 个问题

### ❌ grain/no-mutation

**位置**: 第 274 行，第 13 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/blocks/wiki-hover-preview.tsx

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 54 行，第 4 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/diagram/diagram.fn.ts

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 77 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/diagram/mermaid.render.fn.ts

共 2 个问题

### ❌ grain/no-try-catch

**位置**: 第 318 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 349 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/diagram/plantuml.render.fn.ts

共 2 个问题

### ❌ grain/no-try-catch

**位置**: 第 246 行，第 3 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 360 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/drawing/drawing.utils.fn.ts

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 107 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/editor-history/editor-history.fn.ts

共 2 个问题

### ❌ grain/no-mutation

**位置**: 第 61 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.shift()

📝 问题代码：
  const items = [1, 2, 3];
  items.shift();

🔍 错误原因：
  array.shift() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 shift() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 移除第一个元素
const newArray = array.slice(1);
// 获取第一个元素
const firstItem = array[0];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 88 行，第 16 列

**消息**: ❌ 【错误】禁止使用 array.pop()

📝 问题代码：
  const items = [1, 2, 3];
  items.pop();

🔍 错误原因：
  array.pop() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 pop() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 移除最后一个元素
const newArray = array.slice(0, -1);
// 获取最后一个元素
const lastItem = array[array.length - 1];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/editor-tabs/editor-tab.fn.ts

共 3 个问题

### ❌ grain/no-mutation

**位置**: 第 154 行，第 20 列

**消息**: ❌ 【错误】禁止使用 array.splice()

📝 问题代码：
  const items = [1, 2, 3];
  items.splice();

🔍 错误原因：
  array.splice() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 splice() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 删除元素
const newArray = array.filter((_, index) => index !== targetIndex);
// 插入元素
const newArray = [
  ...array.slice(0, insertIndex),
  newItem,
  ...array.slice(insertIndex)
];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 155 行，第 2 列

**消息**: ❌ 【错误】禁止使用 array.splice()

📝 问题代码：
  const items = [1, 2, 3];
  items.splice();

🔍 错误原因：
  array.splice() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 splice() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 删除元素
const newArray = array.filter((_, index) => index !== targetIndex);
// 插入元素
const newArray = [
  ...array.slice(0, insertIndex),
  newItem,
  ...array.slice(insertIndex)
];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 229 行，第 24 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/excalidraw-editor/excalidraw-editor.container.fn.tsx

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 62 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/excalidraw-editor/excalidraw-editor.utils.ts

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 48 行，第 2 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/export-button/export-button.container.fn.tsx

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 26 行，第 5 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/export-dialog-manager/export-dialog-manager.container.fn.tsx

共 4 个问题

### ❌ grain/no-mutation

**位置**: 第 39 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.forEach()

📝 问题代码：
  const results: string[] = [];
  items.forEach(item => {
    results.push(item.name);  // 副作用！
  });

🔍 错误原因：
  forEach 鼓励副作用编程：
  - 通常用于修改外部状态
  - 没有返回值，难以组合
  - 不如 map/filter/reduce 表达意图

🏗️ 架构原则：
  使用声明式数组方法：
    - map: 转换每个元素
    - filter: 筛选元素
    - reduce: 聚合为单个值
    - flatMap: 转换并展平

✅ 修复方案：
  步骤 1: 分析 forEach 的实际用途
  步骤 2: 如果是转换，使用 map
  步骤 3: 如果是筛选，使用 filter
  步骤 4: 如果是聚合，使用 reduce

📋 修复后的代码：
```typescript
// ❌ 错误做法
const results: string[] = [];
items.forEach(item => {
  results.push(item.name);
});

// ✅ 正确做法 - 使用 map
const results = items.map(item => item.name);

// ✅ 正确做法 - 使用 filter + map
const activeNames = items
  .filter(item => item.active)
  .map(item => item.name);

// ✅ 正确做法 - 使用 reduce
const total = items.reduce((sum, item) => sum + item.value, 0);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';

const results = pipe(
  items,
  A.map(item => item.name)
);
```

📚 参考文档：#fp-patterns - 数组操作
📋 Steering 文件：#code-standards - 声明式编程

🔗 相关规则：no-mutation, prefer-map

---

### ❌ grain/no-mutation

**位置**: 第 44 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.forEach()

📝 问题代码：
  const results: string[] = [];
  items.forEach(item => {
    results.push(item.name);  // 副作用！
  });

🔍 错误原因：
  forEach 鼓励副作用编程：
  - 通常用于修改外部状态
  - 没有返回值，难以组合
  - 不如 map/filter/reduce 表达意图

🏗️ 架构原则：
  使用声明式数组方法：
    - map: 转换每个元素
    - filter: 筛选元素
    - reduce: 聚合为单个值
    - flatMap: 转换并展平

✅ 修复方案：
  步骤 1: 分析 forEach 的实际用途
  步骤 2: 如果是转换，使用 map
  步骤 3: 如果是筛选，使用 filter
  步骤 4: 如果是聚合，使用 reduce

📋 修复后的代码：
```typescript
// ❌ 错误做法
const results: string[] = [];
items.forEach(item => {
  results.push(item.name);
});

// ✅ 正确做法 - 使用 map
const results = items.map(item => item.name);

// ✅ 正确做法 - 使用 filter + map
const activeNames = items
  .filter(item => item.active)
  .map(item => item.name);

// ✅ 正确做法 - 使用 reduce
const total = items.reduce((sum, item) => sum + item.value, 0);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';

const results = pipe(
  items,
  A.map(item => item.name)
);
```

📚 参考文档：#fp-patterns - 数组操作
📋 Steering 文件：#code-standards - 声明式编程

🔗 相关规则：no-mutation, prefer-map

---

### ❌ grain/no-mutation

**位置**: 第 48 行，第 3 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

### ❌ grain/no-mutation

**位置**: 第 51 行，第 20 列

**消息**: ❌ 【错误】禁止使用 array.splice()

📝 问题代码：
  const items = [1, 2, 3];
  items.splice();

🔍 错误原因：
  array.splice() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 splice() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 删除元素
const newArray = array.filter((_, index) => index !== targetIndex);
// 插入元素
const newArray = [
  ...array.slice(0, insertIndex),
  newItem,
  ...array.slice(insertIndex)
];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/export-dialog/export-dialog.container.fn.tsx

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 75 行，第 4 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/file-tree/file-tree.view.fn.tsx

共 1 个问题

### ❌ grain/no-mutation

**位置**: 第 50 行，第 9 列

**消息**: ❌ 【错误】禁止使用 array.sort() 原地排序

📝 问题代码：
  const items = [3, 1, 2];
  items.sort();  // 修改原数组

🔍 错误原因：
  array.sort() 会修改原数组：
  - 违反不可变性原则
  - 可能导致意外的副作用
  - 难以追踪数据变化

🏗️ 架构原则：
  排序时先复制数组：
    - 使用 [...array].sort()
    - 或使用 fp-ts/Array 的 sort 函数

✅ 修复方案：
  步骤 1: 在调用 sort 前复制数组
  步骤 2: 或使用 fp-ts 的排序函数

📋 修复后的代码：
```typescript
// ❌ 错误做法
items.sort();

// ✅ 正确做法 - 先复制
const sorted = [...items].sort();

// ✅ 正确做法 - 带比较函数
const sorted = [...items].sort((a, b) => a - b);

// ✅ 正确做法 - 使用 fp-ts
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as N from 'fp-ts/number';

const sorted = pipe(items, A.sort(N.Ord));
```

📚 参考文档：#fp-patterns - 排序
📋 Steering 文件：#code-standards - 不可变操作

🔗 相关规则：no-mutation

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/global-search/global-search.container.fn.tsx

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 41 行，第 4 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/keyboard-shortcuts-help/keyboard-shortcuts-help.view.fn.tsx

共 2 个问题

### ❌ grain/no-mutation

**位置**: 第 40 行，第 6 列

**消息**: ❌ 【错误】禁止使用数组索引赋值

📝 问题代码：
  const items = [1, 2, 3];
  items[1] = 10;  // 直接修改数组

🔍 错误原因：
  数组索引赋值直接修改原数组：
  - 破坏不可变性
  - 难以追踪变化
  - 可能导致 React 不重新渲染

🏗️ 架构原则：
  使用不可变更新模式：
    - 使用 map 更新特定索引
    - 使用展开运算符创建新数组
    - 使用 Immer 进行复杂更新

✅ 修复方案：
  步骤 1: 确定要更新的索引
  步骤 2: 使用 map 或展开运算符创建新数组
  步骤 3: 复杂更新考虑使用 Immer

📋 修复后的代码：
```typescript
// ❌ 错误做法
items[1] = 10;

// ✅ 正确做法 - 使用 map
const updated = items.map((item, index) => 
  index === 1 ? 10 : item
);

// ✅ 正确做法 - 使用展开运算符
const updated = [
  ...items.slice(0, 1),
  10,
  ...items.slice(2)
];

// ✅ 正确做法 - 使用 Immer
import { produce } from 'immer';
const updated = produce(items, draft => {
  draft[1] = 10;
});

// ✅ 正确做法 - 使用 fp-ts
import * as A from 'fp-ts/Array';
const updated = pipe(
  items,
  A.updateAt(1, 10),
  O.getOrElse(() => items)
);
```

📚 参考文档：#fp-patterns - 不可变更新
📋 Steering 文件：#code-standards - 数组操作

🔗 相关规则：no-mutation, no-object-mutation

---

### ❌ grain/no-mutation

**位置**: 第 42 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/panels/file-tree-panel/file-tree-panel.container.fn.tsx

共 8 个问题

### ❌ grain/no-try-catch

**位置**: 第 62 行，第 5 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 146 行，第 5 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 187 行，第 5 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 279 行，第 5 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 308 行，第 5 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 328 行，第 5 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 359 行，第 4 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

### ❌ grain/no-try-catch

**位置**: 第 394 行，第 5 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/panels/search-panel/search-panel.container.fn.tsx

共 1 个问题

### ❌ grain/no-try-catch

**位置**: 第 38 行，第 4 列

**消息**: ❌ 【错误】禁止使用 try-catch 语句

📝 问题代码：
  try {
    const result = await fetchData();
  } catch (error) {
    console.error(error);
  }

🔍 错误原因：
  try-catch 隐藏了错误的类型信息，使得：
  - 无法在编译时知道函数可能失败
  - 错误处理逻辑分散在各处
  - 难以追踪错误的来源和类型

🏗️ 架构原则：
  Grain 项目使用 fp-ts 的 TaskEither 进行函数式错误处理：
    - 错误是显式的返回值，不是异常
    - 类型系统强制处理所有错误情况
    - 错误可以在管道中优雅传递

✅ 修复方案：
  步骤 1: 将 try-catch 替换为 TE.tryCatch()
  步骤 2: 定义明确的错误类型 AppError
  步骤 3: 使用 pipe() 组合操作
  步骤 4: 在管道末端使用 TE.fold() 处理结果

📋 修复后的代码：
```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: `获取数据失败: ${String(error)}`,
      cause: error,
    })
  );

// 使用
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();
```

⚠️ 注意事项：
  - 不要在 TE.tryCatch 的错误处理函数中返回字符串，必须返回 AppError 类型
  - 记得在管道末端调用 () 执行 TaskEither

📚 参考文档：https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html
📋 Steering 文件：#fp-patterns - TaskEither 异步错误处理

🔗 相关规则：no-throw, no-promise-methods, fp-ts-patterns

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/panels/search-panel/search-panel.view.fn.tsx

共 1 个问题

### ❌ grain/no-mutation

**位置**: 第 66 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.push()

📝 问题代码：
  const items = [1, 2, 3];
  items.push(4);

🔍 错误原因：
  array.push() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 push() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 添加元素到末尾
const newArray = [...array, newItem];
// 添加多个元素
const newArray = [...array, item1, item2];
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/panels/tag-graph-panel/tag-graph-panel.view.fn.tsx

共 1 个问题

### ❌ grain/no-mutation

**位置**: 第 212 行，第 5 列

**消息**: ❌ 【错误】禁止使用 array.fill()

📝 问题代码：
  const items = [1, 2, 3];
  items.fill();

🔍 错误原因：
  array.fill() 会直接修改原数组，违反不可变性原则：
  - 导致难以追踪的状态变化
  - 破坏 React 的变化检测机制
  - 使得函数不再是纯函数

🏗️ 架构原则：
  Grain 项目遵循不可变数据原则：
    - 数据一旦创建就不可修改
    - 更新操作返回新数组
    - 使用展开运算符或 fp-ts/Array 的函数式方法

✅ 修复方案：
  步骤 1: 将 fill() 替换为不可变操作
  步骤 2: 使用展开运算符创建新数组
  步骤 3: 或使用 fp-ts/Array 的函数式方法

📋 修复后的代码：
```typescript
// 填充（创建新数组）
const filled = array.map(() => fillValue);
```

⚠️ 注意事项：
  - 确保不要在原数组上调用任何变异方法
  - 如果需要排序，先复制数组：[...array].sort()

📚 参考文档：#code-standards - 不可变性
📋 Steering 文件：#fp-patterns - 不可变数据

🔗 相关规则：no-object-mutation, prefer-spread

---
