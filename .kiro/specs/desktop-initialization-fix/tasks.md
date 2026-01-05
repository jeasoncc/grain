# Implementation Tasks

## Task 1: 安装 TanStack Query DevTools

### Description
安装 TanStack Query 和 DevTools 依赖，并在开发环境中启用 DevTools。

### Files to Modify
- `apps/desktop/package.json`
- `apps/desktop/src/main.tsx`

### Acceptance Criteria
- [ ] `@tanstack/react-query` 作为显式依赖安装
- [ ] `@tanstack/react-query-devtools` 作为开发依赖安装
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

## Task 5: 重构 ActivityBar 初始化逻辑

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

## Task 6: 修复删除数据功能

### Description
确保删除数据时正确调用 Rust 后端，并清除所有前端状态。

### Files to Modify
- `apps/desktop/src/components/activity-bar/activity-bar.container.fn.tsx`
- `apps/desktop/src/db/index.ts` (检查导出)

### Acceptance Criteria
- [ ] 调用 Rust 后端删除 SQLite 数据
- [ ] 清除 TanStack Query 缓存
- [ ] 重置 Zustand stores
- [ ] 重置初始化状态
- [ ] 清除 localStorage（保留必要设置）
- [ ] 显示操作结果

---

## Task 7: 验证和测试

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
Task 1 (DevTools) ─────────────────────────────────────┐
                                                       │
Task 2 (随机名称) ──┬──▶ Task 4 (初始化逻辑) ──┐        │
                   │                          │        │
Task 3 (状态管理) ──┴──▶ Task 5 (ActivityBar) ─┼──▶ Task 7 (测试)
                                              │        │
                       Task 6 (删除功能) ──────┘        │
                                                       │
                                                       ▼
                                                   完成
```

## 执行顺序

1. Task 1 - 安装依赖（独立）
2. Task 2 - 创建随机名称函数（独立）
3. Task 3 - 创建状态管理模块（独立）
4. Task 4 - 修改初始化逻辑（依赖 Task 2）
5. Task 5 - 重构 ActivityBar（依赖 Task 2, 3）
6. Task 6 - 修复删除功能（依赖 Task 3）
7. Task 7 - 验证测试（依赖所有）
