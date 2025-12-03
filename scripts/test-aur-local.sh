#!/bin/bash

set -e

echo "🧪 测试 AUR 包构建（使用本地源代码）"
echo ""

# 检查是否在 Arch Linux 上
if [ ! -f /etc/arch-release ]; then
  echo "⚠️  警告：此脚本应在 Arch Linux 上运行"
  echo "如果你不是在 Arch Linux 上，请使用: ./scripts/test-local-build.sh"
  read -p "继续？(y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# 检查依赖
echo "📦 检查构建依赖..."
MISSING_DEPS=()

# 检查 pacman 包
for dep in base-devel git rust cargo nodejs patchelf webkit2gtk gtk3 libappindicator-gtk3; do
  if ! pacman -Q $dep &> /dev/null 2>&1; then
    MISSING_DEPS+=($dep)
  fi
done

# 单独检查 bun（不在官方仓库）
if ! command -v bun &> /dev/null; then
  echo "❌ 错误：bun 未安装"
  echo ""
  echo "Bun 不在 Arch 官方仓库中，需要手动安装："
  echo ""
  echo "方法 1：使用官方脚本（推荐）"
  echo "  curl -fsSL https://bun.sh/install | bash"
  echo "  source ~/.bashrc  # 或 source ~/.zshrc"
  echo ""
  echo "方法 2：从 AUR 安装"
  echo "  yay -S bun-bin"
  echo "  # 或"
  echo "  paru -S bun-bin"
  exit 1
fi

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
  echo "❌ 缺少以下依赖："
  printf '  - %s\n' "${MISSING_DEPS[@]}"
  echo ""
  echo "安装命令："
  echo "  sudo pacman -S ${MISSING_DEPS[@]}"
  exit 1
fi

echo "✅ 所有依赖已安装"
echo "✅ Bun 版本: $(bun --version)"
echo ""

# 创建临时构建目录
BUILD_DIR=$(mktemp -d)
echo "📁 创建临时构建目录: $BUILD_DIR"

# 复制 PKGBUILD.local
cp aur/PKGBUILD.local "$BUILD_DIR/PKGBUILD"
cp aur/novel-editor.desktop "$BUILD_DIR/"

# 如果有 LICENSE 和 README，也复制
if [ -f LICENSE ]; then
  cp LICENSE "$BUILD_DIR/"
fi
if [ -f README.md ]; then
  cp README.md "$BUILD_DIR/"
fi

cd "$BUILD_DIR"

echo "✅ 文件已复制"
echo ""

# 生成 .SRCINFO
echo "📝 生成 .SRCINFO..."
makepkg --printsrcinfo > .SRCINFO
echo "✅ .SRCINFO 已生成"
echo ""

# 测试构建
echo "🔨 开始构建..."
echo "这可能需要 10-20 分钟..."
echo ""

if makepkg -sf --noconfirm; then
  echo ""
  echo "✅ 构建成功！"
  echo ""
  
  # 显示生成的包
  echo "📦 生成的包："
  ls -lh *.pkg.tar.zst
  echo ""
  
  # 检查包内容
  if command -v namcap &> /dev/null; then
    echo "🔍 检查包内容..."
    namcap *.pkg.tar.zst
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
    echo "运行测试："
    echo "  novel-editor"
    echo ""
    echo "卸载命令："
    echo "  sudo pacman -R novel-editor"
  fi
  
  # 询问是否保留构建文件
  echo ""
  read -p "是否保留构建文件？(y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📁 构建文件保存在: $BUILD_DIR"
  else
    echo "🧹 清理构建文件..."
    cd /
    rm -rf "$BUILD_DIR"
    echo "✅ 清理完成"
  fi
else
  echo ""
  echo "❌ 构建失败"
  echo ""
  echo "构建文件保存在: $BUILD_DIR"
  echo "你可以进入该目录查看详细错误："
  echo "  cd $BUILD_DIR"
  exit 1
fi

echo ""
echo "🎉 测试完成！"
echo ""
echo "如果构建和安装都成功，说明 AUR 包配置正确。"
echo "下一步可以准备发布到 AUR。"
