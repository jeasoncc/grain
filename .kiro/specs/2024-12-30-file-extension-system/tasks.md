# Implementation Plan: 文件后缀名系统

## Overview

实现扩展名驱动的编辑器选择机制，为所有文件类型添加后缀名。

## Tasks

- [x] 1. 创建扩展名映射函数
  - [x] 1.1 创建 fn/editor/editor-extension.const.ts
    - 定义 EditorType 类型
    - 定义 FILE_EXTENSIONS 常量
    - 定义 NODE_TYPE_EXTENSION_MAP 映射
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 1.2 创建 fn/editor/get-editor-type.fn.ts
    - 实现 getEditorTypeByFilename 纯函数
    - 处理已知扩展名映射
    - 处理未知扩展名 fallback 到 "code"
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [x] 1.3 创建 fn/editor/get-monaco-language.fn.ts
    - 实现 getMonacoLanguage 纯函数
    - 处理所有代码扩展名映射
    - 处理未知扩展名 fallback 到 "plaintext"
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12_
  - [x] 1.4 创建 fn/editor/index.ts 导出
    - 导出所有扩展名相关函数和常量
    - _Requirements: 2.1, 5.1_

- [x] 2. 更新模板配置添加扩展名
  - [x] 2.1 更新 date-template.factory.ts 的 generateTitle 添加扩展名
    - 导入 NODE_TYPE_TO_EXTENSION_MAP
    - 根据 fileType 自动添加对应扩展名
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 2.2 更新 excalidraw.config.ts 的 generateTitle 添加 .excalidraw 扩展名
    - _Requirements: 3.6_
  - [x] 2.3 mermaid.config.ts 和 plantuml.config.ts 自动通过工厂函数获得扩展名
    - _Requirements: 3.7, 3.8_

- [x] 3. Checkpoint - 验证文件创建
  - 创建各类型文件，验证标题包含正确扩展名
  - 验证文件树显示完整文件名
  - 如有问题，询问用户

- [x] 4. 更新编辑器选择逻辑
  - [x] 4.1 更新 StoryWorkspaceContainer 使用 getEditorTypeByFilename
    - 根据文件名扩展名选择编辑器
    - 替换基于 NodeType 的编辑器选择
    - _Requirements: 4.1_
  - [x] 4.2 验证文件重命名后编辑器切换
    - 测试 .grain → .md 切换到 code 编辑器
    - 测试 .js → .ts 保持 code 编辑器
    - _Requirements: 4.2, 4.3_

- [x] 5. 单元测试（可选，已跳过）
  - [ ]* 5.1 编写 get-editor-type.fn.test.ts
    - **Property 1: Extension to Editor Type Mapping**
    - **Property 2: Unknown Extension Fallback**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**
  - [ ]* 5.2 编写 get-monaco-language.fn.test.ts
    - **Property 4: Monaco Language Detection**
    - **Validates: Requirements 5.2-5.12**

- [x] 6. Final Checkpoint - 确保所有测试通过
  - 运行诊断检查确保类型检查通过 ✅
  - 如有问题，询问用户

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 扩展名映射函数是纯函数，易于测试
- 模板配置更新需要检查每个配置文件是否存在
- 编辑器选择逻辑的更新是关键变更点
