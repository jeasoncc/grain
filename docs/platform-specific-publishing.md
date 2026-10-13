# 平台特定发布指南

本文档详细介绍了 Novel Editor 在各个平台的发布流程和命令。

## 📋 快速参考

### 🌐 跨平台发布
```bash
npm run tag:desktop    # GitHub Releases (Windows/macOS/Linux 所有格式)
npm run tag:web        # Web 应用部署 (Vercel/Netlify/GitHub Pages)
npm run tag:all        # 🚀 一键发布到所有平台
```

### 🐧 Linux 平台发布
```bash
# 通用包格式
npm run tag:linux:snap       # Snap Store (Ubuntu 官方商店)
npm run tag:linux:flatpak    # Flathub (跨发行版沙盒应用)

# 发行版特定仓库
npm run tag:linux:ppa        # Debian PPA (Ubuntu/Debian/Mint)
npm run tag:linux:copr       # Fedora COPR (Fedora/RHEL/CentOS)
npm run tag:linux:obs        # openSUSE Build Service (openSUSE/SUSE)
npm run tag:linux:aur        # Arch AUR 源码包 (Arch/Manjaro)
npm run tag:linux:aur-bin    # Arch AUR 二进制包 (Arch/Manjaro)
npm run tag:linux:gentoo     # Gentoo Overlay (Gentoo Linux)
```

### 🪟 Windows 平台发布
```bash
npm run tag:windows:winget     # Microsoft Winget (官方包管理器)
npm run tag:windows:chocolatey # Chocolatey (开发者首选)
npm run tag:windows:scoop      # Scoop (轻量级包管理器)
```

### 🍎 macOS 平台发布
```bash
npm run tag:macos:homebrew     # Homebrew (macOS 包管理器)
```

---

## 🐧 Linux 平台详细指南

### 通用包格式

#### Snap Store
- **命令**: `npm run tag:linux:snap`
- **覆盖**: Ubuntu, 支持 snapd 的发行版
- **特点**: 自动更新，沙盒安全
- **用户安装**: `sudo snap install novel-editor`

#### Flathub (Flatpak)
- **命令**: `npm run tag:linux:flatpak`
- **覆盖**: 所有现代 Linux 发行版
- **特点**: 沙盒应用，统一运行时
- **用户安装**: `flatpak install flathub com.lotus.Grain`

### 发行版特定仓库

#### Debian PPA (Ubuntu/Debian)
- **命令**: `npm run tag:linux:ppa`
- **覆盖**: Ubuntu, Debian, Linux Mint, Pop!_OS, Elementary OS
- **特点**: 官方仓库，自动更新
- **用户安装**:
  ```bash
  sudo add-apt-repository ppa:username/novel-editor
  sudo apt update
  sudo apt install novel-editor
  ```

#### Fedora COPR
- **命令**: `npm run tag:linux:copr`
- **覆盖**: Fedora, CentOS Stream, RHEL, Rocky Linux, AlmaLinux
- **特点**: 社区构建服务，多架构支持
- **用户安装**:
  ```bash
  sudo dnf copr enable username/novel-editor
  sudo dnf install novel-editor
  ```

#### openSUSE Build Service
- **命令**: `npm run tag:linux:obs`
- **覆盖**: openSUSE Tumbleweed/Leap, SUSE Linux Enterprise
- **特点**: 专业构建服务，多架构支持
- **用户安装**:
  ```bash
  sudo zypper ar <repo-url> novel-editor
  sudo zypper install novel-editor
  ```

#### Arch AUR
- **源码包**: `npm run tag:linux:aur`
- **二进制包**: `npm run tag:linux:aur-bin`
- **覆盖**: Arch Linux, Manjaro, EndeavourOS
- **特点**: 社区维护，灵活定制
- **用户安装**:
  ```bash
  # 使用 AUR helper (如 yay)
  yay -S novel-editor        # 源码包
  yay -S novel-editor-bin    # 二进制包
  ```

