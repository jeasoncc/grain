# Release 标签修复说明

## 🐛 问题描述

在发布流程中发现了标签不一致的问题：

- **Desktop 工作流**创建的 release 使用标签：`desktop-v0.1.54`
- **Flatpak 工作流**寻找的 release 使用标签：`v0.1.54`

这导致 Flatpak 工作流无法找到对应的 release，出现错误：
```
❌ Release v0.1.54 not found.
```

## 🔧 修复内容

### 1. 修复 Flatpak 工作流 (`.github/workflows/flatpak-publish.yml`)

**修复前**:
```yaml
if ! curl -s -f "https://api.github.com/repos/${{ github.repository }}/releases/tags/v$VERSION" > /dev/null; then
```

**修复后**:
```yaml
if ! curl -s -f "https://api.github.com/repos/${{ github.repository }}/releases/tags/desktop-v$VERSION" > /dev/null; then
```

### 2. 修复 Flatpak 配置文件 (`flatpak/com.lotus.NovelEditor.yml`)

**修复前**:
```yaml
sources:
  - type: git
    url: https://github.com/jeasoncc/novel-editor.git
    tag: v0.1.54
    commit: HEAD
```

**修复后**:
```yaml
sources:
  - type: git
    url: https://github.com/jeasoncc/novel-editor.git
    tag: desktop-v0.1.54
    commit: HEAD
```

### 3. 修复 Flatpak 工作流中的标签更新

**修复前**:
```bash
sed -i "s/tag: v.*/tag: v$VERSION/" flatpak/com.lotus.NovelEditor.yml
```

**修复后**:
```bash
sed -i "s/tag: v.*/tag: desktop-v$VERSION/" flatpak/com.lotus.NovelEditor.yml
```

## ✅ 验证其他工作流

检查了所有其他工作流，确认它们都正确使用了 `desktop-v$VERSION` 格式：

- ✅ **AUR 工作流**: 正确使用 `desktop-v$VERSION`
- ✅ **AUR-bin 工作流**: 正确使用 `desktop-v$VERSION`
- ✅ **Snap 工作流**: 不依赖 GitHub release
- ✅ **Winget 工作流**: 正确使用 `desktop-v$VERSION`
- ✅ **Chocolatey 工作流**: 正确使用 `desktop-v$VERSION`
- ✅ **Scoop 工作流**: 正确使用 `desktop-v$VERSION`
- ✅ **Homebrew 工作流**: 正确使用 `desktop-v$VERSION`
- ✅ **PPA 工作流**: 正确使用 `desktop-v$VERSION`
- ✅ **COPR 工作流**: 正确使用 `desktop-v$VERSION`
- ✅ **OBS 工作流**: 正确使用 `desktop-v$VERSION`
- ✅ **Gentoo 工作流**: 正确使用 `desktop-v$VERSION`

## 📋 标签命名规范

为了避免将来的混淆，明确我们的标签命名规范：

### Desktop 发布
- **标签格式**: `desktop-v{version}`
- **示例**: `desktop-v0.1.54`
- **创建的 Release**: 使用相同的标签名

### 其他平台发布
- **标签格式**: `{platform}-v{version}`
- **示例**: 
  - `flatpak-v0.1.54`
  - `snap-v0.1.54`
  - `winget-v0.1.54`
- **依赖**: 都依赖于 `desktop-v{version}` 的 release

## 🚀 现在的发布流程

1. **创建 Desktop Release**:
   ```bash
   npm run tag:desktop
   ```
   这会创建 `desktop-v0.1.54` 标签和对应的 GitHub Release

2. **发布到其他平台**:
   ```bash
   npm run tag:linux:flatpak
   npm run tag:windows:winget
   # 等等...
   ```
   这些工作流会寻找 `desktop-v0.1.54` 的 release

3. **一键发布所有平台**:
   ```bash
   npm run tag:all
   ```

## 🔍 如何验证修复

运行以下命令测试 Flatpak 发布：

```bash
# 1. 确保有 desktop release
npm run tag:desktop

# 2. 等待 desktop 构建完成后，测试 Flatpak
npm run tag:linux:flatpak
```

现在 Flatpak 工作流应该能正确找到 `desktop-v0.1.54` 的 release 了。