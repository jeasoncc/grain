# Implementation Plan: Excalidraw File Management

## Overview

本实现计划将现有的 drawing 模块重构为基于文件树的 Excalidraw 文件管理系统。采用与日记功能相同的模板化文件创建模式，使用高阶函数和配置驱动的方式。

**核心特性：**
- Excalidraw 文件存储在文件树中（类型为 `drawing`）
- 文件夹结构：`excalidraw/年/月/日/`（和日记相同）
- 编辑器占据主编辑器区域（和 Lexical 编辑器相同位置）
- 完全删除旧的独立 drawing 系统

## Tasks

- [x] 1. 创建 Excalidraw 内容生成函数
  - [x] 1.1 创建 `fn/content/excalidraw.content.fn.ts`
    - 实现 `generateExcalidrawContent` 函数
    - 生成有效的 Excalidraw JSON 结构
    - 支持自定义 width 和 height
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 1.2 创建 `fn/content/excalidraw.content.fn.test.ts`
    - 测试默认内容生成
    - 测试自定义尺寸
    - 测试 JSON 格式有效性
    - 测试必需字段存在
    - _Requirements: 7.3_

- [x] 2. 创建 Excalidraw 模板配置
  - [x] 2.1 创建 `actions/templated/configs/excalidraw.config.ts`
    - 定义 `ExcalidrawTemplateParams` 接口（包含 title, date, width, height）
    - 创建 `excalidrawParamsSchema` Zod schema
    - 实现 `generateExcalidrawTemplate` 函数
    - 实现 `generateExcalidrawFolderPath` 函数（返回年/月/日文件夹结构）
    - 实现 `generateExcalidrawTitle` 函数（基于日期生成标题）
    - 导出 `excalidrawConfig` 配置对象
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  
  - [x] 2.2 创建 `actions/templated/configs/excalidraw.config.test.ts`
    - 测试配置对象结构
    - 测试 rootFolder 为 "excalidraw"
    - 测试 fileType 为 "drawing"
    - 测试 tag 为 "excalidraw"
    - 测试标题生成（默认和自定义）
    - 测试文件夹路径生成（年/月/日结构）
    - _Requirements: 7.1_

- [x] 3. 创建 Excalidraw 文件创建 Action
  - [x] 3.1 创建 `actions/templated/create-excalidraw.action.ts`
    - 定义 `CreateExcalidrawParams` 接口
    - 使用 `createTemplatedFile` 高阶函数创建 `createExcalidraw`
    - 使用 `createTemplatedFileAsync` 创建 `createExcalidrawAsync`
    - 实现参数适配函数 `adaptExcalidrawParams`
    - 实现兼容函数 `createExcalidrawCompat` 和 `createExcalidrawCompatAsync`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [x] 3.2 创建 `actions/templated/create-excalidraw.action.test.ts`
    - 测试文件创建成功
    - 测试文件位于 excalidraw/年/月/日 目录结构
    - 测试内容格式正确
    - 测试参数适配
    - 测试错误处理
    - _Requirements: 7.2_
  
  - [x] 3.3 更新 `actions/templated/index.ts`
    - 导出 Excalidraw 相关函数和类型
    - _Requirements: 3.3, 3.4_

- [x] 4. 创建 Excalidraw 编辑器组件
  - [x] 4.1 创建 `components/excalidraw-editor/` 目录
    - _Requirements: 5.2_
  
  - [x] 4.2 创建 `components/excalidraw-editor/excalidraw-editor.types.ts`
    - 定义 `ExcalidrawEditorViewProps` 接口
    - 定义 `ExcalidrawEditorContainerProps` 接口
    - _Requirements: 5.2_
  
  - [x] 4.3 创建 `components/excalidraw-editor/excalidraw-editor.view.fn.tsx`
    - 实现纯展示组件
    - 集成 `@excalidraw/excalidraw` 包
    - 支持主题切换
    - 支持 onChange 回调
    - _Requirements: 5.2_
  
  - [x] 4.4 创建 `components/excalidraw-editor/excalidraw-editor.container.fn.tsx`
    - 实现容器组件
    - 从路由获取 nodeId
    - 使用 useNode hook 获取节点数据
    - 解析 Excalidraw JSON
    - 实现自动保存逻辑（debounced）
    - _Requirements: 5.2, 5.4_
  
  - [x] 4.5 创建 `components/excalidraw-editor/index.ts`
    - 导出 View 和 Container 组件
    - _Requirements: 5.2_
  
  - [x] 4.6 创建 `components/excalidraw-editor/excalidraw-editor.view.fn.test.tsx`
    - 测试组件渲染
    - 测试 props 传递
    - 测试主题切换
    - _Requirements: 7.1_
  
  - [x] 4.7 创建 `components/excalidraw-editor/excalidraw-editor.container.fn.test.tsx`
    - 测试数据加载
    - 测试保存逻辑
    - 测试错误处理
    - _Requirements: 7.1_

