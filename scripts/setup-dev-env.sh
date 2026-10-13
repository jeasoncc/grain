#!/bin/bash
# Arch Linux 开发环境配置脚本

set -e

echo "🚀 配置 Grain 开发环境..."

# 1. 安装全局工具
echo "📦 安装全局工具..."
bun install -g turbo@latest
bun install -g @biomejs/biome@latest

# 2. 验证工具安装
echo "✅ 验证工具..."
turbo --version
biome --version
bun --version
cargo --version
rustc --version

# 3. 安装项目依赖
echo "📦 安装项目依赖..."
bun install --frozen-lockfile

# 4. 检查 Rust 工具链
echo "🦀 检查 Rust 工具链..."
if ! command -v cargo-watch &> /dev/null; then
    echo "安装 cargo-watch..."
    cargo install cargo-watch
fi

if ! command -v cargo-nextest &> /dev/null; then
    echo "安装 cargo-nextest（更快的测试运行器）..."
    cargo install cargo-nextest
fi

# 5. 配置 Git hooks（如果需要）
if [ -d ".git" ]; then
    echo "🔧 配置 Git hooks..."
    # 这里可以添加 Git hooks 配置
fi

echo "✨ 开发环境配置完成！"
echo ""
echo "快速开始："
echo "  bun run desktop:dev    # 启动桌面应用"
echo "  bun run web:dev        # 启动 Web 应用"
echo "  bun run lint           # 代码检查"
echo "  bun run build:prod     # 生产构建"
