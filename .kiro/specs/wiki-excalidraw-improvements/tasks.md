# Implementation Plan

## Phase 1: 清理残留的角色和世界观模块

- [x] 1. 删除废弃的路由文件
  - [x] 1.1 删除 characters.tsx 路由文件
    - 删除 `apps/desktop/src/routes/characters.tsx`
    - 验证路由树自动更新
    - _Requirements: 1.1, 1.4_
  - [x] 1.2 删除 world.tsx 路由文件
    - 删除 `apps/desktop/src/routes/world.tsx`
    - 验证路由树自动更新
    - _Requirements: 1.1, 1.4_

- [-] 2. 清理 Activity Bar 中的相关按钮
  - [x] 2.1 移除角色和世界观按钮
    - 从 `activity-bar.tsx` 中移除角色和世界观相关的按钮
    - 保留 Wiki 面板切换功能
    - _Requirements: 1.2_

- [x] 3. 清理数据模型引用
  - [x] 3.1 清理 schema.ts 中的废弃接口
    - 移除或标记 RoleInterface 和 WorldEntryInterface 为废弃
    - 确保所有代码使用 WikiEntryInterface
    - _Requirements: 1.3_
  - [x] 3.2 清理其他文件中的废弃引用
    - 搜索并移除对 RoleInterface 和 WorldEntryInterface 的引用
    - 更新相关组件使用 WikiEntryInterface
    - _Requirements: 1.3_

- [ ] 4. Checkpoint - 确保清理后应用正常运行
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: 完善 Wiki 功能

- [-] 5. 增强 @ 自动补全功能
  - [x] 5.1 优化 mentions-plugin 过滤逻辑
    - 确保匹配名称、别名和标签
    - 优化搜索性能
    - _Requirements: 3.2, 3.3_
  - [ ]* 5.2 编写属性测试：Wiki 过滤匹配正确性
    - **Property 2: Wiki 过滤匹配正确性**
    - **Validates: Requirements 3.2, 3.3**

- [x] 6. 实现 Wiki 悬浮预览功能
  - [x] 6.1 创建 WikiHoverPreview 组件
    - 创建 `apps/desktop/src/components/editor/editor-ui/wiki-hover-preview.tsx`
    - 实现预览卡片 UI（名称、别名、内容摘要）
    - 实现内容截断逻辑（最大150字符）
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 6.2 实现悬浮延迟逻辑
    - 显示延迟 300ms
    - 隐藏延迟 150ms
    - 鼠标移入预览卡片时保持显示
    - _Requirements: 4.4, 4.5_
  - [ ]* 6.3 编写属性测试：悬浮预览内容完整性
    - **Property 3: 悬浮预览内容完整性**
    - **Validates: Requirements 4.2, 4.3**

- [x] 7. 增强 MentionNode 支持悬浮预览
  - [x] 7.1 修改 mention-node.tsx 添加悬浮事件
    - 添加 onMouseEnter 和 onMouseLeave 事件处理
    - 集成 WikiHoverPreview 组件
    - _Requirements: 4.1_

- [ ] 8. Checkpoint - 确保 Wiki 功能正常工作
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: 修复 Excalidraw 绘图功能

- [x] 9. 诊断并修复 Excalidraw 显示问题
  - [x] 9.1 修复 excalidraw-component.tsx 显示问题
    - 检查并修复容器尺寸计算
    - 添加错误边界处理
    - 确保 Suspense fallback 正确显示
    - _Requirements: 5.1, 5.3_
  - [x] 9.2 修复 excalidraw-node.tsx 节点渲染
    - 确保节点正确创建和渲染
    - 修复可能的数据解析问题
    - _Requirements: 5.1, 5.2_

- [x] 10. 优化 Excalidraw 界面集成
  - [x] 10.1 移除"在外部打开"相关功能
    - 更新 UIOptions 配置
    - 移除任何外部打开按钮
    - _Requirements: 6.2_
  - [x] 10.2 统一主题样式
    - 确保使用 useTheme hook 同步主题
    - 调整边框和背景样式与编辑器一致
    - _Requirements: 6.1_
  - [x] 10.3 优化尺寸和布局
    - 设置合适的最小尺寸（400x300）
    - 实现响应式尺寸调整
    - _Requirements: 6.3, 6.4_

- [x] 11. 完善绘图编辑和保存功能
  - [x] 11.1 修复自动保存逻辑
    - 确保编辑后数据正确保存到节点
    - 添加保存状态指示
    - _Requirements: 5.4_
  - [ ]* 11.2 编写属性测试：绘图数据持久化一致性
    - **Property 4: 绘图数据持久化一致性**
    - **Validates: Requirements 5.4, 5.5**

- [x] 12. 优化全屏编辑功能
  - [x] 12.1 完善全屏模式
    - 确保全屏模式正确显示
    - 添加保存和导出按钮
    - 确保退出时保留更改
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ]* 12.2 编写属性测试：全屏模式状态保持
    - **Property 5: 全屏模式状态保持**
    - **Validates: Requirements 7.4**

- [ ] 13. Checkpoint - 确保绘图功能正常工作
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: 集成测试和最终验证

- [ ] 14. 验证 Wiki 条目管理功能
  - [ ] 14.1 测试 Wiki 条目 CRUD 操作
    - 验证创建、编辑、删除功能
    - 验证别名和标签管理
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ]* 14.2 编写属性测试：Wiki 条目 CRUD 操作一致性
    - **Property 1: Wiki 条目 CRUD 操作一致性**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5**

- [ ] 15. 验证 @ 自动补全和悬浮预览
  - [ ] 15.1 测试 @ 自动补全流程
    - 验证输入 @ 显示下拉列表
    - 验证过滤和选择功能
    - _Requirements: 3.1, 3.4, 3.5_
  - [ ] 15.2 测试悬浮预览流程
    - 验证悬停显示预览
    - 验证延迟和交互行为
    - _Requirements: 4.1, 4.4, 4.5_

- [ ] 16. 验证绘图功能
  - [ ] 16.1 测试绘图创建和编辑
    - 验证通过 / 命令插入绘图
    - 验证编辑和预览模式切换
    - _Requirements: 5.1, 5.2, 5.5, 6.4, 6.5_
  - [ ] 16.2 测试全屏编辑
    - 验证全屏模式进入和退出
    - 验证更改保留
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 17. Final Checkpoint - 确保所有功能正常
  - Ensure all tests pass, ask the user if questions arise.

