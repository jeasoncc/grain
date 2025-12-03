# Novel Editor Monorepo

> Professional long-form fiction writing tool - Desktop app + Website

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.2+-black?logo=bun)](https://bun.sh)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.0+-blue?logo=turborepo)](https://turbo.build)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue?logo=typescript)](https://www.typescriptlang.org/)

Novel Editor is a modern long-form fiction writing toolset built with a Monorepo architecture, including a cross-platform desktop application and official website.

> 🇨🇳 [中文文档](./README.zh-CN.md) | English

---
![](https://s3.bmp.ovh/imgs/2025/11/30/17e3f22342be954f.png)

![](https://s3.bmp.ovh/imgs/2025/11/30/20c87f8ef08b246d.png)

## 🎯 Project Overview

This is a **Turborepo**-based Monorepo project using **Bun** as the package manager and runtime, containing two main applications:

- **Desktop App** (`apps/desktop`) - Cross-platform desktop application based on Tauri + React
- **Website** (`apps/web`) - Official website based on Next.js 15

## ✨ Key Features

### Desktop Application

- ✍️ **Immersive Writing** - Rich text editor based on Lexical with Markdown shortcuts
- 📂 **Structured Project Management** - Tree-based organization: Books → Chapters → Scenes
- 🔍 **Powerful Search** - In-file search/replace, global full-text search with regex support
- 🎨 **Icon Theme System** - 6 preset themes, similar to VSCode's icon theme feature
- 📊 **Outline & Chart System** - Complete outline management with Mermaid and PlantUML chart support
- 👤 **Character Mention** - Quick character references via `@` symbol with hover Wiki display
- 💾 **Multiple Export Formats** - JSON, ZIP structured export, Markdown, DOCX, etc.
- ⚙️ **Reliable Storage** - IndexedDB + Dexie for offline persistence
- 🚢 **Production-Ready** - One-command build for AppImage, DEB, RPM, MSI, DMG installers

### Web Website

- 🎨 **Modern Design** - Beautiful UI design with dark mode support
- 📱 **Fully Responsive** - Perfect adaptation for mobile, tablet, and desktop
- ⚡ **Performance Optimized** - Next.js 15 App Router for lightning-fast loading
- ♿ **Accessibility Friendly** - WCAG compliant with keyboard navigation support
- 🔍 **SEO Optimized** - Complete metadata and Open Graph tags
- 📚 **Documentation System** - Three-column layout documentation center with search and outline navigation

## 📁 Project Structure

```
novel-editor-monorepo/
├── apps/
│   ├── desktop/          # Tauri desktop application
│   │   ├── src/          # React application source
│   │   ├── src-tauri/    # Tauri backend (Rust)
│   │   └── package.json
│   └── web/              # Next.js website
│       ├── src/          # Next.js application source
│       └── package.json
├── packages/             # Shared packages (future expansion)
├── docs/                 # Project documentation center
│   ├── desktop/          # Desktop application docs
│   ├── web/              # Web project docs
│   ├── deployment/       # Deployment docs
│   └── development/      # Development docs
├── scripts/              # Build and development scripts
├── turbo.json            # Turborepo configuration
├── package.json          # Root package.json
└── README.md             # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **Bun** ≥ 1.1.0 (Recommended for faster performance)
- **Rust** & **Cargo** (Desktop app only, for Tauri)
- Platform-specific [Tauri dependencies](https://tauri.app/v1/guides/getting-started/prerequisites)

### Install Dependencies

```bash
# Using Bun (Recommended)
bun install

# Or using npm
npm install
```

### Development Mode

```bash
# Run all applications simultaneously
bun dev

# Run desktop app only
bun desktop:dev
# Or
turbo run dev --filter=desktop

# Run website only
bun web:dev
# Or
turbo run dev --filter=web
```

Development server addresses:
- Desktop frontend: `http://localhost:1420`
- Web website: `http://localhost:3000`

### Build

```bash
# Build all applications
bun build

# Build specific application
turbo run build --filter=desktop
turbo run build --filter=web
```

### Desktop Application Packaging

```bash
cd apps/desktop
npm run tauri build
```

This will generate platform-specific installers:
- Linux: AppImage, DEB, RPM
- Windows: MSI
- macOS: DMG

## 📜 Available Scripts

Execute in the project root:

| Script | Description |
|--------|-------------|
| `bun dev` | Start all applications' development servers |
| `bun build` | Build all applications |
| `bun lint` | Run lint checks on all applications |
| `bun format` | Format code in all applications |
| `bun check` | Run type checking and lint |
| `bun clean` | Clean all build artifacts |
| `bun desktop:dev` | Start desktop app development server only |
| `bun web:dev` | Start website development server only |

## 🛠️ Tech Stack

### Monorepo Tools
- **Turborepo** 2.0+ - High-performance build system
- **Bun** - Package manager, runtime, and build tool
- **Workspaces** - Workspace management

### Desktop Application
- **Frontend Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Shadcn UI + Radix UI
- **Editor**: Lexical (rich text editor)
- **State Management**: Zustand + TanStack Query
- **Routing**: TanStack Router
- **Database**: Dexie.js (IndexedDB)
- **Desktop Framework**: Tauri (Rust)
- **Styling**: Tailwind CSS
- **Code Quality**: Biome

### Web Website
- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Shadcn UI + Radix UI
- **Icons**: Lucide React
- **Theme**: next-themes

### Tooling
- **Code Formatting/Checking**: Biome
- **Type Checking**: TypeScript (strict mode)
- **Testing**: Vitest + Playwright (planned)
- **CI/CD**: GitHub Actions

## 📚 Documentation

> 📖 **Complete Documentation Center**: See [`docs/README.md`](./docs/README.md) for all documentation

### Quick Navigation

- 🚀 [Getting Started](./docs/project/START_HERE.md) - Start here!
- ⚡ [Quick Start](./docs/project/QUICKSTART.md) - 5-minute guide
- 🖥️ [Desktop Application Docs](./docs/desktop/README.md) - Complete desktop app documentation
- 🌐 [Web Project Docs](./docs/web/README.md) - Website project documentation
- 🔧 [Development Guide](./docs/development/README.md) - Development environment setup and build guide
- 🚢 [Deployment Guide](./docs/deployment/README.md) - Deployment-related documentation

### Sub-project Documentation

- [Desktop App](./apps/desktop/README.md) - Detailed Tauri desktop application documentation
- [Desktop App (中文)](./apps/desktop/README.zh-CN.md) - Chinese documentation
- [Website](./apps/web/README.md) - Detailed Next.js website documentation

## 🏗️ Architecture Overview

### Monorepo Benefits

- **Code Sharing**: Share type definitions, utility functions, etc. across multiple applications
- **Unified Build**: Use Turborepo for incremental builds and caching
- **Unified Management**: Unified dependency, version, and script management
- **Fast Development**: Parallel builds and development servers

### Turborepo Configuration

The project uses Turborepo for task orchestration, with main configuration in `turbo.json`:

- **Build Cache**: Automatically cache build artifacts to speed up subsequent builds
- **Task Dependencies**: Automatically manage dependencies between tasks
- **Parallel Execution**: Run independent tasks in parallel for efficiency
- **Output Management**: Automatically manage build outputs for each application

### Workflow

```
┌─────────────────────────────────────────┐
│         Root Package.json               │
│  (Turborepo task orchestration)        │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼──────┐  ┌────────▼────────┐
│  Desktop App │  │   Web Website   │
│  (Tauri)     │  │   (Next.js)     │
│              │  │                 │
│  • React     │  │  • Next.js 15   │
│  • Vite      │  │  • App Router   │
│  • Lexical   │  │  • Tailwind CSS │
│  • Dexie     │  │                 │
└──────────────┘  └─────────────────┘
```

## 🔧 Development Guidelines

### Code Standards

- **TypeScript**: Strict mode, prioritize type safety
- **Code Format**: Use Biome for unified formatting
- **Component Standards**: Functional components, use TypeScript interfaces for Props
- **Styling**: Use Tailwind CSS, follow design system

### Commit Standards

Recommend using conventional commits:

```bash
feat(desktop): Add new search feature
fix(web): Fix scrolling issue on docs page
docs: Update README documentation
```

### Adding New Features

1. Create feature branch: `git checkout -b feat/new-feature`
2. Develop and test
3. Run checks: `bun check`
4. Commit code: `git commit -m "feat: new feature"`
5. Push and create PR

## 🧪 Testing

```bash
# Run all tests (planned)
bun test

# Run desktop app tests
cd apps/desktop && npm test

# Run E2E tests
cd apps/desktop && npm run test:e2e
```

## 🚢 Deployment

### Desktop Application

The desktop application can be packaged as installers for each platform:

```bash
cd apps/desktop
npm run tauri build
```

### Web Website

The website can be deployed to any platform that supports Next.js:

- **Vercel** (Recommended) - Zero-config deployment
- **Netlify** - Supports SSR
- **Cloudflare Pages** - Edge computing
- **Self-hosted** - Use Docker or run directly

For detailed deployment guides, see [Deployment Documentation](./docs/deployment/README.md).

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Create a Pull Request

### Contribution Guidelines

- Code must pass lint and type checks
- UI changes should include screenshots or demo videos
- Desktop changes should note the tested platform
- Major changes should first create an issue for discussion

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

## 📧 Contact

- **GitHub**: [@jeasoncc/novel-editor](https://github.com/jeasoncc/novel-editor)
- **Email**: xiaomiquan@aliyun.com

## 🙏 Acknowledgments

Thank you to all developers who have contributed to this project!

---

**Get Started**: Check out the [Quick Start Guide](./docs/project/QUICKSTART.md) to learn more!
