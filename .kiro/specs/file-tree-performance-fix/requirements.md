# Requirements Document

## Introduction

本文档定义文件树性能优化和用户体验改进的需求。虽然系统已经实现了文件模板、Query Devtools 等功能，但在实际使用中仍存在严重的性能问题和用户体验缺陷，需要系统性地解决。

**现状分析**：
- ✅ 文件模板系统已实现（`pipes/content/content.template.fn.ts`）
- ✅ Query Devtools 已配置（`main.tsx`）
- ❌ 文件树节点展开每次都要等待后端响应（~500ms）
- ❌ 新建文件后不会自动展开父文件夹并选中
- ❌ 新建文件的模板内容没有正确显示在编辑器中

## Glossary

- **File_Tree**: 文件树组件，显示工作区的文件和文件夹层级结构
- **Node**: 文件树中的节点，可以是文件或文件夹
- **Backend**: Rust 后端 API，负责数据持久化
- **Frontend**: React 前端，负责 UI 渲染和用户交互
- **TanStack_Query**: React Query 库，用于数据获取和缓存
- **Devtools**: 开发者工具，包括 Router Devtools 和 Query Devtools

## Requirements

### Requirement 1: 文件树节点展开性能优化

**User Story:** 作为用户，我希望展开文件夹时响应迅速，不需要等待后端交互，这样我可以快速浏览文件结构。

#### Acceptance Criteria

1. WHEN 用户点击文件夹展开/折叠按钮 THEN THE System SHALL 立即更新 UI 状态，不等待后端响应
2. WHEN 文件夹状态改变 THEN THE System SHALL 在后台异步保存状态到后端
3. WHEN 后端保存失败 THEN THE System SHALL 记录错误但不影响用户操作
4. THE System SHALL 使用乐观更新策略，先更新 UI 再同步后端
5. WHEN 用户快速连续展开多个文件夹 THEN THE System SHALL 流畅响应，不出现卡顿

### Requirement 2: 文件创建后自动定位

**User Story:** 作为用户，我希望创建新文件后，文件树自动展开到新文件所在位置并选中它，这样我可以立即看到新创建的文件。

#### Acceptance Criteria

1. WHEN 用户创建新文件或文件夹 THEN THE System SHALL 自动展开父文件夹路径
2. WHEN 新节点创建成功 THEN THE System SHALL 在文件树中选中新节点
3. WHEN 新节点在折叠的文件夹内 THEN THE System SHALL 展开所有祖先文件夹
4. WHEN 新节点创建后 THEN THE System SHALL 滚动文件树使新节点可见
5. THE System SHALL 在 300ms 内完成自动定位和选中操作

### Requirement 3: 文件创建模板内容显示

**User Story:** 作为用户，我希望创建新文件时模板内容能正确显示在编辑器中，这样我可以立即开始编辑而不是面对空白编辑器。

#### Acceptance Criteria

1. WHEN 用户创建新的文本文件 THEN THE System SHALL 在编辑器中显示默认的 Markdown 模板
2. WHEN 用户创建新的画布文件 THEN THE System SHALL 在编辑器中显示空的 Excalidraw 画布
3. WHEN 用户创建新的日记文件 THEN THE System SHALL 在编辑器中显示日期标题和基本结构
4. THE System SHALL 确保模板内容从后端正确加载到编辑器状态
5. WHEN 模板内容加载失败 THEN THE System SHALL 显示错误提示并记录日志

### Requirement 4: Query Devtools 位置调整

**User Story:** 作为开发者，我希望 Query Devtools 显示在合适的位置，不与 Router Devtools 重叠，这样我可以同时使用两个工具。

#### Acceptance Criteria

1. THE Query_Devtools SHALL 显示在屏幕左下角
2. THE Router_Devtools SHALL 显示在屏幕右下角
3. THE Query_Devtools SHALL 可以独立打开和关闭
4. THE Query_Devtools SHALL 显示所有 Query 的状态和缓存数据
5. WHEN 两个 Devtools 同时打开 THEN THE System SHALL 确保它们不重叠