- [x] 5. 更新路由以支持 Excalidraw 编辑器
  - [x] 5.1 更新 `routes/workspace/$nodeId.tsx`
    - 根据节点类型渲染不同编辑器
    - 当 `node.type === "drawing"` 时渲染 `ExcalidrawEditorContainer`
    - 保持其他类型节点的现有逻辑
    - _Requirements: 5.2, 5.3_

- [x] 6. 删除旧的 Drawing 模块
  - [x] 6.1 删除 `components/drawing/` 目录
    - 删除 `drawing-workspace.tsx`
    - _Requirements: 1.1_
  
  - [x] 6.2 删除 `actions/drawing/` 目录
    - 删除 `create-drawing.action.ts`
    - 删除 `delete-drawing.action.ts`
    - 删除 `rename-drawing.action.ts`
    - 删除 `save-drawing-content.action.ts`
    - 删除 `create-drawing.action.test.ts`
    - 删除 `index.ts`
    - _Requirements: 1.2_
  
  - [x] 6.3 删除 `db/drawing.db.fn.ts` 中的 drawing 相关函数
    - 删除或注释掉 drawing 相关的数据库函数
    - _Requirements: 1.3_
  
  - [x] 6.4 删除 `db/schema.ts` 中的 drawing 相关类型
    - 删除或注释掉 `DrawingInterface` 和相关类型
    - _Requirements: 1.4_
  
  - [x] 6.5 搜索并更新所有导入旧 drawing 代码的文件
    - 搜索 `from "@/actions/drawing"`
    - 搜索 `from "@/components/drawing"`
    - 搜索 `from "@/db/drawing.db.fn"`
    - 更新或删除这些导入
    - _Requirements: 1.5_

- [x] 7. 更新 actions/index.ts
  - [x] 7.1 移除 drawing 相关导出
    - 删除 `export * from "./drawing"`
    - _Requirements: 1.5_
  
  - [x] 7.2 确保 templated actions 已导出
    - 验证 Excalidraw 相关函数可以被导入
    - _Requirements: 3.3, 3.4_

- [x] 8. 更新命令面板集成
  - [x] 8.1 在命令面板中添加 "Create Excalidraw Drawing" 命令
    - 找到命令面板配置文件
    - 添加新命令定义
    - 绑定到 `createExcalidrawAsync` 函数
    - 使用当前日期作为默认参数
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 9. 验证文件树和编辑器集成
  - [x] 9.1 验证 drawing 类型节点在文件树中正确显示
    - 确认图标正确
    - 确认可以点击打开
    - _Requirements: 5.1, 5.2_
  
  - [x] 9.2 验证 Excalidraw 编辑器正确加载
    - 确认路由正确处理 drawing 类型
    - 确认编辑器加载节点内容
    - 确认编辑器占据主编辑器区域
    - 确认保存功能正常
    - _Requirements: 5.2, 5.3, 5.4_
  
  - [x] 9.3 验证删除功能
    - 确认可以从文件树删除 Excalidraw 文件
    - _Requirements: 5.5_

- [x] 10. 运行完整测试套件
  - [x] 10.1 运行单元测试
    - 执行 `bunx vitest run`
    - 确认所有新测试通过
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 10.2 运行类型检查
    - 执行 `bunx tsc --noEmit`
    - 确认无类型错误
    - _Requirements: 7.4_
  
  - [x] 10.3 手动测试完整流程
    - 从命令面板创建 Excalidraw 文件
    - 验证文件出现在 excalidraw/年/月/日 目录
    - 打开并编辑文件
    - 保存并验证内容持久化
    - 删除文件
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4_

