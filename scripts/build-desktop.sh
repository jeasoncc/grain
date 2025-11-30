#!/bin/bash

set -e

echo "🔨 Building Novel Editor Desktop App"
echo ""

# 获取脚本所在目录的父目录（项目根目录）
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "📁 Project root: $PROJECT_ROOT"

# 清理旧的构建
echo ""
echo "🧹 Cleaning old builds..."
rm -rf "$PROJECT_ROOT/apps/desktop/dist"
rm -rf "$PROJECT_ROOT/apps/desktop/src-tauri/target/release/bundle"

# 进入桌面应用目录
cd "$PROJECT_ROOT/apps/desktop"
echo "📁 Working directory: $(pwd)"

# 安装依赖
echo ""
echo "📦 Installing dependencies..."
bun install

# 构建前端
echo ""
echo "🎨 Building frontend..."
bun run build

# 检查前端构建结果
if [ ! -d "dist" ]; then
    echo ""
    echo "❌ Frontend build failed: dist directory not found"
    exit 1
fi

echo "✅ Frontend built successfully"
echo "📊 Frontend build size:"
du -sh dist/

# 构建 Tauri
echo ""
echo "🦀 Building Tauri app..."
bun tauri build

# 检查构建结果
if [ -d "src-tauri/target/release/bundle" ]; then
    echo ""
    echo "✅ Build complete!"
    echo ""
    echo "📦 Bundles created:"
    find src-tauri/target/release/bundle -type f \( -name "*.deb" -o -name "*.rpm" -o -name "*.AppImage" \) -exec ls -lh {} \;
else
    echo ""
    echo "❌ Tauri build failed: bundle directory not found"
    exit 1
fi
