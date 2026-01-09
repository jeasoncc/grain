# Implementation Plan: Layout Restoration

## Overview

本实现计划将布局恢复功能分解为可执行的任务，遵循函数式架构模式，按照 Types → State → Flows → Hooks → Views → Routes 的顺序实施。

---

## Tasks

- [x] 1. 安装依赖和准备工作
  - 检查并安装 `react-resizable-panels`
  - 检查并安装 `fast-check` (开发依赖)
  - 验证现有依赖版本兼容性
  - _Requirements: 所有需求的基础_

- [x] 2. 创建类型定义
  - [x] 2.1 创建布局相关类型
    - 创建 `types/layout.interface.ts`
    - 定义 `LayoutState`, `SidebarPanel`, `LayoutActions`
    - _Requirements: 1.1, 1.2, 1.3, 11.1_
  
  - [x] 2.2 创建全局 UI 类型
    - 创建 `types/global-ui.interface.ts`
    - 定义 `GlobalUIState`, `GlobalUIActions`
    - _Requirements: 2.1, 3.1, 4.1, 5.1_
  
  - [x] 2.3 创建主题类型
    - 创建 `types/theme.interface.ts`
    - 定义 `ThemeMode`, `ThemeState`, `ThemeActions`
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 3. 创建状态管理
  - [x] 3.1 创建布局状态
    - 创建 `state/layout.state.ts`
    - 实现 `useLayoutStore` with Zustand
    - 实现 `setActivePanel`, `toggleSidebar`, `restoreFromCollapse`
    - _Requirements: 1.1, 1.5, 1.6, 11.1, 11.2_
  
  - [ ]* 3.2 编写布局状态测试
    - 创建 `state/layout.state.test.ts`
    - 测试所有状态操作
    - _Requirements: 1.1, 11.1_
  
  - [x] 3.3 创建全局 UI 状态
    - 创建 `state/global-ui.state.ts`
    - 实现 `useGlobalUIStore`
    - 实现命令面板、搜索、切换器的开关逻辑
    - _Requirements: 2.1, 3.1, 4.1, 5.1_
  
  - [ ]* 3.4 编写全局 UI 状态测试
    - 创建 `state/global-ui.state.test.ts`
    - 测试所有状态操作
    - _Requirements: 2.1, 3.1_
  
  - [x] 3.5 创建主题状态
    - 创建 `state/theme.state.ts`
    - 实现 `useThemeStore`
    - 实现 `setMode`, `setSystemTheme`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ]* 3.6 编写主题状态测试
    - 创建 `state/theme.state.test.ts`
    - 测试主题切换逻辑
    - _Requirements: 9.3, 9.4_

- [x] 4. 创建 IO 层函数
  - [x] 4.1 创建布局状态持久化
    - 创建 `io/storage/layout.storage.ts`
    - 实现 `saveLayoutState`, `loadLayoutState`
    - _Requirements: 1.2, 1.3, 13.1, 13.2_
  
  - [ ]* 4.2 编写持久化测试
    - 创建 `io/storage/layout.storage.test.ts`
    - 测试保存和加载逻辑
    - _Requirements: 13.1, 13.2_

- [x] 5. 创建 Flows 层
  - [x] 5.1 创建布局初始化 flow
    - 创建 `flows/layout/init-layout.flow.ts`
    - 实现布局状态加载和恢复逻辑
    - 处理加载失败的降级策略
    - _Requirements: 1.3, 13.2, 13.3, 13.4_
  
  - [ ]* 5.2 编写布局初始化测试
    - 创建 `flows/layout/init-layout.flow.test.ts`
    - 测试正常加载和错误处理
    - _Requirements: 13.2, 13.4_
  
  - [x] 5.3 创建主题初始化 flow
    - 创建 `flows/theme/init-theme.flow.ts`
    - 实现主题系统初始化
    - 监听系统主题变化
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [ ]* 5.4 编写主题初始化测试
    - 创建 `flows/theme/init-theme.flow.test.ts`
    - 测试主题初始化和同步
    - _Requirements: 9.3_

- [x] 6. 创建 Hooks
  - [x] 6.1 创建布局 hook
    - 创建 `hooks/use-layout.ts`
    - 封装布局状态和操作
    - _Requirements: 1.1, 11.1_
  
  - [x] 6.2 创建全局 UI hook
    - 创建 `hooks/use-global-ui.ts`
    - 封装全局组件状态和操作
    - _Requirements: 2.1, 3.1, 4.1_
  
  - [x] 6.3 创建主题 hook
    - 创建 `hooks/use-theme.ts`
    - 封装主题状态和操作
    - _Requirements: 9.1, 9.2_

