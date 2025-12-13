# 小麦写作 / Wheat Editor

> 现代化、强大的小说写作应用，为严肃作家打造

> 🇺🇸 [English](./README.md) | 中文

![2025-12-08_21-55.png](https://s3.bmp.ovh/imgs/2025/12/13/71e3de193278ba4b.png)

![2025-12-13_20-21.png](https://s3.bmp.ovh/imgs/2025/12/13/3c8f3105d88491f1.png)

![2025-12-13_20-21_1.png](https://s3.bmp.ovh/imgs/2025/12/13/d2f9299e0b5f049f.png)

![Untitled123.png](https://s3.bmp.ovh/imgs/2025/12/13/6647787c1fa17679.png)


小麦写作是专为小说家和长篇小说作者设计的专业写作工具。采用现代技术构建，提供无干扰的写作环境和强大的组织功能。

---

## ✨ 功能特性

- ✍️ **沉浸式写作** - 基于 Lexical 的富文本编辑器，支持 Markdown 快捷格式
- 📂 **项目结构化管理** - 书籍 → 章节 → 场景的树状组织
- 🔍 **强大的搜索功能** - 当前文件搜索替换、全局全文搜索，支持正则表达式
- 🎨 **图标主题系统** - 6 种预设主题，类似 VSCode 的图标主题功能
- 📊 **大纲与图表系统** - 完整的大纲管理，支持 Mermaid 和 PlantUML 图表
- 👤 **角色提及功能** - 通过 `@` 符号快速引用角色，悬停显示 Wiki 信息
- 💾 **多种导出格式** - JSON、ZIP 结构化导出，Markdown、DOCX 等
- ⚙️ **可靠存储** - IndexedDB + Dexie 提供离线持久化
- 🚢 **跨平台支持** - Windows、macOS、Linux 全平台支持

---

## 📥 下载安装

### 全平台安装方式

| 平台 | 安装方式 | 安装命令 / 链接 |
|------|----------|-----------------|
| 🪟 Windows | 微软应用商店 | [小麦写作](ms-windows-store://pdp/?productid=9NV7M2PW25B3) |
| 🪟 Windows | Winget | `winget install Jeason.NovelEditor` |
| 🪟 Windows | Scoop | `scoop install extras/novel-editor` |
| 🪟 Windows | Chocolatey | `choco install novel-editor` |
| 🪟 Windows | 直接下载 | [MSI / NSIS / MSIX](https://github.com/Jeason-Lotus/novel-editor/releases) |
| 🍎 macOS | Homebrew | `brew install --cask novel-editor` |
| 🍎 macOS | 直接下载 | [DMG (Intel / Apple Silicon)](https://github.com/Jeason-Lotus/novel-editor/releases) |
| 🐧 Linux | Snap Store | `sudo snap install novel-editor-app` |
| 🐧 Linux | Flatpak | `flatpak install flathub com.lotus.NovelEditor` |
| 🐧 Linux | AUR (Arch) | `yay -S novel-editor-bin` |
| 🐧 Linux | DEB (Ubuntu/Debian) | [下载 DEB](https://github.com/Jeason-Lotus/novel-editor/releases) |
| 🐧 Linux | RPM (Fedora/RHEL) | [下载 RPM](https://github.com/Jeason-Lotus/novel-editor/releases) |
| 🐧 Linux | AppImage | [下载 AppImage](https://github.com/Jeason-Lotus/novel-editor/releases) |
| 🐧 Linux | Ubuntu PPA | `sudo add-apt-repository ppa:jeason/novel-editor` |
| 🐧 Linux | Fedora COPR | `sudo dnf copr enable jeason/novel-editor` |

---

### 🪟 Windows

#### 微软应用商店（推荐）
[![从微软商店获取](https://get.microsoft.com/images/zh-cn%20dark.svg)](ms-windows-store://pdp/?productid=9NV7M2PW25B3)

在微软应用商店搜索"小麦写作"或"Wheat Editor"即可下载。

#### 包管理器安装
```bash
# Winget
winget install Jeason.NovelEditor

# Scoop
scoop install extras/novel-editor

# Chocolatey
choco install novel-editor
```

---

### 🍎 macOS

```bash
# Homebrew
brew install --cask novel-editor
```

或从 [GitHub Releases](https://github.com/Jeason-Lotus/novel-editor/releases) 下载 DMG 安装包。

---

### 🐧 Linux

```bash
# Snap（所有发行版）
sudo snap install novel-editor-app

# Flatpak（所有发行版）
flatpak install flathub com.lotus.NovelEditor

# Arch Linux (AUR)
yay -S novel-editor-bin

# Ubuntu PPA
sudo add-apt-repository ppa:jeason/novel-editor
sudo apt update && sudo apt install novel-editor

# Fedora COPR
sudo dnf copr enable jeason/novel-editor
sudo dnf install novel-editor
```

---

### 系统要求

| | 最低配置 | 推荐配置 |
|---|---------|----------|
| **操作系统** | Windows 10, macOS 10.15, Linux | 最新版本 |
| **内存** | 2GB | 4GB+ |
| **存储空间** | 200MB | 500MB |
| **架构** | x86_64, ARM64 | - |

---

## 📄 开源协议

本项目采用 [MIT License](./LICENSE) 开源协议。

---

Made with ❤️ by [Jeason](https://github.com/jeasoncc)
