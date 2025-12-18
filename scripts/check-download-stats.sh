#!/bin/bash

# Check download statistics across platforms
# Usage: ./scripts/check-download-stats.sh

set -e

echo "📊 Grain Download Statistics"
echo "================================"
echo ""

# Color definitions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# AUR Statistics
echo -e "${BLUE}🏛️  AUR Statistics${NC}"
echo "--------------------------------"

# Check main package
echo "📦 grain (main package):"
AUR_MAIN=$(curl -s "https://aur.archlinux.org/rpc/?v=5&type=info&arg=grain" 2>/dev/null || echo '{"results":[]}')
if echo "$AUR_MAIN" | jq -e '.results[0]' >/dev/null 2>&1; then
    VOTES=$(echo "$AUR_MAIN" | jq -r '.results[0].NumVotes // "N/A"')
    POPULARITY=$(echo "$AUR_MAIN" | jq -r '.results[0].Popularity // "N/A"')
    echo "  Votes: $VOTES"
    echo "  Popularity: $POPULARITY"
else
    echo "  ❌ Not found or unable to fetch data"
fi

# Check binary package
echo ""
echo "📦 grain-bin (binary package):"
AUR_BIN=$(curl -s "https://aur.archlinux.org/rpc/?v=5&type=info&arg=grain-bin" 2>/dev/null || echo '{"results":[]}')
if echo "$AUR_BIN" | jq -e '.results[0]' >/dev/null 2>&1; then
    VOTES_BIN=$(echo "$AUR_BIN" | jq -r '.results[0].NumVotes // "N/A"')
    POPULARITY_BIN=$(echo "$AUR_BIN" | jq -r '.results[0].Popularity // "N/A"')
    echo "  Votes: $VOTES_BIN"
    echo "  Popularity: $POPULARITY_BIN"
else
    echo "  ❌ Not found or unable to fetch data"
fi

echo ""

# Flathub Statistics
echo -e "${BLUE}📱 Flathub Statistics${NC}"
echo "--------------------------------"
FLATHUB_STATS=$(curl -s "https://flathub.org/api/v1/apps/com.lotus.Grain" 2>/dev/null || echo '{}')
if echo "$FLATHUB_STATS" | jq -e '.installs' >/dev/null 2>&1; then
    INSTALLS=$(echo "$FLATHUB_STATS" | jq -r '.installs // "N/A"')
    echo "📦 com.lotus.Grain:"
    echo "  Installs: $INSTALLS"
else
    echo "📦 com.lotus.Grain:"
    echo "  ❌ Not found or unable to fetch data"
    echo "  💡 May need to wait for Flathub listing"
fi

echo ""

# Snap Store Statistics
echo -e "${BLUE}🫰 Snap Store Statistics${NC}"
echo "--------------------------------"
if command -v snap >/dev/null 2>&1; then
    SNAP_INFO=$(snap info grain-editor 2>/dev/null || echo "")
    if [ -n "$SNAP_INFO" ]; then
        echo "📦 grain-editor:"
        echo "$SNAP_INFO" | grep -E "(installed|channels|contact)" || echo "  Basic info available"
    else
        echo "📦 grain-editor:"
        echo "  ❌ Not found or unable to fetch data"
        echo "  💡 May need to wait for Snap Store listing"
    fi
else
    echo "📦 grain-editor:"
    echo "  ⚠️  snap command not available"
fi

echo ""

# GitHub Releases Statistics
echo -e "${BLUE}🐙 GitHub Releases Statistics${NC}"
echo "--------------------------------"
GITHUB_RELEASES=$(curl -s "https://api.github.com/repos/jeasoncc/grain/releases" 2>/dev/null || echo '[]')
if echo "$GITHUB_RELEASES" | jq -e '.[0]' >/dev/null 2>&1; then
    echo "📦 Latest releases:"
    echo "$GITHUB_RELEASES" | jq -r '.[0:3][] | "  \(.tag_name): \(.assets | map(.download_count) | add // 0) downloads"' 2>/dev/null || echo "  Unable to parse download data"
else
    echo "📦 GitHub Releases:"
    echo "  ❌ Unable to fetch release data"
fi

echo ""
echo -e "${GREEN}✅ Statistics check complete${NC}"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "- AUR popularity is based on actual install count"
echo "- Flathub and Snap Store may take time to show statistics"
echo "- Run this script periodically to track growth"
echo ""
echo "🔗 Direct links:"
echo "- AUR: https://aur.archlinux.org/packages/grain"
echo "- Flathub: https://flathub.org/apps/details/com.lotus.Grain"
echo "- Snap Store: https://snapcraft.io/grain-editor"