#!/bin/bash

set -e

echo "🧪 测试 AUR 包构建..."
echo ""

# 检查是否在 Arch Linux 上
if [ ! -f /etc/arch-release ]; then
  echo "⚠️  警告：此脚本应在 Arch Linux 上运行"
  echo "继续测试可能会失败"
  echo ""
fi

# 检查依赖
echo "📦 检查构建依赖..."
MISSING_DEPS=()

for dep in base-devel git rust cargo bun nodejs patchelf; do
  if ! command -v $dep &> /dev/null && ! pacman -Q $dep &> /dev/null; then
    MISSING_DEPS+=($dep)
  fi
done

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
  echo "❌ 缺少以下依赖："
  printf '  - %s\n' "${MISSING_DEPS[@]}"
  echo ""
  echo "安装命令："
  echo "  sudo pacman -S ${MISSING_DEPS[@]}"
  exit 1
fi

echo "✅ 所有依赖已安装"
echo ""

# 进入 aur 目录
cd aur

# 清理之前的构建
echo "🧹 清理之前的构建..."
rm -rf pkg src *.pkg.tar.zst
echo "✅ 清理完成"
echo ""

# 测试 PKGBUILD 语法
echo "📝 检查 PKGBUILD 语法..."
if command -v namcap &> /dev/null; then
  namcap PKGBUILD
  echo "✅ PKGBUILD 语法检查通过"
else
  echo "⚠️  namcap 未安装，跳过语法检查"
  echo "安装: sudo pacman -S namcap"
fi
echo ""

# 生成 .SRCINFO
echo "📝 生成 .SRCINFO..."
makepkg --printsrcinfo > .SRCINFO
echo "✅ .SRCINFO 已生成"
echo ""

# 测试构建
echo "🔨 开始构建..."
echo "这可能需要几分钟..."
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
  fi
else
  echo ""
  echo "❌ 构建失败"
  echo ""
  echo "常见问题："
  echo "1. 检查依赖是否完整"
  echo "2. 检查网络连接（需要下载依赖）"
  echo "3. 检查磁盘空间"
  echo "4. 查看上面的错误信息"
  exit 1
fi

cd ..

echo ""
echo "🎉 测试完成！"
echo ""
echo "下一步："
echo "1. 如果构建成功，可以提交到 AUR"
echo "2. 运行 ./scripts/release-aur.sh <version> 发布"
