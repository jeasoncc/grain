#!/bin/bash

# 更新所有平台的应用图标
# 用法: ./scripts/update-icons.sh [icon-file]

set -e

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 默认图标文件
ICON_FILE="${1:-apps/desktop/src-tauri/icons/my-new-icon.jpg}"

if [ ! -f "$ICON_FILE" ]; then
    echo -e "${RED}错误: 图标文件不存在: $ICON_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}🎨 开始更新应用图标...${NC}"
echo -e "图标文件: ${YELLOW}$ICON_FILE${NC}"
echo ""

# 1. 使用 Tauri 生成所有平台图标
echo -e "${YELLOW}📱 生成 Tauri 图标...${NC}"
cd apps/desktop
bun run tauri icon "../../$ICON_FILE"
cd "$PROJECT_ROOT"

# 2. 生成额外需要的尺寸
echo -e "${YELLOW}🖼️  生成额外图标尺寸...${NC}"
cd apps/desktop/src-tauri/icons

# 生成 256x256 (Flatpak 和 AUR 需要)
if command -v magick >/dev/null 2>&1; then
    magick icon.png -resize 256x256 256x256.png
elif command -v convert >/dev/null 2>&1; then
    convert icon.png -resize 256x256 256x256.png
else
    echo -e "${YELLOW}警告: 未找到 ImageMagick，跳过 256x256 图标生成${NC}"
fi

cd "$PROJECT_ROOT"

# 3. 更新 Snap 图标
echo -e "${YELLOW}📦 更新 Snap 图标...${NC}"
cp apps/desktop/src-tauri/icons/icon.png snap/gui/grain.png
echo -e "${GREEN}✓${NC} Snap 图标已更新"

# 4. 验证 Flatpak 图标配置
echo -e "${YELLOW}📦 验证 Flatpak 图标配置...${NC}"
if grep -q "icons/.*\.png" flatpak/com.lotus.Grain.yml; then
    echo -e "${GREEN}✓${NC} Flatpak 配置正确 (从 Tauri 图标目录安装)"
else
    echo -e "${YELLOW}⚠️${NC}  Flatpak 配置可能需要检查"
fi

# 5. 验证 AUR 图标配置
echo -e "${YELLOW}📦 验证 AUR 图标配置...${NC}"
if grep -q "icons/.*\.png" aur/PKGBUILD; then
    echo -e "${GREEN}✓${NC} AUR PKGBUILD 配置正确 (从 Tauri 图标目录安装)"
else
    echo -e "${YELLOW}⚠️${NC}  AUR PKGBUILD 配置可能需要检查"
fi

# 6. Winget 图标说明
echo -e "${YELLOW}📦 Winget 图标说明...${NC}"
echo -e "${GREEN}ℹ️${NC}  Winget 使用 MSI 包中的图标，无需单独配置"

# 7. 显示生成的图标文件
echo ""
echo -e "${GREEN}📋 生成的图标文件:${NC}"
echo "Tauri 图标目录: apps/desktop/src-tauri/icons/"
ls -la apps/desktop/src-tauri/icons/*.png | head -10

echo ""
echo -e "${GREEN}✅ 图标更新完成！${NC}"
echo ""
echo -e "${YELLOW}📝 下一步操作:${NC}"
echo "1. 提交更改到 git 仓库"
echo "2. 创建新的 release 来触发各平台的构建"
echo "3. 各平台将自动使用新图标:"
echo "   • Tauri: 使用生成的 .ico/.icns/.png 文件"
echo "   • Snap: 使用 snap/gui/grain.png"
echo "   • Flatpak: 从 Tauri 图标目录安装多尺寸图标"
echo "   • AUR: 从 Tauri 图标目录安装多尺寸图标"
echo "   • Winget: 使用 MSI 包中的图标"