# E2E 测试发现的问题

本文档记录 E2E 测试过程中发现的问题。每个问题都包含详细的复现步骤、期望行为和实际行为。

---

## 问题列表

## Issue E2E-2025-12-27-001: Diary 创建功能未实现

**发现时间**: 2025-12-27 13:08:15

**严重程度**: critical

**测试套件**: Diary

**测试用例**: 所有 Diary 测试

### 描述

Diary 创建功能完全未实现。点击 "New Diary" 按钮后，只显示 `toast.info("Diary creation is being reimplemented")` 消息，没有实际创建任何文件。

### 代码位置

`apps/desktop/src/components/activity-bar/activity-bar.container.fn.tsx`

```typescript
const handleCreateDiary = useCallback(async () => {
  if (!selectedWorkspaceId) {
    toast.error("Please select a workspace first");
    return;
  }
  // TODO: 使用新架构实现日记创建
  toast.info("Diary creation is being reimplemented");
}, [selectedWorkspaceId]);
```

### 复现步骤

1. 启动应用
2. 点击 Activity Bar 中的 "New Diary" 按钮
3. 观察 Toast 消息

### 期望行为

应创建 Diary 文件，文件夹结构为：
- Diary > year-YYYY-Zodiac > month-MM-MonthName > day-DD-Weekday

### 实际行为

显示 "Diary creation is being reimplemented" 的 info toast，没有创建任何文件。

### 需要的修复

需要实现 `handleCreateDiary` 函数，参考 `createLedgerCompatAsync` 的实现方式。

### 相关需求

Requirements 3.1, 3.2, 3.3, 3.4, 3.5

### 状态

- [x] 待修复
- [ ] 修复中
- [ ] 已修复
- [ ] 已验证

---

## Issue E2E-2025-12-27-002: Wiki 创建功能未实现

**发现时间**: 2025-12-27 13:08:51

**严重程度**: critical

**测试套件**: Wiki

**测试用例**: 所有 Wiki 测试

### 描述

Wiki 创建功能完全未实现。点击 "New Wiki" 按钮后，只显示 `toast.info("Wiki creation is being reimplemented")` 消息，没有实际创建任何文件。

### 代码位置

`apps/desktop/src/components/activity-bar/activity-bar.container.fn.tsx`

```typescript
const handleCreateWiki = useCallback(async () => {
  if (!selectedWorkspaceId) {
    toast.error("Please select a workspace first");
    return;
  }
  // TODO: 使用新架构实现 Wiki 创建
  toast.info("Wiki creation is being reimplemented");
}, [selectedWorkspaceId]);
```

### 复现步骤

1. 启动应用
2. 点击 Activity Bar 中的 "New Wiki" 按钮
3. 观察 Toast 消息

### 期望行为

应弹出对话框让用户输入 Wiki 标题，然后创建 Wiki 文件，文件夹结构为：
- Wiki > year-YYYY > month-MM-MonthName

### 实际行为

显示 "Wiki creation is being reimplemented" 的 info toast，没有创建任何文件。

### 需要的修复

需要实现 `handleCreateWiki` 函数，参考 `createLedgerCompatAsync` 的实现方式。

### 相关需求

Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7

### 状态

- [x] 待修复
- [ ] 修复中
- [ ] 已修复
- [ ] 已验证

---

## Issue E2E-2025-12-27-003: Ledger 创建成功但测试验证失败

**发现时间**: 2025-12-27 13:09:44

**严重程度**: major

**测试套件**: Ledger

**测试用例**: Ledger File Appears in File Tree, Ledger File Auto Opened

### 描述

Ledger 创建功能已实现且工作正常（Toast 显示 "Ledger created"），但测试验证文件出现在 File Tree 和自动打开的步骤失败。这可能是测试选择器或等待策略的问题。

### 复现步骤

1. 启动应用
2. 点击 Activity Bar 中的 "New Ledger" 按钮
3. 观察 Toast 消息显示 "Ledger created"
4. 检查 File Tree 中是否有新文件

### 期望行为

- File Tree 中应显示 Ledger 文件夹结构
- 新创建的 Ledger 文件应自动打开在 Editor Tabs 中

### 实际行为

- Toast 显示成功
- 但测试无法在 File Tree 中找到文件
- 测试无法验证 Editor Tabs 中的标签

### 可能原因

1. File Tree 选择器不匹配实际的文件夹/文件名
2. 等待时间不足，File Tree 未刷新
3. Editor Tabs 容器在某些情况下不渲染

### 相关需求

Requirements 5.3, 5.4

### 状态

- [x] 待修复
- [ ] 修复中
- [ ] 已修复
- [ ] 已验证

---

## Issue E2E-2025-12-27-004: DexieError2 控制台错误

**发现时间**: 2025-12-27 13:08:05

**严重程度**: minor

**测试套件**: 所有测试套件

**测试用例**: 所有测试用例

### 描述

所有测试运行期间，控制台持续出现 DexieError2 错误。这些错误来自 `saveLog` 函数，可能是日志保存到 IndexedDB 时出现问题。

### 代码位置

`apps/desktop/src/log/index.ts:38`

### 控制台错误

```
DexieError2: DexieError2
    at saveLog (http://localhost:1420/src/log/index.ts:38:1)
```

### 相关需求

Requirements 8.2

### 状态

- [x] 待修复
- [ ] 修复中
- [ ] 已修复
- [ ] 已验证

---

## Issue E2E-2025-12-27-005: HTML 嵌套 button 错误

**发现时间**: 2025-12-27 13:09:44

**严重程度**: minor

**测试套件**: Ledger, Excalidraw

**测试用例**: 文件创建后

### 描述

在 Ledger 和 Excalidraw 创建后，控制台出现 HTML 嵌套 button 错误。这是一个 React hydration 问题，表明 UI 组件中存在 button 嵌套 button 的情况。

### 控制台错误

```
In HTML, <button> cannot be a descendant of <button>.
This will cause a hydration error.

<button> cannot contain a nested <button>.
See this log for the ancestor stack trace.
```

错误发生在 Tooltip 组件中，可能是 TooltipTrigger 包裹了一个 button，而内部又有另一个 button。

### 相关需求

Requirements 8.2

### 状态

- [x] 待修复
- [ ] 修复中
- [ ] 已修复
- [ ] 已验证

---

## 问题统计

| 严重程度 | 数量 | 已修复 | 待修复 |
|----------|------|--------|--------|
| Critical | 2 | 0 | 2 |
| Major | 1 | 0 | 1 |
| Minor | 2 | 0 | 2 |
| **总计** | **5** | **0** | **5** |

---

## 修复优先级

1. **Critical - Diary 创建功能** - 核心功能未实现
2. **Critical - Wiki 创建功能** - 核心功能未实现
3. **Major - Ledger 测试验证** - 功能正常但测试需要修复
4. **Minor - DexieError2** - 不影响功能但需要清理
5. **Minor - 嵌套 button** - 不影响功能但需要修复 HTML 结构

---

## 更新日志

| 日期 | 操作 | 描述 |
|------|------|------|
| 2025-12-27 | 创建 | 首次运行 E2E 测试，记录 5 个问题 |
| 2025-12-27 | 更新 | 审查代码后更新问题描述，确认 Diary/Wiki 功能未实现 |
