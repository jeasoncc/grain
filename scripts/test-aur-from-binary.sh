#!/bin/bash

set -e

echo "🧪 测试 AUR 包（使用本地构建的二进制文件）"
echo ""

# 检查是否在 Arch Linux 上
if [ ! -f /etc/arch-release ]; then
  echo "⚠️  警告：此脚本应在 Arch Linux 上运行"
  read -p "继续？(y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# 检查是否已经构建
BINARY_PATH="apps/desktop/src-tauri/target/release/novel-editor"

if [ ! -f "$BINARY_PATH" ]; then
  echo "❌ 错误：找不到构建的二进制文件"
  echo ""
  echo "请先运行构建："
  echo "  ./scripts/test-local-build.sh"
  echo ""
  echo "或者手动构建："
  echo "  cd apps/desktop"
  echo "  bun install"
  echo "  bun run build"
  echo "  bun run tauri build"
  exit 1
fi

echo "✅ 找到构建的二进制文件"
echo "📍 位置: $BINARY_PATH"
echo "📊 大小: $(du -h $BINARY_PATH | cut -f1)"
echo ""

# 检查 makepkg 依赖
if ! command -v makepkg &> /dev/null; then
  echo "❌ 错误：makepkg 未安装"
  echo "安装: sudo pacman -S base-devel"
  exit 1
fi

# 创建临时构建目录
BUILD_DIR=$(mktemp -d)
echo "📁 创建临时构建目录: $BUILD_DIR"

# 保存当前目录（项目根目录）
PROJECT_ROOT=$(pwd)

# 复制 PKGBUILD-binary
cp aur/PKGBUILD-binary "$BUILD_DIR/PKGBUILD"
cp aur/novel-editor.desktop "$BUILD_DIR/"

cd "$BUILD_DIR"

echo "✅ 文件已复制"
echo ""

# 生成 .SRCINFO
echo "📝 生成 .SRCINFO..."
makepkg --printsrcinfo > .SRCINFO
echo "✅ .SRCINFO 已生成"
echo ""

# 构建包（只打包，不编译）
echo "📦 打包..."
echo ""

# 设置项目根目录环境变量供 PKGBUILD 使用
export PROJECT_ROOT="$PROJECT_ROOT"

if makepkg -f --noconfirm; then
  echo ""
  echo "✅ 打包成功！"
  echo ""
  
  # 显示生成的包
  echo "📦 生成的包："
  ls -lh *.pkg.tar.zst
  echo ""
  
  # 显示包内容
  echo "📋 包内容："
  tar -tzf *.pkg.tar.zst | head -20
  echo ""
  
  # 检查包质量
  if command -v namcap &> /dev/null; then
    echo "🔍 检查包质量..."
    namcap *.pkg.tar.zst || true
    echo ""
  fi
  
  # 询问是否安装
  read -p "是否安装测试？(y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 安装包..."
    sudo pacman -U *.pkg.tar.zst --noconfirm
    echo "✅ 安装完成"
    echo ""
    echo "🚀 运行测试："
    echo "  novel-editor"
    echo ""
    echo "📍 安装位置："
    echo "  二进制: /usr/bin/novel-editor"
    echo "  桌面文件: /usr/share/applications/novel-editor.desktop"
    echo "  图标: /usr/share/icons/hicolor/*/apps/novel-editor.png"
    echo ""
    echo "🗑️  卸载命令："
    echo "  sudo pacman -R novel-editor"
  fi
  
  # 询问是否保留构建文件
  echo ""
  read -p "是否保留构建文件？(y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📁 构建文件保存在: $BUILD_DIR"
    echo ""
    echo "包文件:"
    ls -1 "$BUILD_DIR"/*.pkg.tar.zst
  else
    echo "🧹 清理构建文件..."
    cd /
    rm -rf "$BUILD_DIR"
    echo "✅ 清理完成"
  fi
else
  echo ""
  echo "❌ 打包失败"
  echo ""
  echo "构建文件保存在: $BUILD_DIR"
  echo "你可以进入该目录查看详细错误："
  echo "  cd $BUILD_DIR"
  exit 1
fi

echo ""
echo "🎉 测试完成！"
echo ""
echo "如果安装和运行都成功，说明 AUR 包配置正确。"
echo ""
echo "下一步："
echo "1. 测试应用功能"
echo "2. 如果一切正常，准备发布到 AUR"
echo "3. 创建 GitHub Release"
echo "4. 运行: ./scripts/release-aur.sh 0.1.0"
