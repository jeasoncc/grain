# Implementation Plan: Lexical Only Editor

## Overview

本实现计划将 Grain 编辑器统一为 Lexical，移除 Tiptap、Monaco、CodeMirror 等其他编辑器实现，简化架构。

## Tasks

- [ ] 1. 删除编辑器配置模块
  - [ ] 1.1 删除编辑器设置 Store
    - 删除 `apps/desktop/src/stores/editor-settings.store.ts`
    - 更新 `apps/desktop/src/stores/index.ts` 移除导出
    - _Requirements: US-4_

  - [ ] 1.2 删除编辑器设置类型
    - 删除 `apps/desktop/src/types/editor-settings/` 目录
    - 更新 `apps/desktop/src/types/index.ts` 移除导出
    - _Requirements: US-4_

  - [ ] 1.3 删除编辑器设置页面
    - 删除 `apps/desktop/src/routes/settings/editor.tsx`
    - 更新设置页面路由配置
    - _Requirements: US-4_

- [ ] 2. Checkpoint - 验证设置页面正常
  - 运行 `bun run desktop:dev` 验证应用启动
  - 确认设置页面不再显示编辑器选项

- [ ] 3. 删除未使用的组件
  - [ ] 3.1 删除 Tiptap 编辑器组件
    - 删除 `apps/desktop/src/components/tiptap-editor/` 目录
    - _Requirements: US-6_

  - [ ] 3.2 删除 CodeMirror 编辑器组件
    - 删除 `apps/desktop/src/components/codemirror-editor/` 目录
    - _Requirements: US-6_

  - [ ] 3.3 删除 CodeMirror 代码编辑器组件
    - 删除 `apps/desktop/src/components/codemirror-code-editor/` 目录
    - _Requirements: US-6_

  - [ ] 3.4 删除 CodeMirror 图表编辑器组件
    - 删除 `apps/desktop/src/components/codemirror-diagram-editor/` 目录
    - _Requirements: US-6_

- [ ] 4. 更新 story-workspace 组件
  - [ ] 4.1 移除编辑器选择逻辑
    - 更新 `apps/desktop/src/components/story-workspace/story-workspace.container.fn.tsx`
    - 移除 `useEditorSettingsStore` 导入和使用
    - 移除编辑器类型判断逻辑
    - _Requirements: US-6_

  - [ ] 4.2 直接使用 Lexical 编辑器
    - 移除 TiptapEditorContainer 引用
    - 移除 CodeMirrorEditorContainer 引用
    - 直接使用 LexicalEditorContainer
    - _Requirements: US-6_

  - [ ] 4.3 简化 renderEditorContent 函数
    - 移除编辑器类型分支
    - 根据文件类型选择 Lexical 模式
    - _Requirements: US-6_

- [ ] 5. Checkpoint - 验证编辑器功能
  - 运行 `bun run desktop:dev` 验证应用启动
  - 测试文档编辑功能
  - 测试代码编辑功能
  - 测试图表编辑功能

- [ ] 6. 删除编辑器包
  - [ ] 6.1 删除 editor-tiptap 包
    - 删除 `packages/editor-tiptap/` 目录
    - _Requirements: US-5_

  - [ ] 6.2 删除 editor-monaco 包
    - 删除 `packages/editor-monaco/` 目录
    - _Requirements: US-5_

  - [ ] 6.3 删除 editor-codemirror 包
    - 删除 `packages/editor-codemirror/` 目录
    - _Requirements: US-5_

- [ ] 7. 更新依赖配置
  - [ ] 7.1 更新根 package.json
    - 移除 `packages/editor-tiptap` 从 workspaces
    - 移除 `packages/editor-monaco` 从 workspaces
    - 移除 `packages/editor-codemirror` 从 workspaces
    - _Requirements: US-5_

  - [ ] 7.2 更新 apps/desktop/package.json
    - 移除 `@grain/editor-tiptap` 依赖
    - 移除 `@grain/editor-monaco` 依赖
    - 移除 `@grain/editor-codemirror` 依赖
    - 移除相关 Tiptap 依赖 (@tiptap/*)
    - 移除相关 Monaco 依赖 (monaco-editor, @monaco-editor/*)
    - 移除相关 CodeMirror 依赖 (@codemirror/*)
    - _Requirements: US-5_

  - [ ] 7.3 更新 turbo.json
    - 移除已删除包的构建配置
    - _Requirements: US-5_

- [ ] 8. Checkpoint - 验证构建
  - 运行 `bun install` 更新依赖
  - 运行 `bun run build` 验证构建
  - 确认无编译错误

- [ ] 9. 简化 editor-core 包
  - [ ] 9.1 移除 EditorSelector 组件
    - 删除或简化 `packages/editor-core/src/components/editor-selector.tsx`
    - _Requirements: US-5_

  - [ ] 9.2 移除 EditorProvider 组件
    - 删除或简化 `packages/editor-core/src/components/editor-provider.tsx`
    - _Requirements: US-5_

  - [ ] 9.3 简化配置类型
    - 更新 `packages/editor-core/src/types/config.interface.ts`
    - 移除 DocumentEditorType, CodeEditorType, DiagramEditorType
    - 移除 EditorConfig 类型
    - _Requirements: US-5_

  - [ ] 9.4 更新 editor-core 导出
    - 更新 `packages/editor-core/src/index.ts`
    - 移除已删除组件的导出
    - _Requirements: US-5_

- [ ] 10. 清理 CSS 样式
  - [ ] 10.1 移除 Tiptap 样式
    - 从 `apps/desktop/src/styles.css` 移除 Tiptap 相关样式
    - _Requirements: US-5_

  - [ ] 10.2 移除 CodeMirror 样式
    - 从 `apps/desktop/src/styles.css` 移除 CodeMirror 相关样式
    - _Requirements: US-5_

- [ ] 11. Final Checkpoint - 完整功能验证
  - 运行 `bun run desktop:dev` 验证应用启动
  - 测试文档编辑：创建、编辑、保存 .grain 文件
  - 测试代码块：创建、编辑代码块
  - 测试图表：创建、编辑 Mermaid 图表
  - 测试现有文档：打开现有文档验证兼容性
  - 验证设置页面正常（无编辑器选项）

- [ ] 12. 提交代码
  - 运行 `git add -A`
  - 运行 `git commit -m "refactor: 统一使用 Lexical 编辑器，移除 Tiptap/Monaco/CodeMirror"`

## Notes

- 任务按顺序执行，每个 Checkpoint 确保阶段性成果可用
- 删除包前先删除组件引用，避免编译错误
- 保持向后兼容，现有文档应能正常打开
- Excalidraw 编辑器保持不变，它是独立的绘图编辑器

## 预期收益

1. **包体积减少**: 移除 Monaco (~2MB)、Tiptap (~150KB)、CodeMirror (~300KB)
2. **维护成本降低**: 只需维护一套编辑器代码
3. **稳定性提升**: 避免 Tiptap ProseMirror 兼容性问题
4. **代码简化**: 移除编辑器选择逻辑和配置
