# Requirements Document: Layout Restoration

## Introduction

本规范定义了将 Grain 桌面应用的布局系统从简化版本恢复到完整功能版本的需求。目标是恢复 v0.1.163 里程碑版本中的所有布局功能，同时遵循当前的函数式架构模式。

## Glossary

- **AppLayout**: 应用主布局组件，负责组织整体布局结构
- **ActivityBar**: 左侧固定宽度的窄栏，包含主要操作按钮
- **UnifiedSidebar**: 可折叠的侧边栏，包含文件树、搜索等面板
- **PanelGroup**: react-resizable-panels 提供的面板容器组件
- **Panel**: react-resizable-panels 提供的可调整大小的面板组件
- **PanelResizeHandle**: react-resizable-panels 提供的拖拽调整手柄
- **CommandPalette**: 命令面板，通过 Ctrl/Cmd+K 触发
- **GlobalSearch**: 全局搜索面板，通过 Ctrl/Cmd+Shift+F 触发
- **BufferSwitcher**: 标签页切换器，通过 Ctrl+Tab 触发
- **ExportDialogManager**: 导出对话框管理器
- **FontStyleInjector**: 字体样式动态注入组件
- **DevtoolsWrapper**: 开发工具包装器（仅开发模式）
- **Toaster**: Toast 通知组件
- **SidebarProvider**: 侧边栏上下文提供者

## Requirements

### Requirement 1: 可调整大小的面板系统

**User Story:** 作为用户，我希望能够拖拽调整侧边栏的宽度，以便根据我的需求自定义布局。

#### Acceptance Criteria

1. WHEN 用户拖拽侧边栏和主内容区之间的分隔线 THEN THE System SHALL 实时调整两个区域的宽度
2. WHEN 用户调整完布局后 THEN THE System SHALL 自动保存布局状态到浏览器存储
3. WHEN 用户重新打开应用 THEN THE System SHALL 恢复上次保存的布局状态
4. WHEN 用户将侧边栏拖拽到最小宽度以下 THEN THE System SHALL 自动折叠侧边栏
5. WHEN 侧边栏被拖拽折叠后 THEN THE System SHALL 显示恢复按钮
6. WHEN 用户点击恢复按钮 THEN THE System SHALL 恢复侧边栏到默认宽度

### Requirement 2: 全局组件管理

**User Story:** 作为用户，我希望能够通过快捷键快速访问各种全局功能，以提高工作效率。

#### Acceptance Criteria

1. WHEN 应用启动时 THEN THE System SHALL 在根组件中初始化所有全局组件
2. WHEN 全局组件未被激活时 THEN THE System SHALL 不渲染其 DOM 结构
3. WHEN 全局组件被激活时 THEN THE System SHALL 以模态或浮层形式显示
4. WHEN 用户关闭全局组件时 THEN THE System SHALL 清理其状态并隐藏
5. WHEN 多个全局组件同时被触发 THEN THE System SHALL 按优先级显示（后触发的覆盖先触发的）

### Requirement 3: 命令面板功能

**User Story:** 作为用户，我希望通过命令面板快速执行各种操作，而不需要记住复杂的菜单路径。

#### Acceptance Criteria

1. WHEN 用户按下 Ctrl/Cmd+K THEN THE System SHALL 打开命令面板
2. WHEN 命令面板打开时 THEN THE System SHALL 显示所有可用命令列表
3. WHEN 用户输入搜索关键词 THEN THE System SHALL 实时过滤匹配的命令
4. WHEN 用户选择一个命令 THEN THE System SHALL 执行该命令并关闭面板
5. WHEN 用户按下 Esc THEN THE System SHALL 关闭命令面板
6. WHEN 命令面板打开时 THEN THE System SHALL 自动聚焦搜索输入框

### Requirement 4: 全局搜索功能

**User Story:** 作为用户，我希望能够在所有文档中搜索内容，以快速找到我需要的信息。

#### Acceptance Criteria

1. WHEN 用户按下 Ctrl/Cmd+Shift+F THEN THE System SHALL 打开全局搜索面板
2. WHEN 全局搜索面板已打开且用户再次按下快捷键 THEN THE System SHALL 切换侧边栏显示状态
3. WHEN 用户输入搜索关键词 THEN THE System SHALL 在所有文档中搜索匹配内容
4. WHEN 搜索完成 THEN THE System SHALL 显示搜索结果列表
5. WHEN 用户点击搜索结果 THEN THE System SHALL 打开对应文档并高亮匹配内容
6. WHEN 用户按下 Esc THEN THE System SHALL 关闭全局搜索面板