- [x] 7. 更新 AppLayout 组件
  - [x] 7.1 更新 AppLayout 视图组件
    - 修改 `views/app-layout/app-layout.view.fn.tsx`
    - 引入 `PanelGroup`, `Panel`, `PanelResizeHandle`
    - 实现条件渲染侧边栏
    - 设置 `autoSaveId="grain-main-layout"`
    - _Requirements: 1.1, 1.2, 1.4_
  
  - [ ]* 7.2 编写 AppLayout 集成测试
    - 创建 `views/app-layout/app-layout.integration.test.tsx`
    - 测试面板调整和折叠
    - _Requirements: 1.1, 1.4_

- [x] 8. 更新 __root.tsx
  - [x] 8.1 添加全局组件
    - 修改 `routes/__root.tsx`
    - 添加 `<Toaster />`
    - 添加 `<CommandPalette />`
    - 添加 `<GlobalSearch />`
    - 添加 `<BufferSwitcher />`
    - 添加 `<ExportDialogManager />`
    - 添加 `<FontStyleInjector />`
    - 添加 `<DevtoolsWrapper />` (仅开发模式)
    - _Requirements: 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 12.1_
  
  - [x] 8.2 添加全局状态管理
    - 在 `__root.tsx` 中添加全局组件状态
    - 使用 `useGlobalUIStore` 管理开关状态
    - _Requirements: 2.1, 2.2_
  
  - [x] 8.3 添加初始化逻辑
    - 调用 `initLayoutFlow()` 初始化布局
    - 调用 `initThemeFlow()` 初始化主题
    - 启动自动备份管理器（如果启用）
    - _Requirements: 9.1, 10.1, 10.2_

- [x] 9. 实现全局快捷键
  - [ ] 9.1 创建快捷键管理 hook
    - 创建 `hooks/use-keyboard-shortcuts.ts`
    - 实现快捷键注册和处理逻辑
    - _Requirements: 3.1, 4.1, 5.1, 11.1_
    - _Note: 已在 __root.tsx 中直接实现，无需单独 hook_
  
  - [x] 9.2 在 __root.tsx 中注册快捷键
    - 注册 Ctrl/Cmd+K → 打开命令面板
    - 注册 Ctrl/Cmd+Shift+F → 切换全局搜索
    - 注册 Ctrl/Cmd+B → 切换文件面板
    - 注册 Ctrl+Tab → 向前切换标签页
    - 注册 Ctrl+Shift+Tab → 向后切换标签页
    - _Requirements: 3.1, 4.1, 5.1, 5.2, 11.1_
  
  - [ ]* 9.3 编写快捷键测试
    - 创建 `hooks/use-keyboard-shortcuts.test.ts`
    - 测试快捷键触发和冲突处理
    - _Requirements: 3.1, 4.1_

- [x] 10. 实现 FontStyleInjector
  - [x] 10.1 创建 FontStyleInjector 组件
    - 创建 `views/utils/font-style-injector.tsx`
    - 从设置读取字体配置
    - 动态注入 CSS 样式
    - _Requirements: 7.1, 7.2, 7.3_
    - _Note: 组件已存在并已在 __root.tsx 中使用_
  
  - [ ]* 10.2 编写 FontStyleInjector 测试
    - 创建 `views/utils/font-style-injector.test.tsx`
    - 测试样式注入和更新
    - _Requirements: 7.2, 7.3_

- [x] 11. 实现 DevtoolsWrapper
  - [x] 11.1 创建 DevtoolsWrapper 组件
    - 创建 `views/utils/devtools-wrapper.container.fn.tsx`
    - 仅在开发模式下加载 TanStack Devtools
    - _Requirements: 12.1, 12.2_

- [x] 12. 实现响应式布局
  - [x] 12.1 添加窗口大小监听
    - 在 AppLayout 中监听窗口大小变化
    - 实现自动折叠逻辑（< 768px）
    - _Requirements: 15.1, 15.2_
  
  - [x] 12.2 添加面板宽度约束
    - 设置侧边栏 maxSize={40}（40%）
    - 确保主内容区最小宽度 400px
    - _Requirements: 15.3, 15.4_
  
  - [ ]* 12.3 编写响应式布局测试
    - 创建响应式布局测试
    - 测试不同窗口大小下的行为
    - _Requirements: 15.1, 15.3_

- [ ] 13. Checkpoint - 核心功能验证
  - 验证面板可拖拽调整
  - 验证布局状态持久化
  - 验证全局快捷键工作
  - 验证主题系统工作
  - 运行所有测试
  - 如有问题，询问用户

