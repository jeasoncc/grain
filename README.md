# Novel Editor Monorepo

> 专业的长篇小说写作工具 - 桌面应用 + 官网

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.2+-black?logo=bun)](https://bun.sh)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.0+-blue?logo=turborepo)](https://turbo.build)

这是 Novel Editor 的 monorepo 项目，包含桌面应用和官网。

## 项目结构

```
novel-editor-monorepo/
├── apps/
│   ├── desktop/     # Tauri 桌面应用
│   └── web/         # Next.js 官网
├── packages/        # 共享包（未来扩展）
└── turbo.json       # Turborepo 配置
```

## 快速开始

### 安装依赖

```bash
bun install
```

### 开发

```bash
# 同时运行所有应用
bun dev

# 只运行桌面应用
bun desktop:dev

# 只运行官网
bun web:dev
```

### 构建

```bash
bun build
```

## 子项目

- [Desktop App](./apps/desktop/README.md) - Tauri 桌面应用
- [Website](./apps/web/README.md) - Next.js 官网

## 技术栈

- **Monorepo**: Turborepo + Bun Workspaces
- **Desktop**: Tauri + React + TypeScript
- **Website**: Next.js 15 + Tailwind CSS
- **UI**: Shadcn UI
- **Linting**: Biome

## 📖 文档

> 📚 **完整文档中心**：查看 [`docs/README.md`](./docs/README.md) 获取所有文档

### 快速导航

- 🚀 [开始使用](./docs/project/START_HERE.md) - 从这里开始！
- ⚡ [快速开始](./docs/project/QUICKSTART.md) - 5分钟上手
- 📚 [文档中心](./docs/README.md) - 完整的文档索引
- 🖥️ [Desktop 应用文档](./docs/desktop/README.md) - 桌面应用完整文档
- 🌐 [Web 项目文档](./apps/web/README.md) - 官网项目文档

### 子项目文档

- [Desktop App](./apps/desktop/README.md) - Tauri 桌面应用
- [Website](./apps/web/README.md) - Next.js 官网

## License

MIT
