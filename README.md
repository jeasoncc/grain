# Wheat Editor / 小麦写作

> A modern, powerful novel writing application for serious writers

> 🇨🇳 [中文文档](./README.zh-CN.md) | English

![Wheat Editor Screenshot](https://s3.bmp.ovh/imgs/2025/11/30/17e3f22342be954f.png)

![Wheat Editor Features](https://s3.bmp.ovh/imgs/2025/11/30/20c87f8ef08b246d.png)

Wheat Editor is a professional writing tool designed specifically for novelists and long-form fiction writers. Built with modern technologies, it provides a distraction-free writing environment with powerful organizational features.

---

## ✨ Features

- ✍️ **Immersive Writing** - Rich text editor based on Lexical with Markdown shortcuts
- 📂 **Structured Project Management** - Tree-based organization: Books → Chapters → Scenes
- 🔍 **Powerful Search** - In-file search/replace, global full-text search with regex support
- 🎨 **Icon Theme System** - 6 preset themes, similar to VSCode's icon theme feature
- 📊 **Outline & Chart System** - Complete outline management with Mermaid and PlantUML chart support
- 👤 **Character Mention** - Quick character references via `@` symbol with hover Wiki display
- 💾 **Multiple Export Formats** - JSON, ZIP structured export, Markdown, DOCX, etc.
- ⚙️ **Reliable Storage** - IndexedDB + Dexie for offline persistence
- 🚢 **Cross-Platform** - Windows, macOS, Linux support

---

## �A Download

### Quick Install

| Platform | Recommended | Command / Link |
|----------|-------------|----------------|
| 🪟 Windows | Microsoft Store | [小麦写作](ms-windows-store://pdp/?productid=9NV7M2PW25B3) |
| 🪟 Windows | Winget | `winget install Jeason.NovelEditor` |
| 🍎 macOS | Homebrew | `brew install --cask novel-editor` |
| 🐧 Arch Linux | AUR | `yay -S novel-editor-bin` |
| 🐧 All Linux | Snap | `sudo snap install novel-editor-app` |
| 🐧 All Linux | Flatpak | `flatpak install com.lotus.NovelEditor` |

---

### 🪟 Windows

#### Microsoft Store (Recommended)
[![Get it from Microsoft Store](https://get.microsoft.com/images/en-us%20dark.svg)](ms-windows-store://pdp/?productid=9NV7M2PW25B3)

Search "小麦写作" or "Wheat Editor" in Microsoft Store, or [click here](ms-windows-store://pdp/?productid=9NV7M2PW25B3).

#### Winget
```bash
winget install Jeason.NovelEditor
```

#### Scoop
```bash
scoop install extras/novel-editor
```

#### Chocolatey
```bash
choco install novel-editor
```

#### Direct Download
Download from [GitHub Releases](https://github.com/Jeason-Lotus/novel-editor/releases):
- `novel-editor_x.x.x_x64-setup.exe` - NSIS installer
- `novel-editor_x.x.x_x64_zh-CN.msi` - MSI installer
- `novel-editor_x.x.x_x64.msix` - MSIX package

---

### 🍎 macOS

#### Homebrew
```bash
brew install --cask novel-editor
```

#### Direct Download
Download from [GitHub Releases](https://github.com/Jeason-Lotus/novel-editor/releases):
- `novel-editor_x.x.x_aarch64.dmg` - Apple Silicon (M1/M2/M3)
- `novel-editor_x.x.x_x64.dmg` - Intel Mac

---

### 🐧 Linux

#### Snap Store
```bash
sudo snap install novel-editor-app
```

#### Flatpak
```bash
flatpak install flathub com.lotus.NovelEditor
```

#### Arch Linux (AUR)
```bash
yay -S novel-editor-bin
```

#### Ubuntu/Debian (DEB)
```bash
# Download from GitHub Releases
sudo dpkg -i novel-editor_*.deb
sudo apt-get install -f
```

#### Fedora/RHEL (RPM)
```bash
sudo dnf install novel-editor-*.rpm
```

#### AppImage
```bash
chmod +x novel-editor_*.AppImage
./novel-editor_*.AppImage
```

---

### System Requirements

- **OS:** Windows 10+, macOS 10.15+, Linux (x86_64/ARM64)
- **RAM:** 2GB minimum, 4GB+ recommended
- **Storage:** ~200MB

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

---

Made with ❤️ by [Jeason](https://github.com/jeasoncc)
