# Grain Editor - 核心功能开发清单

## 🎯 核心功能

### 1. Org-mode 全面支持 ⭐⭐⭐⭐⭐

**目标：** 让 Lexical 编辑器全面支持 Org-mode 语法，成为最强大的 Org-mode 编辑器

#### Phase 1: 基础语法支持（MVP - 2 周）

- [ ] **Org Heading 节点**
  - [ ] 创建 `OrgHeadingNode` 自定义节点
  - [ ] 实现 `OrgHeadingPlugin` 插件
  - [ ] 支持 `*` → H1, `**` → H2, `***` → H3 等
  - [ ] 集成现有的 `HeadingFoldPlugin` 折叠功能
  - 文件位置：`packages/editor-lexical/src/orgmode/nodes/org-heading.node.ts`

- [ ] **TODO 状态节点**
  - [ ] 创建 `OrgTodoNode` 自定义节点
  - [ ] 实现 `OrgTodoPlugin` 插件
  - [ ] 支持 `TODO`, `DONE`, `WAITING` 等状态
  - [ ] 快捷键切换状态（Ctrl+Shift+T）
  - 文件位置：`packages/editor-lexical/src/orgmode/nodes/org-todo.node.ts`

- [ ] **Org 链接支持**
  - [ ] 创建 `OrgLinkNode` 自定义节点
  - [ ] 实现 `OrgLinkPlugin` 插件
  - [ ] 支持 `[[link]]` 和 `[[link][description]]` 格式
  - [ ] 自动转换和点击跳转
  - 文件位置：`packages/editor-lexical/src/orgmode/nodes/org-link.node.ts`

- [ ] **基础导入导出**
  - [ ] 实现 `org-to-lexical.ts` 转换器
  - [ ] 实现 `lexical-to-org.ts` 转换器
  - [ ] 支持基础语法的往返转换
  - 文件位置：`packages/editor-lexical/src/orgmode/transformers/`

#### Phase 2: 高级语法支持（3 周）

- [ ] **优先级标记**
  - [ ] 创建 `OrgPriorityNode` 自定义节点
  - [ ] 实现 `OrgPriorityPlugin` 插件
  - [ ] 支持 `[#A]`, `[#B]`, `[#C]` 优先级
  - [ ] 快捷键设置优先级
  - 文件位置：`packages/editor-lexical/src/orgmode/nodes/org-priority.node.ts`

- [ ] **标签系统增强**
  - [ ] 增强现有 `TagNode` 支持 Org 标签格式
  - [ ] 支持 `:tag1:tag2:` 格式
  - [ ] 标签继承（子标题继承父标题标签）
  - [ ] 标签搜索和过滤
  - 文件位置：`packages/editor-lexical/src/orgmode/plugins/org-tag-plugin.ts`

- [ ] **时间戳支持**
  - [ ] 创建 `OrgTimestampNode` 自定义节点
  - [ ] 实现 `OrgTimestampPlugin` 插件
  - [ ] 支持 `<2024-01-18>` 和 `[2024-01-18]` 格式
  - [ ] 日期选择器 UI
  - [ ] 时间范围支持
  - 文件位置：`packages/editor-lexical/src/orgmode/nodes/org-timestamp.node.ts`

- [ ] **复选框增强**
  - [ ] 增强现有 `ChecklistShortcutPlugin`
  - [ ] 支持 `[ ]`, `[X]`, `[-]` 三种状态
  - [ ] 自动计算父项完成度
  - 文件位置：`packages/editor-lexical/src/plugins/checklist-shortcut-plugin.tsx`

#### Phase 3: 高级特性（4 周）

- [ ] **属性抽屉**
  - [ ] 创建 `OrgDrawerNode` 自定义节点
  - [ ] 支持 `:PROPERTIES:` ... `:END:` 格式
  - [ ] 属性编辑 UI
  - 文件位置：`packages/editor-lexical/src/orgmode/nodes/org-drawer.node.ts`

- [ ] **Agenda 视图**
  - [ ] 创建 Agenda 侧边栏视图
  - [ ] 按日期聚合 TODO 和时间戳
  - [ ] 日历视图
  - [ ] 过滤和搜索
  - 文件位置：`apps/desktop/src/views/agenda/`

- [ ] **时间跟踪**
  - [ ] CLOCK 功能支持
  - [ ] 时间统计和报告
  - 文件位置：`packages/editor-lexical/src/orgmode/plugins/org-clock-plugin.ts`

- [ ] **导出功能**
  - [ ] 导出为 .org 文件
  - [ ] 导出为 HTML
  - [ ] 导出为 Markdown
  - 文件位置：`packages/editor-lexical/src/orgmode/plugins/org-export-plugin.ts`

---

### 2. Typst 精美排版导出 ⭐⭐⭐⭐⭐

**目标：** 将 Org-mode 内容导出为出版级别的精美 PDF 电子书

#### Phase 1: Typst 核心集成（1 周）

- [ ] **Rust 后端集成**
  - [ ] 添加 Typst 依赖到 `packages/rust-core/Cargo.toml`
  - [ ] 实现 `GrainTypstWorld` (Typst World trait)
  - [ ] 实现 `TypstCompiler` 编译器
  - [ ] 字体系统集成（支持中文字体）
  - 文件位置：`packages/rust-core/src/export/typst/`