### Requirement 5: 文件树数据缓存优化

**User Story:** 作为用户，我希望文件树数据被智能缓存，这样切换工作区时不需要重新加载已访问过的数据。

#### Acceptance Criteria

1. WHEN 用户首次访问工作区 THEN THE System SHALL 从后端加载节点数据
2. WHEN 用户再次访问相同工作区 THEN THE System SHALL 使用缓存数据立即显示
3. WHEN 节点数据发生变化 THEN THE System SHALL 自动更新缓存
4. THE System SHALL 在后台定期刷新缓存数据
5. WHEN 缓存数据过期 THEN THE System SHALL 重新从后端加载

### Requirement 6: 节点操作防抖优化

**User Story:** 作为用户，我希望快速操作文件树时系统不会发送过多的后端请求，这样可以减少服务器负载和提高响应速度。

#### Acceptance Criteria

1. WHEN 用户快速展开/折叠多个文件夹 THEN THE System SHALL 合并后端请求
2. WHEN 用户拖拽节点移动 THEN THE System SHALL 在拖拽结束后才发送请求
3. WHEN 用户重命名节点 THEN THE System SHALL 在输入停止后才发送请求
4. THE System SHALL 使用 300ms 的防抖延迟
5. WHEN 用户离开页面 THEN THE System SHALL 立即发送所有待处理的请求

### Requirement 7: 错误处理和用户反馈

**User Story:** 作为用户，我希望当操作失败时能看到清晰的错误提示，这样我知道发生了什么问题。

#### Acceptance Criteria

1. WHEN 后端操作失败 THEN THE System SHALL 显示具体的错误消息
2. WHEN 网络连接失败 THEN THE System SHALL 提示用户检查网络
3. WHEN 操作成功 THEN THE System SHALL 显示简短的成功提示
4. THE System SHALL 在 3 秒后自动关闭成功提示
5. THE System SHALL 保持错误提示直到用户手动关闭

### Requirement 8: 文件树状态持久化

**User Story:** 作为用户，我希望文件树的展开状态在刷新页面后保持，这样我不需要重新展开所有文件夹。

#### Acceptance Criteria

1. WHEN 用户展开文件夹 THEN THE System SHALL 保存展开状态到 localStorage
2. WHEN 用户刷新页面 THEN THE System SHALL 恢复之前的展开状态
3. WHEN 用户切换工作区 THEN THE System SHALL 保存当前工作区的状态
4. THE System SHALL 为每个工作区独立保存展开状态
5. WHEN 存储空间不足 THEN THE System SHALL 清理最旧的状态数据

### Requirement 9: 文件树虚拟化性能

**User Story:** 作为用户，我希望即使工作区有数千个文件，文件树仍然流畅滚动，这样我可以高效管理大型项目。

#### Acceptance Criteria

1. WHEN 工作区有超过 1000 个节点 THEN THE System SHALL 使用虚拟化渲染
2. THE System SHALL 只渲染可见区域的节点
3. WHEN 用户滚动文件树 THEN THE System SHALL 保持 60fps 的流畅度
4. THE System SHALL 预渲染可见区域上下各 5 个节点
5. WHEN 节点数量变化 THEN THE System SHALL 自动调整虚拟化参数

### Requirement 10: 调试和诊断工具

**User Story:** 作为开发者，我希望有完善的调试工具来诊断文件树性能问题，这样我可以快速定位和解决问题。

#### Acceptance Criteria

1. THE System SHALL 提供性能监控日志（展开/折叠耗时、文件创建耗时）
2. THE System SHALL 在控制台输出关键操作的时间戳
3. THE System SHALL 记录所有后端 API 调用的耗时
4. WHEN 操作耗时超过阈值 THEN THE System SHALL 输出警告日志
5. THE System SHALL 提供性能分析报告（平均耗时、最慢操作等）

