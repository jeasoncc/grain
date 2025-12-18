# Grain 自动更新配置指南

## 概述

Grain 使用 Tauri 内置的自动更新功能，从 GitHub Releases 自动下载和安装更新。

## 工作原理

```
应用启动 → 检查更新 → 发现新版本 → 提示用户 → 下载安装 → 重启应用
```

## 配置步骤

### 1. 生成签名密钥

```bash
npm run updater:generate-keys
```

这会生成：
- **私钥**: `~/.tauri/grain-updater.key` (保密！)
- **公钥**: 显示在终端 (需要添加到配置)

### 2. 更新 tauri.conf.json

将生成的公钥替换 `WILL_BE_GENERATED`:

```json
{
  "plugins": {
    "updater": {
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

### 3. 配置 GitHub Secrets

在 GitHub 仓库设置中添加 Secret:

- **Name**: `TAURI_SIGNING_PRIVATE_KEY`
- **Value**: `~/.tauri/grain-updater.key` 文件的内容

### 4. 更新 GitHub Actions

在 `.github/workflows/release-desktop.yml` 中添加签名步骤：

```yaml
- name: Sign and create updater artifacts
  env:
    TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
  run: |
    # Build will automatically sign if key is present
    bun run build:prod:desktop
```

## 使用方式

### 前端集成

在设置页面添加更新检查按钮：

```tsx
import { UpdateChecker } from "@/components/blocks/update-checker";

function SettingsPage() {
  return (
    <div>
      <UpdateChecker />
    </div>
  );
}
```

### 手动检查更新

```typescript
import { checkForUpdates, downloadAndInstall } from "@/services/updater";

// 检查更新
const updateInfo = await checkForUpdates();

if (updateInfo.available) {
  console.log(`New version: ${updateInfo.latestVersion}`);
  
  // 下载并安装
  await downloadAndInstall((progress) => {
    console.log(`Download progress: ${progress}%`);
  });
}
```

## 发布流程

### 1. 创建新版本

```bash
# 递增版本号
npm run version:bump

# 提交更改
git add .
git commit -m "chore: bump version to 0.1.X"

# 创建标签
npm run tag:desktop

# 推送
git push origin main --tags
```

### 2. GitHub Actions 自动构建

推送标签后，GitHub Actions 会：
1. 构建所有平台的安装包
2. 使用私钥签名
3. 生成 `latest.json` 文件
4. 上传到 GitHub Releases

### 3. latest.json 格式

```json
{
  "version": "0.1.92",
  "notes": "Release notes here",
  "pub_date": "2024-12-18T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "...",
      "url": "https://github.com/.../grain_0.1.92_x64_en-US.msi"
    },
    "darwin-x86_64": {
      "signature": "...",
      "url": "https://github.com/.../grain_0.1.92_x64.dmg"
    },
    "linux-x86_64": {
      "signature": "...",
      "url": "https://github.com/.../grain_0.1.92_amd64.AppImage"
    }
  }
}
```

## 更新策略

### 自动检查

- 应用启动时自动检查
- 每24小时后台检查一次

### 用户控制

- 用户可以选择"稍后更新"
- 用户可以手动检查更新
- 下载进度实时显示

## 安全性

### 签名验证

- 所有更新包都使用私钥签名
- 客户端使用公钥验证签名
- 防止中间人攻击

### HTTPS

- 所有下载通过 HTTPS
- GitHub CDN 提供可靠性

## 故障排除

### 问题: 更新检查失败

**原因**: 网络问题或 GitHub API 限制

**解决**: 
```typescript
try {
  await checkForUpdates();
} catch (error) {
  console.error("Update check failed:", error);
  // 显示友好错误提示
}
```

### 问题: 签名验证失败

**原因**: 公钥配置错误

**解决**: 
1. 检查 `tauri.conf.json` 中的公钥
2. 确保与生成的公钥一致

### 问题: 下载失败

**原因**: 网络中断或磁盘空间不足

**解决**: 
- 提供重试机制
- 检查磁盘空间

## 最佳实践

1. **版本号规范**: 使用语义化版本 (0.1.X)
2. **发布说明**: 每次发布都写清楚更新内容
3. **测试**: 在测试环境验证更新流程
4. **回滚**: 保留旧版本以便回滚
5. **通知**: 重大更新提前通知用户

## 相关文件

- `apps/desktop/src-tauri/Cargo.toml` - 添加 updater 依赖
- `apps/desktop/src-tauri/tauri.conf.json` - 更新器配置
- `apps/desktop/src/services/updater.ts` - 更新服务
- `apps/desktop/src/components/blocks/update-checker.tsx` - UI 组件
- `.github/workflows/release-desktop.yml` - 构建和签名

## 参考资料

- [Tauri Updater 文档](https://v2.tauri.app/plugin/updater/)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)
