#!/bin/bash

# Grain API Docker 构建脚本
# 只复制 Rust 相关文件，避免复制 node_modules

set -e

echo "🐳 准备 Docker 构建上下文..."

# 创建临时构建目录
BUILD_DIR=$(mktemp -d)
echo "📁 临时目录: $BUILD_DIR"

# 复制必要文件
echo "📦 复制 Rust 源码..."
mkdir -p "$BUILD_DIR/packages/rust-core"
mkdir -p "$BUILD_DIR/apps/api-rust"

# 复制 rust-core
cp -r ../../packages/rust-core/* "$BUILD_DIR/packages/rust-core/"

# 复制 api-rust
cp -r ./* "$BUILD_DIR/apps/api-rust/"

# 进入构建目录
cd "$BUILD_DIR"

# 构建 Docker 镜像
echo "🔨 构建 Docker 镜像..."
docker build -f apps/api-rust/Dockerfile -t grain-api:latest .

# 清理临时目录
echo "🧹 清理临时文件..."
rm -rf "$BUILD_DIR"

echo "✅ 构建完成！"
echo ""
echo "运行容器："
echo "  docker run -d -p 3030:3030 -v \$(pwd)/data:/app/data grain-api:latest"
