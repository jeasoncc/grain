# 🔍 GitHub Actions 工作流对比分析

## 📋 问题

官网部署工作流失败，错误信息：
```
Action failed with 'The process '/usr/bin/git' failed with exit code 128'
```

## 🔄 旧工作流 vs 新工作流对比

### 桌面应用工作流

#### 旧工作流 (apps/desktop/.github/workflows/release.yml)

**关键特点**:
```yaml
# Bun 安装方式
- name: setup Bun
  run: |
    curl -fsSL https://bun.sh/install | bash
    echo "$HOME/.bun/bin" >> $GITHUB_PATH

# 依赖安装（在项目根目录）
- name: install frontend dependencies
  run: bun install

# 前端构建（在项目根目录）
- name: build frontend
  run: bun run build

# Tauri 构建（无 projectPath）
- uses: tauri-apps/tauri-action@v0
  with:
    tagName: app-v__VERSION__
    # 没有 projectPath，默认在根目录

# Rust cache 路径
workspaces: './src-tauri -> target'

# 构建产物路径
path: |
  src-tauri/target/release/bundle/**/*.deb
```

#### 新工作流 (.github/workflows/release-desktop.yml)

**关键特点**:
```yaml
# Bun 安装方式（使用官方 Action）
- name: Setup Bun
  uses: oven-sh/setup-bun@v1
  with:
    bun-version: latest

# 依赖安装（在根目录，monorepo）
- name: Install dependencies
  run: bun install

# 前端构建（在子目录）
- name: Build desktop frontend
  working-directory: apps/desktop
  run: bun run build

# Tauri 构建（指定 projectPath）
- uses: tauri-apps/tauri-action@v0
  with:
    projectPath: apps/desktop  # ⚠️ 关键差异
    tagName: desktop-v__VERSION__

# Rust cache 路径
workspaces: 'apps/desktop/src-tauri -> target'

# 构建产物路径
path: |
  apps/desktop/src-tauri/target/release/bundle/**/*.deb
```

### 官网部署工作流

#### 新工作流 (.github/workflows/deploy-web.yml)

```yaml
- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  if: github.ref == 'refs/heads/main'
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./apps/web/out
    cname: your-domain.com  # ⚠️ 问题所在
```

## 🐛 发现的问题

### 问题 1: 官网部署失败 (高优先级)

**错误**: `The process '/usr/bin/git' failed with exit code 128`

**原因**: 
1. `cname: your-domain.com` 是占位符，不是真实域名
2. GitHub Pages 尝试配置 CNAME 但失败

**影响**: 官网无法部署

### 问题 2: 桌面应用工作流路径差异

**旧工作流**: 在项目根目录操作
```yaml
run: bun install          # 在根目录
run: bun run build        # 在根目录
workspaces: './src-tauri -> target'
```

**新工作流**: 在 monorepo 子目录操作
```yaml
run: bun install                    # 在根目录
working-directory: apps/desktop     # 切换到子目录
run: bun run build                  # 在子目录
workspaces: 'apps/desktop/src-tauri -> target'
```

**影响**: 路径不一致可能导致构建失败

### 问题 3: 缺少 ARM Ubuntu 支持

**旧工作流**: 包含 `ubuntu-22.04-arm`
**新工作流**: 移除了 ARM 支持

## 🔧 修复方案

### 修复 1: 官网部署工作流（立即修复）

**问题**: CNAME 配置错误

**解决方案 A**: 移除 CNAME（如果没有自定义域名）

```yaml
- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  if: github.ref == 'refs/heads/main'
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./apps/web/out
    # 移除 cname 行
```

**解决方案 B**: 使用真实域名（如果有）

```yaml
- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  if: github.ref == 'refs/heads/main'
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./apps/web/out
    cname: novel-editor.yourdomain.com  # 使用真实域名
```

### 修复 2: 桌面应用工作流（保持兼容）

**方案 A**: 使用旧工作流的方式（推荐）

恢复到单一项目的构建方式，因为它已经验证可以工作：

```yaml
# 在根目录安装依赖
- name: Install dependencies
  working-directory: apps/desktop
  run: bun install

# 在子目录构建
- name: Build frontend
  working-directory: apps/desktop
  run: bun run build

# Tauri 构建指定项目路径
- uses: tauri-apps/tauri-action@v0
  with:
    projectPath: apps/desktop
```

**方案 B**: 使用 monorepo 方式（需要测试）

保持当前的 monorepo 方式，但需要确保路径正确。

### 修复 3: 恢复 ARM Ubuntu 支持（可选）

