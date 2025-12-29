# Implementation Tasks

## Task 1: 安装 Monaco Editor 依赖

**Requirements:** 1.1

**Acceptance Criteria:**
- [x] 在 `apps/desktop/package.json` 中添加 `@monaco-editor/react` 依赖
- [x] 运行 `bun install` 安装依赖
- [x] 验证 Monaco Editor 可以正常导入

**Implementation Notes:**
```bash
cd apps/desktop
bun add @monaco-editor/react
```

## Task 2: 创建 CodeEditor 类型定义

**Requirements:** 2.1, 2.2

**Acceptance Criteria:**
- [x] 创建 `components/code-editor/code-editor.types.ts`
- [x] 定义 `CodeLanguage` 类型，支持 plantuml、mermaid、json、markdown
- [x] 定义 `CodeEditorViewProps` 接口
- [x] 定义 `CodeEditorContainerProps` 接口

## Task 3: 创建 Monaco 语言定义

**Requirements:** 1.2, 1.3

**Acceptance Criteria:**
- [x] 创建 `components/code-editor/code-editor.languages.ts`
- [x] 实现 `registerPlantUMLLanguage` 函数
- [x] 实现 `registerMermaidLanguage` 函数
- [x] 定义关键字、操作符、注释等 token 规则

## Task 4: 创建 CodeEditorView 组件

**Requirements:** 2.1, 2.3, 2.4, 1.4, 1.6

**Acceptance Criteria:**
- [x] 创建 `components/code-editor/code-editor.view.fn.tsx`
- [x] 使用 `@monaco-editor/react` 的 Editor 组件
- [x] 支持 theme prop 切换 light/dark 主题
- [x] 实现 Ctrl+S 快捷键保存
- [x] 配置合理的编辑器选项（minimap、wordWrap 等）
- [x] 使用 memo 包裹组件

## Task 5: 创建 CodeEditorContainer 组件

**Requirements:** 2.5, 3.1, 3.2, 3.3, 3.4

**Acceptance Criteria:**
- [x] 创建 `components/code-editor/code-editor.container.fn.tsx`
- [-] 连接 useContentByNodeId hook 加载内容
- [x] 连接 useTheme hook 获取主题
- [x] 实现内容变化时的防抖保存
- [x] 实现组件卸载时保存未保存的更改

## Task 6: 创建 CodeEditor index 导出

**Requirements:** 2.5

**Acceptance Criteria:**
- [x] 创建 `components/code-editor/index.ts`
- [x] 导出 CodeEditorView、CodeEditorContainer
- [x] 导出类型定义
- [x] 导出语言注册函数

## Task 7: 重构 EditorSaveService

**Requirements:** 3.1, 3.2, 3.3, 3.4, 3.5

**Acceptance Criteria:**
- [ ] 创建 `fn/save/editor-save.service.ts`
- [ ] 实现 `createEditorSaveService` 工厂函数
- [ ] 支持配置 autoSaveDelay
- [ ] 实现 updateContent、saveNow、setInitialContent、dispose 方法
- [ ] 实现 hasUnsavedChanges 方法
- [ ] 在 `fn/save/index.ts` 中导出

## Task 8: 创建 useEditorSave Hook

**Requirements:** 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5

**Acceptance Criteria:**
- [ ] 创建 `hooks/use-editor-save.ts`
- [ ] 封装 createEditorSaveService 的使用
- [ ] 自动连接 useSaveStore 更新状态
- [ ] 处理组件卸载时的清理逻辑
- [ ] 返回 updateContent、saveNow、hasUnsavedChanges
- [ ] 支持 onSave 回调供编辑器快捷键调用

## Task 9: 统一快捷键事件流

**Requirements:** 7.1, 7.2, 7.3, 7.4, 7.5, 7.6

**Acceptance Criteria:**
- [x] Monaco Editor 中注册 Ctrl+S 快捷键，调用 onSave 回调
- [x] 确保 Lexical Editor 的 Ctrl+S 流向统一保存服务
- [x] 确保 Excalidraw Editor 的 Ctrl+S 流向统一保存服务
- [x] 阻止浏览器默认的保存对话框
- [x] 验证快捷键事件流：Editor → Hook → SaveService → DB → Store → UI

## Task 10: 提取 DiagramPreview 组件

**Requirements:** 4.3, 4.4

**Acceptance Criteria:**
- [ ] 创建 `components/diagram-editor/diagram-preview.view.fn.tsx`
- [ ] 从现有 DiagramEditorView 中提取预览相关代码
- [ ] 支持 SVG 内容渲染
- [ ] 支持加载状态显示
- [ ] 支持错误状态显示和重试

## Task 11: 重构 DiagramEditorView 使用 CodeEditor

**Requirements:** 4.1, 4.2, 4.6

