# Novel Editor Monorepo 设置指南

## 前置要求

- Node.js >= 20
- Bun >= 1.1.0
- Rust & Cargo (用于 Tauri 桌面应用)

## 安装步骤

### 1. 安装 Bun

```bash
# Linux & macOS
curl -fsSL https://bun.sh/install | bash

# Windows
powershell -c "irm bun.sh/install.ps1|iex"
```

### 2. 安装依赖

```bash
bun install
```

### 3. 开发

#### 运行所有项目

```bash
bun dev
```

#### 只运行桌面应用

```bash
bun desktop:dev
```

#### 只运行官网

```bash
bun web:dev
```

官网将在 http://localhost:3000 运行
桌面应用将在 http://localhost:1420 运行

### 4. 构建

```bash
# 构建所有项目
bun build

# 只构建桌面应用
bun turbo run build --filter=desktop

# 只构建官网
bun turbo run build --filter=web
```

## 项目结构

```
novel-editor-monorepo/
├── apps/
│   ├── desktop/          # Tauri 桌面应用
│   │   ├── src/          # React 前端代码
│   │   ├── src-tauri/    # Rust 后端代码
│   │   └── package.json
│   │
│   └── web/              # Next.js 官网
│       ├── src/app/      # App Router 页面
│       ├── src/components/
│       └── package.json
│
├── packages/             # 共享包（未来扩展）
├── turbo.json           # Turborepo 配置
└── package.json         # 根配置 (包含 workspaces)
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `bun dev` | 启动所有项目的开发服务器 |
| `bun build` | 构建所有项目 |
| `bun lint` | 运行所有项目的 lint |
| `bun format` | 格式化所有代码 |
| `bun desktop:dev` | 只运行桌面应用 |
| `bun web:dev` | 只运行官网 |

## 部署

### 桌面应用

```bash
cd apps/desktop
bun tauri build
```

生成的安装包在 `apps/desktop/src-tauri/target/release/bundle/`

### 官网

官网使用静态导出，可以部署到：

- **Vercel**: 推荐，零配置部署
- **Netlify**: 支持自动部署
- **GitHub Pages**: 免费静态托管
- **Cloudflare Pages**: 全球 CDN

```bash
cd apps/web
bun build
# 输出在 apps/web/out/
```

## 故障排除

### bun install 失败

确保使用 bun >= 1.1.0：

```bash
bun --version
```

### Tauri 构建失败

确保安装了 Rust 和系统依赖：

```bash
# Linux
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# macOS
xcode-select --install

# Windows
# 安装 Visual Studio C++ Build Tools
```

### 端口冲突

如果端口被占用，可以修改：

- 桌面应用: `apps/desktop/vite.config.ts`
- 官网: `apps/web/package.json` 中的 dev 脚本

## 下一步

- 查看 [桌面应用文档](./apps/desktop/README.md)
- 查看 [官网文档](./apps/web/README.md)
- 开始开发！
