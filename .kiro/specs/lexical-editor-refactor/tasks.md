# 实现计划

## 阶段 1: 清理现有编辑器组件

- [x] 1. 删除 `components/blocks/rich-editor/` 目录下所有文件
  - 删除 `editor.tsx`, `minimal-editor.tsx`, `minimal-plugins.tsx`, `nodes.ts`, `novel-editor.tsx`, `plugins.tsx`
  - _Requirements: 1.1_

- [-] 2. 删除 `components/editor/` 目录下不需要的文件
  - [x] 2.1 删除 `context/` 目录
    - 删除 `toolbar-context.tsx`
    - _Requirements: 1.2_
  - [x] 2.2 删除 `editor-hooks/` 目录
    - 删除 `use-debounce.ts`, `use-modal.tsx`, `use-report.ts`, `use-update-toolbar.ts`
    - _Requirements: 1.2_
  - [x] 2.3 删除 `plugins/` 目录下不需要的插件
    - 删除 `actions/`, `embeds/`, `picker/`, `toolbar/` 子目录
    - 删除除 `mentions-plugin.tsx`, `mention-tooltip-plugin.tsx`, `tag-picker-plugin.tsx` 外的所有插件文件
    - _Requirements: 1.2, 1.3_
  - [x] 2.4 删除 `nodes/` 目录下不需要的节点
    - 删除 `embeds/` 子目录
    - 删除除 `mention-node.tsx`, `tag-node.tsx` 外的所有节点文件
    - _Requirements: 1.2, 1.3_
  - [x] 2.5 删除 `shared/`, `themes/`, `transformers/`, `utils/` 目录
    - _Requirements: 1.2_
  - [x] 2.6 删除 `editor-ui/` 目录下不需要的文件
    - 保留 `wiki-hover-preview.tsx`
    - 删除其他所有文件
    - _Requirements: 1.2, 1.3_

- [ ] 3. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

## 阶段 2: 创建新的编辑器基础架构

- [x] 4. 创建新的编辑器主题
  - [x] 4.1 创建 `components/editor/themes/PlaygroundEditorTheme.ts`
    - 基于 Lexical Playground 的主题配置
    - 包含所有必要的 CSS 类名映射
    - _Requirements: 2.2, 2.4_

- [x] 5. 创建节点配置
  - [x] 5.1 创建 `components/editor/nodes/index.ts`
    - 导出所有需要的节点类型
    - 包含 Lexical 内置节点和自定义节点 (MentionNode, TagNode)
    - _Requirements: 2.3_

- [x] 6. 创建核心编辑器组件
  - [x] 6.1 创建 `components/editor/Editor.tsx`
    - 基于 Lexical Playground 实现
    - 配置 LexicalComposer
    - 加载精简的插件集
    - _Requirements: 2.2, 2.3_
  - [x] 6.2 创建 `components/editor/plugins/index.ts`
    - 导出所有插件组件
    - 包含 Lexical 内置插件和自定义插件
    - _Requirements: 2.3_

- [ ]* 6.3 编写属性测试 - 插件加载验证
  - **Property: 编辑器应只加载指定的插件集**
  - **验证: Requirements 2.3**

- [ ] 7. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

## 阶段 3: 实现多编辑器容器

- [-] 8. 创建编辑器实例包装器
  - [x] 8.1 创建 `components/editor/EditorInstance.tsx`
    - 包装单个编辑器实例
    - 管理滚动位置监听
    - 处理内容变化回调
    - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 8.2 编写属性测试 - 状态保留往返
  - **Property 1: 标签切换状态保留往返**
  - **验证: Requirements 3.2, 3.3**

- [x] 9. 创建多编辑器容器
  - [x] 9.1 创建 `components/editor/MultiEditorContainer.tsx`
    - 管理多个 EditorInstance
    - 实现 CSS visibility 切换逻辑
    - 处理标签切换时的状态恢复
    - _Requirements: 4.1_

- [ ]* 9.2 编写属性测试 - Visibility 模式切换
  - **Property 3: Visibility 模式切换**
  - **验证: Requirements 4.1**

