# Implementation Plan: ActivityBar Diary/Wiki Integration

## Overview

本任务列表描述将 Diary 和 Wiki 创建功能集成到 ActivityBar 组件的实现步骤，并修复 Ledger 文件夹结构问题。

## Tasks

- [-] 1. 修复 Ledger 文件夹结构
  - [x] 1.1 修改 `ledger.config.ts` 使用 `getDateFolderStructure`
    - 将 `import { getLedgerFolderStructure } from "@/fn/ledger"` 改为 `import { getDateFolderStructure } from "@/fn/date"`
    - 修改 `generateLedgerFolderPath` 函数使用 `getDateFolderStructure`
    - 删除 `getLedgerFolderStructure`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ]* 1.2 更新 Ledger 配置测试
    - 更新 `create-ledger.action.test.ts` 验证新的文件夹结构
    - 验证年份文件夹包含生肖
    - **Property 6: Ledger folder structure matches Diary format**
    - **Validates: Requirements 5.1, 5.2, 5.4**

- [-] 2. 集成 Diary 创建功能
  - [-] 2.1 修改 `activity-bar.container.fn.tsx` 中的 `handleCreateDiary`
    - 导入 `createDiaryCompatAsync` from `@/actions/templated`
    - 实现与 `handleCreateLedger` 相同的模式
    - 调用 `openTab` 打开新创建的文件
    - 显示成功/失败 toast
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [ ]* 2.2 添加 Diary 创建单元测试
    - 测试 `handleCreateDiary` 调用正确的函数
    - 测试成功后调用 `openTab`
    - 测试错误处理
    - **Property 1: Diary creation triggers correct function call**
    - **Property 3: Successful creation opens file in EditorTabs**
    - **Validates: Requirements 1.1, 1.2**

- [ ] 3. 创建 Wiki 标题对话框组件
  - [ ] 3.1 创建 `wiki-title-dialog.tsx` 组件
    - 创建 `components/wiki-title-dialog/wiki-title-dialog.tsx`
    - 实现 `WikiTitleDialogProps` 接口
    - 实现输入框、确认按钮、取消按钮
    - 实现 Enter 键提交
    - 实现空标题验证
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [ ]* 3.2 添加 Wiki 对话框单元测试
    - 测试输入框实时更新
    - 测试 Enter 键提交
    - 测试空标题验证
    - 测试取消按钮
    - **Property 4: Wiki dialog input updates in real-time**
    - **Property 5: Wiki dialog confirm triggers creation with non-empty title**
    - **Validates: Requirements 3.2, 3.4**

- [ ] 4. 集成 Wiki 创建功能
  - [ ] 4.1 修改 `activity-bar.container.fn.tsx` 中的 `handleCreateWiki`
    - 添加 `wikiDialogOpen` 状态
    - 修改 `handleCreateWiki` 打开对话框
    - 添加 `handleWikiDialogConfirm` 回调
    - 导入 `createWikiAsync` from `@/actions/templated`
    - 调用 `openTab` 打开新创建的文件
    - 显示成功/失败 toast
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - [ ] 4.2 在 ActivityBar 中渲染 WikiTitleDialog
    - 导入 `WikiTitleDialog` 组件
    - 添加到 JSX 返回值中
    - 传递 `open`、`onOpenChange`、`onConfirm` props
    - _Requirements: 2.1_
  - [ ]* 4.3 添加 Wiki 创建单元测试
    - 测试 `handleCreateWiki` 打开对话框
    - 测试 `handleWikiDialogConfirm` 调用正确的函数
    - 测试成功后调用 `openTab`
    - 测试错误处理
    - **Property 2: Wiki creation triggers correct function call with user input**
    - **Property 3: Successful creation opens file in EditorTabs**
    - **Validates: Requirements 2.2, 2.3**

- [ ] 5. Checkpoint - 验证功能实现
  - 运行 `bun run check` 确保无类型错误
  - 运行 `bun run lint` 确保无 lint 错误
  - 运行 `bun run test` 确保测试通过
  - 手动测试 Diary、Wiki、Ledger 创建功能
  - 确认文件夹结构正确（带生肖年份）

- [ ] 6. 运行 E2E 测试验证
  - [ ] 6.1 运行 Diary E2E 测试
    - 执行 `bun run e2e:diary`
    - 验证 "Diary Folder Structure Created" 通过
    - 验证 "Diary File Appears in File Tree" 通过
    - _Requirements: 7.1, 7.2_
  - [ ] 6.2 运行 Wiki E2E 测试
    - 执行 `bun run e2e:wiki`
    - 验证 "Wiki Folder Structure Created" 通过
    - 验证 "Wiki File Appears in File Tree" 通过
    - _Requirements: 7.3, 7.4_
  - [ ] 6.3 运行 Ledger E2E 测试
    - 执行 `bun run e2e:ledger`
    - 验证 "Ledger Folder Structure Created" 通过（带生肖年份）
    - _Requirements: 7.5_
  - [ ] 6.4 运行全部 E2E 测试
    - 执行 `bun run e2e`
    - 验证通过率高于 61.3%
    - _Requirements: 7.6_

- [ ] 7. Final Checkpoint - 确保所有测试通过
  - 确保所有单元测试通过
  - 确保所有 E2E 测试通过
  - 如有问题，询问用户

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