- [ ] **Tauri Commands**
  - [ ] `export_org_to_pdf` - 导出 PDF
  - [ ] `preview_typst_page` - 预览页面（SVG）
  - [ ] `list_typst_templates` - 列出模板
  - 文件位置：`packages/rust-core/src/tauri/commands/export_commands.rs`

- [ ] **Org → Typst 转换器**
  - [ ] 实现 `OrgToTypstConverter`
  - [ ] 标题转换：`* Heading` → `= Heading`
  - [ ] 列表转换
  - [ ] 表格转换
  - [ ] 代码块转换
  - [ ] 链接转换
  - 文件位置：`packages/rust-core/src/export/converters/org_to_typst.rs`

#### Phase 2: 模板系统（2 周）

- [ ] **模板管理器**
  - [ ] 实现 `TemplateManager`
  - [ ] 模板加载和缓存
  - [ ] 模板变量替换
  - 文件位置：`packages/rust-core/src/export/typst/templates.rs`

- [ ] **内置精美模板**
  - [ ] 优雅书籍模板 (`book/elegant.typ`)
  - [ ] 现代书籍模板 (`book/modern.typ`)
  - [ ] 经典书籍模板 (`book/classic.typ`)
  - [ ] 学术论文模板 (`article/academic.typ`)
  - [ ] 杂志风格模板 (`article/magazine.typ`)
  - [ ] 技术文档模板 (`report/technical.typ`)
  - 文件位置：`templates/typst/`

- [ ] **模板预览系统**
  - [ ] 模板缩略图生成
  - [ ] 模板预览 UI
  - 文件位置：`apps/desktop/src/views/export/template-gallery.view.tsx`

#### Phase 3: 前端集成（2 周）

- [ ] **导出流程**
  - [ ] 实现 `export-typst.flow.ts`
  - [ ] 实现 `preview-typst.flow.ts`
  - [ ] 错误处理和日志
  - 文件位置：`apps/desktop/src/flows/export/`

- [ ] **导出对话框 UI**
  - [ ] 模板选择器
  - [ ] 导出选项配置（标题、作者、日期等）
  - [ ] 实时预览
  - [ ] 进度显示
  - 文件位置：`apps/desktop/src/views/export/typst-export-dialog.view.tsx`

- [ ] **导出配置管理**
  - [ ] 保存常用配置
  - [ ] 配置预设
  - 文件位置：`apps/desktop/src/state/export-config.state.ts`

#### Phase 4: 高级功能（2 周）

- [ ] **自定义模板编辑器**
  - [ ] Typst 语法高亮
  - [ ] 实时预览
  - [ ] 模板变量管理
  - 文件位置：`apps/desktop/src/views/export/template-editor.view.tsx`

- [ ] **批量导出**
  - [ ] 多文档批量导出
  - [ ] 导出队列管理
  - 文件位置：`apps/desktop/src/flows/export/batch-export.flow.ts`

- [ ] **导出增强**
  - [ ] 封面自动生成
  - [ ] 目录自动生成
  - [ ] 页眉页脚自定义
  - [ ] 水印支持
  - 文件位置：`packages/rust-core/src/export/typst/enhancements.rs`

---

## 📋 开发规范

### 架构规范
- 遵循函数式数据流架构（`#architecture`）
- 严格遵守依赖规则：`views/ → hooks/ → flows/ → pipes/ + io/`
- 所有业务逻辑在 `flows/` 层，`hooks/` 只负责数据绑定

### 文件命名规范
- Nodes: `*.node.ts` / `*.node.tsx`
- Plugins: `*-plugin.ts` / `*-plugin.tsx`
- Flows: `*.flow.ts`
- Pipes: `*.pipe.ts`
- Views: `*.view.tsx` / `*.view.fn.tsx`
- State: `*.state.ts`

### Git 提交规范
- `feat:` 新功能
- `fix:` 修复 bug
- `refactor:` 重构
- `docs:` 文档
- `test:` 测试

---

## 🎯 里程碑

### Milestone 1: Org-mode MVP (2 周)
- ✅ 基础标题、TODO、链接支持
- ✅ 基础导入导出
- ✅ 可以创建和编辑简单的 Org 文档

### Milestone 2: Typst 导出 MVP (1 周)
- ✅ Typst 核心集成
- ✅ 基础 Org → Typst 转换
- ✅ 1-2 个精美模板
- ✅ 可以导出精美 PDF

### Milestone 3: 完整 Org-mode (5 周)
- ✅ 所有 Org-mode 核心语法
- ✅ Agenda 视图
- ✅ 完整导出功能

### Milestone 4: 完整 Typst 系统 (5 周)
- ✅ 完整模板库
- ✅ 自定义模板编辑器
- ✅ 批量导出和高级功能

---

## 📝 备注

- 优先级：Org-mode 基础支持 > Typst 基础导出 > 高级功能
- 每个 Phase 完成后进行测试和代码审查
- 保持代码质量，遵循项目规范
- 及时更新文档

---

**创建日期：** 2026-01-18
**最后更新：** 2026-01-18
