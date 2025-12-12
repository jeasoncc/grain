#!/bin/bash

# 发布 novel-editor-bin 到 AUR
# 使用预编译的 DEB 包，避免长时间编译

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 从 package.json 读取版本
VERSION=$(grep -o '"version":\s*"[^"]*"' "$PROJECT_ROOT/package.json" | sed 's/.*"version":\s*"\([^"]*\)".*/\1/')

if [ -z "$VERSION" ]; then
    echo -e "${RED}错误: 无法读取版本号${NC}"
    exit 1
fi

echo -e "${GREEN}准备发布 novel-editor-bin v$VERSION 到 AUR${NC}"
echo ""

# 检查 GitHub Release 是否存在
echo -e "${YELLOW}检查 GitHub Release...${NC}"
if ! curl -s -f "https://api.github.com/repos/jeasoncc/novel-editor/releases/tags/desktop-v$VERSION" > /dev/null; then
    echo -e "${RED}错误: Release desktop-v$VERSION 不存在${NC}"
    echo "请先创建 GitHub Release"
    exit 1
fi

# 检查 DEB 文件是否存在
DEB_URL="https://github.com/jeasoncc/novel-editor/releases/download/desktop-v$VERSION/novel-editor_${VERSION}_amd64.deb"
echo -e "${YELLOW}检查 DEB 文件: $DEB_URL${NC}"
if ! curl -s -f -I "$DEB_URL" > /dev/null; then
    echo -e "${RED}错误: DEB 文件不存在: $DEB_URL${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Release 和 DEB 文件都存在${NC}"
echo ""

# 更新 PKGBUILD-bin
echo -e "${YELLOW}更新 PKGBUILD-bin...${NC}"
cd "$PROJECT_ROOT/aur"

# 更新版本号
sed -i "s/^pkgver=.*/pkgver=$VERSION/" PKGBUILD-bin

# 更新下载 URL
sed -i "s|desktop-v.*\/novel-editor_.*_amd64\.deb|desktop-v$VERSION/novel-editor_${VERSION}_amd64.deb|" PKGBUILD-bin

echo -e "${GREEN}✓ PKGBUILD-bin 已更新${NC}"

# 显示更新后的内容
echo ""
echo -e "${YELLOW}更新后的 PKGBUILD-bin:${NC}"
grep -E "^(pkgver|source)" PKGBUILD-bin

echo ""
echo -e "${GREEN}novel-editor-bin 已准备就绪！${NC}"
echo ""
echo -e "${YELLOW}手动发布步骤:${NC}"
echo "1. 克隆 AUR 仓库:"
echo "   git clone ssh://aur@aur.archlinux.org/novel-editor-bin.git"
echo ""
echo "2. 复制文件:"
echo "   cp aur/PKGBUILD-bin novel-editor-bin/PKGBUILD"
echo ""
echo "3. 生成 .SRCINFO:"
echo "   cd novel-editor-bin"
echo "   makepkg --printsrcinfo > .SRCINFO"
echo ""
echo "4. 提交并推送:"
echo "   git add PKGBUILD .SRCINFO"
echo "   git commit -m \"Update to $VERSION\""
echo "   git push"
echo ""
echo -e "${GREEN}用户安装命令:${NC}"
echo "   yay -S novel-editor-bin"
echo "   # 或"
echo "   paru -S novel-editor-bin"