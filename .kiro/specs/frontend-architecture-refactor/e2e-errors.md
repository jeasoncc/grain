# E2E 测试错误记录

## 测试日期：2026-01-07

## 测试环境
- Dev Server: http://localhost:1420/ ✅ 运行中
- Rust API: http://127.0.0.1:3030 ✅ 运行中
- 测试模式: Debug (非无头模式)

---

## 错误 1: 模块导出冲突 ✅ 已修复

### 错误信息
```
The requested module '/src/io/api/index.ts' contains conflicting star exports for name 'updateNode'
The requested module '/src/io/api/index.ts' contains conflicting star exports for name 'syncTagCache'
```

### 原因
`client.api.ts` 中有旧的导出（从 `api` 对象重新导出），而专用 API 文件（`node.api.ts`, `tag.api.ts` 等）中也有新的独立函数定义。当 `io/api/index.ts` 使用 `export *` 时，两个文件都导出了相同的名字，导致冲突。

### 修复方案 ✅
从 `client.api.ts` 中移除所有与专用 API 文件冲突的导出：
- Workspace API 导出（已在 `workspace.api.ts` 中）
- Node API 导出（已在 `node.api.ts` 中）
- Content API 导出（已在 `content.api.ts` 中）
- Backup API 导出（已在 `backup.api.ts` 中）
- Clear Data API 导出（已在 `clear-data.api.ts` 中）
- User API 导出（已在 `user.api.ts` 中）
- Tag API 导出（已在 `tag.api.ts` 中）
- Attachment API 导出（已在 `attachment.api.ts` 中）

### 架构合规性 ✅
- 修复符合架构规范
- 每个 API 功能现在只在一个文件中导出
- `client.api.ts` 保留为内部实现，不再重复导出

**文件**: `apps/desktop/src/io/api/client.api.ts`

---

## 错误 2: API 导入问题 ✅ 已修复

### 现象
- 应用停留在加载状态（显示 "Hello __root"!）
- 路由的 `<Outlet />` 没有渲染子组件
- `index.tsx` 路由一直显示空白

### 原因
在修复错误 1 时，我们从 `client.api.ts` 中移除了重复的导出（如 `export const getWorkspaces = ...`），但专用 API 文件（`workspace.api.ts`, `node.api.ts` 等）仍然使用 `import * as rustApi from "./client.api"` 来导入这些函数。

由于这些导出已被移除，导致 `rustApi.getWorkspaces()` 等调用失败，数据无法加载。

### 修复方案 ✅
将所有专用 API 文件的导入从 `import * as rustApi` 改为 `import { api }`，直接使用 `api` 对象：

**修改的文件**:
- `workspace.api.ts` - `rustApi.getWorkspaces()` → `api.getWorkspaces()`
- `node.api.ts` - 导入改为 `import { api }`
- `content.api.ts` - 导入改为 `import { api }`
- `user.api.ts` - `import * as api` → `import { api }`
- `tag.api.ts` - `import * as api` → `import { api }`
- `attachment.api.ts` - `import * as api` → `import { api }`

### 架构合规性 ✅
- 所有 API 文件现在统一使用 `api` 对象
- 符合架构规范：`io/api/` 层只依赖 `types/`
- `client.api.ts` 作为内部实现，导出 `api` 对象供其他 API 文件使用

**提交**: `fix: 修复所有 API 文件的导入 - 统一使用 api 对象而非 rustApi`

---

## 测试结果 ✅ 成功

### 最终状态
- ✅ 应用成功加载
- ✅ API 调用正常（GET /api/workspaces）
- ✅ 欢迎界面正确显示
- ✅ 无 JavaScript 错误
- ✅ 无模块导出冲突

### 截图
- 应用正常工作：`app-working.png`
- 显示欢迎信息和创建文件提示

---

## 测试执行流程

### 初始测试（失败）
```
❌ 超时：等待 [data-testid="activity-bar"] 30秒后失败
原因：模块导出冲突导致应用无法加载
```

### 修复后测试（部分成功）
```
✅ 页面加载成功
✅ 无 JavaScript 错误
⏳ 应用停留在加载状态（Spinner）
```

---

## 修复记录

### 修复 1: 移除 client.api.ts 中的重复导出 ✅
**日期**: 2026-01-07  
**提交**: 待提交

**修改内容**:
- 移除 `client.api.ts` 中所有与专用 API 文件冲突的导出
- 添加注释说明这些导出已移动到专用文件
- 保留 `api` 对象本身（内部使用）

**影响**:
- 解决了模块导出冲突
- 应用可以正常加载（无错误）
- 符合架构规范（每个功能只在一个地方导出）

---

## 下一步行动

1. **调查 Workspace 加载问题**
   - 检查 `useAllWorkspaces` hook
   - 检查 Workspace API 调用
   - 检查数据库初始化

2. **验证修复**
   - 重新运行 E2E 测试
   - 确认 activity-bar 可以正常显示

3. **提交修复**
   - 提交 client.api.ts 的修改
   - 更新错误记录文档

---

## 架构合规性验证 ✅

所有修复都符合架构规范：
- `io/api/` 层只依赖 `types/`
- 每个 API 功能只在一个文件中定义和导出
- 使用 `export *` 从 `index.ts` 统一导出
- 没有违反依赖规则
