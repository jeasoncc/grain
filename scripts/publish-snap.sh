#!/bin/bash

# Snap Store 发布脚本
# 用于本地构建和发布 snap 包

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取版本号
VERSION=$(grep '^version:' snap/snapcraft.yaml | awk '{print $2}' | tr -d "'\"")

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Snap Store 发布工具${NC}"
echo -e "${GREEN}  版本: $VERSION${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 检查是否已登录
if ! snapcraft whoami &>/dev/null; then
    echo -e "${RED}❌ 未登录 Snapcraft${NC}"
    echo -e "${YELLOW}请先运行: snapcraft login${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} 已登录 Snapcraft"
echo ""

# 选择操作
echo "请选择操作："
echo "1) 构建 snap 包"
echo "2) 构建并发布到 edge"
echo "3) 构建并发布到 beta"
echo "4) 构建并发布到 stable"
echo "5) 仅发布已有的 snap 包"
read -p "选择 (1-5): " choice

case $choice in
    1)
        echo -e "${YELLOW}开始构建 snap 包...${NC}"
        snapcraft --use-lxd
        echo -e "${GREEN}✓${NC} 构建完成: novel-editor_${VERSION}_amd64.snap"
        ;;
    2|3|4)
        echo -e "${YELLOW}开始构建 snap 包...${NC}"
        snapcraft --use-lxd
        
        CHANNEL=""
        case $choice in
            2) CHANNEL="edge" ;;
            3) CHANNEL="beta" ;;
            4) CHANNEL="stable" ;;
        esac
        
        echo -e "${YELLOW}上传到 $CHANNEL channel...${NC}"
        snapcraft upload novel-editor_${VERSION}_amd64.snap --release=$CHANNEL
        
        echo ""
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}  ✅ 发布成功！${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "用户可以通过以下命令安装："
        echo -e "${YELLOW}sudo snap install novel-editor --${CHANNEL}${NC}"
        ;;
    5)
        if [ ! -f "novel-editor_${VERSION}_amd64.snap" ]; then
            echo -e "${RED}❌ 找不到 snap 包: novel-editor_${VERSION}_amd64.snap${NC}"
            exit 1
        fi
        
        echo "选择发布 channel："
        echo "1) edge"
        echo "2) beta"
        echo "3) stable"
        read -p "选择 (1-3): " channel_choice
        
        CHANNEL=""
        case $channel_choice in
            1) CHANNEL="edge" ;;
            2) CHANNEL="beta" ;;
            3) CHANNEL="stable" ;;
            *) echo -e "${RED}无效选择${NC}"; exit 1 ;;
        esac
        
        echo -e "${YELLOW}上传到 $CHANNEL channel...${NC}"
        snapcraft upload novel-editor_${VERSION}_amd64.snap --release=$CHANNEL
        
        echo ""
        echo -e "${GREEN}✅ 发布成功！${NC}"
        ;;
    *)
        echo -e "${RED}无效选择${NC}"
        exit 1
        ;;
esac