**Acceptance Criteria:**
- [ ] 修改 `diagram-editor.view.fn.tsx`
- [ ] 替换 textarea 为 CodeEditorView 组件
- [ ] 保持分屏布局（左侧代码，右侧预览）
- [ ] 传递正确的 language prop (mermaid/plantuml)
- [ ] 传递 onSave 回调支持 Ctrl+S

## Task 12: 重构 DiagramEditorContainer 使用统一保存逻辑

**Requirements:** 4.2, 4.5, 5.2

**Acceptance Criteria:**
- [ ] 修改 `diagram-editor.container.fn.tsx`
- [ ] 使用 useEditorSave hook 替代手动保存逻辑
- [ ] 移除重复的防抖保存代码
- [ ] 保持预览更新逻辑
- [ ] 连接 useSaveStore 更新保存状态

## Task 13: 更新 DiagramEditor 类型定义

**Requirements:** 4.1

**Acceptance Criteria:**
- [ ] 更新 `diagram-editor.types.ts`
- [ ] 添加 theme prop 到 DiagramEditorViewProps
- [ ] 添加 onSave prop 到 DiagramEditorViewProps
- [ ] 移除不再需要的类型

## Task 14: 更新 StoryWorkspace 集成

**Requirements:** 5.1, 5.2, 5.3

**Acceptance Criteria:**
- [ ] 验证 DiagramEditorContainer 在 StoryWorkspace 中正常工作
- [ ] 确保保存状态指示器正确显示
- [ ] 确保标签切换时状态正确保存和恢复

## Task 15: 添加 CodeEditor 单元测试

**Requirements:** 2.5

**Acceptance Criteria:**
- [ ] 创建 `code-editor.view.fn.test.tsx`
- [ ] 测试组件渲染
- [ ] 测试 onChange 回调
- [ ] 测试主题切换

## Task 15: 添加 EditorSaveService 单元测试

**Requirements:** 3.1, 3.2, 3.3, 3.4, 3.5

**Acceptance Criteria:**
- [ ] 创建 `editor-save.service.test.ts`
- [ ] 测试 updateContent 防抖逻辑
- [ ] 测试 saveNow 立即保存
- [ ] 测试 hasUnsavedChanges 状态
- [ ] 测试 dispose 清理

## Task 16: 性能优化 - Monaco 懒加载

**Requirements:** 7.1, 7.5

**Acceptance Criteria:**
- [ ] 配置 Monaco Editor 懒加载
- [ ] 验证首次加载时间改善
- [ ] 添加加载状态指示器

## Task 17: 实现 Mermaid 客户端渲染

**Requirements:** 8.1, 8.2, 8.4, 8.5, 8.6

**Acceptance Criteria:**
- [ ] 创建 `fn/diagram/mermaid.render.fn.ts`
- [ ] 实现 `initMermaid` 函数，支持 light/dark 主题
- [ ] 实现 `renderMermaid` 函数，返回 SVG 或错误
- [ ] 配置 mermaid.js 安全设置（securityLevel）
- [ ] 处理语法错误并返回友好的错误信息

## Task 18: 实现 PlantUML Kroki 渲染

**Requirements:** 8.3

**Acceptance Criteria:**
- [ ] 创建 `fn/diagram/plantuml.render.fn.ts`
- [ ] 实现 `renderPlantUML` 函数，调用 Kroki API
- [ ] 处理网络错误和服务器错误
- [ ] 支持重试逻辑

## Task 19: 创建统一渲染接口

**Requirements:** 8.1, 8.2, 8.3

**Acceptance Criteria:**
- [ ] 更新 `fn/diagram/diagram.render.fn.ts`
- [ ] 实现 `renderDiagram` 统一接口
- [ ] 根据 diagramType 自动选择渲染策略
- [ ] Mermaid 使用客户端渲染，PlantUML 使用 Kroki
- [ ] 在 `fn/diagram/index.ts` 中导出

## Task 20: 更新 DiagramEditorContainer 使用新渲染逻辑

**Requirements:** 8.1, 8.2, 8.3, 8.4, 8.5

**Acceptance Criteria:**
- [ ] 修改 `diagram-editor.container.fn.tsx`
- [ ] 使用 `renderDiagram` 替代直接调用 Kroki
- [ ] Mermaid 类型不再检查 Kroki 配置
- [ ] PlantUML 类型保持 Kroki 配置检查
- [ ] 根据主题初始化 Mermaid

## Task 21: 添加 Mermaid 渲染测试

**Requirements:** 8.1, 8.5

**Acceptance Criteria:**
- [ ] 创建 `fn/diagram/mermaid.render.fn.test.ts`
- [ ] 测试有效 Mermaid 代码渲染
- [ ] 测试无效语法错误处理
- [ ] 测试主题切换

## Task 22: 类型检查和代码清理

**Requirements:** All

**Acceptance Criteria:**
- [ ] 运行 `bun run check` 确保没有类型错误
- [ ] 运行 `bun run lint` 确保没有 lint 错误
- [ ] 移除未使用的导入和代码
- [ ] 更新相关文档注释