- [-] 11. 清理和文档
  - [x] 11.1 搜索残留的 drawing 引用
    - 执行 `grep -r "from.*drawing" apps/desktop/src/`
    - 确认无旧代码引用
    - _Requirements: 1.5_
  
  - [x] 11.2 更新相关文档（如果有）
    - 更新功能说明
    - 更新架构文档
  
  - [-] 11.3 提交所有更改
    - 执行 `git add -A && git commit -m "feat: 重构 drawing 为 Excalidraw 文件管理系统"`

---

## 迁移统计

### 新增文件

| 文件 | 类型 | 说明 |
|------|------|------|
| `fn/content/excalidraw.content.fn.ts` | 函数 | Excalidraw 内容生成 |
| `fn/content/excalidraw.content.fn.test.ts` | 测试 | 内容生成测试 |
| `actions/templated/configs/excalidraw.config.ts` | 配置 | Excalidraw 模板配置 |
| `actions/templated/configs/excalidraw.config.test.ts` | 测试 | 配置测试 |
| `actions/templated/create-excalidraw.action.ts` | Action | Excalidraw 创建 Action |
| `actions/templated/create-excalidraw.action.test.ts` | 测试 | Action 测试 |
| `components/excalidraw-editor/excalidraw-editor.view.fn.tsx` | 组件 | Excalidraw 编辑器 View |
| `components/excalidraw-editor/excalidraw-editor.container.fn.tsx` | 组件 | Excalidraw 编辑器 Container |
| `components/excalidraw-editor/excalidraw-editor.types.ts` | 类型 | 编辑器类型定义 |
| `components/excalidraw-editor/excalidraw-editor.view.fn.test.tsx` | 测试 | View 组件测试 |
| `components/excalidraw-editor/excalidraw-editor.container.fn.test.tsx` | 测试 | Container 组件测试 |
| `components/excalidraw-editor/index.ts` | 导出 | 组件导出 |

### 删除文件

| 文件 | 说明 |
|------|------|
| `components/drawing/drawing-workspace.tsx` | 旧的 Drawing 组件 |
| `actions/drawing/create-drawing.action.ts` | 旧的创建 Action |
| `actions/drawing/delete-drawing.action.ts` | 旧的删除 Action |
| `actions/drawing/rename-drawing.action.ts` | 旧的重命名 Action |
| `actions/drawing/save-drawing-content.action.ts` | 旧的保存 Action |
| `actions/drawing/create-drawing.action.test.ts` | 旧的测试 |
| `actions/drawing/index.ts` | 旧的导出文件 |
| `db/drawing.db.fn.ts` 中的函数 | 旧的数据库函数 |
| `db/schema.ts` 中的 DrawingInterface | 旧的类型定义 |

### 修改文件

| 文件 | 修改内容 |
|------|---------|
| `actions/templated/index.ts` | 添加 Excalidraw 导出 |
| `actions/index.ts` | 移除 drawing 导出 |
| `routes/workspace/$nodeId.tsx` | 添加 drawing 类型路由处理 |
| 命令面板配置 | 添加 Excalidraw 命令 |

### 预计工作量

| Phase | 任务数 | 预计时间 |
|-------|--------|----------|
| Phase 1: 创建内容生成 | 1 | 30 分钟 |
| Phase 2: 创建配置 | 1 | 30 分钟 |
| Phase 3: 创建 Action | 1 | 45 分钟 |
| Phase 4: 创建编辑器组件 | 1 | 1.5 小时 |
| Phase 5: 更新路由 | 1 | 30 分钟 |
| Phase 6: 删除旧代码 | 1 | 30 分钟 |
| Phase 7: 更新导出 | 1 | 15 分钟 |
| Phase 8: 命令面板 | 1 | 20 分钟 |
| Phase 9: 验证集成 | 1 | 30 分钟 |
| Phase 10: 测试 | 1 | 30 分钟 |
| Phase 11: 清理 | 1 | 20 分钟 |
| **总计** | **11** | **~5.5 小时** |
