# Implementation Tasks

## Task 1: 扩展 DiagramStore 类型定义

- [ ] 在 `diagram.interface.ts` 添加 `diagramAutoSave` 字段（默认 false）
- [ ] 在 `diagram.interface.ts` 添加 `diagramAutoSaveDelay` 字段（默认 60）
- [ ] 在 `DiagramActions` 添加 `setDiagramAutoSave` action
- [ ] 在 `DiagramActions` 添加 `setDiagramAutoSaveDelay` action

**Requirements:** 1, 3
**Files:**
- `apps/desktop/src/types/diagram/diagram.interface.ts` (modify)

---

## Task 2: 实现 DiagramStore 新功能

- [ ] 在 `diagram.store.ts` 添加 `diagramAutoSave` 状态（默认 false）
- [ ] 在 `diagram.store.ts` 添加 `diagramAutoSaveDelay` 状态（默认 60）
- [ ] 实现 `setDiagramAutoSave` action
- [ ] 实现 `setDiagramAutoSaveDelay` action（包含范围限制 10-300）
- [ ] 添加 selector hooks

**Requirements:** 1, 3
**Files:**
- `apps/desktop/src/stores/diagram.store.ts` (modify)

---

## Task 3: 创建 useIdleSave Hook

- [ ] 创建 `use-idle-save.ts` 文件
- [ ] 实现空闲检测逻辑（使用 setTimeout）
- [ ] 实现 `updateContent` 方法（重置空闲计时器）
- [ ] 实现 `saveNow` 方法（立即保存）
- [ ] 实现 `onSaveComplete` 回调（用于触发渲染）
- [ ] 处理组件卸载时的清理逻辑

**Requirements:** 2, 4
**Files:**
- `apps/desktop/src/hooks/use-idle-save.ts` (create)

---

## Task 4: 创建保存状态指示组件

- [ ] 创建 `save-status-indicator.types.ts` 类型定义
- [ ] 创建 `save-status-indicator.view.fn.tsx` 展示组件
- [ ] 实现未保存状态显示（黄色圆点）
- [ ] 实现保存中状态显示（旋转图标）
- [ ] 实现已保存状态显示（绿色勾）
- [ ] 实现自动保存关闭状态显示
- [ ] 创建 `index.ts` 导出

**Requirements:** 5
**Files:**
- `apps/desktop/src/components/diagram-editor/save-status-indicator.types.ts` (create)
- `apps/desktop/src/components/diagram-editor/save-status-indicator.view.fn.tsx` (create)
- `apps/desktop/src/components/diagram-editor/index.ts` (modify)

---

## Task 5: 更新 DiagramEditorView 组件

- [ ] 在 `diagram-editor.types.ts` 添加保存状态相关 props
- [ ] 在 `diagram-editor.view.fn.tsx` 集成 SaveStatusIndicator 组件
- [ ] 在编辑器工具栏或状态栏显示保存状态

**Requirements:** 5
**Files:**
- `apps/desktop/src/components/diagram-editor/diagram-editor.types.ts` (modify)
- `apps/desktop/src/components/diagram-editor/diagram-editor.view.fn.tsx` (modify)

---

## Task 6: 更新 DiagramEditorContainer 组件

- [ ] 导入 `useIdleSave` hook 替代 `useEditorSave`
- [ ] 从 DiagramStore 获取 `diagramAutoSave` 和 `diagramAutoSaveDelay`
- [ ] 移除 `debouncedPreview` 调用
- [ ] 在 `onSaveComplete` 回调中触发预览渲染
- [ ] 更新 `handleCodeChange` 只更新内容不触发渲染
- [ ] 更新 `handleManualSave` 保存后触发渲染
- [ ] 传递保存状态 props 给 View 组件

**Requirements:** 2, 4
**Files:**
- `apps/desktop/src/components/diagram-editor/diagram-editor.container.fn.tsx` (modify)

---

## Task 7: 更新设置页面

- [ ] 添加 Auto-save Settings 区块
- [ ] 添加自动保存开关（Switch 组件）
- [ ] 添加保存延迟滑块（Slider 组件，10-300 秒）
- [ ] 显示当前延迟值
- [ ] 连接 DiagramStore actions

**Requirements:** 6
**Files:**
- `apps/desktop/src/routes/settings/diagrams.tsx` (modify)

---

## Task 8: 添加 useIdleSave Hook 测试

- [ ] 测试空闲检测逻辑
- [ ] 测试 enabled=false 时不触发自动保存
- [ ] 测试 saveNow 立即保存
- [ ] 测试 onSaveComplete 回调调用
- [ ] 测试组件卸载清理

**Requirements:** 2
**Files:**
- `apps/desktop/src/hooks/use-idle-save.test.ts` (create)

---

## Task 9: 添加 DiagramStore 测试

- [ ] 测试 `diagramAutoSave` 默认值为 false
- [ ] 测试 `diagramAutoSaveDelay` 默认值为 60
- [ ] 测试 `setDiagramAutoSaveDelay` 范围限制（10-300）
- [ ] 测试设置持久化

**Requirements:** 1, 3
**Files:**
- `apps/desktop/src/stores/diagram.store.test.ts` (create)

---

## Task 10: 添加 SaveStatusIndicator 组件测试

- [ ] 测试未保存状态渲染
- [ ] 测试保存中状态渲染
- [ ] 测试已保存状态渲染
- [ ] 测试自动保存关闭状态渲染

**Requirements:** 5
**Files:**
- `apps/desktop/src/components/diagram-editor/save-status-indicator.view.fn.test.tsx` (create)

---

## Task 11: 更新 DiagramEditorContainer 测试

- [ ] 测试输入时不触发预览渲染
- [ ] 测试保存后触发预览渲染
- [ ] 测试手动保存 (Ctrl+S) 流程
- [ ] 测试自动保存关闭时的行为

**Requirements:** 2, 4
**Files:**
- `apps/desktop/src/components/diagram-editor/diagram-editor.container.fn.test.tsx` (modify or create)

---

## Task 12: 验证和清理

- [ ] 运行所有测试确保通过
- [ ] 运行 lint 检查
- [ ] 运行类型检查
- [ ] 手动测试自动保存开关功能
- [ ] 手动测试保存延迟设置
- [ ] 手动测试保存状态指示
- [ ] 手动测试预览只在保存后更新
- [ ] 清理未使用的代码

**Requirements:** 1, 2, 3, 4, 5, 6
**Files:**
- N/A (verification only)
