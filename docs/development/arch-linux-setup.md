# Arch Linux 开发环境配置指南

## 系统要求

- Arch Linux (滚动更新)
- 8GB+ RAM (推荐 16GB)
- 8 核 CPU (你的 i7-6700 满足)
- 50GB+ 可用磁盘空间

## 快速配置

```bash
# 1. 运行自动配置脚本
bash scripts/setup-dev-env.sh

# 2. 加载项目环境变量（添加到 ~/.zshrc）
echo "source $(pwd)/.zshrc-grain" >> ~/.zshrc
source ~/.zshrc

# 3. 验证环境
dev-tools
```

## 手动配置步骤

### 1. 安装系统依赖

```bash
# 基础开发工具（已安装）
sudo pacman -S base-devel git

# Node.js 和 Bun（已安装）
sudo pacman -S nodejs npm
curl -fsSL https://bun.sh/install | bash

# Rust（已安装）
sudo pacman -S rust cargo

# Tauri 依赖
sudo pacman -S webkit2gtk-4.1 libayatana-appindicator \
  librsvg libvips openssl appmenu-gtk-module gtk3
```

### 2. 配置镜像加速

#### npm/Bun 镜像
项目根目录已创建 `.npmrc` 和 `.bunfig.toml`

#### Cargo 镜像
已配置 `.cargo/config.toml`（使用 rsproxy）

### 3. 安装全局工具

```bash
bun install -g turbo@latest
bun install -g @biomejs/biome@latest
cargo install cargo-watch cargo-nextest
```

### 4. 安装项目依赖

```bash
bun install
```

## 性能优化建议

### 1. 编译优化

你的 CPU 是 8 核，已在 `.cargo/config.toml` 配置：
```toml
[build]
jobs = 8
```

### 2. 内存优化

当前内存使用：8.1GB / 15GB，建议：
- 关闭不必要的应用
- 增加 Node.js 内存限制（已在 `.zshrc-grain` 配置）

### 3. 磁盘优化

当前使用：74GB / 233GB (34%)
- 定期清理 Turbo 缓存：`clean-turbo`
- 清理 Rust target：`clean-rust`
- 清理 node_modules：`clean-all`

### 4. 构建缓存

Turbo 缓存位置：`.turbo/cache/`
- 不要删除此目录，它能显著加速构建
- 如果遇到缓存问题，使用 `clean-turbo`

## 常用命令

### 开发
```bash
gd          # bun run desktop:dev
gw          # bun run web:dev
```

### 构建
```bash
gb          # bun run build:prod
```

### 代码质量
```bash
gl          # bun run lint
gc          # bun run check
gt          # bun run test
```

### Rust 开发
```bash
cr          # cargo run (API server)
cb          # cargo build --release
cw          # cargo watch (自动重新编译)
```

## 故障排查

### Bun 安装失败
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.zshrc
```

### Turbo 未找到
```bash
bun install -g turbo@latest
```

### Tauri 构建失败
```bash
# 检查依赖
sudo pacman -S webkit2gtk-4.1 libayatana-appindicator

# 清理并重新构建
cargo clean --manifest-path apps/api-rust/Cargo.toml
bun run build:prod:desktop
```

### 内存不足
```bash
# 增加 swap
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 系统信息

- OS: Arch Linux (rolling)
- CPU: Intel i7-6700 (8 cores @ 3.40GHz)
- RAM: 15GB (8GB used)
- Disk: 233GB (74GB used)
- Shell: zsh
- Node: v25.2.1
- Bun: (需要检查版本)
- Rust: 1.92.0
- Cargo: 1.92.0

## 推荐工具

```bash
# 更好的 ls（已安装 eza）
alias ls='eza --icons --group-directories-first --git'

# 系统监控
sudo pacman -S htop btop

# 开发工具
sudo pacman -S ripgrep fd bat
```
