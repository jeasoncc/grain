# Grain / 小麦

> Pure. Elegant. Focused on what matters—your words.

> 🇨🇳 [中文文档](./README.zh-CN.md) | English

![Grain Editor](https://s3.bmp.ovh/imgs/2025/12/13/6647787c1fa17679.png)

Grain is a minimalist writing sanctuary for long-form content. Distraction-free by design, powerful when you need it. Write novels, essays, research papers, or build your knowledge base—all in one elegant space.

---

## ⚡ Performance

Grain delivers world-class performance with multiple deployment options. With 10 documents open:

### Memory Usage (MB)
```
Grain Web ██░░░░░░░░░░░░░░░░░░  32 MB  🏆 97% less than Notion!
Grain App ████░░░░░░░░░░░░░░░░ 166 MB  ⭐ 83% less than Notion
Typora    ██████░░░░░░░░░░░░░░ 280 MB
Obsidian  █████████░░░░░░░░░░░ 450 MB
VS Code   ██████████░░░░░░░░░░ 520 MB
Logseq    █████████████░░░░░░░ 680 MB
Notion    ███████████████████░ 950 MB
          0                    1000
```

### CPU Usage - Idle (%)
```
Grain Web █░░░░░░░░░░░░░░░░░░░ 0.3%   🏆 87% less than VS Code
Grain App █░░░░░░░░░░░░░░░░░░░ 0.6%   ⭐ 75% less than VS Code
Typora    ██░░░░░░░░░░░░░░░░░░ 1.2%
Obsidian  ███░░░░░░░░░░░░░░░░░ 1.8%
VS Code   ████░░░░░░░░░░░░░░░░ 2.4%
Logseq    ██████░░░░░░░░░░░░░░ 3.1%
Notion    █████████░░░░░░░░░░░ 4.5%
          0                    5.0
```

| Metric | Grain Web | Grain Desktop | Competitors (avg) |
|--------|-----------|---------------|-------------------|
| � Memory | **32 MB** 🏆 | **166 MB** ⭐ | 576 MB |
| �🔥 CPU (idle) | **0.3%** 🏆 | **0.6%** ⭐ | 2.4% |
| 🚀 Startup | **< 0.5s** 🏆 | **< 1s** ⭐ | 2-4s |
| 🔋 Battery | **Ultra-low** 🏆 | **Minimal** ⭐ | High |
| 📦 Install | **0 MB** 🏆 | **~50 MB** ⭐ | 200-500 MB |

**Why so fast?**
- 🌐 **Web Version** - Browser-native, zero installation, 32MB memory
- 🦀 **Rust Backend** - Native performance, no JavaScript overhead
- 🎯 **Tauri Architecture** - 83% less memory than Electron apps
- ⚡ **Optimized Rendering** - Efficient React + Lexical integration

**Choose your deployment:**
- 🌐 **Web** - Instant access, ultra-lightweight (32MB)
- 💻 **Desktop** - Native experience, offline-first (166MB)

[📊 View interactive charts with uPlot](./docs/performance-comparison.html)

---

## ✨ Features

- ✍️ **Immersive Writing** - Rich text editor based on Lexical with Markdown shortcuts
- 📂 **Flexible Organization** - Tree-based file management with workspaces
- 🔍 **Powerful Search** - In-file search/replace, global full-text search with regex support
- 🎨 **Icon Theme System** - 6 preset themes, similar to VSCode's icon theme feature
- 📊 **Outline & Chart System** - Complete outline management with Mermaid and PlantUML chart support
- 🏷️ **Tag System** - Organize content with `#[tags]` for easy categorization
- 👤 **Wiki Links** - Quick references via `@` symbol with hover preview
- 📝 **Daily Journal** - Built-in diary system for daily writing
- 💾 **Multiple Export Formats** - JSON, ZIP structured export, Markdown, DOCX, etc.
- ⚙️ **Reliable Storage** - IndexedDB + Dexie for offline persistence
- 🚢 **Cross-Platform** - Windows, macOS, Linux support

---

## 📥 Download

### All Platforms

| Platform | Method | Install Command / Link |
|----------|--------|------------------------|
| 🪟 Windows | Microsoft Store | [Grain / 小麦](ms-windows-store://pdp/?productid=9NV7M2PW25B3) |
| 🪟 Windows | Direct Download | [MSI / NSIS / MSIX](https://github.com/jeasoncc/grain/releases) |
| 🍎 macOS | Direct Download | [DMG (Intel / Apple Silicon)](https://github.com/jeasoncc/grain/releases) |
| 🐧 Linux | Snap Store | `sudo snap install grain` |
| 🐧 Linux | Direct Download | [DEB / RPM / AppImage](https://github.com/jeasoncc/grain/releases) |

---

## 🚀 Quick Start

1. **Create a Workspace** - Start by creating your first workspace
2. **Add Files** - Create files and folders to organize your content
3. **Start Writing** - Use the rich text editor with Markdown shortcuts
4. **Organize with Tags** - Use `#[tag]` to categorize your content
5. **Link Content** - Reference other files with `@filename`

---

## 🛠️ Development

### Prerequisites

- Node.js >= 20
- Bun >= 1.1.0
- Rust (for Tauri)

### Setup

```bash
# Install dependencies
bun install

# Run development server
bun run desktop:dev

# Build for production
bun run build:prod:desktop
```

---

## 📖 Documentation

- [User Guide](./docs/README.md)
- [Development Guide](./docs/development/)
- [API Documentation](./docs/api-server.md)

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) first.

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

---

## 🙏 Acknowledgments

- Built with [Tauri](https://tauri.app/)
- Editor powered by [Lexical](https://lexical.dev/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)

---

## 📧 Contact

- Author: Jeason
- Email: xiaomiquan@aliyun.com
- GitHub: [@jeasoncc](https://github.com/jeasoncc)
