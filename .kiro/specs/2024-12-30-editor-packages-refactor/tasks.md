# Implementation Plan: 编辑器包重构 + 新增 Code 类型

## Overview

将编辑器迁移到 packages 目录，并新增 Code 类型支持代码编辑。依赖 Spec 1（统一保存逻辑）和 Spec 2（文件后缀名系统）。

## Tasks

- [ ] 1. 新增 Code NodeType
  - [ ] 1.1 更新 node.schema.ts 添加 "code" 到 NodeTypeSchema
    - 在 z.enum 数组中添加 "code"
    - 更新类型说明注释
    - _Requirements: 2.1_
  - [ ] 1.2 运行类型检查确保 TabType 自动包含 code
    - 执行 `bun run check`
    - 验证 TabType 包含 "code"
    - _Requirements: 2.4_

- [ ] 2. 创建 Code 模板配置
  - [ ] 2.1 创建 actions/templated/code.config.ts
    - 定义 CodeTemplateParams 接口
    - 定义 codeParamsSchema
    - 实现 codeConfig 配置
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ] 2.2 创建 createCode action
    - 使用 createTemplatedFile 高阶函数
    - 导出 createCode 和 createCodeAsync
    - _Requirements: 3.3, 3.4, 3.5_
  - [ ] 2.3 更新 actions/templated/index.ts 导出
    - 导出 codeConfig
    - 导出 createCode 相关函数
    - _Requirements: 4.1_

- [ ] 3. Checkpoint - 验证 Code 模板
  - 测试 createCode action 生成正确的文件结构
  - 验证文件名包含 .js 扩展名
  - 验证初始内容包含注释
  - 如有问题，询问用户

- [ ] 4. 创建 CodeEditor 包
  - [ ] 4.1 创建 packages/code-editor 目录结构
    - 创建 package.json
    - 创建 tsconfig.json
    - 创建 src/index.ts
    - _Requirements: 1.3_
  - [ ] 4.2 创建 code-editor.view.fn.tsx
    - 实现 CodeEditorView 组件
    - 使用 @monaco-editor/react
    - 支持 Ctrl+S 快捷键
    - _Requirements: 5.1, 5.4_
  - [ ] 4.3 创建 code-editor.types.ts
    - 定义 CodeEditorViewProps
    - _Requirements: 1.4_
  - [ ] 4.4 更新 apps/desktop package.json 添加依赖
    - 添加 @grain/code-editor 依赖
    - _Requirements: 1.6_

- [ ] 5. 创建 CodeEditorContainer
  - [ ] 5.1 创建 apps/desktop/src/components/code-editor 目录
    - 创建 code-editor.container.fn.tsx
    - 创建 code-editor.types.ts
    - 创建 index.ts
    - _Requirements: 5.5_
  - [ ] 5.2 实现 CodeEditorContainer
    - 使用 useEditorSave hook
    - 使用 getMonacoLanguage 检测语言
    - 连接 CodeEditorView
    - _Requirements: 5.2, 5.3, 5.5_

- [ ] 6. 集成 CodeEditor 到 StoryWorkspace
  - [ ] 6.1 更新 StoryWorkspaceContainer 支持 code 类型
    - 添加 isCodeTab 判断
    - 渲染 CodeEditorContainer
    - _Requirements: 2.3_
  - [ ] 6.2 更新编辑器选择逻辑使用扩展名
    - 使用 getEditorTypeByFilename 替代 NodeType 判断
    - _Requirements: 5.2_

- [ ] 7. 添加 ActivityBar Code 按钮
  - [ ] 7.1 在 ActivityBar 添加 Code 按钮
    - 使用 Code icon (lucide-react)
    - 添加 tooltip "Create Code File"
    - _Requirements: 3.1_
  - [ ] 7.2 实现 handleCreateCode 处理器
    - 调用 createCodeAsync action
    - 打开新创建的文件
    - _Requirements: 3.2_

- [ ] 8. Checkpoint - 验证 Code 功能
  - 点击 ActivityBar Code 按钮创建文件
  - 验证文件在正确位置
  - 验证 CodeEditor 正常显示
  - 验证语法高亮正常
  - 验证保存功能正常
  - 如有问题，询问用户

- [x] 9. 迁移 DiagramEditor 到 packages（可选）
  - [x] 9.1 创建 packages/diagram-editor 目录结构
    - _Requirements: 1.1_
  - [x] 9.2 迁移 DiagramEditorView 组件
    - _Requirements: 1.4_
  - [x] 9.3 更新 apps/desktop 导入路径
    - _Requirements: 1.6_

- [x] 10. 迁移 ExcalidrawEditor 到 packages（可选）
  - [x] 10.1 创建 packages/excalidraw-editor 目录结构
    - _Requirements: 1.2_
  - [x] 10.2 迁移 ExcalidrawEditorView 组件
    - _Requirements: 1.4_
  - [x] 10.3 更新 apps/desktop 导入路径
    - _Requirements: 1.6_

- [ ] 11. 属性测试
  - [ ] 11.1 编写 code.config.test.ts
    - **Property 1: Code Template Generation**
    - **Validates: Requirements 3.3, 3.4, 3.5**

- [ ] 12. Final Checkpoint - 确保所有测试通过
  - 运行 `bun run test` 确保所有测试通过
  - 运行 `bun run check` 确保类型检查通过
  - 如有问题，询问用户

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 此 Spec 依赖 Spec 1（统一保存逻辑）和 Spec 2（文件后缀名系统）
- DiagramEditor 和 ExcalidrawEditor 的迁移标记为可选，可以后续再做
- CodeEditor 是核心功能，必须完成
- Monaco 编辑器已在 DiagramEditor 中使用，可以复用配置
