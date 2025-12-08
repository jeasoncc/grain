# 发布到 Winget 指南

Winget 是 Windows 官方的包管理器，完全免费且无需代码签名。

## 什么是 Winget？

用户可以通过命令安装你的应用：
```powershell
winget install jeasoncc.NovelEditor
```

## 发布步骤

### 1. 准备清单文件

创建 `manifests/j/jeasoncc/NovelEditor/0.1.8/` 目录，包含三个文件：

#### jeasoncc.NovelEditor.yaml
```yaml
PackageIdentifier: jeasoncc.NovelEditor
PackageVersion: 0.1.8
DefaultLocale: zh-CN
ManifestType: version
ManifestVersion: 1.6.0
```

#### jeasoncc.NovelEditor.locale.zh-CN.yaml
```yaml
PackageIdentifier: jeasoncc.NovelEditor
PackageVersion: 0.1.8
PackageLocale: zh-CN
Publisher: jeasoncc
PublisherUrl: https://github.com/jeasoncc
PublisherSupportUrl: https://github.com/jeasoncc/novel-editor/issues
Author: jeasoncc
PackageName: Novel Editor
PackageUrl: https://github.com/jeasoncc/novel-editor
License: MIT
LicenseUrl: https://github.com/jeasoncc/novel-editor/blob/main/LICENSE
ShortDescription: 一个现代化的小说编辑器
Description: |-
  Novel Editor 是一个功能强大的小说编辑器，提供丰富的编辑功能和直观的用户界面。
  
  主要特性：
  - 富文本编辑
  - 章节管理
  - 角色管理
  - 大纲视图
  - 导出为多种格式
Tags:
  - editor
  - novel
  - writing
  - 小说
  - 编辑器
ManifestType: defaultLocale
ManifestVersion: 1.6.0
```

#### jeasoncc.NovelEditor.installer.yaml
```yaml
PackageIdentifier: jeasoncc.NovelEditor
PackageVersion: 0.1.8
Platform:
  - Windows.Desktop
MinimumOSVersion: 10.0.0.0
InstallerType: wix
Scope: user
InstallModes:
  - interactive
  - silent
  - silentWithProgress
UpgradeBehavior: install
Installers:
  - Architecture: x64
    InstallerUrl: https://github.com/jeasoncc/novel-editor/releases/download/desktop-v0.1.8/novel-editor_0.1.8_x64-setup.msi
    InstallerSha256: <SHA256_HASH>
    ProductCode: '{YOUR-PRODUCT-CODE}'
ManifestType: installer
ManifestVersion: 1.6.0
```

### 2. 获取 SHA256 哈希

```powershell
# Windows PowerShell
Get-FileHash novel-editor_0.1.8_x64-setup.msi -Algorithm SHA256

# 或使用在线工具
# https://emn178.github.io/online-tools/sha256_checksum.html
```

### 3. 提交到 Winget 仓库

```bash
# 1. Fork winget-pkgs 仓库
# https://github.com/microsoft/winget-pkgs

# 2. Clone 你的 fork
git clone https://github.com/YOUR-USERNAME/winget-pkgs
cd winget-pkgs

# 3. 创建分支
git checkout -b jeasoncc.NovelEditor-0.1.8

# 4. 创建清单文件
mkdir -p manifests/j/jeasoncc/NovelEditor/0.1.8
# 复制上面的三个文件到这个目录

# 5. 提交
git add .
git commit -m "Add jeasoncc.NovelEditor version 0.1.8"
git push origin jeasoncc.NovelEditor-0.1.8

# 6. 创建 Pull Request
# 访问 https://github.com/microsoft/winget-pkgs
# 点击 "New Pull Request"
```

### 4. 等待审核

- 通常 1-3 天
- 机器人会自动验证
- 审核通过后自动合并

### 5. 用户安装

审核通过后，用户可以：

```powershell
# 搜索
winget search novel-editor

# 安装
winget install jeasoncc.NovelEditor

# 更新
winget upgrade jeasoncc.NovelEditor
```

## 自动化发布

可以创建 GitHub Action 自动提交到 Winget：

```yaml
name: Publish to Winget

on:
  release:
    types: [published]

jobs:
  publish-winget:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Publish to Winget
        uses: vedantmgoyal2009/winget-releaser@v2
        with:
          identifier: jeasoncc.NovelEditor
          token: ${{ secrets.WINGET_TOKEN }}
```

## 常见问题

### Q: 需要代码签名吗？
A: 不需要！Winget 不要求代码签名。

### Q: 需要付费吗？
A: 完全免费。

### Q: 多久审核一次？
A: 通常 1-3 天，周末可能更长。

### Q: 如何更新版本？
A: 重复上述步骤，提交新版本的清单文件。

### Q: 用户多吗？
A: Winget 用户主要是技术人员，但在增长中。Windows 11 默认安装 Winget。

## 参考资源

- [Winget 官方文档](https://learn.microsoft.com/en-us/windows/package-manager/)
- [Winget 仓库](https://github.com/microsoft/winget-pkgs)
- [清单文件规范](https://learn.microsoft.com/en-us/windows/package-manager/package/manifest)
