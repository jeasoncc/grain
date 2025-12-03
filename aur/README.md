# Novel Editor - AUR 包

这是 Novel Editor 的 Arch User Repository (AUR) 包。

## 安装

### 使用 AUR Helper

如果你使用 `yay` 或 `paru`：

```bash
yay -S novel-editor
# 或
paru -S novel-editor
```

### 手动安装

```bash
# 克隆 AUR 仓库
git clone https://aur.archlinux.org/novel-editor.git
cd novel-editor

# 构建并安装
makepkg -si
```

## 依赖

### 运行时依赖
- `webkit2gtk` - WebKit 渲染引擎
- `gtk3` - GTK3 图形库
- `libappindicator-gtk3` - 系统托盘支持

### 构建依赖
- `rust` - Rust 编译器
- `cargo` - Rust 包管理器
- `bun` - JavaScript 运行时和包管理器
- `nodejs` - Node.js 运行时
- `patchelf` - ELF 二进制修补工具

### 可选依赖
- `libfuse2` - 用于 AppImage 支持

## 安装 Bun

Bun 不在官方仓库中，需要手动安装：

```bash
# 使用官方安装脚本
curl -fsSL https://bun.sh/install | bash

# 或从 AUR 安装
yay -S bun-bin
```

## 构建说明

1. 包会从 GitHub 下载源代码
2. 使用 Bun 安装依赖
3. 构建前端资源
4. 使用 Tauri 构建桌面应用
5. 安装到系统

## 文件位置

- 二进制文件: `/usr/bin/novel-editor`
- 桌面文件: `/usr/share/applications/novel-editor.desktop`
- 图标: `/usr/share/icons/hicolor/*/apps/novel-editor.png`
- 许可证: `/usr/share/licenses/novel-editor/LICENSE`
- 文档: `/usr/share/doc/novel-editor/README.md`

## 卸载

```bash
sudo pacman -R novel-editor
```

## 问题反馈

如果遇到问题，请在 GitHub 上提交 Issue：
https://github.com/jeasoncc/novel-editor/issues

## 维护者

- Jeason <xiaomiquan@aliyun.com>

## 许可证

MIT License
