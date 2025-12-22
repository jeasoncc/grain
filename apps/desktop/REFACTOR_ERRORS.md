# 函数式架构重构 - 错误报告

生成时间：2024-12-21 23:22

## 📊 错误统计

| 类型 | 数量 | 优先级 |
|------|------|--------|
| 开发服务器启动错误 | 5 | 🔴 高 |
| TypeScript 类型错误 | 100+ | 🔴 高 |
| Biome Lint 警告 | 15 | 🟡 中 |
| 缺失模块导入 | 20+ | 🔴 高 |
| Builder 只读属性错误 | 14 | 🔴 高 |

## 🚨 开发服务器启动错误

**执行命令：** `bun run desktop:dev`

**状态：** ❌ 无法启动 - 模块解析失败

### 主要错误

#### 1. 无法解析 @/db/models 模块

```
❌ Failed to resolve import "@/db/models" from:
   - src/domain/search/search.service.ts
   - src/services/drawings.ts
   - src/services/drawings.utils.ts
   - src/services/nodes.ts
   - src/domain/file-creator/file-creator.service.ts
```

**影响：** 阻止开发服务器启动

#### 2. 无法解析 @/services/export 模块

```
❌ Failed to resolve import "@/services/export" from:
   - src/components/blocks/export-dialog.tsx
```

**影响：** 导出功能无法使用

#### 3. Vite 依赖优化

```
✨ new dependencies optimized: fp-ts/Either
✨ optimized dependencies changed. reloading
```

**说明：** Vite 正在优化 fp-ts 依赖，但由于模块解析错误，无法完成启动

## 🔴 高优先级错误

### 1. 缺失的 Services 模块

**影响范围：** 多个组件和路由

```
❌ Cannot find module '@/services/export'
❌ Cannot find module '@/services/import-export'
❌ Cannot find module '@/services/updater'
❌ Cannot find module '@/services/save'
❌ Cannot find module '@/services/wiki-files'
❌ Cannot find module '@/services/keyboard-shortcuts'
❌ Cannot find module '@/services/export-path'
❌ Cannot find module '@/services/clear-data'
```

**受影响文件：**
- `src/components/blocks/export-dialog.tsx`
- `src/components/blocks/update-checker.tsx`
- `src/components/export/export-button.tsx`
- `src/components/workspace/story-workspace.tsx`
- `src/hooks/use-manual-save.ts`
- `src/routes/settings/export.tsx`
- `src/routes/test-clear-data.tsx`

**原因：** 这些 services 文件尚未迁移到函数式架构

**修复方案：**
1. 将 `services/` 中的函数迁移到 `fn/` 或 `db/` 目录
2. 更新所有导入路径
3. 确保函数符合纯函数规范

---

### 2. 缺失的 @/db/models 模块

**影响范围：** Domain 层和 Services 层

```
❌ Cannot find module '@/db/models'
```

**受影响文件：**
- `src/domain/diary/diary.service.ts`
- `src/domain/export/export.service.ts`
- `src/domain/export/export.utils.ts`
- `src/domain/file-creator/file-creator.service.ts`
- `src/domain/import-export/import-export.service.ts`
- `src/domain/save/save.service.ts`
- `src/domain/search/search.service.ts`
- `src/domain/wiki/wiki-migration.service.ts`
- `src/domain/wiki/wiki.service.ts`
- `src/services/drawings.ts`
- `src/services/drawings.utils.ts`
- `src/services/nodes.ts`
- `src/services/tags.ts`
- `src/services/workspaces.ts`

**原因：** `db/models/` 目录已被删除，类型已迁移到 `types/` 目录

**修复方案：**
```typescript
// ❌ 旧导入
import { NodeInterface } from '@/db/models';

// ✅ 新导入
import type { NodeInterface } from '@/types/node';
```

---

### 3. Builder 只读属性错误

**影响范围：** DrawingBuilder

```
❌ Cannot assign to 'id' because it is a read-only property
❌ Cannot assign to 'project' because it is a read-only property
❌ Cannot assign to 'name' because it is a read-only property
❌ Cannot assign to 'content' because it is a read-only property
❌ Cannot assign to 'width' because it is a read-only property
❌ Cannot assign to 'height' because it is a read-only property
❌ Cannot assign to 'createDate' because it is a read-only property
❌ Cannot assign to 'updatedAt' because it is a read-only property
```

**受影响文件：**
- `src/types/drawing/drawing.builder.ts`

**原因：** Builder 试图直接修改 readonly 接口属性

