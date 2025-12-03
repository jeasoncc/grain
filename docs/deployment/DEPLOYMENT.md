# 部署指南

## 📦 官网部署

官网使用 Next.js 静态导出，可以部署到任何静态托管服务。

### Vercel (推荐)

1. 在 Vercel 导入项目
2. 设置根目录为 `apps/web`
3. 构建命令: `bun build`
4. 输出目录: `out`
5. 点击部署

或使用 CLI：

```bash
cd apps/web
bun add -D vercel
bunx vercel
```

### Netlify

1. 在 Netlify 导入项目
2. 设置：
   - Base directory: `apps/web`
   - Build command: `bun build`
   - Publish directory: `apps/web/out`
3. 部署

或创建 `netlify.toml`：

```toml
[build]
  base = "apps/web"
  command = "bun build"
  publish = "out"
```

### GitHub Pages

```bash
cd apps/web
bun build

# 将 out/ 目录推送到 gh-pages 分支
```

### Cloudflare Pages

1. 连接 GitHub 仓库
2. 设置：
   - Build command: `cd apps/web && bun build`
   - Build output directory: `apps/web/out`
3. 部署

## 🖥️ 桌面应用发布

### Linux

```bash
cd apps/desktop
bun tauri build
```

生成的文件：
- `src-tauri/target/release/bundle/appimage/` - AppImage
- `src-tauri/target/release/bundle/deb/` - DEB 包
- `src-tauri/target/release/bundle/rpm/` - RPM 包

### Windows

```bash
cd apps/desktop
bun tauri build
```

生成的文件：
- `src-tauri/target/release/bundle/msi/` - MSI 安装包
- `src-tauri/target/release/bundle/nsis/` - NSIS 安装包

### macOS

```bash
cd apps/desktop
bun tauri build
```

生成的文件：
- `src-tauri/target/release/bundle/dmg/` - DMG 镜像
- `src-tauri/target/release/bundle/macos/` - .app 包

## 🚀 自动化发布

### GitHub Actions

创建 `.github/workflows/release.yml`：

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun web:build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./apps/web/out

  release-desktop:
    strategy:
      matrix:
        platform: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - uses: dtolnay/rust-toolchain@stable
      - run: bun install
      - run: cd apps/desktop && bun tauri build
      - uses: softprops/action-gh-release@v1
        with:
          files: apps/desktop/src-tauri/target/release/bundle/**/*
```

## 📊 更新官网下载链接

构建完成后，更新 `apps/web/src/app/page.tsx` 中的下载链接：

```tsx
// 替换为实际的 GitHub Release 链接
href="https://github.com/yourusername/novel-editor/releases/latest/download/novel-editor_0.1.0_amd64.AppImage"
```

## 🔐 代码签名

### macOS

```bash
# 在 src-tauri/tauri.conf.json 中配置
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)"
    }
  }
}
```

### Windows

使用 SignTool 或在 CI 中配置证书。

## 📝 发布检查清单

- [ ] 更新版本号 (package.json)
- [ ] 更新 CHANGELOG
- [ ] 测试所有平台构建
- [ ] 更新官网下载链接
- [ ] 创建 GitHub Release
- [ ] 发布官网更新
- [ ] 社交媒体宣传
