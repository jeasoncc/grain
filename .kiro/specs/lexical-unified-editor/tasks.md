# Implementation Plan: Lexical Unified Editor

## Overview

本实施计划将 Grain 编辑器统一化重构分解为可执行的任务。根据代码分析，大部分重构工作已完成，剩余任务主要是验证和完善。

## 当前状态

根据代码分析，以下工作已完成：
- ✅ Monaco 依赖已从 package.json 移除
- ✅ code-editor 和 diagram-editor 组件目录已删除
- ✅ editor-settings.store 已移除编辑器类型选择
- ✅ story-workspace.container 已只使用 Lexical 和 Excalidraw
- ✅ get-editor-type.fn.ts 已实现正确的编辑器类型判断

## Tasks

- [x] 1. 验证并完善编辑器类型判断函数
  - [-] 1.1 审查 get-editor-type.fn.ts 确保只返回 "lexical" | "excalidraw"
    - 验证 EditorType 类型定义
    - 验证 EXTENSION_TO_EDITOR_MAP 映射
    - _Requirements: 1.1, 1.2, 1.5_
  - [ ] 1.2 编写属性测试验证编辑器类型选择正确性
    - **Property 1: Editor Type Selection Correctness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [ ] 2. 验证 StoryWorkspace 容器组件
  - [ ] 2.1 审查 story-workspace.container.fn.tsx 确保只使用 Lexical 和 Excalidraw
    - 验证 import 语句只引用 @grain/editor-lexical
    - 验证 renderEditorContent 逻辑
    - _Requirements: 1.4, 6.3, 6.4, 6.5_

- [ ] 3. 验证 Settings 页面
  - [ ] 3.1 审查 routes/settings/editor.tsx 确保无编辑器选择配置
    - 验证只保留排版设置和行为设置
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4. 验证 editor-settings store
  - [ ] 4.1 审查 editor-settings.store.ts 确保无编辑器类型选择状态
    - 验证只保留 foldIconStyle 设置
    - _Requirements: 3.4_
  - [ ] 4.2 审查 editor-settings.interface.ts 确保无编辑器类型选择类型
    - _Requirements: 3.5_

- [ ] 5. 验证 package.json 依赖
  - [ ] 5.1 确认 apps/desktop/package.json 无 Monaco 相关依赖
    - 验证无 @monaco-editor/react
    - 验证无 monaco-editor
    - _Requirements: 2.3_

- [ ] 6. 验证后备编辑器包完整性
  - [ ] 6.1 确认 packages/editor-monaco 目录存在且完整
    - _Requirements: 4.1_
  - [ ] 6.2 确认 packages/editor-tiptap 目录存在且完整
    - _Requirements: 4.2_
  - [ ] 6.3 确认 packages/editor-codemirror 目录存在且完整
    - _Requirements: 4.3_
  - [ ] 6.4 确认 packages/editor-lexical 目录存在且完整
    - _Requirements: 4.4_

- [ ] 7. 验证 Editor Core 接口完整性
  - [ ] 7.1 审查 packages/editor-core/src/types/document.interface.ts
    - 验证 DocumentEditorAdapter 接口定义完整
    - _Requirements: 5.1_
  - [ ] 7.2 审查 packages/editor-core/src/types/code.interface.ts
    - 验证 CodeEditorAdapter 接口定义完整
    - _Requirements: 5.2_
  - [ ] 7.3 审查 packages/editor-core/src/types/diagram.interface.ts
    - 验证 DiagramEditorAdapter 接口定义完整
    - _Requirements: 5.3_
  - [ ] 7.4 审查 packages/editor-core/src/types/file-type.interface.ts
    - 验证 FileTypeMapping 导出
    - _Requirements: 5.4_
  - [ ] 7.5 审查 packages/editor-core/src/utils/content-converter.ts
    - 验证内容转换工具函数
    - _Requirements: 5.5_

- [ ] 8. 验证文件创建流程
  - [ ] 8.1 审查 ActivityBar 文件创建相关 actions
    - 验证新建文件使用正确的编辑器类型
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 9. Checkpoint - 运行测试验证
  - 运行 `bun run test` 确保所有测试通过
  - 运行 `bun run check` 确保类型检查通过
  - 如有问题，询问用户

- [ ] 10. 清理残留引用（如有）
  - [ ] 10.1 搜索并移除任何对 @grain/editor-monaco 的引用
    - _Requirements: 2.1, 2.2_
  - [ ] 10.2 搜索并移除任何对 @monaco-editor/react 的引用
    - _Requirements: 2.1_

- [ ] 11. Final Checkpoint - 构建验证
  - 运行 `bun run build` 确保构建成功
  - 确保无 Monaco 相关代码被打包
  - 如有问题，询问用户

## Notes

- 所有任务都必须执行，确保全面验证
- 每个任务引用具体的需求以便追溯
- Checkpoint 任务用于增量验证
- 属性测试验证通用正确性属性
