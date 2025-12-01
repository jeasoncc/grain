# GitHub Releases 自动下载链接集成

## 概述

下载页面现在会自动从 GitHub Releases API 获取最新的发布版本和下载链接，无需手动更新。

## 功能特性

1. **自动获取最新版本**：从 GitHub Releases API 实时获取最新版本号
2. **自动匹配下载文件**：智能识别不同平台（Linux、Windows、macOS）的安装包
3. **文件格式识别**：
   - Linux: AppImage, DEB, RPM
   - Windows: MSI, EXE (Portable/Installer)
   - macOS: DMG (Intel/Apple Silicon)
4. **下载统计**：显示每个文件的下载次数和总下载量
5. **错误处理**：如果 API 失败，会显示默认数据并提示用户
6. **客户端直接调用**：由于项目使用静态导出，直接从客户端调用 GitHub API

## 技术实现

### 静态导出兼容

项目配置了 `output: "export"`，这意味着：
- ❌ 不能使用 Next.js API Routes
- ✅ 直接从客户端调用 GitHub API
- ✅ 完全静态，可以部署到任何静态托管服务

### 数据获取流程

1. 组件加载时，从客户端直接调用 GitHub API
2. 解析 release assets 并匹配到不同平台
3. 格式化并显示下载链接
4. 如果失败，显示默认数据（指向 GitHub Releases 页面）

## 文件命名规范

为了正确匹配文件，GitHub Release 中的文件应该遵循以下命名规范：

### Linux
- `*.AppImage` → AppImage 格式
- `*.deb` → DEB 格式
- `*.rpm` → RPM 格式

### Windows
- `*.msi` → MSI Installer
- `*portable*.exe` → Portable EXE
- `*setup*.exe` 或 `*.exe` → Installer EXE

### macOS
- `*arm64*.dmg` 或 `*aarch64*.dmg` → Apple Silicon
- `*intel*.dmg` 或 `*x64*.dmg` 或 `*x86*.dmg` → Intel
- `*.dmg` → 通用 DMG

## 示例 Release 文件

```
novel-editor-v0.1.0-linux-x64.AppImage
novel-editor-v0.1.0-linux-x64.deb
novel-editor-v0.1.0-linux-x64.rpm
novel-editor-v0.1.0-win-x64.msi
novel-editor-v0.1.0-win-x64-portable.exe
novel-editor-v0.1.0-macos-x64.dmg
novel-editor-v0.1.0-macos-arm64.dmg
```

## 配置

### 修改仓库信息

如果仓库地址不同，修改 `components/sections/download-section.tsx` 中的 API URL：

```typescript
const response = await fetch(
  "https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/releases/latest",
  // ...
);
```

## 错误处理

### API 失败时

- 显示警告提示
- 使用默认的平台数据
- 所有下载按钮指向 GitHub Releases 页面，用户可以手动下载

### 文件匹配失败

- 如果某个平台没有匹配的文件，显示"暂无可用下载"
- 不会影响其他平台的显示

## 故障排除

### 问题：一直显示"加载中..."

1. 检查浏览器控制台是否有错误
2. 检查网络连接
3. 检查 GitHub 仓库是否有 releases
4. 检查是否触发了 CORS 错误（GitHub API 通常允许 CORS）

### 问题：无法获取最新版本

1. 检查 GitHub 仓库是否有 releases
2. 查看浏览器控制台错误信息
3. 确认仓库名称和用户名正确

### 问题：文件匹配不正确

1. 检查 GitHub Release 中的文件名
2. 确保文件名包含平台和格式标识
3. 根据实际文件名调整匹配逻辑

## 相关链接

- [GitHub Releases API 文档](https://docs.github.com/en/rest/releases/releases)
- [Next.js 静态导出](https://nextjs.org/docs/advanced-features/static-html-export)