**修复方案：**
```typescript
// ❌ 错误：直接修改 readonly 属性
class DrawingBuilder {
  private data: DrawingInterface = {};
  
  id(v: string) {
    this.data.id = v; // ❌ 错误
    return this;
  }
}

// ✅ 正确：使用 Partial 类型
class DrawingBuilder {
  private data: Partial<DrawingInterface> = {};
  
  id(v: string) {
    this.data.id = v; // ✅ 正确
    return this;
  }
  
  build(): DrawingInterface {
    return Object.freeze(this.data) as DrawingInterface;
  }
}
```

---

### 4. WikiHoverPreview Props 不匹配

**影响范围：** story-workspace.tsx

```
❌ Property 'onFetchData' is missing in type '{ entryId: string; anchorElement: HTMLElement; onClose: () => void; }' 
   but required in type 'WikiHoverPreviewProps'
```

**受影响文件：**
- `src/components/workspace/story-workspace.tsx`

**原因：** WikiHoverPreview 已重构为纯展示组件，需要 `onFetchData` 回调

**修复方案：**
```typescript
// ✅ 添加 onFetchData 回调
<WikiHoverPreview
  entryId={entryId}
  anchorElement={anchorElement}
  onClose={onClose}
  onFetchData={async (id) => {
    const node = await getNode(id);
    const content = await getNodeContent(id);
    return { title: node.title, content };
  }}
/>
```

---

### 5. 测试文件中的类型错误

**影响范围：** 多个测试文件

```
❌ 'createdAt' does not exist in type 'DrawingInterface'. Did you mean 'createDate'?
❌ 'createdAt' does not exist in type 'TagInterface'. Did you mean 'createDate'?
❌ Type '"pro"' is not assignable to type 'UserPlan'
```

**受影响文件：**
- `src/db/drawing.db.fn.test.ts`
- `src/db/tag.db.fn.test.ts`
- `src/db/user.db.fn.test.ts`
- `src/fn/tag/tag.extract.fn.test.ts`

**原因：** 测试使用了错误的字段名或类型

**修复方案：**
```typescript
// ❌ 错误字段名
const drawing = { createdAt: new Date().toISOString() };

// ✅ 正确字段名
const drawing = { createDate: new Date().toISOString() };

// ❌ 错误类型
const plan: UserPlan = "pro";

// ✅ 正确类型（需要检查 UserPlan 定义）
const plan: UserPlan = UserPlan.Pro; // 或其他正确的枚举值
```

---

## 🟡 中优先级警告

### 1. Biome Lint 警告

#### 未使用的导入

```
⚠️ src/components/blocks/emptyProject.tsx
   - ArrowUpRightIcon (未使用)
   - CalendarCheck (未使用)
```

**修复方案：** 移除未使用的导入

#### 模板字符串建议

```
⚠️ src/components/activity-bar.tsx:292
   - 建议使用模板字符串替代字符串拼接
```

**修复方案：**
```typescript
// ❌ 字符串拼接
location.pathname.startsWith(path + "/")

// ✅ 模板字符串
location.pathname.startsWith(`${path}/`)
```

#### any 类型警告

```
⚠️ src/components/blocks/canvas-editor.tsx
   - 多处使用 any 类型（Excalidraw 相关）
```

**修复方案：** 定义正确的 Excalidraw 类型或使用 `unknown` + 类型守卫

#### 无效的 suppression 注释

```
⚠️ src/components/blocks/canvas-editor.tsx:270
   - biome-ignore 注释无效
```

**修复方案：** 移除无效的注释或修复注释位置

#### 缺少 label 关联

```
⚠️ src/components/blocks/export-dialog.tsx:165
   - label 元素缺少关联的 input
```

**修复方案：** 为 label 添加 `htmlFor` 属性或将 input 包裹在 label 内

---

### 2. 隐式 any 类型

**影响范围：** 多个文件

```
⚠️ Parameter 'xxx' implicitly has an 'any' type
```

**受影响文件：**
- `src/components/blocks/update-checker.tsx`
- `src/components/file-tree/file-tree-item.tsx`
- `src/components/workspace/story-workspace.tsx`
- `src/domain/export/export.service.ts`
- `src/domain/file-creator/file-creator.service.ts`
- `src/domain/import-export/import-export.service.ts`
- `src/domain/search/search.service.ts`
- `src/domain/wiki/wiki.service.ts`
- `src/services/drawings.ts`
- `src/services/nodes.ts`
- `src/routes/settings/export.tsx`

**修复方案：** 为所有参数添加明确的类型注解

---

### 3. 缺失的样式导入

```
❌ Cannot find module or type declarations for side-effect import of '@grain/editor/styles'
```

**受影响文件：**
- `src/main.tsx`

**原因：** editor package 的样式文件路径可能已变更

**修复方案：** 检查 `packages/editor` 的导出配置

---

