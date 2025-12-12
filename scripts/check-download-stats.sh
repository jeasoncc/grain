#!/bin/bash

# 检查各平台下载统计的脚本
# 用法: ./scripts/check-download-stats.sh

set -e

echo "📊 Novel Editor 下载统计检查"
echo "================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# AUR 统计
echo -e "${BLUE}🏛️  AUR 统计${NC}"
echo "--------------------------------"

# 检查主包
echo "📦 novel-editor (主包):"
AUR_MAIN=$(curl -s "https://aur.archlinux.org/rpc/?v=5&type=info&arg=novel-editor" 2>/dev/null || echo '{"results":[]}')
if echo "$AUR_MAIN" | jq -e '.results[0]' >/dev/null 2>&1; then
    VOTES=$(echo "$AUR_MAIN" | jq -r '.results[0].NumVotes // "N/A"')
    POPULARITY=$(echo "$AUR_MAIN" | jq -r '.results[0].Popularity // "N/A"')
    echo "  投票数: $VOTES"
    echo "  受欢迎度: $POPULARITY"
else
    echo "  ❌ 未找到或无法获取数据"
fi

# 检查二进制包
echo ""
echo "📦 novel-editor-bin (二进制包):"
AUR_BIN=$(curl -s "https://aur.archlinux.org/rpc/?v=5&type=info&arg=novel-editor-bin" 2>/dev/null || echo '{"results":[]}')
if echo "$AUR_BIN" | jq -e '.results[0]' >/dev/null 2>&1; then
    VOTES_BIN=$(echo "$AUR_BIN" | jq -r '.results[0].NumVotes // "N/A"')
    POPULARITY_BIN=$(echo "$AUR_BIN" | jq -r '.results[0].Popularity // "N/A"')
    echo "  投票数: $VOTES_BIN"
    echo "  受欢迎度: $POPULARITY_BIN"
else
    echo "  ❌ 未找到或无法获取数据"
fi

echo ""

# Flathub 统计
echo -e "${BLUE}📱 Flathub 统计${NC}"
echo "--------------------------------"
FLATHUB_STATS=$(curl -s "https://flathub.org/api/v1/apps/com.lotus.NovelEditor" 2>/dev/null || echo '{}')
if echo "$FLATHUB_STATS" | jq -e '.installs' >/dev/null 2>&1; then
    INSTALLS=$(echo "$FLATHUB_STATS" | jq -r '.installs // "N/A"')
    echo "📦 com.lotus.NovelEditor:"
    echo "  安装次数: $INSTALLS"
else
    echo "📦 com.lotus.NovelEditor:"
    echo "  ❌ 未找到或无法获取数据"
    echo "  💡 可能需要等待应用被Flathub收录"
fi

echo ""

# Snap Store 统计
echo -e "${BLUE}🫰 Snap Store 统计${NC}"
echo "--------------------------------"
if command -v snap >/dev/null 2>&1; then
    SNAP_INFO=$(snap info novel-editor-app 2>/dev/null || echo "")
    if [ -n "$SNAP_INFO" ]; then
        echo "📦 novel-editor-app:"
        echo "$SNAP_INFO" | grep -E "(installed|channels|contact)" || echo "  基本信息可用"
    else
        echo "📦 novel-editor-app:"
        echo "  ❌ 未找到或无法获取数据"
        echo "  💡 可能需要等待应用被Snap Store收录"
    fi
else
    echo "📦 novel-editor-app:"
    echo "  ⚠️  snap 命令不可用，无法检查"
fi

echo ""

# GitHub Releases 统计
echo -e "${BLUE}🐙 GitHub Releases 统计${NC}"
echo "--------------------------------"
GITHUB_RELEASES=$(curl -s "https://api.github.com/repos/jeasoncc/novel-editor/releases" 2>/dev/null || echo '[]')
if echo "$GITHUB_RELEASES" | jq -e '.[0]' >/dev/null 2>&1; then
    echo "📦 最新发布版本统计:"
    echo "$GITHUB_RELEASES" | jq -r '.[0:3][] | "  \(.tag_name): \(.assets | map(.download_count) | add // 0) 下载"' 2>/dev/null || echo "  无法解析下载数据"
else
    echo "📦 GitHub Releases:"
    echo "  ❌ 无法获取发布数据"
fi

echo ""
echo -e "${GREEN}✅ 统计检查完成${NC}"
echo ""
echo -e "${YELLOW}💡 提示:${NC}"
echo "- AUR 的受欢迎度基于实际安装量计算"
echo "- Flathub 和 Snap Store 可能需要时间来显示统计"
echo "- 可以定期运行此脚本来跟踪增长趋势"
echo ""
echo "🔗 直接访问链接:"
echo "- AUR: https://aur.archlinux.org/packages/novel-editor"
echo "- Flathub: https://flathub.org/apps/details/com.lotus.NovelEditor"
echo "- Snap Store: https://snapcraft.io/novel-editor-app"