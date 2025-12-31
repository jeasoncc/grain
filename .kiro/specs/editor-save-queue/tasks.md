# Implementation Plan: Editor Save Queue

## Overview

基于 p-queue 实现编辑器保存队列，解决 Tab 切换时的内容丢失问题。

## Tasks

- [x] 1. 安装依赖并创建保存队列服务
  - [x] 1.1 安装 p-queue 依赖
    - 运行 `bun add p-queue` 在 apps/desktop 目录
    - _Requirements: 1.1_
  - [x] 1.2 创建 save-queue.ts 服务文件
    - 创建 `apps/desktop/src/lib/save-queue.ts`
    - 实现 `SaveQueueService` 接口
    - 实现 `createSaveQueueService` 工厂函数
    - 导出单例 `saveQueueService`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [x] 1.3 编写 save-queue 单元测试
    - 创建 `apps/desktop/src/lib/save-queue.test.ts`
    - 测试单例、入队、去重、等待、超时、错误处理
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. 编写属性测试
  - [x] 2.1 Property 1: 单例一致性
    - **Property 1: 单例一致性**
    - **Validates: Requirements 1.1**
  - [x] 2.2 Property 2: 相同 nodeId 去重
    - **Property 2: 相同 nodeId 去重**
    - **Validates: Requirements 1.5**
  - [x] 2.3 Property 3: 顺序执行
    - **Property 3: 顺序执行**
    - **Validates: Requirements 1.6**
  - [x] 2.4 Property 4: waitForSave 行为
    - **Property 4: waitForSave 行为**
    - **Validates: Requirements 3.2, 3.3**
  - [x] 2.5 Property 5: 错误恢复
    - **Property 5: 错误恢复**
    - **Validates: Requirements 5.2, 5.3, 5.4**
  - [x] 2.6 Property 6: 超时保护
    - **Property 6: 超时保护**
    - **Validates: Requirements 6.2, 6.3**
  - [x] 2.7 Property 7: 非阻塞入队
    - **Property 7: 非阻塞入队**
    - **Validates: Requirements 6.1**

- [ ] 3. Checkpoint - 确保队列服务测试通过
  - 运行测试确保所有测试通过
  - 如有问题，询问用户

- [ ] 4. 修改 useUnifiedSave hook
  - [ ] 4.1 导入 saveQueueService
    - 在 `apps/desktop/src/hooks/use-unified-save.ts` 中导入
    - _Requirements: 2.1_
  - [ ] 4.2 修改 cleanup effect 使用队列
    - 将 `saveNow()` 改为 `enqueueSave(nodeId, saveFn)`
    - 入队后清除 isDirty 状态
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.2_

- [ ] 5. 修改编辑器容器组件
  - [ ] 5.1 修改 CodeEditorContainer
    - 在 `loadContent` 前调用 `waitForSave(nodeId)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ] 5.2 修改 DiagramEditorContainer
    - 在 `loadContent` 前调用 `waitForSave(nodeId)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ] 5.3 修改 ExcalidrawEditorContainer
    - 在内容加载前调用 `waitForSave(nodeId)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 6. Checkpoint - 集成测试
  - 手动测试 Tab 切换场景
  - 验证内容不丢失
  - 验证 isDirty 状态正确显示
  - 如有问题，询问用户

- [ ] 7. 最终验证
  - [ ] 7.1 运行类型检查
    - 运行 `bun run check` 确保无类型错误
  - [ ] 7.2 运行 lint
    - 运行 `bun run lint` 确保代码规范
  - [ ] 7.3 运行所有测试
    - 运行 `bun run test` 确保测试通过

## Notes

- 每个任务引用具体的需求以便追溯
- Checkpoint 用于增量验证
- 属性测试验证通用正确性属性
- 单元测试验证具体示例和边界情况
