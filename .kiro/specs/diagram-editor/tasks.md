# Implementation Tasks

## Task 1: 创建 Mermaid 和 PlantUML 内容生成函数

**Requirements:** 1.5, 2.5

**Acceptance Criteria:**
- [x] 创建 `diagram.content.fn.ts` 文件
- [x] 实现 `generateMermaidContent` 函数，返回默认 flowchart 模板
- [x] 实现 `generatePlantUMLContent` 函数，返回默认 sequence diagram 模板
- [x] 在 `fn/content/index.ts` 中导出新函数

## Task 2: 创建 Mermaid 和 PlantUML 模板配置

**Requirements:** 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4

**Acceptance Criteria:**
- [x] 创建 `mermaid.config.ts` 使用 `createDateTemplateConfig` 工厂函数
- [x] 创建 `plantuml.config.ts` 使用 `createDateTemplateConfig` 工厂函数
- [x] 在 `configs/index.ts` 中导出新配置
- [x] 在 `templateConfigs` 注册表中添加新配置

## Task 3: 创建 Mermaid 和 PlantUML 创建 Actions

**Requirements:** 1.1, 2.1

**Acceptance Criteria:**
- [x] 创建 `create-mermaid.action.ts` 使用 `createDateTemplateActions` 工厂函数
- [x] 创建 `create-plantuml.action.ts` 使用 `createDateTemplateActions` 工厂函数
- [x] 在 `actions/templated/index.ts` 中导出新 actions
- [x] 导出 `createMermaidCompatAsync` 和 `createPlantUMLCompatAsync`

## Task 4: 创建 DiagramEditor 组件

**Requirements:** 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5

**Acceptance Criteria:**
- [x] 创建 `diagram-editor.types.ts` 定义组件类型
- [x] 创建 `diagram-editor.view.fn.tsx` 纯展示组件
- [x] 创建 `diagram-editor.container.fn.tsx` 容器组件
- [x] 创建 `index.ts` 统一导出
- [x] 实现分屏布局（代码编辑区 + 预览区）
- [x] 实现 Kroki 服务调用和预览渲染
- [x] 实现防抖更新预览
- [x] 实现错误处理和重试

## Task 5: 集成 DiagramEditor 到 StoryWorkspace

**Requirements:** 5.1, 5.2, 5.3, 5.4

**Acceptance Criteria:**
- [x] 在 `story-workspace.container.fn.tsx` 中添加 mermaid/plantuml 类型判断
- [x] 渲染 `DiagramEditorContainer` 组件
- [x] 确保内容加载和保存正常工作

## Task 6: 添加 Activity Bar 图标按钮

**Requirements:** 6.1, 6.2, 6.3, 6.4, 6.5

**Acceptance Criteria:**
- [x] 在 `activity-bar.types.ts` 中添加 `onCreateMermaid` 和 `onCreatePlantUML` 回调
- [x] 在 `icon-theme.interface.ts` 中添加 `mermaid` 和 `plantuml` 图标
- [x] 在 `activity-bar.view.fn.tsx` 中添加 Mermaid 和 PlantUML 按钮
- [x] 在 `activity-bar.container.fn.tsx` 中实现创建逻辑
- [x] 更新图标主题配置

## Task 7: 类型检查和测试

**Requirements:** All

**Acceptance Criteria:**
- [x] 运行 `bun run check` 确保没有类型错误
- [ ] 确保所有导入正确解析
