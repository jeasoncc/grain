# Linux 安装指南

Novel Editor 支持多种 Linux 发行版和安装方式。选择最适合你系统的安装方法。

## 快速安装对照表

| 发行版 | 推荐方式 | 命令 |
|--------|----------|------|
| Ubuntu/Debian | DEB 包 | 从 GitHub Release 下载 |
| Fedora/RHEL | RPM 包 | 从 GitHub Release 下载 |
| Arch Linux | AUR | `yay -S novel-editor-bin` |
| 所有发行版 | Snap | `sudo snap install novel-editor-app` |
| 所有发行版 | Flatpak | `flatpak install com.lotus.NovelEditor` |
| 所有发行版 | AppImage | 从 GitHub Release 下载 |

---

## 1. GitHub Release 直接下载

最简单的方式，适用于所有发行版。

**下载地址：** https://github.com/Jeason-Lotus/novel-editor/releases

### DEB 包 (Ubuntu/Debian/Linux Mint/Pop!_OS)

```bash
# 下载最新版本
wget https://github.com/Jeason-Lotus/novel-editor/releases/latest/download/novel-editor_VERSION_amd64.deb

# 安装
sudo dpkg -i novel-editor_*.deb

# 如果有依赖问题
sudo apt-get install -f
```

### RPM 包 (Fedora/RHEL/CentOS/openSUSE)

```bash
# 下载最新版本
wget https://github.com/Jeason-Lotus/novel-editor/releases/latest/download/novel-editor-VERSION-1.x86_64.rpm

# Fedora/RHEL
sudo dnf install novel-editor-*.rpm

# openSUSE
sudo zypper install novel-editor-*.rpm
```

### AppImage (通用)

```bash
# 下载
wget https://github.com/Jeason-Lotus/novel-editor/releases/latest/download/novel-editor_VERSION_amd64.AppImage

# 添加执行权限
chmod +x novel-editor_*.AppImage

# 运行
./novel-editor_*.AppImage
```

---

## 2. Snap Store

适用于所有支持 Snap 的发行版（Ubuntu、Fedora、Debian、Arch 等）。

```bash
# 安装
sudo snap install novel-editor-app

# 安装 edge 版本（最新开发版）
sudo snap install novel-editor-app --edge

# 更新
sudo snap refresh novel-editor-app
```

**Snap Store 页面：** https://snapcraft.io/novel-editor-app

---

## 3. Flatpak (Flathub)

适用于所有支持 Flatpak 的发行版。

```bash
# 确保已安装 Flatpak
sudo apt install flatpak  # Debian/Ubuntu
sudo dnf install flatpak  # Fedora

# 添加 Flathub 仓库
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# 安装
flatpak install flathub com.lotus.NovelEditor

# 运行
flatpak run com.lotus.NovelEditor

# 更新
flatpak update com.lotus.NovelEditor
```

**Flathub 页面：** https://flathub.org/apps/com.lotus.NovelEditor

---

## 4. Arch Linux (AUR)

Arch Linux 用户可以通过 AUR 安装。

### 二进制包（推荐，快速安装）

```bash
# 使用 yay
yay -S novel-editor-bin

# 或使用 paru
paru -S novel-editor-bin
```

### 源码编译包

```bash
# 使用 yay（需要编译，耗时较长）
yay -S novel-editor

# 或使用 paru
paru -S novel-editor
```

**AUR 页面：**
- 二进制包：https://aur.archlinux.org/packages/novel-editor-bin
- 源码包：https://aur.archlinux.org/packages/novel-editor

---

## 5. Ubuntu PPA

Ubuntu 用户可以通过 PPA 获取自动更新。

```bash
# 添加 PPA
sudo add-apt-repository ppa:jeason/novel-editor

# 更新并安装
sudo apt update
sudo apt install novel-editor

# 更新
sudo apt upgrade novel-editor
```

---

## 6. Fedora COPR

Fedora 用户可以通过 COPR 获取。

```bash
# 启用 COPR 仓库
sudo dnf copr enable jeason/novel-editor

# 安装
sudo dnf install novel-editor

# 更新
sudo dnf upgrade novel-editor
```

---

## 安装方式对比

| 特性 | DEB/RPM | Snap | Flatpak | AUR | AppImage |
|------|---------|------|---------|-----|----------|
| 自动更新 | ❌ | ✅ | ✅ | ✅ | ❌ |
| 沙盒隔离 | ❌ | ✅ | ✅ | ❌ | ❌ |
| 系统集成 | ✅ | ⚠️ | ⚠️ | ✅ | ❌ |
| 安装大小 | 小 | 中 | 中 | 小 | 大 |
| 无需 root | ❌ | ❌ | ✅ | ❌ | ✅ |

---

## 系统要求

- **操作系统：** Linux (x86_64 或 ARM64)
- **内存：** 最低 2GB，推荐 4GB+
- **存储：** 约 200MB
- **依赖：** WebKit2GTK 4.1（DEB/RPM 包会自动安装）

---

## 常见问题

### Q: 哪种安装方式最好？

- **Ubuntu/Debian 用户：** 推荐 DEB 包或 Snap
- **Fedora 用户：** 推荐 RPM 包或 COPR
- **Arch 用户：** 推荐 AUR (`novel-editor-bin`)
- **其他发行版：** 推荐 Flatpak 或 AppImage

### Q: 如何卸载？

```bash
# DEB
sudo apt remove novel-editor

# RPM
sudo dnf remove novel-editor

# Snap
sudo snap remove novel-editor-app

# Flatpak
flatpak uninstall com.lotus.NovelEditor

# AUR
yay -R novel-editor-bin
```

### Q: 数据存储在哪里？

用户数据默认存储在：
- `~/.local/share/novel-editor/` - 应用数据
- `~/.config/novel-editor/` - 配置文件

---

## 获取帮助

- **GitHub Issues：** https://github.com/Jeason-Lotus/novel-editor/issues
- **文档：** https://github.com/Jeason-Lotus/novel-editor/tree/main/docs
