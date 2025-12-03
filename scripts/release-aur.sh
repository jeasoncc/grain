#!/bin/bash

set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "❌ 错误：未指定版本号"
  echo "用法: $0 <version>"
  echo "示例: $0 0.1.0"
  exit 1
fi

echo "🚀 开始发布 Novel Editor v$VERSION 到 AUR..."
echo ""

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
  echo "❌ 错误：请在项目根目录运行此脚本"
  exit 1
fi

# 检查 aur 目录是否存在
if [ ! -d "aur" ]; then
  echo "❌ 错误：aur 目录不存在"
  exit 1
fi

# 1. 创建 Git tag
echo "📝 步骤 1/6: 创建 Git tag..."
if git rev-parse "v$VERSION" >/dev/null 2>&1; then
  echo "⚠️  警告：tag v$VERSION 已存在，跳过创建"
else
  git tag -a "v$VERSION" -m "Release version $VERSION"
  git push origin "v$VERSION"
  echo "✅ Tag 已创建并推送"
fi
echo ""

# 2. 等待 GitHub 生成源代码包
echo "⏳ 步骤 2/6: 等待 GitHub 生成源代码包..."
sleep 5
echo "✅ 等待完成"
echo ""

# 3. 下载并生成 SHA256
echo "🔐 步骤 3/6: 下载源代码并生成 SHA256..."
TARBALL="v$VERSION.tar.gz"
URL="https://github.com/jeasoncc/novel-editor/archive/refs/tags/$TARBALL"

# 下载源代码包
if ! wget -q "$URL" -O "$TARBALL"; then
  echo "❌ 错误：下载源代码包失败"
  echo "URL: $URL"
  exit 1
fi

# 生成 SHA256
SHA256=$(sha256sum "$TARBALL" | awk '{print $1}')
rm "$TARBALL"

echo "✅ SHA256: $SHA256"
echo ""

# 4. 更新 PKGBUILD
echo "📝 步骤 4/6: 更新 PKGBUILD..."
sed -i "s/^pkgver=.*/pkgver=$VERSION/" aur/PKGBUILD
sed -i "s/^pkgrel=.*/pkgrel=1/" aur/PKGBUILD
sed -i "s/^sha256sums=.*/sha256sums=('$SHA256')/" aur/PKGBUILD
echo "✅ PKGBUILD 已更新"
echo ""

# 5. 生成 .SRCINFO
echo "📝 步骤 5/6: 生成 .SRCINFO..."
cd aur
if ! makepkg --printsrcinfo > .SRCINFO; then
  echo "❌ 错误：生成 .SRCINFO 失败"
  cd ..
  exit 1
fi
cd ..
echo "✅ .SRCINFO 已生成"
echo ""

# 6. 提交到 AUR
echo "📤 步骤 6/6: 提交到 AUR..."

# 检查 aur-repo 目录是否存在
if [ ! -d "aur-repo" ]; then
  echo "⚠️  警告：aur-repo 目录不存在"
  echo "请先克隆 AUR 仓库："
  echo "  git clone ssh://aur@aur.archlinux.org/novel-editor.git aur-repo"
  echo ""
  echo "或者手动提交："
  echo "  cd aur-repo"
  echo "  cp ../aur/PKGBUILD ."
  echo "  cp ../aur/.SRCINFO ."
  echo "  git add PKGBUILD .SRCINFO"
  echo "  git commit -m 'Update to v$VERSION'"
  echo "  git push origin master"
  exit 1
fi

# 复制文件到 aur-repo
cp aur/PKGBUILD aur-repo/
cp aur/.SRCINFO aur-repo/

# 提交并推送
cd aur-repo

git add PKGBUILD .SRCINFO

if git diff --cached --quiet; then
  echo "⚠️  警告：没有变更需要提交"
else
  git commit -m "Update to v$VERSION"
  
  if git push origin master; then
    echo "✅ 已推送到 AUR"
  else
    echo "❌ 错误：推送失败"
    echo "请检查 SSH 密钥配置和网络连接"
    cd ..
    exit 1
  fi
fi

cd ..
echo ""

# 完成
echo "🎉 成功发布 v$VERSION 到 AUR!"
echo ""
echo "📦 AUR 包页面: https://aur.archlinux.org/packages/novel-editor"
echo "🔗 GitHub Release: https://github.com/jeasoncc/novel-editor/releases/tag/v$VERSION"
echo ""
echo "用户可以通过以下方式安装："
echo "  yay -S novel-editor"
echo "  paru -S novel-editor"