- [ ] 14. 属性测试实现
  - [ ]* 14.1 编写布局状态持久化属性测试
    - **Property 1: 布局状态持久化**
    - **Validates: Requirements 1.2, 1.3, 13.1, 13.2, 13.3**
    - 使用 fast-check 生成随机布局状态
    - 验证保存-加载往返一致性
  
  - [ ]* 14.2 编写面板调整属性测试
    - **Property 2: 面板拖拽调整**
    - **Validates: Requirements 1.1, 1.4**
    - 验证拖拽操作的实时更新
  
  - [ ]* 14.3 编写快捷键响应属性测试
    - **Property 4: 快捷键响应**
    - **Validates: Requirements 3.1, 4.1, 5.1, 5.2, 11.1**
    - 验证所有快捷键正确触发
  
  - [ ]* 14.4 编写主题同步属性测试
    - **Property 9: 主题系统同步**
    - **Validates: Requirements 9.3, 9.4**
    - 验证系统主题变化时应用主题同步
  
  - [ ]* 14.5 编写面板切换状态属性测试
    - **Property 11: 面板切换状态**
    - **Validates: Requirements 11.1, 11.2, 11.3**
    - 验证面板切换的状态转换逻辑
  
  - [ ]* 14.6 编写响应式布局约束属性测试
    - **Property 12: 响应式布局约束**
    - **Validates: Requirements 15.3, 15.4**
    - 验证布局约束在所有窗口大小下成立

- [ ] 15. E2E 测试实现
  - [ ]* 15.1 编写布局持久化 E2E 测试
    - 创建 `e2e/layout-persistence.spec.ts`
    - 测试跨会话的布局状态恢复
    - _Requirements: 1.2, 1.3, 13.1_
  
  - [ ]* 15.2 编写快捷键 E2E 测试
    - 创建 `e2e/keyboard-shortcuts.spec.ts`
    - 测试所有全局快捷键
    - _Requirements: 3.1, 4.1, 5.1, 11.1_
  
  - [ ]* 15.3 编写主题切换 E2E 测试
    - 创建 `e2e/theme-switching.spec.ts`
    - 测试主题切换和持久化
    - _Requirements: 9.1, 9.3, 9.5_

- [ ] 16. 性能优化
  - [ ] 16.1 优化组件渲染
    - 为所有视图组件添加 `React.memo`
    - 使用 `useCallback` 稳定回调函数
    - 使用 Zustand 选择器优化订阅
    - _Requirements: 性能目标_
  
  - [ ] 16.2 优化全局组件加载
    - 实现全局组件懒加载
    - 优化初始渲染性能
    - _Requirements: 性能目标_

- [ ] 17. 最终验证
  - 运行完整测试套件
  - 验证所有需求已实现
  - 验证架构合规性
  - 性能测试（首次渲染 < 100ms）
  - 内存泄漏检测
  - 代码审查

- [ ] 18. 文档更新
  - 更新 README.md
  - 更新架构文档
  - 添加使用示例
  - 更新 CHANGELOG

---

## Notes

### 任务标记说明

- `[ ]` - 未开始的任务
- `[ ]*` - 可选任务（主要是测试相关）
- `[x]` - 已完成的任务

### 实施顺序

1. **阶段 1: 基础设施**（任务 1-6）
   - 安装依赖
   - 创建类型、状态、IO、Flows、Hooks

2. **阶段 2: 核心布局**（任务 7-8）
   - 更新 AppLayout
   - 更新 __root.tsx

3. **阶段 3: 交互功能**（任务 9-12）
   - 实现快捷键
   - 实现工具组件
   - 实现响应式布局

4. **阶段 4: 测试**（任务 13-15）
   - 核心功能验证
   - 属性测试
   - E2E 测试

5. **阶段 5: 优化和发布**（任务 16-18）
   - 性能优化
   - 最终验证
   - 文档更新

### 依赖关系

- 任务 2 必须在任务 3 之前完成（类型 → 状态）
- 任务 3 必须在任务 5 之前完成（状态 → Flows）
- 任务 5 必须在任务 6 之前完成（Flows → Hooks）
- 任务 6 必须在任务 7-8 之前完成（Hooks → Views）
- 任务 13 是检查点，必须通过才能继续

### 测试策略

- 单元测试（`*`标记）是可选的，但强烈推荐
- 属性测试（任务 14）验证核心正确性属性
- E2E 测试（任务 15）验证完整用户流程
- 所有测试应该在任务 17 之前完成

### 架构合规性

每个任务完成后，Agent Hook 会自动检查：
- 文件位置是否正确
- 命名是否符合规范
- 依赖关系是否合规
- 组件是否正确分离

如果检查失败，需要修复后才能继续下一个任务。
