# 应用图标配置指南

本文档说明了 Novel Editor 在各个平台上的图标配置和使用方式。

## 🎨 图标源文件

- **主图标**: `apps/desktop/src-tauri/icons/my-new-icon.jpg`
- **生成工具**: Tauri CLI (`bun run tauri icon`)
- **更新脚本**: `scripts/update-icons.sh`

## 📱 各平台图标配置

### 1. Tauri Desktop (Windows/macOS/Linux)

**图标文件位置**: `apps/desktop/src-tauri/icons/`

**使用的图标**:
- `icon.ico` - Windows 应用图标
- `icon.icns` - macOS 应用图标  
- `icon.png` - Linux 应用图标
- `*.png` - 各种尺寸的 PNG 图标

**配置文件**: `apps/desktop/src-tauri/tauri.conf.json`

**更新方式**: 
```bash
# 方式1: 使用 npm 命令 (推荐)
npm run icons:generate

# 方式2: 直接使用 Tauri CLI
cd apps/desktop
bun run tauri icon src-tauri/icons/my-new-icon.jpg
```

### 2. Snap Package

**图标文件位置**: `snap/gui/novel-editor.png`

**配置文件**: `snap/snapcraft.yaml`

**更新方式**: 
```bash
# 方式1: 使用 npm 命令 (推荐)
npm run icons:update

# 方式2: 手动复制
cp apps/desktop/src-tauri/icons/icon.png snap/gui/novel-editor.png
```

**安装位置**: Snap 会自动将图标安装到系统图标目录

### 3. Flatpak Package

**图标源**: 从 Tauri 图标目录安装多尺寸图标

**配置文件**: `flatpak/com.lotus.Grain.yml`

**安装的图标尺寸**:
- 32x32px
- 128x128px  
- 256x256px

**安装位置**: `/app/share/icons/hicolor/{size}x{size}/apps/com.lotus.Grain.png`

### 4. AUR Package

**图标源**: 从 Tauri 图标目录安装多尺寸图标

**配置文件**: `aur/PKGBUILD`

**安装的图标尺寸**:
- 32x32px
- 128x128px
- 256x256px

**安装位置**: `/usr/share/icons/hicolor/{size}x{size}/apps/novel-editor.png`

### 5. AUR Binary Package

**图标源**: 从 DEB 包中提取

**配置文件**: `aur/PKGBUILD-bin`

**说明**: 使用预编译的 DEB 包，图标已包含在包中

### 6. Winget Package

**图标源**: MSI 安装包中的图标

**配置文件**: `winget-manifests/*.yaml`

**说明**: Winget 使用 MSI 包中嵌入的图标，无需单独配置

## 🔄 图标更新流程

### 自动更新 (推荐)

1. 将新图标放置到 `apps/desktop/src-tauri/icons/my-new-icon.jpg`
2. 运行更新命令:
   ```bash
   # 方式1: 使用 npm 命令 (推荐)
   npm run icons:update
   
   # 方式2: 直接运行脚本
   ./scripts/update-icons.sh
   ```
3. 提交更改到 git 仓库
4. 创建新的 release

### 手动更新

1. **更新 Tauri 图标**:
   ```bash
   # 方式1: 使用 npm 命令
   npm run icons:generate
   
   # 方式2: 在 desktop 目录中
   cd apps/desktop
   npm run icon:generate
   
   # 方式3: 直接使用 Tauri CLI
   cd apps/desktop
   bun run tauri icon src-tauri/icons/my-new-icon.jpg
   ```

2. **更新所有平台图标**:
   ```bash
   # 推荐: 一键更新所有平台
   npm run icons:update
   ```

3. **生成额外尺寸** (如需要):
   ```bash
   cd apps/desktop/src-tauri/icons
   magick icon.png -resize 256x256 256x256.png
   ```

## 📋 图标规格要求

### 通用要求
- **格式**: PNG (推荐) 或 JPG
- **最小尺寸**: 512x512px (用于生成各种尺寸)
- **背景**: 透明背景 (PNG) 或纯色背景
- **设计**: 简洁明了，在小尺寸下仍清晰可见

### 平台特定要求

| 平台 | 主要尺寸 | 格式 | 特殊要求 |
|------|----------|------|----------|
| Windows | 16, 32, 48, 256px | ICO | 多尺寸合并 |
| macOS | 16-1024px | ICNS | 多尺寸合并 |
| Linux | 32, 128, 256px | PNG | 透明背景 |
| Snap | 任意 | PNG | 透明背景 |
| Flatpak | 32, 128, 256px | PNG | 透明背景 |

## 🛠️ 故障排除

### 图标未更新
1. 确认图标文件已正确生成
2. 检查各平台配置文件是否正确
3. 重新构建应用包

### 图标显示异常
1. 检查图标文件是否损坏
2. 确认图标尺寸符合要求
3. 验证透明背景是否正确

### 构建失败
1. 确认 ImageMagick 已安装 (用于尺寸转换)
2. 检查 Tauri CLI 版本
3. 验证源图标文件格式

## � N关PM 命令参考

### 根目录命令

| 命令 | 描述 | 用途 |
|------|------|------|
| `npm run icons:update` | 更新所有平台图标 | 一键更新所有平台的应用图标 |
| `npm run icons:generate` | 仅生成 Tauri 图标 | 只生成 Tauri 应用的图标文件 |
| `npm run version:bump` | 递增版本号 | 自动递增版本号并同步到所有文件 |

### Desktop 应用命令

| 命令 | 描述 | 用途 |
|------|------|------|
| `npm run icon:generate` | 生成 Tauri 图标 | 在 desktop 目录中生成图标 |
| `npm run icon:update` | 更新所有平台图标 | 从 desktop 目录调用全局更新脚本 |

### 使用示例

```bash
# 更新图标的完整流程
npm run icons:update          # 更新所有平台图标
npm run version:bump          # 递增版本号
git add .                     # 添加更改
git commit -m "feat: update app icons"  # 提交更改
```

## 📚 相关文档

- [Tauri 图标配置](https://tauri.app/v1/guides/features/icons)
- [Snap 图标指南](https://snapcraft.io/docs/desktop-applications)
- [Flatpak 图标规范](https://docs.flatpak.org/en/latest/conventions.html#application-icons)
- [AUR 包装指南](https://wiki.archlinux.org/title/Creating_packages)