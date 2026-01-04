# Implementation Plan: Editor Refactoring

## Overview

本实现计划将 Grain 编辑器包重构为可插拔架构，支持 Lexical、Tiptap、Monaco、CodeMirror 四种编辑器实现，并建立统一的接口层和文件类型匹配机制。

## Tasks

- [x] 1. 创建 editor-core 包
  - [x] 1.1 初始化 `packages/editor-core` 包结构
    - 创建 package.json、tsconfig.json、vite.config.ts
    - 配置 peerDependencies: react, react-dom
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 实现编辑器接口定义
    - 创建 `src/types/document.interface.ts` - DocumentEditorAdapter
    - 创建 `src/types/code.interface.ts` - CodeEditorAdapter
    - 创建 `src/types/diagram.interface.ts` - DiagramEditorAdapter
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.3 实现内容序列化类型
    - 创建 `src/types/content.interface.ts` - SerializedContent
    - 实现 createJsonContent, createMarkdownContent, createHtmlContent
    - _Requirements: 1.6_

  - [x] 1.4 实现文件类型解析器
    - 创建 `src/types/file-type.interface.ts` - FileTypeResolver
    - 实现 FILE_TYPE_MAPPINGS 配置
    - 实现 resolveFileType, getEditorType 函数
    - _Requirements: 1.8, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 1.5 实现编辑器配置类型
    - 创建 `src/types/config.interface.ts` - EditorConfig
    - 定义 DocumentEditorType, CodeEditorType, DiagramEditorType
    - _Requirements: 1.7_

  - [x] 1.6 实现 EditorProvider 组件
    - 创建 `src/components/editor-provider.tsx`
    - 实现 EditorConfigContext 和 useEditorConfig hook
    - _Requirements: 8.1_

  - [x] 1.7 创建包导出入口
    - 创建 `src/index.ts` 统一导出所有类型和组件
    - 配置 package.json exports

- [ ] 2. Checkpoint - 确保 editor-core 编译通过
  - 运行 `bun run build` 验证包构建
  - 确保所有类型导出正确

- [ ] 3. 重命名 editor 包为 editor-lexical
  - [ ] 3.1 重命名包目录和更新 package.json
    - 将 `packages/editor` 重命名为 `packages/editor-lexical`
    - 更新 package.json 中的 name 为 `@grain/editor-lexical`
    - 添加 `@grain/editor-core` 为 peerDependency
    - _Requirements: 2.1_

  - [ ] 3.2 重组 Lexical 包目录结构
    - 创建 `src/document/` 目录，移动富文本相关代码
    - 创建 `src/code/` 目录，移动代码编辑相关代码
    - 创建 `src/diagram/` 目录，创建图表编辑组件
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 3.3 实现 LexicalDocumentEditor 适配器
    - 创建 `src/document/lexical-document-adapter.ts`
    - 实现 DocumentEditorAdapter 接口
    - 保留现有 mentions, tags, wiki links 功能
    - _Requirements: 3.1, 3.4, 3.5_

  - [ ] 3.4 实现 LexicalCodeEditor 适配器
    - 创建 `src/code/lexical-code-adapter.ts`
    - 实现 CodeEditorAdapter 接口
    - 使用 @lexical/code 提供代码高亮
    - _Requirements: 3.2_

  - [ ] 3.5 实现 LexicalDiagramEditor 适配器
    - 创建 `src/diagram/lexical-diagram-adapter.ts`
    - 实现 DiagramEditorAdapter 接口
    - 集成 Mermaid 预览
    - _Requirements: 3.3_

  - [ ] 3.6 配置 subpath exports
    - 更新 package.json exports 支持 `/document`, `/code`, `/diagram`
    - _Requirements: 3.6_