### Requirement 5: 标签页切换功能

**User Story:** 作为用户，我希望能够通过键盘快捷键在打开的标签页之间快速切换，类似于 Emacs 的 buffer 切换。

#### Acceptance Criteria

1. WHEN 用户按下 Ctrl+Tab THEN THE System SHALL 打开标签页切换器并向前切换
2. WHEN 用户按下 Ctrl+Shift+Tab THEN THE System SHALL 打开标签页切换器并向后切换
3. WHEN 标签页切换器打开时 THEN THE System SHALL 显示所有打开的标签页列表
4. WHEN 用户持续按住 Ctrl 并按 Tab THEN THE System SHALL 在列表中循环选择
5. WHEN 用户释放 Ctrl 键 THEN THE System SHALL 切换到选中的标签页并关闭切换器
6. WHEN 没有打开的标签页时 THEN THE System SHALL 不显示标签页切换器

### Requirement 6: 导出对话框管理

**User Story:** 作为用户，我希望能够方便地导出我的文档和工作区数据，支持多种格式。

#### Acceptance Criteria

1. WHEN 用户触发导出操作 THEN THE System SHALL 打开导出对话框
2. WHEN 导出对话框打开时 THEN THE System SHALL 显示可用的导出格式选项
3. WHEN 用户选择导出格式 THEN THE System SHALL 显示该格式的配置选项
4. WHEN 用户确认导出 THEN THE System SHALL 执行导出操作并显示进度
5. WHEN 导出完成 THEN THE System SHALL 显示成功提示并关闭对话框
6. WHEN 导出失败 THEN THE System SHALL 显示错误信息并保持对话框打开

### Requirement 7: 字体样式动态注入

**User Story:** 作为用户，我希望能够自定义编辑器的字体样式，并且更改能够立即生效。

#### Acceptance Criteria

1. WHEN 应用启动时 THEN THE System SHALL 从设置中读取字体配置
2. WHEN 字体配置存在时 THEN THE System SHALL 动态注入对应的 CSS 样式
3. WHEN 用户更改字体设置 THEN THE System SHALL 立即更新注入的样式
4. WHEN 字体配置无效时 THEN THE System SHALL 使用默认字体
5. WHEN 字体文件加载失败时 THEN THE System SHALL 降级到系统字体

### Requirement 8: Toast 通知系统

**User Story:** 作为用户，我希望在执行操作后能够看到清晰的反馈信息，了解操作是否成功。

#### Acceptance Criteria

1. WHEN 操作成功时 THEN THE System SHALL 显示成功 Toast 通知
2. WHEN 操作失败时 THEN THE System SHALL 显示错误 Toast 通知
3. WHEN 需要用户确认时 THEN THE System SHALL 显示警告 Toast 通知
4. WHEN Toast 显示后 THEN THE System SHALL 在 3 秒后自动消失
5. WHEN 用户点击 Toast THEN THE System SHALL 立即关闭该 Toast
6. WHEN 多个 Toast 同时显示 THEN THE System SHALL 堆叠显示，最新的在最上方

### Requirement 9: 主题系统初始化

**User Story:** 作为用户，我希望应用能够自动适配我的系统主题偏好，并支持手动切换。

#### Acceptance Criteria

1. WHEN 应用启动时 THEN THE System SHALL 读取系统主题偏好
2. WHEN 系统主题为深色模式 THEN THE System SHALL 应用深色主题
3. WHEN 系统主题为浅色模式 THEN THE System SHALL 应用浅色主题
4. WHEN 系统主题发生变化 THEN THE System SHALL 自动切换应用主题
5. WHEN 用户手动设置主题 THEN THE System SHALL 覆盖系统主题偏好
6. WHEN 应用关闭时 THEN THE System SHALL 保存用户的主题设置

### Requirement 10: 自动备份系统

**User Story:** 作为用户，我希望应用能够自动备份我的数据，防止意外丢失。

#### Acceptance Criteria

