# Snap Store 快速发布指南

## 最简单的方式：使用 Snap Store 自动构建

### 1. 注册应用（一次性操作）

访问 https://snapcraft.io/register 注册应用名称 `novel-editor`

### 2. 连接 GitHub（一次性操作）

1. 访问 https://snapcraft.io/novel-editor/builds
2. 点击 "Connect to GitHub"
3. 授权并选择你的仓库
4. 配置：
   - Branch: `main`
   - Snapcraft.yaml: `snap/snapcraft.yaml`
   - ✅ Build on push
   - ✅ Build on tag

### 3. 发布新版本

只需要推送代码或创建 tag：

```bash
# 方式 1：推送到 main 分支（自动构建到 edge）
git push origin main

# 方式 2：创建 tag（推荐）
git tag snap-v0.1.8
git push origin snap-v0.1.8
```

就这么简单！Snap Store 会自动：
- 从 GitHub 拉取代码
- 构建 snap 包
- 发布到 edge channel

### 4. 提升到 stable

构建成功后，在 Snap Store 网站上：
1. 访问 https://snapcraft.io/novel-editor/releases
2. 找到 edge channel 的版本
3. 点击 "Promote" → 选择 "stable"

## 本地构建方式

如果你想在本地构建和测试：

```bash
# 1. 安装 snapcraft
sudo snap install snapcraft --classic

# 2. 登录
snapcraft login

# 3. 构建
snapcraft --use-lxd

# 4. 测试
sudo snap install --dangerous novel-editor_*.snap

# 5. 发布
./scripts/publish-snap.sh
```

## 使用 GitHub Actions

已经配置好了 workflow，只需：

1. 获取 Snapcraft token：
   ```bash
   snapcraft export-login snapcraft-token.txt
   ```

2. 添加到 GitHub Secrets：
   - 名称：`SNAPCRAFT_TOKEN`
   - 值：snapcraft-token.txt 的内容

3. 推送 tag 触发发布：
   ```bash
   git tag snap-v0.1.8
   git push origin snap-v0.1.8
   ```

## 用户安装

发布后，用户可以：

```bash
# 安装稳定版
sudo snap install novel-editor

# 安装测试版
sudo snap install novel-editor --edge
```

## 常见问题

**Q: 构建失败怎么办？**
A: 查看 https://snapcraft.io/novel-editor/builds 的构建日志

**Q: 如何更新版本号？**
A: 运行 `./scripts/bump-version.sh`，它会自动更新所有文件

**Q: 多久能构建完成？**
A: 通常 15-30 分钟，取决于 Snap Store 的构建队列