- [ ] 4. 重命名 code-editor 包为 editor-monaco
  - [ ] 4.1 重命名包目录和更新 package.json
    - 将 `packages/code-editor` 重命名为 `packages/editor-monaco`
    - 更新 package.json 中的 name 为 `@grain/editor-monaco`
    - 添加 `@grain/editor-core` 为 peerDependency
    - _Requirements: 2.2_

  - [ ] 4.2 重组 Monaco 包目录结构
    - 创建 `src/document/` 目录，实现 Markdown 分屏预览
    - 创建 `src/code/` 目录，移动现有代码编辑器
    - 创建 `src/diagram/` 目录，移动图表编辑器（从 diagram-editor 包）
    - _Requirements: 5.1, 5.4, 5.7_

  - [ ] 4.3 实现 MonacoDocumentEditor 适配器
    - 创建 `src/document/monaco-document-adapter.ts`
    - 实现 MarkdownDocumentEditorAdapter 接口
    - 实现 Markdown 实时预览和同步滚动
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 4.4 实现 MonacoCodeEditor 适配器
    - 创建 `src/code/monaco-code-adapter.ts`
    - 实现 CodeEditorAdapter 接口
    - _Requirements: 5.4, 5.5, 5.6_

  - [ ] 4.5 实现 MonacoDiagramEditor 适配器
    - 创建 `src/diagram/monaco-diagram-adapter.ts`
    - 实现 DiagramEditorAdapter 接口
    - 迁移 diagram-editor 包的功能
    - _Requirements: 5.7_

  - [ ] 4.6 配置 subpath exports
    - 更新 package.json exports 支持 `/document`, `/code`, `/diagram`
    - _Requirements: 5.9_

- [ ] 5. Checkpoint - 确保 Lexical 和 Monaco 包编译通过
  - 运行 `bun run build` 验证包构建
  - 确保所有导出正确

- [ ] 6. 创建 editor-tiptap 包
  - [ ] 6.1 初始化 `packages/editor-tiptap` 包结构
    - 创建 package.json、tsconfig.json、vite.config.ts
    - 配置 peerDependencies: @tiptap/core, @tiptap/react, @tiptap/starter-kit
    - _Requirements: 2.4_

  - [ ] 6.2 实现 TiptapDocumentEditor 组件
    - 创建 `src/document/tiptap-document-editor.tsx`
    - 配置 StarterKit 扩展
    - 实现富文本格式化功能
    - _Requirements: 4.1, 4.2_

  - [ ] 6.3 实现 TiptapDocumentAdapter
    - 创建 `src/document/tiptap-document-adapter.ts`
    - 实现 DocumentEditorAdapter 接口
    - _Requirements: 4.1, 4.7_

  - [ ] 6.4 配置 Tiptap 表格扩展
    - 安装 @tiptap/extension-table
    - 实现 insertTable 功能
    - _Requirements: 4.3_

  - [ ] 6.5 配置 Markdown 快捷键
    - 配置 markdown shortcuts
    - _Requirements: 4.4_

  - [ ] 6.6 实现 TiptapCodeEditor 组件
    - 创建 `src/code/tiptap-code-editor.tsx`
    - 使用 @tiptap/extension-code-block-lowlight
    - _Requirements: 4.5_

  - [ ] 6.7 实现 TiptapDiagramEditor 组件
    - 创建 `src/diagram/tiptap-diagram-editor.tsx`
    - 集成 Mermaid 预览
    - _Requirements: 4.6_

  - [ ] 6.8 配置 subpath exports
    - 更新 package.json exports
    - _Requirements: 4.9_

