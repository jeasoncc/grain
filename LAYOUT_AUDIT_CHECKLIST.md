# 布局审查清单

## 📋 审查目标

审查 `desktop-v0.1.163` 版本（里程碑时期）的布局结构，提炼正确的布局模式到当前的 `AppLayout` 组件中。

---

## 🔍 历史版本布局分析（desktop-v0.1.163）

### 1. 根布局结构（`__root.tsx`）

**历史版本的布局层次：**

```tsx
<ConfirmProvider>
  <SidebarProvider>
    <Toaster />
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* 1. ActivityBar - 固定左侧窄栏 */}
      <ActivityBar />
      
      {/* 2. 主内容区域 - flex-1 */}
      <div className="flex-1 flex h-full min-w-0 overflow-hidden">
        <PanelGroup direction="horizontal" autoSaveId="grain-main-layout">
          
          {/* 2.1 UnifiedSidebar - 可折叠面板 */}
          {unifiedSidebarOpen && activePanel && (
            <>
              <Panel
                id="sidebar"
                order={1}
                defaultSize={20}
                minSize={15}
                maxSize={40}
                className="bg-sidebar flex flex-col"
              >
                <UnifiedSidebarContent {...props} />
              </Panel>
              <PanelResizeHandle />
            </>
          )}
          
          {/* 2.2 主编辑区域 - 路由出口 */}
          <Panel
            id="main"
            order={2}
            defaultSize={80}
            className="bg-background text-foreground min-h-svh"
          >
            <div className="flex-1 h-full overflow-auto">
              <Outlet />
            </div>
          </Panel>
          
        </PanelGroup>
      </div>
    </div>
    
    {/* 全局组件 */}
    <CommandPalette />
    <GlobalSearchContainer />
    <BufferSwitcher />
    <ExportDialogManager />
    <FontStyleInjector />
    <DevtoolsWrapper />
  </SidebarProvider>
</ConfirmProvider>
```

### 2. 关键特性

#### ✅ 使用了 `react-resizable-panels`
- `PanelGroup` 作为容器
- `Panel` 包裹侧边栏和主内容区
- `PanelResizeHandle` 提供拖拽调整功能
- `autoSaveId="grain-main-layout"` 保存布局状态

#### ✅ 侧边栏可折叠逻辑
- 通过 `unifiedSidebarOpen && activePanel` 控制显示
- 折叠后完全移除 Panel，主内容区占满
- 支持拖拽折叠（`wasCollapsedByDrag`）
- 提供恢复按钮（`onRestoreFromCollapse`）

#### ✅ 全局组件管理
- 所有全局组件（命令面板、搜索、导出对话框等）在根组件统一管理
- 通过 state 控制开关
- 通过全局快捷键触发

#### ✅ 主题和字体注入
- `FontStyleInjector` - 动态注入字体样式
- `initializeTheme()` - 初始化主题系统
- `autoBackupManager` - 自动备份管理

---

## 🆚 当前版本布局分析（main 分支）

### 1. 当前布局结构

```tsx
// __root.tsx
<ConfirmProvider>
  <AppLayout>
    <Outlet />
  </AppLayout>
</ConfirmProvider>

// AppLayout
<div className="flex h-screen w-screen overflow-hidden">
  <ActivityBar />
  <UnifiedSidebar />
  <div className="flex-1 overflow-hidden">{children}</div>
</div>
```

### 2. 问题分析

#### ❌ 缺失的功能

1. **没有 `react-resizable-panels`**
   - 无法拖拽调整侧边栏宽度
   - 无法保存布局状态
   - 无法通过拖拽折叠侧边栏

2. **缺少全局组件**
   - `CommandPalette` - 命令面板
   - `GlobalSearchContainer` - 全局搜索
   - `BufferSwitcher` - 标签页切换器
   - `ExportDialogManager` - 导出对话框管理器
   - `FontStyleInjector` - 字体样式注入
   - `DevtoolsWrapper` - 开发工具
   - `Toaster` - Toast 通知

3. **缺少全局快捷键**
   - Ctrl/Cmd + K - 命令面板
   - Ctrl/Cmd + Shift + F - 全局搜索
   - Ctrl/Cmd + B - 切换文件面板
   - Ctrl + Tab - 标签页切换

4. **缺少初始化逻辑**
   - 主题系统初始化
   - 自动备份初始化
   - 工作区加载逻辑

5. **缺少 Provider**
   - `SidebarProvider` - 侧边栏上下文

#### ⚠️ 架构问题

1. **布局过于简化**
   - 当前 `AppLayout` 只是简单的 flex 布局
   - 没有考虑可调整大小的需求
   - 没有考虑状态持久化

2. **职责不清晰**
   - 全局组件应该在哪里管理？
   - 全局快捷键应该在哪里注册？
   - 初始化逻辑应该在哪里执行？

---

## ✅ 改进清单

### 第一阶段：恢复核心布局功能

- [ ] 1. 在 `AppLayout` 中引入 `react-resizable-panels`
  - [ ] 安装依赖（如果未安装）
  - [ ] 使用 `PanelGroup` 包裹侧边栏和主内容区
  - [ ] 使用 `Panel` 组件替代简单的 div
  - [ ] 添加 `PanelResizeHandle` 支持拖拽调整
  - [ ] 设置 `autoSaveId` 保存布局状态

- [ ] 2. 恢复侧边栏折叠逻辑
  - [ ] 根据 `isOpen` 和 `activePanel` 条件渲染 Panel
  - [ ] 支持拖拽折叠（`wasCollapsedByDrag`）
  - [ ] 添加恢复按钮

- [ ] 3. 添加 `SidebarProvider`
  - [ ] 在 `__root.tsx` 中包裹 `AppLayout`

### 第二阶段：恢复全局组件

