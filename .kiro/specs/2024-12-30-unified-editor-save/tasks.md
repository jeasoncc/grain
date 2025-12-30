# Implementation Plan: 统一编辑器保存逻辑

## Overview

分 4 个阶段实现：TabType 复用 NodeType → Excalidraw 迁移 → Lexical 迁移 → 验证和测试。

## Tasks

- [ ] 1. TabType 复用 NodeType
  - [ ] 1.1 修改 editor-tab.interface.ts，将 TabType 改为 `Exclude<NodeType, "folder">`
    - 导入 NodeType 从 `@/types/node`
    - 删除独立的 TabType 枚举定义
    - 添加注释说明 TabType 自动跟随 NodeType
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ] 1.2 运行类型检查，修复类型错误
    - 执行 `bun run check` 检查类型
    - 修复任何因类型变更导致的错误
    - _Requirements: 4.3, 4.4_

- [ ] 2. 迁移 ExcalidrawEditorContainer
  - [ ] 2.1 引入 useEditorSave hook 替换自定义保存逻辑
    - 导入 useEditorSave hook
    - 获取 activeTabId 用于 isDirty 同步
    - 配置 contentType 为 "excalidraw"
    - 移除自定义的 debounce/throttle 保存逻辑
    - 保留 Excalidraw JSON 序列化逻辑
    - _Requirements: 5.2, 1.1, 1.2, 2.1, 2.2_
  - [ ] 2.2 更新 onChange 处理器使用 updateContent
    - 将 JSON.stringify 后的内容传给 updateContent
    - 移除 hasUnsavedChanges ref
    - 移除 throttledMarkAsUnsaved 等自定义状态管理
    - _Requirements: 2.1, 2.4_
  - [ ] 2.3 更新手动保存处理器使用 saveNow
    - 使用 hook 的 hasUnsavedChanges() 检查
    - 使用 hook 的 saveNow() 执行保存
    - _Requirements: 3.1, 3.2_

- [ ] 3. 迁移 StoryWorkspaceContainer (Lexical)
  - [ ] 3.1 引入 useEditorSave hook 替换自定义保存逻辑
    - 导入 useEditorSave hook
    - 配置 contentType 为 "lexical"
    - 移除 autoSaveTimerRef 和自定义定时器逻辑
    - _Requirements: 5.3, 1.1, 1.2_
  - [ ] 3.2 更新 handleMultiEditorContentChange 使用 updateContent
    - 将 JSON.stringify(state) 传给 updateContent
    - 移除手动的 markAsUnsaved/markAsSaving/markAsSaved 调用
    - _Requirements: 2.1, 2.4_
  - [ ] 3.3 确保 useManualSave hook 与 useEditorSave 协同工作
    - 验证 Ctrl+S 快捷键仍然有效
    - 确保不会重复保存
    - _Requirements: 3.1, 3.2_

- [ ] 4. Checkpoint - 验证基本功能
  - 确保所有编辑器的保存功能正常
  - 验证 isDirty 状态在标签页正确显示
  - 测试 Ctrl+S 手动保存
  - 如有问题，询问用户

- [ ] 5. 验证 DiagramEditor
  - [ ] 5.1 确认 DiagramEditor 已正确使用 useEditorSave
    - 检查 hook 配置是否正确
    - 验证 tabId 传递正确
    - _Requirements: 5.1_
  - [ ] 5.2 验证 onSaveSuccess 触发预览渲染
    - 测试保存后预览自动更新
    - 确保 Mermaid 和 PlantUML 都正常
    - _Requirements: 3.1, 3.2_

- [ ] 6. 属性测试
  - [ ]* 6.1 编写 Property 1 测试：Settings Configuration Applied Correctly
    - **Property 1: Settings Configuration Applied Correctly**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
  - [ ]* 6.2 编写 Property 2 测试：isDirty State Synchronization
    - **Property 2: isDirty State Synchronization**
    - **Validates: Requirements 2.1, 2.2, 2.4**

- [ ] 7. Final Checkpoint - 确保所有测试通过
  - 运行 `bun run test` 确保所有测试通过
  - 运行 `bun run check` 确保类型检查通过
  - 如有问题，询问用户

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- DiagramEditor 已经使用 useEditorSave，只需验证
- Excalidraw 的 JSON 序列化逻辑需要保留，只是保存触发机制改用 hook
- Lexical 的 SerializedEditorState 处理需要保留
