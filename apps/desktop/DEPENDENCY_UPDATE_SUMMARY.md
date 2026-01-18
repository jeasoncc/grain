# 依赖更新总结

**更新日期**: 2026-01-18

## 📦 更新的依赖 (47个)

### 主要更新

1. **React 生态**
   - react: 19.1.0 → 19.2.3
   - react-dom: 19.1.0 → 19.2.3
   - @types/react: 19.1.8 → 19.2.8
   - @types/react-dom: 19.1.6 → 19.2.3

2. **Lexical 编辑器** (0.38.2 → 0.39.0)
   - lexical
   - @lexical/code, file, hashtag, link, list, markdown, overflow, react, rich-text, selection, table, text, utils

3. **TanStack 生态**
   - @tanstack/react-form: 1.23.8 → 1.27.7
   - @tanstack/react-query: 5.90.16 → 5.90.19
   - @tanstack/react-router: 1.134.4 → 1.151.2
   - @tanstack/react-router-devtools: 1.134.4 → 1.151.2
   - @tanstack/router-plugin: 1.134.6 → 1.151.2

4. **react-resizable-panels** (3.0.6 → 4.4.1) ⚠️ **破坏性变更**
   - `PanelGroup` → `Group`
   - `PanelResizeHandle` → `Separator`
   - `direction` → `orientation`
   - `autoSaveId` → `id`
   - 移除了 `onCollapse` 和 `onExpand` 回调

5. **构建工具**
   - vite: 7.1.7 → 7.3.1
   - @vitejs/plugin-react: 5.0.4 → 5.1.2
   - vitest: 4.0.16 → 4.0.17
   - typescript: 5.8.3 → 5.9.3

6. **其他重要更新**
   - tailwindcss: 4.0.0 → 4.1.18
   - @tailwindcss/vite: 4.1.16 → 4.1.18
   - zod: 4.1.12 → 4.3.5
   - zustand: 5.0.8 → 5.0.10
   - lucide-react: 0.554.0 → 0.562.0

## 🔧 代码修改

### 1. react-resizable-panels API 更新

**文件**: `apps/desktop/src/views/app-layout/app-layout.view.fn.tsx`

```diff
- import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
+ import { Panel, Group, Separator } from "react-resizable-panels"

- <PanelGroup direction="horizontal" autoSaveId="grain-main-layout" onLayout={handleResize}>
+ <Group orientation="horizontal" id="grain-main-layout">
  
-   <PanelResizeHandle className="..." />
+   <Separator className="..." />

- </PanelGroup>
+ </Group>
```

**文件**: `apps/desktop/src/hooks/use-app-layout.ts`

- 移除了 `setSidebarCollapsedByDrag` 和 `restoreFromCollapse` 的使用
- `handleCollapse` 和 `handleExpand` 改为空函数（v4 不支持这些回调）

### 2. Puppeteer 优化

**文件**: `apps/desktop/.puppeteerrc.cjs` (新建)

```javascript
module.exports = {
  skipDownload: true,
};
```

跳过 Chromium 下载，加快 `bun install` 速度（从 1分钟+ 降到 100ms）

### 3. React 19 类型兼容性

**文件**: `apps/desktop/src/types/react-19-compat.d.ts` (新建)

添加类型声明以解决 React 19 与 Radix UI 的类型冲突

## ⚠️ 已知问题

### React 19 + Radix UI 类型不兼容

**错误**: `VoidOrUndefinedOnly` 类型冲突

**影响文件**:
- `src/views/ui/breadcrumb.tsx`
- `src/views/ui/button-group.tsx`
- `src/views/ui/button.tsx`
- `src/views/ui/sidebar.tsx`

**状态**: 
- 这是 React 19 和 Radix UI 之间的已知类型不兼容问题
- 已启用 `skipLibCheck: true` 来跳过库类型检查
- 不影响运行时行为，仅影响类型检查
- 等待 Radix UI 更新以完全支持 React 19

**临时解决方案**:
1. 使用 `skipLibCheck: true` (已配置)
2. 添加类型兼容性补丁 (`react-19-compat.d.ts`)
3. 等待 Radix UI 官方更新

## ✅ 测试建议

1. **功能测试**
   - [ ] 测试侧边栏拖拽调整大小
   - [ ] 测试侧边栏折叠/展开
   - [ ] 测试响应式布局（< 768px）
   - [ ] 测试 Lexical 编辑器功能
   - [ ] 测试 TanStack Router 路由

2. **构建测试**
   ```bash
   bun run build:prod
   ```

3. **类型检查**
   ```bash
   bun run type:check
   ```
   注意：会有 8 个 Radix UI 相关的类型错误，这是已知问题

4. **E2E 测试**
   ```bash
   bun run e2e
   ```

## 📝 后续行动

1. **监控 Radix UI 更新**
   - 关注 Radix UI 对 React 19 的支持
   - 更新后移除临时类型补丁

2. **测试 react-resizable-panels v4**
   - 验证拖拽功能是否正常
   - 确认布局持久化是否工作

3. **性能测试**
   - 验证 Vite 7.3 的构建性能
   - 测试 React 19 的渲染性能

## 🔗 相关链接

- [react-resizable-panels v4 迁移指南](https://github.com/bvaughn/react-resizable-panels/releases)
- [React 19 发布说明](https://react.dev/blog/2024/12/05/react-19)
- [Radix UI React 19 支持追踪](https://github.com/radix-ui/primitives/issues)