- [ ] 4. 在 `__root.tsx` 中添加全局组件
  - [ ] `<Toaster />` - Toast 通知
  - [ ] `<CommandPalette />` - 命令面板
  - [ ] `<GlobalSearchContainer />` - 全局搜索
  - [ ] `<BufferSwitcher />` - 标签页切换器
  - [ ] `<ExportDialogManager />` - 导出对话框管理器
  - [ ] `<FontStyleInjector />` - 字体样式注入
  - [ ] `<DevtoolsWrapper />` - 开发工具（仅开发模式）

- [ ] 5. 添加全局组件的状态管理
  - [ ] `commandOpen` - 命令面板开关
  - [ ] `searchOpen` - 搜索面板开关
  - [ ] `bufferSwitcherOpen` - 标签切换器开关
  - [ ] `bufferSwitcherDirection` - 切换方向

### 第三阶段：恢复全局快捷键

- [ ] 6. 注册全局快捷键
  - [ ] Ctrl/Cmd + K → 打开命令面板
  - [ ] Ctrl/Cmd + Shift + F → 打开/切换搜索面板
  - [ ] Ctrl/Cmd + B → 打开/切换文件面板
  - [ ] Ctrl + Tab → 向前切换标签页
  - [ ] Ctrl + Shift + Tab → 向后切换标签页

- [ ] 7. 监听自定义事件
  - [ ] `open-global-search` → 打开全局搜索

### 第四阶段：恢复初始化逻辑

- [ ] 8. 添加初始化 hooks
  - [ ] `initializeTheme()` - 主题系统初始化
  - [ ] `autoBackupManager.start()` - 自动备份初始化
  - [ ] 清理函数（cleanup）

- [ ] 9. 获取必要的数据
  - [ ] `useAllWorkspaces()` - 工作区列表
  - [ ] `useDrawingNodes()` - 绘图节点列表
  - [ ] `useEditorTabsStore` - 编辑器标签页状态
  - [ ] `useSelectionStore` - 选中状态
  - [ ] `useUnifiedSidebarStore` - 侧边栏状态

### 第五阶段：优化和测试

- [ ] 10. 代码优化
  - [ ] 提取回调函数（`useCallback`）
  - [ ] 添加日志追踪
  - [ ] 性能优化

- [ ] 11. 测试
  - [ ] 测试拖拽调整侧边栏宽度
  - [ ] 测试侧边栏折叠/展开
  - [ ] 测试全局快捷键
  - [ ] 测试全局组件显示/隐藏
  - [ ] 测试布局状态持久化

---

## 📝 实现建议

### 方案 A：渐进式迁移（推荐）

1. 先在 `AppLayout` 中恢复 `react-resizable-panels`
2. 然后在 `__root.tsx` 中逐步添加全局组件
3. 最后添加全局快捷键和初始化逻辑

**优点：**
- 风险小，每一步都可以测试
- 可以逐步验证功能
- 容易回滚

### 方案 B：一次性迁移

1. 直接将历史版本的 `__root.tsx` 代码复制过来
2. 调整导入路径（`@/components` → `@/views`）
3. 一次性测试所有功能

**优点：**
- 快速恢复所有功能
- 保证功能完整性

**缺点：**
- 风险较大
- 可能引入未知问题

---

## 🎯 关键差异总结

| 特性 | 历史版本 (v0.1.163) | 当前版本 (main) | 状态 |
|------|---------------------|-----------------|------|
| `react-resizable-panels` | ✅ 使用 | ❌ 未使用 | 需恢复 |
| 侧边栏可拖拽调整 | ✅ 支持 | ❌ 不支持 | 需恢复 |
| 布局状态持久化 | ✅ 支持 | ❌ 不支持 | 需恢复 |
| 命令面板 | ✅ 有 | ❌ 无 | 需添加 |
| 全局搜索 | ✅ 有 | ❌ 无 | 需添加 |
| 标签页切换器 | ✅ 有 | ❌ 无 | 需添加 |
| 导出对话框管理器 | ✅ 有 | ❌ 无 | 需添加 |
| 字体样式注入 | ✅ 有 | ❌ 无 | 需添加 |
| Toast 通知 | ✅ 有 | ❌ 无 | 需添加 |
| 全局快捷键 | ✅ 有 | ❌ 无 | 需添加 |
| 主题初始化 | ✅ 有 | ❌ 无 | 需添加 |
| 自动备份 | ✅ 有 | ❌ 无 | 需添加 |
| `SidebarProvider` | ✅ 有 | ❌ 无 | 需添加 |

---

## 🚀 下一步行动

**请确认：**

1. 你希望使用哪种方案？（A：渐进式 / B：一次性）
2. 是否需要我先展示详细的代码变更？
3. 是否有特定的功能优先级？

**我的建议：**

采用**方案 A（渐进式迁移）**，按以下顺序执行：

1. 第一步：恢复 `react-resizable-panels`（核心布局）
2. 第二步：添加全局组件（UI 完整性）
3. 第三步：添加全局快捷键（交互体验）
4. 第四步：添加初始化逻辑（功能完整性）
5. 第五步：测试和优化

每完成一步，我们都可以测试验证，确保没有问题再继续下一步。

---

## 📌 注意事项

1. **导入路径变更**
   - 历史版本：`@/components/xxx`
   - 当前版本：`@/views/xxx`
   - 需要批量替换

2. **依赖检查**
   - 确认 `react-resizable-panels` 是否已安装
   - 确认所有全局组件是否存在于 `views/` 目录

3. **状态管理**
   - 确认所有 Store 是否已迁移到 `state/` 目录
   - 确认导入路径是否正确

4. **类型定义**
   - 确认所有类型是否已定义
   - 确认类型导入路径是否正确
