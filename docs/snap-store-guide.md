# Snap Store 发布指南

本指南介绍如何将 Novel Editor 发布到 Snap Store。

## 前置要求

1. **注册 Snap Store 账号**
   - 访问 https://snapcraft.io/
   - 注册账号并验证邮箱

2. **安装 snapcraft**
   ```bash
   sudo snap install snapcraft --classic
   ```

3. **登录 snapcraft**
   ```bash
   snapcraft login
   ```

## 方式一：本地构建并发布

### 1. 本地构建 snap 包

```bash
# 在项目根目录执行
snapcraft

# 或使用 multipass（推荐）
snapcraft --use-lxd
```

### 2. 测试 snap 包

```bash
# 安装本地构建的 snap
sudo snap install --dangerous novel-editor_*.snap

# 运行测试
novel-editor

# 卸载
sudo snap remove novel-editor
```

### 3. 发布到 Snap Store

```bash
# 上传到 edge channel（测试）
snapcraft upload novel-editor_*.snap --release=edge

# 上传到 stable channel（正式发布）
snapcraft upload novel-editor_*.snap --release=stable
```

## 方式二：使用 GitHub 自动构建（推荐）

Snap Store 支持从 GitHub 自动构建，这是最方便的方式。

### 1. 在 Snap Store 注册应用

1. 访问 https://snapcraft.io/register
2. 注册应用名称：`novel-editor`
3. 确认注册

### 2. 连接 GitHub 仓库

1. 访问 https://snapcraft.io/novel-editor/builds
2. 点击 "Connect to GitHub"
3. 授权 Snapcraft 访问你的 GitHub 仓库
4. 选择你的仓库（例如：`your-username/novel-editor`）

### 3. 配置自动构建

在 Snapcraft 网站上配置：

- **Source**: 选择你的 GitHub 仓库
- **Branch**: 选择要构建的分支（例如：`main` 或 `release`）
- **Snapcraft.yaml location**: `snap/snapcraft.yaml`
- **Build triggers**: 
  - ✅ Build on push to branch
  - ✅ Build on tag creation

### 4. 触发构建

有两种方式触发构建：

#### 方式 A：推送到指定分支
```bash
git push origin main
```

#### 方式 B：创建 tag（推荐）
```bash
# 创建 tag
git tag -a snap-v0.1.8 -m "Release snap v0.1.8"
git push origin snap-v0.1.8
```

### 5. 监控构建状态

1. 访问 https://snapcraft.io/novel-editor/builds
2. 查看构建日志
3. 构建成功后，snap 会自动发布到指定的 channel

## Channel 管理

Snap Store 有 4 个 channel：

- **edge**: 最新的开发版本（自动发布）
- **beta**: 测试版本
- **candidate**: 候选版本
- **stable**: 稳定版本（生产环境）

### 提升 channel

```bash
# 从 edge 提升到 beta
snapcraft promote novel-editor --from-channel=edge --to-channel=beta

# 从 beta 提升到 stable
snapcraft promote novel-editor --from-channel=beta --to-channel=stable
```

## 使用 GitHub Actions 自动化

虽然 Snap Store 可以自动构建，但你也可以使用 GitHub Actions 来更好地控制发布流程。

创建 `.github/workflows/snap-publish.yml`：

```yaml
name: Publish to Snap Store

on:
  push:
    tags:
      - 'snap-v*.*.*'
  workflow_dispatch:

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build snap
        uses: snapcore/action-build@v1
        id: build
      
      - name: Publish to edge
        uses: snapcore/action-publish@v1
        env:
          SNAPCRAFT_STORE_CREDENTIALS: ${{ secrets.SNAPCRAFT_TOKEN }}
        with:
          snap: ${{ steps.build.outputs.snap }}
          release: edge
```

### 获取 SNAPCRAFT_TOKEN

```bash
# 导出 credentials
snapcraft export-login snapcraft-token.txt

# 将内容添加到 GitHub Secrets
# Settings -> Secrets -> Actions -> New repository secret
# Name: SNAPCRAFT_TOKEN
# Value: (粘贴 snapcraft-token.txt 的内容)
```

## 更新版本号

每次发布新版本时，需要更新：

1. `snap/snapcraft.yaml` 中的 `version` 字段
2. `apps/desktop/package.json` 中的 `version`
3. `apps/desktop/src-tauri/tauri.conf.json` 中的 `version`

或者使用自动化脚本：
```bash
./scripts/bump-version.sh
```

## 常见问题

### 1. 构建失败：找不到 bun

确保 `snapcraft.yaml` 中正确安装了 bun：
```yaml
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
```

### 2. 权限问题

Snap 应用默认是沙箱化的，需要正确配置 plugs：
```yaml
plugs:
  - home          # 访问用户主目录
  - network       # 网络访问
  - desktop       # 桌面集成
  - removable-media  # 访问外部存储
```

### 3. 图标不显示

确保在 `snap/gui` 目录下有正确的图标文件：
```bash
mkdir -p snap/gui
cp apps/desktop/src-tauri/icons/128x128.png snap/gui/novel-editor.png
```

## 用户安装

发布后，用户可以通过以下方式安装：

```bash
# 从 stable channel 安装
sudo snap install novel-editor

# 从 edge channel 安装（测试版）
sudo snap install novel-editor --edge

# 更新
sudo snap refresh novel-editor
```

## 参考资源

- [Snapcraft 官方文档](https://snapcraft.io/docs)
- [Tauri Snap 打包指南](https://tauri.app/v1/guides/distribution/snap)
- [Snap Store Dashboard](https://snapcraft.io/snaps)
