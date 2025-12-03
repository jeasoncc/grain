# 🔧 Tauri Bundle 配置修复

## ❌ 问题

### macOS 错误
```
Looking for artifacts in:
/Users/runner/.../bundle/dmg/novel-editor_0.1.0_aarch64.dmg
Error: No artifacts were found.
```

### Windows 错误
```
Looking for artifacts in:
D:\a\...\bundle\msi\novel-editor_0.1.0_x64_en-US.msi
D:\a\...\bundle\nsis\novel-editor_0.1.0_x64-setup.exe
Error: No artifacts were found.
```

## 🔍 根本原因

### Tauri 配置问题

**当前配置** (`apps/desktop/src-tauri/tauri.conf.json`):
```json
{
  "bundle": {
    "active": true,
    "targets": ["deb", "rpm"],  // ❌ 只配置了 Linux 格式
    "icon": [...]
  }
}
```

**问题**:
- `targets: ["deb", "rpm"]` 只会在 Linux 上生成 DEB 和 RPM 包
- macOS 不会生成 DMG
- Windows 不会生成 MSI/NSIS

**但是**: `tauri-action` 默认会尝试查找所有平台的产物，导致找不到文件。

## ✅ 解决方案

### 方案 1: 使用 "all" 目标（推荐）

```json
{
  "bundle": {
    "active": true,
    "targets": "all",  // ✅ 生成所有平台的格式
    "icon": [...]
  }
}
```

**优点**:
- ✅ 自动为每个平台生成合适的格式
- ✅ 简单配置
- ✅ 与 tauri-action 默认行为一致

**生成的格式**:
- **Linux**: deb, rpm, appimage
- **macOS**: dmg, app
- **Windows**: msi, nsis

### 方案 2: 平台特定配置

```json
{
  "bundle": {
    "active": true,
    "targets": {
      "linux": ["deb", "rpm", "appimage"],
      "macOS": ["dmg"],
      "windows": ["msi", "nsis"]
    },
    "icon": [...]
  }
}
```

**优点**:
- ✅ 精确控制每个平台的格式
- ✅ 可以排除不需要的格式

**缺点**:
- ⚠️ 配置更复杂

## 📊 Bundle 格式说明

### Linux

| 格式 | 说明 | 文件名示例 |
|------|------|-----------|
| deb | Debian/Ubuntu 包 | `novel-editor_0.1.0_amd64.deb` |
| rpm | RedHat/Fedora 包 | `novel-editor-0.1.0-1.x86_64.rpm` |
| appimage | 通用 Linux 包 | `novel-editor_0.1.0_amd64.AppImage` |

### macOS

| 格式 | 说明 | 文件名示例 |
|------|------|-----------|
| dmg | 磁盘镜像 | `novel-editor_0.1.0_aarch64.dmg` |
| app | 应用程序包 | `novel-editor.app` |

### Windows

| 格式 | 说明 | 文件名示例 |
|------|------|-----------|
| msi | Windows 安装包 | `novel-editor_0.1.0_x64_en-US.msi` |
| nsis | NSIS 安装程序 | `novel-editor_0.1.0_x64-setup.exe` |

## 🎯 推荐配置

### 完整的 tauri.conf.json

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "novel-editor",
  "version": "0.1.0",
  "identifier": "com.lotus.novel-editor",
  "build": {
    "beforeDevCommand": "bun run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "bun run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [...],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",  // ✅ 生成所有格式
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "identifier": "com.lotus.novel-editor",
    "publisher": "Lotus",
    "copyright": "Copyright © 2024 Lotus",
    "category": "Productivity",
    "shortDescription": "A modern novel editor",
    "longDescription": "Novel Editor is a modern, cross-platform writing environment for long-form fiction."
  }
}
```

## 🔍 验证配置

### 检查生成的格式

```bash
# 本地构建
cd apps/desktop
bun tauri build

# 检查生成的文件
find src-tauri/target/release/bundle -type f
```

**预期输出** (Linux):
```
src-tauri/target/release/bundle/deb/novel-editor_0.1.0_amd64.deb
src-tauri/target/release/bundle/rpm/novel-editor-0.1.0-1.x86_64.rpm
src-tauri/target/release/bundle/appimage/novel-editor_0.1.0_amd64.AppImage
```

**预期输出** (macOS):
```
src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/novel-editor_0.1.0_aarch64.dmg
src-tauri/target/aarch64-apple-darwin/release/bundle/macos/novel-editor.app
```

**预期输出** (Windows):
```
src-tauri/target/release/bundle/msi/novel-editor_0.1.0_x64_en-US.msi
src-tauri/target/release/bundle/nsis/novel-editor_0.1.0_x64-setup.exe
```

## 📝 GitHub Actions 更新

工作流不需要修改，因为 `tauri-action` 会自动处理 `targets: "all"` 配置。

但是，如果你想明确指定，可以这样：

```yaml
- uses: tauri-apps/tauri-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    projectPath: apps/desktop
    tagName: desktop-v__VERSION__
    releaseName: 'Novel Editor Desktop v__VERSION__'
    releaseBody: 'See the assets to download this version and install.'
    releaseDraft: true
    prerelease: false
    args: ${{ matrix.args }}
    # includeRelease: true  # 自动上传到 Release
```

## 🎯 修复步骤

### 1. 更新配置

```bash
# 已完成：修改 apps/desktop/src-tauri/tauri.conf.json
# 将 targets: ["deb", "rpm"] 改为 targets: "all"
```

### 2. 提交更改

```bash
git add apps/desktop/src-tauri/tauri.conf.json
git commit -m "fix: enable all bundle targets for cross-platform builds"
git push
```

### 3. 测试构建

```bash
# 创建测试 tag
git tag v0.1.0-test
git push origin v0.1.0-test

# 检查 GitHub Actions
# 应该看到所有平台都成功生成产物
```

### 4. 清理测试 tag

```bash
git tag -d v0.1.0-test
git push origin :refs/tags/v0.1.0-test
```

## 📊 预期结果

修复后，每个平台应该生成：

### Linux (ubuntu-22.04)
- ✅ novel-editor_0.1.0_amd64.deb
- ✅ novel-editor-0.1.0-1.x86_64.rpm
- ✅ novel-editor_0.1.0_amd64.AppImage

### macOS (macos-latest, ARM)
- ✅ novel-editor_0.1.0_aarch64.dmg
- ✅ novel-editor.app

### macOS (macos-latest, Intel)
- ✅ novel-editor_0.1.0_x64.dmg
- ✅ novel-editor.app

### Windows (windows-latest)
- ✅ novel-editor_0.1.0_x64_en-US.msi
- ✅ novel-editor_0.1.0_x64-setup.exe

## ✅ 验证清单

- [x] 更新 tauri.conf.json 的 targets 配置
- [ ] 提交更改
- [ ] 推送到 GitHub
- [ ] 创建测试 tag
- [ ] 验证所有平台构建成功
- [ ] 验证产物上传到 Release
- [ ] 清理测试 tag

## 🎊 总结

**问题**: `targets: ["deb", "rpm"]` 只配置了 Linux 格式

**解决**: 改为 `targets: "all"` 生成所有平台的格式

**结果**: 
- ✅ macOS 会生成 DMG
- ✅ Windows 会生成 MSI/NSIS
- ✅ Linux 会生成 DEB/RPM/AppImage
- ✅ tauri-action 可以找到所有产物

---

**修复后应该可以成功生成所有平台的安装包了！** 🚀