1. WHEN 应用启动时 THEN THE System SHALL 检查自动备份设置
2. WHEN 自动备份已启用 THEN THE System SHALL 启动备份管理器
3. WHEN 达到备份时间间隔 THEN THE System SHALL 自动执行备份操作
4. WHEN 备份成功 THEN THE System SHALL 记录备份时间和文件信息
5. WHEN 备份失败 THEN THE System SHALL 记录错误日志并重试
6. WHEN 应用关闭时 THEN THE System SHALL 停止备份管理器

### Requirement 11: 侧边栏面板切换

**User Story:** 作为用户，我希望能够通过快捷键快速切换侧边栏显示的面板类型。

#### Acceptance Criteria

1. WHEN 用户按下 Ctrl/Cmd+B THEN THE System SHALL 切换文件面板显示状态
2. WHEN 文件面板已打开且用户再次按下快捷键 THEN THE System SHALL 折叠侧边栏
3. WHEN 侧边栏已折叠且用户按下快捷键 THEN THE System SHALL 展开侧边栏并显示对应面板
4. WHEN 用户切换到不同的面板 THEN THE System SHALL 保持侧边栏展开状态
5. WHEN 侧边栏展开时 THEN THE System SHALL 显示当前激活面板的内容

### Requirement 12: 开发工具集成

**User Story:** 作为开发者，我希望在开发模式下能够访问调试工具，以便排查问题。

#### Acceptance Criteria

1. WHEN 应用在开发模式下运行 THEN THE System SHALL 加载开发工具组件
2. WHEN 应用在生产模式下运行 THEN THE System SHALL 不加载开发工具组件
3. WHEN 开发工具加载时 THEN THE System SHALL 显示 TanStack Query Devtools
4. WHEN 开发工具加载时 THEN THE System SHALL 显示 TanStack Router Devtools
5. WHEN 开发工具出错时 THEN THE System SHALL 不影响应用正常运行

### Requirement 13: 布局状态持久化

**User Story:** 作为用户，我希望应用能够记住我的布局偏好，每次打开时保持一致。

#### Acceptance Criteria

1. WHEN 用户调整布局 THEN THE System SHALL 将布局状态保存到 localStorage
2. WHEN 应用启动时 THEN THE System SHALL 从 localStorage 读取布局状态
3. WHEN 布局状态存在 THEN THE System SHALL 恢复保存的布局
4. WHEN 布局状态不存在 THEN THE System SHALL 使用默认布局
5. WHEN 布局状态损坏 THEN THE System SHALL 使用默认布局并清除损坏数据

### Requirement 14: 函数式架构合规性

**User Story:** 作为开发者，我希望所有新增代码都遵循 Grain 的函数式架构模式，保持代码库的一致性。

#### Acceptance Criteria

1. WHEN 创建新的视图组件 THEN THE System SHALL 使用 `.view.fn.tsx` 命名
2. WHEN 创建新的容器组件 THEN THE System SHALL 使用 `.container.fn.tsx` 命名
3. WHEN 视图组件需要数据 THEN THE System SHALL 通过 props 接收，不直接访问 Store
4. WHEN 容器组件需要数据 THEN THE System SHALL 使用 hooks 获取，通过 props 传递给视图
5. WHEN 创建新的 hook THEN THE System SHALL 使用 `use-` 前缀命名
6. WHEN 创建新的状态 THEN THE System SHALL 使用 Zustand 并放在 `state/` 目录
7. WHEN 创建新的类型 THEN THE System SHALL 放在 `types/` 目录
8. WHEN 组件使用外部依赖 THEN THE System SHALL 遵循依赖规则（views → hooks → flows → pipes → io）

### Requirement 15: 响应式布局支持

**User Story:** 作为用户，我希望应用在不同窗口大小下都能正常显示和操作。

#### Acceptance Criteria

1. WHEN 窗口宽度小于 768px THEN THE System SHALL 自动折叠侧边栏
2. WHEN 窗口宽度恢复正常 THEN THE System SHALL 恢复侧边栏状态
3. WHEN 侧边栏宽度超过窗口宽度的 50% THEN THE System SHALL 限制最大宽度
4. WHEN 主内容区宽度小于 400px THEN THE System SHALL 优先保证主内容区宽度
5. WHEN 用户调整窗口大小 THEN THE System SHALL 平滑过渡布局变化
