# Implementation Plan: 编辑器保存服务单例化

## Overview

将编辑器保存服务从"每组件一实例"改为"单例多 model"模式。

## Tasks

- [ ] 1. 创建 SaveServiceManager
  - [ ] 1.1 创建 save-service-manager.ts
    - 创建 `apps/desktop/src/lib/save-service-manager.ts`
    - 实现 `SaveServiceManagerInterface` 接口
    - 实现 `createSaveServiceManager` 工厂函数
    - 导出单例 `saveServiceManager`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_
  - [ ] 1.2 实现 SaveModel 状态管理
    - 实现 pendingContent / lastSavedContent 追踪
    - 实现防抖自动保存
    - 实现 hasUnsavedChanges 判断
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ] 1.3 实现清理方法
    - 实现 dispose(nodeId)
    - 实现 disposeAll()
    - 取消防抖定时器
    - _Requirements: 6.1, 6.2, 6.4_

- [ ] 2. 编写单元测试
  - [ ] 2.1 测试 getOrCreate
    - 创建新 model
    - 获取已有 model
    - 更新配置
  - [ ] 2.2 测试 updateContent
    - 更新 pendingContent
    - 触发防抖
    - 更新 isDirty
  - [ ] 2.3 测试 saveNow
    - 保存成功
    - 保存失败（保留 pendingContent）
    - 无内容时跳过
  - [ ] 2.4 测试 hasUnsavedChanges
    - 有更改返回 true
    - 无更改返回 false
  - [ ] 2.5 测试 dispose
    - 清理 model
    - 取消防抖

- [ ] 3. Checkpoint - 确保 SaveServiceManager 测试通过

- [ ] 4. 重构 useUnifiedSave hook
  - [ ] 4.1 移除组件级服务创建
    - 删除 useMemo 创建服务的逻辑
    - 删除 serviceRef
    - 删除清理 effect
  - [ ] 4.2 连接 SaveServiceManager
    - 组件挂载时调用 getOrCreate
    - 返回的函数委托给 manager
  - [ ] 4.3 保留快捷键注册
    - Ctrl+S / Cmd+S 调用 manager.saveNow

- [ ] 5. 简化编辑器容器组件
  - [ ] 5.1 简化 CodeEditorContainer
    - 移除复杂的清理逻辑
    - 使用简化的 useUnifiedSave
    - 移除 waitForSave（不再需要）
  - [ ] 5.2 简化 DiagramEditorContainer
    - 移除复杂的清理逻辑
    - 使用简化的 useUnifiedSave
    - 移除 waitForSave
  - [ ] 5.3 简化 ExcalidrawEditorContainer
    - 移除复杂的清理逻辑
    - 使用简化的 useUnifiedSave
    - 移除 waitForSave

- [ ] 6. 实现 Tab 关闭时清理
  - [ ] 6.1 修改 editor-tabs.store
    - closeTab 时调用 saveNow + dispose
    - _Requirements: 6.3_

- [ ] 7. 清理旧代码
  - [ ] 7.1 删除 save-queue.ts（不再需要）
  - [ ] 7.2 删除 unified-save.service.ts（合并到 manager）
  - [ ] 7.3 删除相关测试文件

- [ ] 8. Checkpoint - 集成测试
  - 手动测试 Tab 切换场景
  - 验证内容不丢失
  - 验证 isDirty 状态正确显示

- [ ] 9. 最终验证
  - [ ] 9.1 运行类型检查
  - [ ] 9.2 运行 lint
  - [ ] 9.3 运行所有测试

## Notes

- 单例模式简化了生命周期管理
- 组件卸载时不清理 model，只有 Tab 关闭时才清理
- 不再需要 save-queue，因为没有竞态条件了