- [ ]* 9.3 编写属性测试 - 编辑器实例隔离
  - **Property 2: 编辑器实例隔离**
  - **验证: Requirements 3.4**

- [ ] 10. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

## 阶段 4: 集成自定义插件

- [x] 11. 更新自定义插件的导入路径
  - [x] 11.1 更新 `mentions-plugin.tsx` 的导入
    - 修复对已删除文件的引用
    - 更新节点导入路径
    - _Requirements: 1.4, 5.1, 5.2_
  - [x] 11.2 更新 `mention-tooltip-plugin.tsx` 的导入
    - 修复对已删除文件的引用
    - _Requirements: 1.4, 5.3_
  - [x] 11.3 更新 `tag-picker-plugin.tsx` 的导入
    - 修复对已删除文件的引用
    - 更新节点导入路径
    - _Requirements: 1.4, 5.4, 5.5_

- [ ]* 11.4 编写属性测试 - 节点插入正确性
  - **Property 5: 节点插入正确性**
  - **验证: Requirements 5.2, 5.5**

- [ ] 12. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

## 阶段 5: 更新工作空间组件

- [x] 13. 更新 `story-workspace.tsx`
  - [x] 13.1 移除旧的编辑器导入
    - 删除对 `components/blocks/rich-editor/` 的引用
    - _Requirements: 1.4_
  - [x] 13.2 集成 MultiEditorContainer
    - 替换现有的编辑器渲染逻辑
    - 连接 editorStates 和回调函数
    - _Requirements: 3.1, 4.1_
  - [x] 13.3 实现自动保存逻辑
    - 配置保存延迟
    - 连接保存服务
    - _Requirements: 6.4_

- [ ]* 13.4 编写属性测试 - 自动保存触发
  - **Property 8: 自动保存触发**
  - **验证: Requirements 6.4**

- [x] 14. 更新 `focus-mode.tsx`
  - 更新编辑器导入和使用
  - _Requirements: 1.4_

- [ ] 15. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

## 阶段 6: 实现 LRU 缓存和内存管理

- [x] 16. 验证 LRU 缓存逻辑
  - [x] 16.1 审查 `editor-tabs.ts` 中的 LRU 实现
    - 确保 evictLRUEditorStates 正确工作
    - 验证阈值配置 (MAX_EDITOR_STATES = 10)
    - _Requirements: 4.3_

- [ ]* 16.2 编写属性测试 - LRU 缓存清理
  - **Property 4: LRU 缓存清理**
  - **验证: Requirements 4.3**

- [ ] 17. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

## 阶段 7: 添加 Markdown 支持和 Undo/Redo

- [x] 18. 配置 Markdown 快捷键
  - [x] 18.1 在 Editor.tsx 中添加 MarkdownShortcutPlugin
    - 配置支持的 Markdown 转换器
    - 支持标题、粗体、斜体、列表
    - _Requirements: 6.1_

- [ ]* 18.2 编写属性测试 - Markdown 转换
  - **Property 6: Markdown 转换**
  - **验证: Requirements 6.1**

- [x] 19. 验证 Undo/Redo 功能
  - [x] 19.1 确保 HistoryPlugin 正确配置
    - 每个编辑器实例独立的历史记录
    - _Requirements: 6.3_

- [ ]* 19.2 编写属性测试 - Undo/Redo 往返
  - **Property 7: Undo/Redo 往返**
  - **验证: Requirements 6.3**

- [ ] 20. 最终检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

## 阶段 8: 清理和验证

- [x] 21. 运行 TypeScript 编译检查
  - 确保没有类型错误
  - 确保没有断开的导入
  - _Requirements: 1.4_

- [ ] 22. 运行完整测试套件
  - 运行所有单元测试
  - 运行所有属性测试
  - _Requirements: 所有_

- [ ] 23. 手动验证
  - 打开多个文件标签
  - 切换标签验证状态保留
  - 测试 @mentions 和 #tags 功能
  - 验证内存使用稳定
  - _Requirements: 所有_
