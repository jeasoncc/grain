# 侧边栏显示问题分析

## 文件树显示的控制逻辑

### 渲染条件（3个必要条件）

在 `__root.tsx` 中：
```typescript
{unifiedSidebarOpen && activePanel && (
    <Panel><UnifiedSidebarContent /></Panel>
)}
```

在 `UnifiedSidebarContent` 中：
```typescript
{activePanel === "files" && <FileTreePanel />}
```

**必要条件**：
1. `unifiedSidebarOpen === true` (侧边栏打开状态)
2. `activePanel !== null` (有活动面板)
3. `activePanel === "files"` (活动面板是files)

## 创建功能审查

### 从Activity Bar创建（需要设置activePanel）

| 功能 | 位置 | 是否设置activePanel | 状态 |
|------|------|-------------------|------|
| 创建Diary | activity-bar.tsx `handleCreateDiary` | ✅ `setActivePanel("files")` | 正常 |
| 创建Wiki | activity-bar.tsx `handleCreateWiki` | ✅ `setActivePanel("files")` | 正常 |

### 从FileTreePanel创建（不需要设置activePanel）

| 功能 | 位置 | 是否需要设置 | 原因 |
|------|------|------------|------|
| 创建文件夹 | file-tree-panel.tsx `handleCreateFolder` | ❌ 不需要 | 只有在FileTreePanel已显示时才能点击 |
| 创建文件 | file-tree-panel.tsx `handleCreateFile` | ❌ 不需要 | 只有在FileTreePanel已显示时才能点击 |

**重要发现**：FileTreePanel内部的创建按钮只有在文件树已经显示时才能被点击，所以不需要设置activePanel。

## 问题根源

根据日志分析，问题可能是：

### 可能原因1: setActivePanel没有同时设置isOpen

查看 `unified-sidebar.ts` 的 `setActivePanel` 实现：

```typescript
setActivePanel: (panel) => {
    const state = get();
    const newIsOpen = panel !== null ? true : state.isOpen;
    set({
        activePanel: panel,
        isOpen: newIsOpen,  // 当panel不为null时，应该设置为true
    });
},
```

**理论上应该正常**：当 `panel !== null` 时，`isOpen` 会被设置为 `true`。

### 可能原因2: localStorage缓存问题

清空数据库后，localStorage被清空，但在页面重新加载时：
1. Zustand persist中间件恢复状态
2. 可能恢复了错误的 `isOpen: false` 状态
3. 导致即使 `activePanel="files"`，侧边栏也不显示

### 可能原因3: React状态更新时序问题

`setActivePanel("files")` 调用后，状态可能没有立即更新，导致：
1. `activePanel` 更新为 "files"
2. 但 `isOpen` 仍然是旧值 `false`
3. 渲染条件 `unifiedSidebarOpen && activePanel` 不满足

## 建议的修复方案

### 方案1: 同时调用setIsOpen和setActivePanel

```typescript
// 在activity-bar.tsx的handleCreateDiary中
setIsOpen(true);  // 先确保侧边栏打开
setActivePanel("files");  // 再设置活动面板
```

### 方案2: 修改setActivePanel的实现

```typescript
setActivePanel: (panel) => {
    const state = get();
    logger.info(`[UnifiedSidebar] setActivePanel: ${panel}, forcing isOpen=true`);
    set({
        activePanel: panel,
        isOpen: true,  // 强制打开，不管之前的状态
    });
},
```

### 方案3: 在清空数据后正确初始化localStorage

在 `clear-data.ts` 的 `initializeBasicSettings` 中设置默认状态。

## 下一步调试

通过日志查看：
1. `setActivePanel("files")` 调用后，`isOpen` 的值是什么
2. `__root.tsx` 中的渲染条件 `unifiedSidebarOpen && activePanel` 的实际值
3. 是否有其他地方设置了 `isOpen: false`

## 日志追踪点

已添加的日志：
- ✅ `[Root] Sidebar state: isOpen=X, activePanel=X, willRender=X`
- ✅ `[UnifiedSidebar] setActivePanel: panel=X, currentIsOpen=X, newIsOpen=X`
- ✅ `[UnifiedSidebar] setIsOpen: open=X`
- ✅ `[UnifiedSidebar] toggleSidebar: currentIsOpen=X, newIsOpen=X`
- ✅ `[ActivityBar] Before/After setActivePanel`
