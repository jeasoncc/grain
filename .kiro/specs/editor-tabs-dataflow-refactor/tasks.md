你# Implementation Plan: Editor Tabs Dataflow Refactor

## Overview

重构编辑器标签页数据流架构，建立单一数据源模式，通过文件操作队列确保操作有序执行。

## Tasks

- [x] 1. 创建文件操作队列
  - [x] 1.1 安装 p-queue 依赖
    - 运行 `bun add p-queue` 安装依赖
    - _Requirements: 2.1, 2.2_
  - [x] 1.2 创建 `lib/file-operation-queue.ts`
    - 创建模块级单例队列实例
    - 设置 concurrency 为 1
    - 导出 getQueueStatus 辅助函数
    - _Requirements: 2.1, 2.2, 2.5, 6.1_
  - [ ]* 1.3 编写队列单元测试
    - 验证 concurrency 配置
    - 验证串行执行行为
    - _Requirements: 2.2_

- [x] 2. 创建统一的文件操作 Actions
  - [x] 2.1 创建 `actions/file/open-file.action.ts`
    - 实现 openFile 函数
    - 通过队列执行
    - 先加载 DB 内容，再更新 Store
    - 处理已打开文件的情况
    - _Requirements: 3.1, 3.2, 5.1, 5.2, 5.3, 5.4, 5.5, 8.2, 8.3, 8.4, 8.6_
  - [ ]* 2.2 编写 openFile 属性测试
    - **Property 1: Open File Operation Order**
    - **Validates: Requirements 1.3, 3.1, 3.2, 5.2, 8.2, 8.3**
  - [x] 2.3 创建 `actions/file/create-file.action.ts`
    - 实现 createFile 函数
    - 通过队列执行
    - 先创建 content，再创建 node，再更新 Store
    - _Requirements: 7.2, 7.3, 7.4, 7.5_
  - [ ]* 2.4 编写 createFile 属性测试
    - **Property 2: Create File Operation Order**
    - **Validates: Requirements 7.2, 7.3, 7.4**
  - [x] 2.5 创建 `actions/file/index.ts` 导出文件
    - 导出 openFile 和 createFile
    - _Requirements: 6.2_

- [x] 3. Checkpoint - 确保队列和 Actions 测试通过
  - 运行测试确保所有测试通过
  - 如有问题请询问用户

- [x] 4. 重构 Editor Tabs Store
  - [x] 4.1 移除 persist 中间件（如果存在）
    - 确保 store 不使用任何持久化
    - 初始状态为空 tabs 数组
    - _Requirements: 1.1, 1.2, 1.4, 4.4_
    - **注意：store 已经没有使用 persist 中间件**
  - [ ]* 4.2 编写 Store 初始状态测试
    - 验证初始 tabs 为空数组
    - 验证不使用 persist
    - _Requirements: 1.1, 1.4_
  - [ ]* 4.3 编写 Property 5 测试：关闭标签清理
    - **Property 5: Cleanup on Tab Close**
    - **Validates: Requirements 4.2, 4.3**

- [x] 5. 重构组件调用方式
  - [x] 5.1 重构 FileTreePanelContainer
    - 使用 openFile action 替代直接调用 store
    - 使用 createFile action 替代 createNode
    - _Requirements: 5.1, 6.5, 7.7, 8.5_
  - [x] 5.2 重构 ActivityBarContainer
    - 使用 openFile action 替代直接调用
    - 更新 handleCreateTemplate 使用新的 action
    - _Requirements: 6.5, 7.7_
  - [x] 5.3 重构 CommandPaletteContainer
    - 使用 openFile action 替代直接调用 store
    - _Requirements: 8.5_

- [x] 6. Checkpoint - 确保组件重构后功能正常
  - 手动测试文件创建和打开功能
  - 如有问题请询问用户

- [x] 7. 重构模板文件创建
  - [x] 7.1 更新 createTemplatedFile 高阶函数
    - 内部使用 createFile action
    - 确保通过队列执行
    - _Requirements: 9.1, 9.2, 9.4, 9.5_
  - [ ]* 7.2 编写 Property 8 测试：模板创建器使用 createFile
    - **Property 8: Template Creators Use Create File Action**
    - **Validates: Requirements 9.5**

- [x] 8. 重构 StoryWorkspaceContainer
  - [x] 8.1 移除内容加载 useEffect
    - 删除 story-workspace.container.fn.tsx 中的内容加载逻辑
    - 内容加载已在 openFile action 中处理
    - _Requirements: 3.1, 3.4_
  - [x] 8.2 移除未使用的 editorInitialState 状态
    - 清理未使用的代码
    - _Requirements: 3.4_
  - [ ]* 8.3 编写 Property 7 测试：内容加载前不渲染
    - **Property 7: No Render Before Content Load**
    - **Validates: Requirements 3.4**

- [ ] 9. 编写集成属性测试
  - [ ]* 9.1 编写 Property 3 测试：队列串行执行
    - **Property 3: Queue Serial Execution**
    - **Validates: Requirements 2.2, 2.3, 2.4, 5.1, 7.5, 8.4**
  - [ ]* 9.2 编写 Property 4 测试：已打开文件跳过重新加载
    - **Property 4: Skip Reload for Existing Tab**
    - **Validates: Requirements 5.5, 8.6**
  - [ ]* 9.3 编写 Property 6 测试：队列 Promise 解析
    - **Property 6: Queue Promise Resolution**
    - **Validates: Requirements 2.6**

- [ ] 10. Final Checkpoint - 确保所有测试通过
  - 运行完整测试套件
  - 手动测试完整流程
  - 如有问题请询问用户

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
