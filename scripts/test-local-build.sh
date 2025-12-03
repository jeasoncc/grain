#!/bin/bash

set -e

echo "🧪 本地构建测试（不使用 PKGBUILD）"
echo "这将直接构建应用，不打包成 AUR 包"
echo ""

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
  echo "❌ 错误：请在项目根目录运行此脚本"
  exit 1
fi

# 检查依赖
echo "📦 检查依赖..."
MISSING_DEPS=()

if ! command -v bun &> /dev/null; then
  MISSING_DEPS+=("bun")
fi

if ! command -v cargo &> /dev/null; then
  MISSING_DEPS+=("rust/cargo")
fi

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
  echo "❌ 缺少以下依赖："
  printf '  - %s\n' "${MISSING_DEPS[@]}"
  echo ""
  echo "安装 Bun:"
  echo "  curl -fsSL https://bun.sh/install | bash"
  echo ""
  echo "安装 Rust:"
  echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
  exit 1
fi

echo "✅ 依赖检查通过"
echo ""

# 清理之前的构建
echo "🧹 清理之前的构建..."
rm -rf apps/desktop/dist
rm -rf apps/desktop/src-tauri/target/release/bundle
echo "✅ 清理完成"
echo ""

# 安装依赖
echo "📦 安装依赖..."
bun install
echo "✅ 依赖安装完成"
echo ""

# 构建前端
echo "🔨 构建前端..."
cd apps/desktop
bun run build

if [ ! -d "dist" ]; then
  echo "❌ 前端构建失败"
  exit 1
fi

echo "✅ 前端构建完成"
echo ""

# 构建 Tauri 应用
echo "🚀 构建 Tauri 应用..."
echo "这可能需要几分钟..."
echo ""

bun run tauri build

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 构建成功！"
  echo ""
  
  # 显示生成的文件
  echo "📦 生成的包："
  echo ""
  
  if [ -d "src-tauri/target/release/bundle/deb" ]; then
    echo "DEB 包："
    ls -lh src-tauri/target/release/bundle/deb/*.deb
    echo ""
  fi
  
  if [ -d "src-tauri/target/release/bundle/rpm" ]; then
    echo "RPM 包："
    ls -lh src-tauri/target/release/bundle/rpm/*.rpm
    echo ""
  fi
  
  echo "二进制文件："
  ls -lh src-tauri/target/release/novel-editor
  echo ""
  
  # 询问是否安装
  read -p "是否安装 DEB 包测试？(y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    DEB_FILE=$(ls src-tauri/target/release/bundle/deb/*.deb | head -1)
    if [ -f "$DEB_FILE" ]; then
      echo "📦 安装 DEB 包..."
      sudo dpkg -i "$DEB_FILE"
      echo "✅ 安装完成"
      echo ""
      echo "运行测试："
      echo "  novel-editor"
    fi
  fi
  
  cd ../..
  
  echo ""
  echo "🎉 本地构建测试完成！"
  echo ""
  echo "下一步："
  echo "1. 测试运行应用"
  echo "2. 如果一切正常，可以测试 AUR 包构建"
  echo "3. 运行: ./scripts/test-aur-local.sh"
else
  echo ""
  echo "❌ 构建失败"
  exit 1
fi