#### Gentoo Overlay
- **命令**: `npm run tag:linux:gentoo`
- **覆盖**: Gentoo Linux
- **特点**: 源码编译，高度优化
- **用户安装**:
  ```bash
  eselect repository add novel-editor-overlay git <overlay-url>
  emerge --sync novel-editor-overlay
  emerge --ask app-editors/novel-editor
  ```

---

## 🪟 Windows 平台详细指南

### Microsoft Winget
- **命令**: `npm run tag:windows:winget`
- **特点**: Windows 官方包管理器，系统集成
- **用户安装**: `winget install Jeason.NovelEditor`

### Chocolatey
- **命令**: `npm run tag:windows:chocolatey`
- **特点**: 开发者首选，PowerShell 集成
- **用户安装**: `choco install novel-editor`

### Scoop
- **命令**: `npm run tag:windows:scoop`
- **特点**: 轻量级，便携应用
- **用户安装**: `scoop install extras/novel-editor`

---

## 🍎 macOS 平台详细指南

### Homebrew
- **命令**: `npm run tag:macos:homebrew`
- **特点**: macOS 用户首选包管理器
- **用户安装**: `brew install --cask novel-editor`

---

## 🌐 Web 平台详细指南

### Web 应用部署
- **命令**: `npm run tag:web`
- **部署到**: Vercel, Netlify, GitHub Pages
- **特点**: 无需安装，即开即用，PWA 支持
- **访问**: 通过浏览器访问部署的 URL

---

## 🚀 发布策略建议

### 完整发布流程
```bash
# 1. 更新版本号
npm run version:bump

# 2. 提交更改
git add .
git commit -m "chore: bump version to x.x.x"
git push

# 3. 发布所有平台
npm run tag:all
```

### 分阶段发布
```bash
# 阶段 1: 核心平台
npm run tag:desktop              # 所有桌面平台
npm run tag:web                  # Web 版本

# 阶段 2: Linux 主流发行版
npm run tag:linux:snap           # Ubuntu 用户
npm run tag:linux:flatpak        # 跨发行版用户
npm run tag:linux:ppa            # Debian 系用户

# 阶段 3: 其他 Linux 发行版
npm run tag:linux:copr           # Fedora 系用户
npm run tag:linux:aur            # Arch 系用户
npm run tag:linux:obs            # openSUSE 用户

# 阶段 4: Windows 包管理器
npm run tag:windows:winget       # 官方包管理器
npm run tag:windows:chocolatey   # 开发者用户
npm run tag:windows:scoop        # 轻量级用户

# 阶段 5: macOS 包管理器
npm run tag:macos:homebrew       # macOS 用户
```

### 测试发布
```bash
# 仅发布到测试平台
npm run tag:linux:aur-bin        # 快速测试 Linux
npm run tag:windows:scoop        # 快速测试 Windows
```

---

## 📊 平台优先级建议

### 高优先级 (必须支持)
1. `npm run tag:desktop` - 所有平台基础支持
2. `npm run tag:linux:snap` - Ubuntu 官方商店
3. `npm run tag:linux:flatpak` - 跨 Linux 发行版
4. `npm run tag:windows:winget` - Windows 官方包管理器
5. `npm run tag:web` - 无需安装的 Web 版本

### 中优先级 (推荐支持)
1. `npm run tag:linux:ppa` - Debian/Ubuntu 用户
2. `npm run tag:linux:aur` - Arch 用户
3. `npm run tag:windows:chocolatey` - Windows 开发者
4. `npm run tag:macos:homebrew` - macOS 用户

### 低优先级 (可选支持)
1. `npm run tag:linux:copr` - Fedora 用户
2. `npm run tag:linux:obs` - openSUSE 用户
3. `npm run tag:linux:gentoo` - Gentoo 高级用户
4. `npm run tag:windows:scoop` - Windows 轻量级用户

---

## 🔧 故障排除

### 常见问题
1. **标签已存在**: 删除旧标签后重新创建
2. **依赖发布不存在**: 确保先运行 `npm run tag:desktop`
3. **权限问题**: 检查相关平台的 API 密钥和权限设置

### 调试命令
```bash
# 查看帮助
bash scripts/create-tag.sh help

# 检查版本
npm run version:bump --dry-run

# 查看下载统计
npm run stats:check
```