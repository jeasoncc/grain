# Implementation Plan: Excalidraw Performance Optimization

## Overview

本实现计划将 Excalidraw 性能优化设计分解为可执行的编码任务。采用增量开发方式，每个任务都建立在前一个任务的基础上，确保代码始终可运行。

## Tasks

- [x] 1. 创建性能配置常量和类型定义
  - [x] 1.1 创建 `excalidraw-editor.config.ts` 文件定义性能常量
    - 定义 AUTO_SAVE_DELAY, STATUS_UPDATE_THROTTLE, RESIZE_DEBOUNCE_DELAY 等常量
    - 使用 `as const` 确保类型安全
    - _Requirements: 3.4, 4.1, 5.3_

  - [x] 1.2 更新 `excalidraw-editor.types.ts` 添加性能相关类型
    - 添加 PerformanceConfig 接口
    - 添加 PerformanceMetrics 接口（可选，用于调试）
    - _Requirements: 1.2, 8.1_

- [ ] 2. 优化 Container 组件状态管理
  - [ ] 2.1 重构 Container 组件使用 refs 存储非渲染数据
    - 将 currentDataRef 保持为 ref（已实现）
    - 将 hasUnsavedChanges 保持为 ref（已实现）
    - 确保 onChange 回调不触发组件重渲染
    - _Requirements: 2.1, 3.1, 3.2_

  - [ ] 2.2 编写属性测试验证 onChange 不触发重渲染
    - **Property 1: onChange 不触发组件重渲染**
    - **Validates: Requirements 2.1**

- [ ] 3. 优化 ResizeObserver 处理
  - [ ] 3.1 重构 ResizeObserver 逻辑使用配置常量
    - 使用 RESIZE_DEBOUNCE_DELAY (200ms) 替代硬编码的 150ms
    - 使用 SIZE_CHANGE_THRESHOLD (10px) 替代硬编码的 10
    - 使用 MIN_VALID_SIZE (200px) 替代硬编码的 200
    - _Requirements: 4.1, 4.2_

  - [ ] 3.2 编写属性测试验证 Resize 事件防抖
    - **Property 5: Resize 事件防抖**
    - **Validates: Requirements 4.1**

  - [ ] 3.3 编写属性测试验证尺寸变化阈值过滤
    - **Property 2: 尺寸变化阈值过滤**
    - **Validates: Requirements 2.2, 4.2**

- [ ] 4. 优化保存状态更新
  - [ ] 4.1 创建节流的保存状态更新函数
    - 使用 es-toolkit 的 throttle 函数
    - 节流间隔使用 STATUS_UPDATE_THROTTLE (500ms)
    - 包装 markAsUnsaved, markAsSaving, markAsSaved 调用
    - _Requirements: 3.3, 3.4_

  - [ ] 4.2 编写属性测试验证状态更新节流
    - **Property 4: 状态更新节流**
    - **Validates: Requirements 3.4**

- [ ] 5. 优化内容解析缓存
  - [ ] 5.1 确保 parseExcalidrawContent 只在初始化时调用一次
    - 验证 isInitializedRef 逻辑正确
    - 确保 nodeId 变化时正确重置
    - _Requirements: 2.4_

  - [ ] 5.2 编写属性测试验证内容解析缓存
    - **Property 3: 内容解析缓存**
    - **Validates: Requirements 2.4**

- [ ] 6. Checkpoint - 确保所有测试通过
  - 运行 `bun run test` 确保所有测试通过
  - 如有问题，询问用户

- [ ] 7. 优化 Excalidraw 实例稳定性
  - [ ] 7.1 确保 resize 时不重新创建 Excalidraw 实例
    - 验证 key prop 在 resize 时保持稳定
    - 只有 nodeId 变化时才更新 key
    - _Requirements: 4.4_

  - [ ] 7.2 编写属性测试验证 Excalidraw 实例保持
    - **Property 6: Excalidraw 实例保持**
    - **Validates: Requirements 4.4**

- [ ] 8. 优化自动保存合并
  - [ ] 8.1 验证现有 debounce 保存逻辑正确性
    - 确保使用 AUTO_SAVE_DELAY (2000ms)
    - 确保多次快速变更只触发一次保存
    - _Requirements: 5.1, 5.3_

  - [ ] 8.2 编写属性测试验证保存操作合并
    - **Property 7: 保存操作合并**
    - **Validates: Requirements 5.3**

- [ ] 9. 优化组件卸载清理
  - [ ] 9.1 完善组件卸载时的资源清理
    - 确保取消所有 debounced 操作
    - 确保移除所有事件监听器
    - 确保清理 ResizeObserver
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 9.2 编写属性测试验证卸载时资源清理
    - **Property 8: 卸载时资源清理**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [ ] 10. Tauri WebView 优化
  - [ ] 10.1 添加硬件加速检测和日志
    - 检测 WebView 是否启用硬件加速
    - 如果未启用，记录警告日志
    - _Requirements: 6.1, 6.3_

  - [ ] 10.2 配置 Excalidraw 最优渲染设置
    - 设置 Canvas 渲染选项
    - 配置 UIOptions 减少不必要的 UI 元素
    - _Requirements: 6.4_

- [ ] 11. Final Checkpoint - 确保所有测试通过
  - 运行 `bun run test` 确保所有测试通过
  - 运行 `bun run check` 确保类型检查通过
  - 如有问题，询问用户

## Notes

- 所有任务均为必需，包括属性测试
- 每个任务都引用了具体的需求以便追溯
- Checkpoint 任务用于确保增量验证
- 属性测试验证通用正确性属性
- 单元测试验证具体示例和边界情况

