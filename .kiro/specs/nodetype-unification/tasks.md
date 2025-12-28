# Implementation Plan: NodeType Unification

## Overview

统一 NodeType 类型定义，确保所有模板化文件类型都有对应的 NodeType 枚举值。从 Zod Schema 推断类型，确保单一来源。

## Tasks

- [ ] 1. 更新 NodeType 定义（单一来源）
  - [ ] 1.1 更新 `node.schema.ts` 中的 NodeTypeSchema
    - 添加新类型：wiki, todo, note, ledger, plantuml, mermaid
    - 保留现有类型：folder, file, diary, drawing
    - 移除废弃类型：canvas（如果存在）
    - _Requirements: 1.1, 1.3_

  - [ ] 1.2 更新 `node.interface.ts` 从 schema 导入 NodeType
    - 从 `node.schema.ts` 导入 NodeType 类型
    - 添加 FileNodeType 类型定义
    - 删除重复的 NodeType 定义
    - _Requirements: 4.3_

  - [ ] 1.3 更新 `node/index.ts` 导出
    - 确保 NodeType 和 FileNodeType 正确导出
    - _Requirements: 4.3_

- [ ] 2. 更新模板配置文件
  - [ ] 2.1 更新 `wiki.config.ts` 使用 `"wiki"` 作为 fileType
    - _Requirements: 2.1_

  - [ ] 2.2 更新 `todo.config.ts` 使用 `"todo"` 作为 fileType
    - _Requirements: 2.2_

  - [ ] 2.3 更新 `note.config.ts` 使用 `"note"` 作为 fileType
    - _Requirements: 2.3_

  - [ ] 2.4 更新 `ledger.config.ts` 使用 `"ledger"` 作为 fileType
    - _Requirements: 2.4_

  - [ ] 2.5 更新 `date-template.factory.ts` 使用 FileNodeType
    - 将 `Exclude<NodeType, "folder">` 替换为 `FileNodeType`
    - _Requirements: 4.1_

- [ ] 3. 清理废弃代码
  - [ ] 3.1 更新 `db/schema.ts` 中的 NodeType 定义
    - 从 `@/types/node` 导入 NodeType
    - 删除重复的类型定义
    - 添加废弃注释指向新位置
    - _Requirements: 3.1_

- [ ] 4. Checkpoint - 类型检查
  - 运行 `bun run check` 确保没有类型错误
  - 确保所有导入正确解析
  - 如有问题，询问用户

- [ ]* 5. 编写测试
  - [ ]* 5.1 编写 NodeType 定义测试
    - 验证 NodeTypeSchema 包含所有预期值
    - 验证 FileNodeType 排除 folder
    - **Property 2: FileNodeType Excludes Folder**
    - **Validates: Requirements 4.1**

  - [ ]* 5.2 编写模板配置测试
    - 验证每个配置的 fileType 正确
    - **Property 1: Template Config FileType Consistency**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

- [ ] 6. Final Checkpoint
  - 运行 `bun run check` 确保类型检查通过
  - 运行 `bun run test` 确保测试通过
  - 如有问题，询问用户

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- NodeType 从 Zod Schema 推断，确保运行时和编译时类型一致
- 现有数据库中的 `"file"` 类型节点保持不变，向后兼容
- `"canvas"` 类型在运行时映射为 `"drawing"` 处理