```yaml
matrix:
  include:
    - platform: 'ubuntu-22.04'
      args: ''
    - platform: 'ubuntu-22.04-arm'  # 恢复 ARM 支持
      args: ''
```

## 📝 推荐的修复工作流

### 官网部署工作流（修复版）

```yaml
name: Deploy Website

on:
  workflow_dispatch:
  push:
    branches:
      - main
    paths:
      - 'apps/web/**'
      - '.github/workflows/deploy-web.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Build website
        working-directory: apps/web
        run: bun run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        if: github.ref == 'refs/heads/main'
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./apps/web/out
          # 移除 cname，除非你有真实域名
```

### 桌面应用工作流（兼容旧版本）

```yaml
name: Release Desktop App

on:
  workflow_dispatch:
  push:
    branches:
      - release
    tags:
      - "desktop-v*.*.*"

jobs:
  publish-tauri:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: 'macos-latest'
            args: '--target aarch64-apple-darwin'
          - platform: 'macos-latest'
            args: '--target x86_64-apple-darwin'
          - platform: 'ubuntu-22.04'
            args: ''
          - platform: 'ubuntu-22.04-arm'  # 恢复 ARM 支持
            args: ''
          - platform: 'windows-latest'
            args: ''

    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      # Ubuntu 系统依赖
      - name: Install dependencies (Ubuntu only)
        if: matrix.platform == 'ubuntu-22.04' || matrix.platform == 'ubuntu-22.04-arm'
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            libappindicator3-dev \
            librsvg2-dev \
            patchelf \
            build-essential \
            pkg-config

      # 安装 Bun（使用官方 Action）
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      # 安装 Rust
      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: 'apps/desktop/src-tauri -> target'

      # 在子目录安装依赖（更接近旧版本的方式）
      - name: Install dependencies
        working-directory: apps/desktop
        run: bun install

      # 在子目录构建前端
      - name: Build frontend
        working-directory: apps/desktop
        run: bun run build

      # 构建 & 发布 Tauri App
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

      # 上传构建产物
      - name: Upload build artifacts
        if: success()
        uses: actions/upload-artifact@v4
        with:
          name: tauri-bundles-${{ matrix.platform }}-${{ matrix.args }}
          path: |
            apps/desktop/src-tauri/target/release/bundle/**/*.deb
            apps/desktop/src-tauri/target/release/bundle/**/*.AppImage
            apps/desktop/src-tauri/target/release/bundle/**/*.rpm
            apps/desktop/src-tauri/target/release/bundle/**/*.exe
            apps/desktop/src-tauri/target/release/bundle/**/*.msi
            apps/desktop/src-tauri/target/release/bundle/**/*.dmg
```

## 📊 关键差异总结

| 项目 | 旧工作流 | 新工作流 | 推荐 |
|------|----------|----------|------|
| Bun 安装 | 手动脚本 | 官方 Action | 官方 Action ✅ |
| 依赖安装位置 | 根目录 | 根目录 (monorepo) | 子目录 ✅ |
| 构建位置 | 根目录 | 子目录 | 子目录 ✅ |
| projectPath | 无 | apps/desktop | apps/desktop ✅ |
| ARM 支持 | 有 | 无 | 恢复 ✅ |
| 官网 CNAME | N/A | 占位符 | 移除 ✅ |

## 🎯 立即行动

### 1. 修复官网部署（高优先级）

```bash
# 编辑 .github/workflows/deploy-web.yml
# 移除或修改 cname 行
```

### 2. 更新桌面应用工作流（中优先级）

```bash
# 编辑 .github/workflows/release-desktop.yml
# 使用推荐的工作流配置
```

### 3. 测试工作流

```bash
# 提交更改
git add .github/workflows/
git commit -m "fix: update GitHub Actions workflows for monorepo"
git push

# 手动触发测试
# 在 GitHub Actions 页面点击 "Run workflow"
```

## ✅ 验证清单

- [ ] 移除或修改官网部署的 CNAME
- [ ] 更新桌面应用工作流的依赖安装位置
- [ ] 恢复 ARM Ubuntu 支持（如需要）
- [ ] 测试官网部署
- [ ] 测试桌面应用构建

## 🎊 结论

**主要问题**:
1. 🔴 官网部署失败 - CNAME 配置错误
2. 🟡 桌面应用工作流路径不一致
3. 🟢 缺少 ARM 支持（可选）

**修复优先级**:
1. 立即修复官网部署的 CNAME 问题
2. 更新桌面应用工作流以匹配旧版本的成功模式
3. 可选：恢复 ARM Ubuntu 支持

**预计修复时间**: 10-15 分钟