## 📋 修复任务清单

### Phase 1: 修复阻塞性错误（必须完成才能运行）

- [ ] 1.1 修复 DrawingBuilder 只读属性错误
  - 将 `private data: DrawingInterface` 改为 `private data: Partial<DrawingInterface>`
  
- [ ] 1.2 迁移缺失的 Services 模块
  - [ ] `services/export` → `fn/export/` 或 `routes/actions/`
  - [ ] `services/import-export` → `fn/import/` + `fn/export/`
  - [ ] `services/save` → `fn/save/`
  - [ ] `services/wiki-files` → `fn/wiki/`
  - [ ] `services/keyboard-shortcuts` → `fn/keyboard/`
  - [ ] `services/export-path` → `fn/export/`
  - [ ] `services/clear-data` → 已完成（`db/clear-data.db.fn.ts`）
  - [ ] `services/updater` → 保留（Tauri 相关）

- [ ] 1.3 更新所有 `@/db/models` 导入
  - 批量替换为 `@/types/xxx`
  - 检查所有 domain/ 和 services/ 文件

- [ ] 1.4 修复 WikiHoverPreview 使用
  - 在 story-workspace.tsx 中添加 onFetchData 回调

- [ ] 1.5 修复测试文件类型错误
  - 统一使用 `createDate` 而非 `createdAt`
  - 修复 UserPlan 类型使用

### Phase 2: 修复 Lint 警告（提升代码质量）

- [ ] 2.1 移除未使用的导入
  - emptyProject.tsx

- [ ] 2.2 使用模板字符串
  - activity-bar.tsx

- [ ] 2.3 修复 any 类型
  - canvas-editor.tsx（定义 Excalidraw 类型）
  - 其他文件添加类型注解

- [ ] 2.4 修复 label 关联
  - export-dialog.tsx

- [ ] 2.5 修复样式导入
  - main.tsx

### Phase 3: 架构符合性检查（对比 Steering）

- [ ] 3.1 检查目录结构
  - 确认所有文件在正确的目录
  - 确认文件命名符合规范

- [ ] 3.2 检查依赖关系
  - 确认依赖方向正确
  - 确认无循环依赖

- [ ] 3.3 检查函数式编程
  - 确认使用 fp-ts pipe
  - 确认使用 Either 处理错误
  - 确认使用 dayjs 处理时间

- [ ] 3.4 检查日志使用
  - 确认无 console.log
  - 确认使用 logger

---

## 📈 进度追踪

- 总错误数：~150
- 已修复：0
- 待修复：150
- 完成度：0%

---

## 🔄 下一步行动

### 紧急修复（阻止启动）

1. **批量替换** `@/db/models` 导入路径（10分钟）
   - 影响文件：domain/ 和 services/ 目录
   - 替换为：`@/types/xxx`
   
2. **迁移 Services** 模块到函数式架构（2-3小时）
   - `services/export` → `fn/export/` 或 `routes/actions/`
   - `services/import-export` → `fn/import/` + `fn/export/`
   - 其他 services 模块

3. **修复 DrawingBuilder** 只读属性错误（5分钟）

### 后续修复

4. **修复测试** 类型错误（30分钟）
5. **清理 Lint** 警告（30分钟）

预计总修复时间：**4-5小时**

---

## 📝 启动错误详细日志

```
11:22:05 PM [vite] (client) Pre-transform error: Failed to resolve import "@/db/models" from "src/services/drawings.ts"
11:22:05 PM [vite] (client) Pre-transform error: Failed to resolve import "@/db/models" from "src/services/drawings.utils.ts"
11:22:05 PM [vite] (client) Pre-transform error: Failed to resolve import "@/services/export" from "src/components/blocks/export-dialog.tsx"
11:22:05 PM [vite] (client) Pre-transform error: Failed to resolve import "@/db/models" from "src/services/nodes.ts"
11:22:06 PM [vite] Internal server error: Failed to resolve import "@/db/models" from "src/domain/search/search.service.ts"
11:22:06 PM [vite] Internal server error: Failed to resolve import "@/db/models" from "src/services/drawings.ts"
11:22:06 PM [vite] Internal server error: Failed to resolve import "@/services/export" from "src/components/blocks/export-dialog.tsx"
11:22:06 PM [vite] Internal server error: Failed to resolve import "@/db/models" from "src/services/nodes.ts"
11:22:07 PM [vite] (client) Pre-transform error: Failed to resolve import "@/db/models" from "src/domain/file-creator/file-creator.service.ts"
11:22:19 PM [vite] (client) ✨ new dependencies optimized: fp-ts/Either
11:22:19 PM [vite] (client) ✨ optimized dependencies changed. reloading
```
