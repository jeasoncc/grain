# Implementation Tasks

## Task 1: 安装 TanStack Query DevTools

### Description
安装 TanStack Query 和 DevTools 依赖，并在开发环境中启用 DevTools。

### Files to Modify
- `apps/desktop/package.json`
- `apps/desktop/src/main.tsx`

### Acceptance Criteria
- [ ] `@tanstack/react-query` 作为显式依赖安装
- [-] `@tanstack/react-query-devtools` 作为开发依赖安装
- [ ] DevTools 在开发环境中可见
- [ ] DevTools 在生产构建中不包含

---

## Task 2: 创建随机友好名称生成函数

### Description
创建纯函数生成随机友好名称，格式为 "形容词 + 名词"。

### Files to Create
- `apps/desktop/src/fn/user/random-name.fn.ts`
- `apps/desktop/src/fn/user/random-name.fn.test.ts`
- `apps/desktop/src/fn/user/index.ts`

### Acceptance Criteria
- [ ] 函数返回格式为 "Adjective Noun" 的字符串
- [ ] 包含至少 15 个形容词和 15 个名词
- [ ] 单元测试覆盖

---

## Task 3: 创建初始化状态管理模块

### Description
使用 localStorage 持久化初始化状态，区分首次使用、已初始化、数据已删除三种状态。

### Files to Create
- `apps/desktop/src/lib/initialization-state.ts`
- `apps/desktop/src/lib/initialization-state.test.ts`

### Acceptance Criteria
- [ ] 支持三种状态：uninitialized, initialized, data-deleted
- [ ] 状态持久化到 localStorage
- [ ] 提供 get/set/reset 函数
- [ ] 单元测试覆盖

---

## Task 4: 修改数据库初始化逻辑

### Description
修改 initDatabase 函数，使用随机友好名称创建默认用户。

### Files to Modify
- `apps/desktop/src/db/init.db.fn.ts`

### Acceptance Criteria
- [ ] 首次启动时创建默认用户
- [ ] 用户名使用随机友好名称
- [ ] 添加日志记录

---

## Task 5: 创建 deleteAllData Action 和 Hook（架构重构）

### Description
将删除数据的业务逻辑从组件中抽离到 Action 层，遵循正确的数据流架构：
```
Component → Hook (useMutation) → Action (业务逻辑) → Repo → API
```

当前问题：`handleDeleteAllData` 直接调用 Repo 层的 `clearAllData()`，业务逻辑（重置状态、清除缓存）散落在组件中。

### Files to Create
- `apps/desktop/src/actions/data/delete-all-data.action.ts` - 删除数据 Action
- `apps/desktop/src/hooks/use-delete-all-data.ts` - 删除数据 Hook（使用 useMutation）
- `apps/desktop/src/actions/data/index.ts` - 导出

### Files to Modify
- `apps/desktop/src/actions/index.ts` - 添加导出

### Acceptance Criteria
- [ ] Action 封装所有业务逻辑（调用 Repo、清除缓存、重置状态）
- [ ] Action 返回 TaskEither，遵循函数式模式
- [ ] Hook 使用 `useMutation` 包装 Action
- [ ] Hook 提供 `mutate`、`isPending`、`isError` 等状态
- [ ] 组件只调用 Hook，不直接调用 Repo

---

## Task 6: 重构 ActivityBar 初始化逻辑

### Description
使用持久化的初始化状态替代组件级 ref，防止工作区重复创建。

### Files to Modify
- `apps/desktop/src/components/activity-bar/activity-bar.container.fn.tsx`

### Acceptance Criteria
- [ ] 使用 localStorage 持久化初始化状态
- [ ] 等待 Query 数据加载完成后再做决策
- [ ] 创建工作区时使用 "{username}'s Workspace" 格式
- [ ] 防止竞态条件导致的重复创建

---

## Task 7: 重构 ActivityBar 删除数据逻辑

### Description
使用 Task 5 创建的 Hook 替换组件中的直接 Repo 调用。

### Files to Modify
- `apps/desktop/src/components/activity-bar/activity-bar.container.fn.tsx`

### Acceptance Criteria
- [ ] 使用 `useDeleteAllData` Hook 替换直接调用
- [ ] 移除组件中的业务逻辑代码
- [ ] 保留 UI 交互逻辑（确认对话框、toast 提示）
- [ ] 删除成功后调用 `resetInitializationState()`

---

## Task 8: 验证和测试

### Description
使用 SQLite MCP 验证数据库状态，进行手动测试。

### Files to Modify
- 无

### Acceptance Criteria
- [ ] 首次启动创建默认用户和工作区
- [ ] 删除数据后 SQLite 表为空
- [ ] 删除后刷新重新创建默认数据
- [ ] 多次刷新不会重复创建工作区
- [ ] DevTools 正常显示

---

## 任务依赖关系

```
Task 1 (DevTools) ──────────────────────────────────────────────┐
                                                                │
Task 2 (随机名称) ──┬──▶ Task 4 (初始化逻辑) ──┐                 │
                   │                          │                 │
Task 3 (状态管理) ──┼──▶ Task 6 (ActivityBar   │                 │
                   │     初始化重构)  ─────────┼──▶ Task 8 (测试)
                   │                          │                 │
                   └──▶ Task 5 (Action/Hook) ─┼──▶ Task 7       │
                                              │   (删除重构)     │
                                              │                 │
                                              └─────────────────┘
```

## 执行顺序

1. Task 1 - 安装依赖（独立）
2. Task 2 - 创建随机名称函数（独立）
3. Task 3 - 创建状态管理模块（独立）
4. Task 4 - 修改初始化逻辑（依赖 Task 2）
5. Task 5 - 创建 Action 和 Hook（依赖 Task 3）
6. Task 6 - 重构 ActivityBar 初始化（依赖 Task 2, 3）
7. Task 7 - 重构 ActivityBar 删除（依赖 Task 5, 6）
8. Task 8 - 验证测试（依赖所有）