- [ ] 7. 创建 editor-codemirror 包
  - [ ] 7.1 初始化 `packages/editor-codemirror` 包结构
    - 创建 package.json、tsconfig.json、vite.config.ts
    - 配置 peerDependencies: @codemirror/state, @codemirror/view, etc.
    - _Requirements: 2.5_

  - [ ] 7.2 实现 CodeMirrorDocumentEditor 组件
    - 创建 `src/document/codemirror-document-editor.tsx`
    - 实现 Markdown 编辑 + 实时预览
    - _Requirements: 6.1, 6.2_

  - [ ] 7.3 实现 CodeMirrorCodeEditor 组件
    - 创建 `src/code/codemirror-code-editor.tsx`
    - 配置语言支持包
    - _Requirements: 6.3, 6.4_

  - [ ] 7.4 实现 CodeMirrorDiagramEditor 组件
    - 创建 `src/diagram/codemirror-diagram-editor.tsx`
    - 集成 Mermaid 预览
    - _Requirements: 6.5_

  - [ ] 7.5 配置 subpath exports
    - 更新 package.json exports
    - _Requirements: 6.7_

- [ ] 8. Checkpoint - 确保所有编辑器包编译通过
  - 运行 `bun run build` 验证所有包构建
  - 确保所有导出正确

- [ ] 9. 更新 apps/desktop 导入路径
  - [ ] 9.1 更新 @grain/editor 导入为 @grain/editor-lexical
    - 搜索并替换所有 `@grain/editor` 导入
    - 更新为对应的 subpath 导入
    - _Requirements: 2.6_

  - [ ] 9.2 更新 @grain/code-editor 导入为 @grain/editor-monaco
    - 搜索并替换所有 `@grain/code-editor` 导入
    - _Requirements: 2.6_

  - [ ] 9.3 更新 @grain/diagram-editor 导入
    - 将 diagram-editor 导入迁移到 editor-monaco/diagram
    - _Requirements: 2.8_

  - [ ] 9.4 更新 package.json 依赖
    - 更新 apps/desktop/package.json 中的依赖名称
    - 添加新包依赖
    - _Requirements: 2.6_

- [ ] 10. 实现编辑器切换机制
  - [ ] 10.1 创建 EditorSelector 组件
    - 根据 EditorConfig 动态加载对应编辑器
    - 实现懒加载以优化包大小
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 10.2 实现内容转换工具
    - 创建 content-converter.ts
    - 实现不同编辑器格式之间的转换
    - _Requirements: 8.6_

  - [ ] 10.3 创建编辑器设置 UI
    - 在设置页面添加编辑器选择选项
    - 支持为 document/code/diagram 分别选择编辑器
    - _Requirements: 8.7, 7.7_

- [ ] 11. 删除旧包
  - [ ] 11.1 删除 diagram-editor 包
    - 确认功能已迁移到 editor-monaco
    - 删除 `packages/diagram-editor` 目录
    - _Requirements: 2.8_

  - [ ] 11.2 更新 workspace 配置
    - 更新根 package.json 的 workspaces 配置
    - 更新 turbo.json 配置
    - _Requirements: 2.7_

- [ ] 12. Checkpoint - 确保应用正常运行
  - 运行 `bun run desktop:dev` 验证应用启动
  - 测试各编辑器功能正常

- [ ] 13. 向后兼容处理
  - [ ] 13.1 验证现有内容加载
    - 测试现有 .grain 文件能正常打开
    - 测试现有内容格式兼容性
    - _Requirements: 9.1, 9.2_

  - [ ] 13.2 添加内容迁移工具（如需要）
    - 如果发现格式不兼容，实现迁移工具
    - _Requirements: 9.3_

  - [ ] 13.3 添加废弃警告
    - 为旧导入路径添加 console.warn
    - _Requirements: 9.4_

- [ ] 14. Final Checkpoint - 完整功能验证
  - 验证所有编辑器类型正常工作
  - 验证文件类型匹配正确
  - 验证编辑器切换功能
  - 确保所有测试通过

## Notes

- 任务按顺序执行，每个 Checkpoint 确保阶段性成果可用
- 优先完成 editor-core 和包重命名，再添加新编辑器实现
- Tiptap 和 CodeMirror 是新增包，可以并行开发
- 保持向后兼容是关键，确保现有用户数据不丢失
