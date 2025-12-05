# Novel Editor Mobile

Novel Editor 移动端应用 - 专业的长篇小说写作工具

## 📱 简介

这是 Novel Editor 的移动端版本，基于 React Native 和 Expo 构建，提供与桌面版相同的功能和体验。

## ✨ 功能特性

- ✍️ **沉浸式写作** - 基于 Lexical 的富文本编辑器，支持 Markdown 快捷键
- 📂 **结构化项目管理** - 树形组织：Books → Chapters → Scenes
- 🔍 **强大搜索** - 文件内搜索/替换，全局全文搜索，支持正则表达式
- 🎨 **主题系统** - 支持明暗主题切换
- 📊 **大纲系统** - 完整的大纲管理功能
- 👤 **角色管理** - 角色提及和 Wiki 系统
- 💾 **多种导出格式** - JSON, ZIP, Markdown, DOCX 等
- ⚙️ **可靠存储** - 本地数据库存储，离线使用

## 🚀 快速开始

### 环境要求

- Node.js ≥ 20
- Bun ≥ 1.1.0（推荐）
- Expo CLI
- iOS 开发需要 Xcode 和 CocoaPods
- Android 开发需要 Android Studio

### 安装依赖

```bash
# 在项目根目录
bun install

# 或者在 mobile 目录
cd apps/mobile
bun install
```

### 开发模式

```bash
# 从项目根目录
bun mobile:dev

# 或者在 mobile 目录
cd apps/mobile
bun dev
```

### 运行在特定平台

```bash
# iOS 模拟器
bun ios

# Android 模拟器/设备
bun android

# Web 浏览器
bun web
```

### 构建

```bash
# 构建所有平台
bun build

# 生产构建
bun build:prod

# 测试构建
bun build:test

# Android 构建（需要 EAS）
bun build:android

# iOS 构建（需要 EAS）
bun build:ios
```

## 📁 项目结构

```
mobile/
├── src/
│   ├── components/     # React 组件
│   ├── db/            # 数据库配置和模型
│   ├── hooks/         # 自定义 Hooks
│   ├── lib/           # 工具函数
│   ├── routes/        # 路由配置
│   ├── services/      # 业务逻辑服务
│   ├── stores/        # 状态管理（Zustand）
│   └── utils/         # 工具函数
├── app/               # Expo Router 路由页面
├── assets/            # 静态资源
├── app.json           # Expo 配置
└── package.json       # 项目依赖
```

## 🛠️ 技术栈

- **框架**: React Native 0.76+
- **构建工具**: Expo 52
- **路由**: Expo Router 4
- **状态管理**: Zustand + TanStack Query
- **数据存储**: MMKV / AsyncStorage
- **类型检查**: TypeScript 5.8+
- **代码质量**: Biome

## 📝 开发说明

### 与 Desktop 版本的区别

- **数据存储**: 使用 MMKV/AsyncStorage 替代 IndexedDB
- **UI 组件**: 使用 React Native 组件替代 Web 组件
- **路由**: 使用 Expo Router 替代 TanStack Router
- **编辑器**: 使用 React Native 兼容的富文本编辑器

### 功能迁移计划

- [x] 项目基础结构
- [ ] 数据模型和存储
- [ ] 路由和导航
- [ ] 核心编辑器
- [ ] 项目管理
- [ ] 搜索功能
- [ ] 大纲系统
- [ ] 角色管理
- [ ] 导出功能
- [ ] 设置系统

## 📄 许可证

MIT



