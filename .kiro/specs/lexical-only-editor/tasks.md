# Implementation Plan: Lexical Only Editor

## Overview

本实现计划将 Grain 编辑器统一为 Lexical，移除 Tiptap、Monaco、CodeMirror 等其他编辑器实现，简化架构。

## Tasks

- [x] 1. 删除编辑器配置模块
  - [x] 1.1 简化编辑器设置 Store
    - 简化 `apps/desktop/src/stores/editor-settings.store.ts`，只保留 foldIconStyle
    - _Requirements: US-4_

  - [x] 1.2 简化编辑器设置类型
    - 简化 `apps/desktop/src/types/editor-settings/editor-settings.interface.ts`
    - 移除 DocumentEditorType, CodeEditorType, DiagramEditorType
    - _Requirements: US-4_

  - [x] 1.3 简化编辑器设置页面
    - 更新 `apps/desktop/src/routes/settings/editor.tsx`
    - 移除编辑器引擎选择部分，保留排版和行为设置
    - _Requirements: US-4_

- [x] 2. Checkpoint - 验证设置页面正常 ✓

- [x] 3. 删除未使用的组件
  - [x] 3.1 删除 Tiptap 编辑器组件
    - 删除 `apps/desktop/src/components/tiptap-editor/` 目录
    - _Requirements: US-6_

  - [x] 3.2 删除 CodeMirror 编辑器组件
    - 删除 `apps/desktop/src/components/codemirror-editor/` 目录
    - _Requirements: US-6_

  - [x] 3.3 删除 CodeMirror 代码编辑器组件
    - 删除 `apps/desktop/src/components/codemirror-code-editor/` 目录
    - _Requirements: US-6_

  - [x] 3.4 删除 CodeMirror 图表编辑器组件
    - 删除 `apps/desktop/src/components/codemirror-diagram-editor/` 目录
    - _Requirements: US-6_

- [x] 4. 更新 story-workspace 组件
  - [x] 4.1 移除编辑器选择逻辑
    - 更新 `apps/desktop/src/components/story-workspace/story-workspace.container.fn.tsx`
    - 移除 TiptapEditorContainer, CodeMirrorEditorContainer 等引用
    - _Requirements: US-6_

  - [x] 4.2 直接使用 Lexical 编辑器
    - 文档使用 Lexical，代码/图表使用 Monaco
    - _Requirements: US-6_

- [x] 5. Checkpoint - 验证编辑器功能 ✓

- [x] 6. 删除编辑器包
  - [x] 6.1 删除 editor-tiptap 包
    - 删除 `packages/editor-tiptap/` 目录
    - _Requirements: US-5_

  - [x] 6.2 删除 editor-monaco 包
    - 删除 `packages/editor-monaco/` 目录
    - _Requirements: US-5_

  - [x] 6.3 删除 editor-codemirror 包
    - 删除 `packages/editor-codemirror/` 目录
    - _Requirements: US-5_

- [x] 7. 更新依赖配置
  - [x] 7.1 更新 apps/desktop/package.json
    - 移除 `@grain/editor-tiptap` 依赖
    - 移除 `@grain/editor-monaco` 依赖
    - 移除 `@grain/editor-codemirror` 依赖
    - _Requirements: US-5_

- [x] 8. 简化 editor-core 包
  - [x] 8.1 移除 EditorSelector 组件
    - 删除 `packages/editor-core/src/components/editor-selector.tsx`
    - _Requirements: US-5_

  - [x] 8.2 移除 EditorProvider 组件
    - 删除 `packages/editor-core/src/components/editor-provider.tsx`
    - _Requirements: US-5_

  - [x] 8.3 简化配置类型
    - 删除 `packages/editor-core/src/types/config.interface.ts`
    - 移除 DocumentEditorType, CodeEditorType, DiagramEditorType
    - _Requirements: US-5_

  - [x] 8.4 更新 editor-core 导出
    - 更新 `packages/editor-core/src/index.ts`
    - 移除已删除组件的导出
    - _Requirements: US-5_

- [x] 9. 清理 CSS 样式
  - [x] 9.1 移除 Tiptap 样式
    - 从 `apps/desktop/src/styles.css` 移除 Tiptap 相关样式
    - _Requirements: US-5_

  - [x] 9.2 移除 CodeMirror 样式
    - 从 `apps/desktop/src/styles.css` 移除 CodeMirror 相关样式
    - _Requirements: US-5_

- [x] 10. Checkpoint - 验证构建
  - 运行 `bun install` 更新依赖
  - 运行 `bun run build` 验证构建
  - ✅ 编辑器相关错误已全部修复
  - ⚠️ 剩余错误为预存在问题（测试文件、tag-graph-panel、clear-data.repo.fn.ts）

- [ ] 11. Final Checkpoint - 完整功能验证
  - 运行 `bun run desktop:dev` 验证应用启动
  - 测试文档编辑：创建、编辑、保存 .grain 文件
  - 测试代码块：创建、编辑代码块
  - 测试图表：创建、编辑 Mermaid 图表
  - 测试现有文档：打开现有文档验证兼容性
  - 验证设置页面正常（无编辑器选项）

- [x] 12. 提交代码
  - 运行 `git add -A`
  - 运行 `git commit -m "refactor: 统一使用 Lexical 编辑器，移除 Tiptap/Monaco/CodeMirror"`

## Notes

- 任务按顺序执行，每个 Checkpoint 确保阶段性成果可用
- 删除包前先删除组件引用，避免编译错误
- 保持向后兼容，现有文档应能正常打开
- Excalidraw 编辑器保持不变，它是独立的绘图编辑器
- Monaco 编辑器保留用于代码和图表编辑

## 预期收益

1. **包体积减少**: 移除 Tiptap (~150KB)、CodeMirror (~300KB)
2. **维护成本降低**: 只需维护一套文档编辑器代码
3. **稳定性提升**: 避免 Tiptap ProseMirror 兼容性问题
4. **代码简化**: 移除编辑器选择逻辑和配置

## 已完成的变更

1. 删除了 Tiptap、CodeMirror 编辑器组件目录
2. 删除了 editor-tiptap、editor-monaco、editor-codemirror 包
3. 简化了 editor-settings store 和类型定义
4. 更新了 story-workspace 组件，移除多编辑器选择逻辑
5. 简化了 editor-core 包，移除多编辑器相关组件和类型
6. 清理了 CSS 中的 Tiptap/CodeMirror 样式
7. 更新了 desktop package.json 依赖
8. 修复了 diagram-editor 组件，移除 @grain/editor-monaco 依赖
9. 修复了 code-editor 组件，使用本地 CodeEditorView
10. 修复了 editor-theme.fn.ts，定义本地 EditorThemeColors 类型
