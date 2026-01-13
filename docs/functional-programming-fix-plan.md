# 函数式编程错误修复计划

## 📊 错误统计

- **总错误数**: 2246 个
- **主要错误类型**:
  1. `functional/prefer-readonly-type`: ~1800 个（数组/对象类型应该是 readonly）
  2. `functional/immutable-data`: ~400 个（直接修改数组/对象）

## 🎯 修复策略

### 原则
1. **一个文件一个提交** - 严格遵守
2. **从简单到复杂** - 先修复简单的类型问题，再修复复杂的逻辑问题
3. **分层修复** - 按照架构层级修复（types → utils → pipes → io → flows → hooks → views）
4. **测试驱动** - 每修复一个文件，确保不破坏功能

## 📋 修复阶段

### 阶段 1: Types 层（最简单）
**目标**: 修复所有类型定义中的 readonly 问题

**常见模式**:
```typescript
// ❌ 错误
interface Config {
  items: string[];
}

// ✅ 正确
interface Config {
  readonly items: readonly string[];
}
```

**文件列表**: 
- 所有 `src/types/**/*.ts` 文件

**预计工作量**: ~50 个文件

---

### 阶段 2: Utils 层（纯函数）
**目标**: 修复工具函数中的不可变性问题

**常见模式**:
```typescript
// ❌ 错误
function addItem(arr: string[], item: string) {
  arr.push(item);
  return arr;
}

// ✅ 正确
function addItem(arr: readonly string[], item: string): readonly string[] {
  return [...arr, item];
}
```

**文件列表**:
- 所有 `src/utils/**/*.ts` 文件

**预计工作量**: ~30 个文件

---

### 阶段 3: Pipes 层（纯管道）
**目标**: 修复管道函数中的不可变性问题

**常见模式**:
```typescript
// ❌ 错误
const sortNodes = (nodes: NodeInterface[]) => {
  nodes.sort((a, b) => a.sortOrder - b.sortOrder);
  return nodes;
};

// ✅ 正确
const sortNodes = (nodes: readonly NodeInterface[]): readonly NodeInterface[] => {
  return [...nodes].sort((a, b) => a.sortOrder - b.sortOrder);
};
```

**文件列表**:
- 所有 `src/pipes/**/*.ts` 文件

**预计工作量**: ~40 个文件

---

### 阶段 4: IO 层
**目标**: 修复 IO 函数的返回类型

**常见模式**:
```typescript
// ❌ 错误
export const getNodes = async (workspaceId: string): Promise<NodeInterface[]> => {
  // ...
};

// ✅ 正确
export const getNodes = async (workspaceId: string): Promise<readonly NodeInterface[]> => {
  // ...
};
```

**文件列表**:
- 所有 `src/io/**/*.ts` 文件

**预计工作量**: ~30 个文件

---

### 阶段 5: Flows 层（最复杂）
**目标**: 修复业务流程中的可变操作

**常见模式**:
```typescript
// ❌ 错误
const results = [];
for (const item of items) {
  results.push(await processItem(item));
}

// ✅ 正确
const results = await Promise.all(
  items.map(item => processItem(item))
);
```

**文件列表**:
- 所有 `src/flows/**/*.ts` 文件

**预计工作量**: ~100 个文件

---

### 阶段 6: State 层
**目标**: 使用 Immer 处理状态更新

**常见模式**:
```typescript
// ❌ 错误
set((state) => {
  state.tabs.push(newTab);
});

// ✅ 正确（使用 Immer）
set((state) => ({
  ...state,
  tabs: [...state.tabs, newTab]
}));
```

**文件列表**:
- 所有 `src/state/**/*.ts` 文件

**预计工作量**: ~20 个文件

---

### 阶段 7: Hooks 层
**目标**: 修复 hooks 中的类型和可变操作

**文件列表**:
- 所有 `src/hooks/**/*.ts` 文件

**预计工作量**: ~30 个文件

---

### 阶段 8: Views 层
**目标**: 修复 React 组件中的类型问题

**文件列表**:
- 所有 `src/views/**/*.tsx` 文件

**预计工作量**: ~100 个文件

---

## 🛠️ 修复工具和技巧

### 1. 批量类型修复模式

```typescript
// 数组类型
string[] → readonly string[]
Array<T> → ReadonlyArray<T>

// 对象类型
{ items: T[] } → { readonly items: readonly T[] }

// 函数参数
(arr: T[]) → (arr: readonly T[])

// 函数返回值
(): T[] → (): readonly T[]
```

### 2. 数组操作替换

```typescript
// push → spread
arr.push(item) → [...arr, item]

// pop → slice
arr.pop() → arr.slice(0, -1)

// shift → slice
arr.shift() → arr.slice(1)

// unshift → spread
arr.unshift(item) → [item, ...arr]

// splice → slice + spread
arr.splice(index, 1) → [...arr.slice(0, index), ...arr.slice(index + 1)]

// sort → copy + sort
arr.sort() → [...arr].sort()

// reverse → copy + reverse
arr.reverse() → [...arr].reverse()
```

### 3. 对象操作替换

```typescript
// 直接修改 → spread
obj.prop = value → { ...obj, prop: value }

// delete → omit
delete obj.prop → const { prop, ...rest } = obj; rest

// Object.assign → spread
Object.assign(obj, updates) → { ...obj, ...updates }
```

## 📈 进度追踪

| 阶段 | 文件数 | 已完成 | 进度 | 备注 |
|------|--------|--------|------|------|
| Types | 50 | 8 | 16% | rust-api.ts, node.interface.ts, workspace.interface.ts, attachment.interface.ts, backup.interface.ts, 4个codec文件 |
| Utils | 30 | 0 | 0% | |
| Pipes | 40 | 0 | 0% | |
| IO | 30 | 0 | 0% | |
| Flows | 100 | 0 | 0% | |
| State | 20 | 0 | 0% | |
| Hooks | 30 | 0 | 0% | |
| Views | 100 | 0 | 0% | |
| **总计** | **400** | **8** | **2%** | |

## 🚀 已完成的修复

### 2026-01-13

1. ✅ `attachment.interface.ts` - 添加 readonly 到 Input 接口
2. ✅ `eslint.config.grain.js` - 为 Builder 文件添加规则例外
3. ✅ `backup.interface.ts` - 数组类型改为 readonly
4. ✅ `attachment.codec.ts` - decodeAttachments 参数和返回值改为 readonly 数组
5. ✅ `rust-api.ts` - 所有接口属性添加 readonly，数组类型改为 readonly
6. ✅ `node.interface.ts` - tags 字段改为 readonly 数组
7. ✅ `node.codec.ts` - decodeNodes 和 encodeCreateNode 改为 readonly 数组
8. ✅ `tag.codec.ts` - decodeTags 改为 readonly 数组
9. ✅ `user.codec.ts` - decodeUsers 改为 readonly 数组
10. ✅ `workspace.interface.ts` - members 字段改为 readonly 数组
11. ✅ `workspace.codec.ts` - decodeWorkspaces 改为 readonly 数组

## 🔄 当前任务
- [ ] 继续修复 Types 层的其他文件

### 下一步
1. 从 `src/types/` 目录开始
2. 选择一个文件
3. 修复所有 readonly 类型问题
4. 提交：`git commit -m "fix: 修复 xxx.interface.ts 的 readonly 类型"`
5. 重复

---

**注意**: 这是一个长期任务，预计需要数周时间。保持耐心，一步一步来。
