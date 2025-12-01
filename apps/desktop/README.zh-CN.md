# Novel Editor（小说创作编辑器）

Novel Editor 是一款基于 **Tauri**、**React** 与 **Shadcn UI** 打造的跨平台写作环境，专注于长篇小说创作。它兼顾沉浸式编辑体验、项目组织、资料管理以及多平台打包发布能力，让作者可以在 Linux、Windows 和 macOS 上获得一致的离线创作流程。

> 🇺🇸 English documentation is available in [`README.md`](./README.md)

---

## 核心亮点

- ✍️ **沉浸式写作**：基于 Lexical 的富文本编辑器，支持快捷键、模板和可选的专注模式。
- 📂 **项目结构化管理**：将章节、场景、人物和世界观资料统一管理，支持搜索与标签。
- 🧠 **知识工作台**：关联笔记、参考资料，提供时间线与关系图可视化。
- ⚙️ **可靠存储**：IndexedDB + Dexie 提供离线持久化，可选云同步确保多设备一致。
- 🧪 **质量流程**：集成自动化 Lint、测试与桌面打包，确保版本稳定。
- 🚢 **生产级发布**：一键产出 AppImage、DEB、RPM、MSI、DMG 安装包，预留签名与更新脚本。

---

## 功能分区

### 写作体验

- 富文本编辑、Markdown 快捷格式、模板支持、深浅主题切换。
- 全屏沉浸视图、布局自定义、无干扰模式。
- **可折叠侧边栏**（`Ctrl+B`）：隐藏书库侧边栏，获得最大写作空间。
- 行内批注、版本历史、差异对比，保障创作安全。

### 项目组织

- 书籍 → 章节 → 场景的树状导航与拖拽排序。
- 人物、地点、设定数据库，支持自定义字段与标签。
- **搜索与替换**：
  - 当前文件搜索替换（`Ctrl+F` / `Ctrl+H`）：支持区分大小写、全字匹配、正则表达式
  - 全局搜索（`Ctrl+Shift+F`）：跨场景、角色、世界观的全文搜索，关键词高亮，智能排序
- 导入导出（Markdown、DOCX、JSON）、自动备份与快照恢复。

### 创作增效

- 日写目标、进度仪表板、剧情时间线。
- 场景卡片、卡片墙大纲、剧情弧线规划工具。
- 可选 AI 辅助：灵感提示、文案润色、剧情续写。

### 平台支持与打包

- Tauri 驱动的离线桌面应用。
- 已配置多平台打包、图标资源、签名钩子。
- 结构化日志（内置日志视图 + Dexie 持久化）便于定位问题。

---

## 路线图概览

- **近期**：项目模板、创建/导入对话框、自动保存与快照、实体元数据扩展、Lint/测试覆盖。
- **中期**：协作云同步（WebDAV/Supabase）、AI 辅助功能、导出格式扩充、拼写语法工具。
- **远期**：插件生态、移动端伴侣、实时协作、社区内容市场。

进度将同步到 `docs/roadmap.md`（规划中），以及 issue 标签（`status:planned`、`status:in-progress`）。

---

## 技术栈

- **前端**：React、TypeScript、Vite、Tailwind CSS、Shadcn UI、Lexical。
- **数据与状态**：Dexie.js（IndexedDB）、TanStack Query & Router、Zustand。
- **桌面外壳**：Tauri（Rust）、Consola 日志、多平台打包资源。
- **工具链**：Biome（格式化/Lint）、Vitest、Playwright、GitHub Actions CI。

---

## 快速开始

### 环境准备

- Node.js ≥ 20
- Rust 与 Cargo（Tauri 工具链）
- 可选：Bun（加速脚本执行）
- 各平台 [Tauri 依赖](https://tauri.app/v1/guides/getting-started/prerequisites)

### 安装依赖

```bash
# 使用 npm
npm install

# 或者使用 bun
bun install
```

### 开发模式

```bash
npm run dev         # 启动 Vite + Tauri 联合调试
npm run tauri dev   # 仅启动 Tauri 外壳调试
```

前端开发服务器默认运行在 `http://localhost:1420`。

### 构建与打包

```bash
npm run build       # TypeScript 检查 + 前端打包 + Tauri 产物准备
npm run preview     # 预览生产版构建
npm run tauri build # 生成 AppImage/DEB/RPM/MSI/DMG 安装包
```

> Linux 平台打包需要预先安装 `patchelf`、`appimagetool`、`desktop-file-utils` 与 `fuse2`。

---

## 开发脚本

| 脚本         | 说明                                           |
|--------------|-----------------------------------------------|
| `dev`        | 启动开发环境                                   |
| `build`      | TypeScript 检查 + 前端构建 + Tauri 产物准备    |
| `preview`    | 本地预览生产构建                              |
| `tauri`      | 代理执行 Tauri CLI                            |
| `format`     | 使用 Biome 进行格式化                          |
| `lint`       | 使用 Biome 进行 Lint                          |
| `check`      | Biome 运行类型 + Lint 综合检查                 |
| `test`       | 运行单元与组件测试（Vitest）                   |
| `test:e2e`   | 运行端到端测试（Playwright）                   |
| `diff`       | 将暂存区 diff 保存到 `diff.txt`                |

---

## 架构概览

```
src/
├─ components/         可复用 UI 组件与功能块
│  ├─ ui/              基于 Shadcn 的 UI 原子组件
│  └─ blocks/          功能级组件（EmptyProject、对话框等）
├─ routes/             TanStack Router 路由树
├─ db/                 Dexie Schema 与 CRUD 封装
├─ lib/                共用工具与日志模块
├─ assets/             静态资源
└─ styles.css          Tailwind 全局样式

src-tauri/
├─ src/main.rs         Tauri 入口与命令处理
├─ src/lib.rs          Rust 工具模块
├─ icons/              各平台图标资源
└─ tauri.conf.json     Tauri 配置
```

核心流程：

- React + TanStack Router 管理布局，TanStack Query 负责数据请求与缓存。
- Dexie 定义书籍、章节、场景、设定等结构；通过封装 Hook 暴露类型化 CRUD。
- Tauri Commands 负责文件系统、同步服务与系统能力桥接。
- Consola 驱动的日志写入本地数据库，并在 `/log` 页面可视化。

---

## 质量与测试

- **类型约束**：严格 TypeScript + Biome 检查。
- **单元/组件测试**：使用 Vitest + React Testing Library。
- **端到端测试**：Playwright 覆盖项目生命周期关键路径。
- **Rust 端**：`cargo test` + Clippy + rustfmt 保持一致性。
- **持续集成**：GitHub Actions（或自选 CI）在 PR 上运行 lint、测试、打包验证。

---

## 贡献指南

1. Fork 仓库并创建特性分支。
2. 提交 PR 前运行 `npm run lint` 与 `npm run test`。
3. UI 相关改动附上截图或演示视频。
4. 桌面端改动请注明测试平台与打包验证情况。

Issue 模板与贡献指南将放置于 `.github/`（筹备中）。欢迎在 Discussion 中反馈创意与路线建议。

---

## 许可证

项目采用 MIT License，详见 [`LICENSE`](./LICENSE)。

