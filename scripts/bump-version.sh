#!/bin/bash

# 版本号自动递增脚本
# 从主版本号文件读取当前版本，递增 patch 版本，然后同步到所有相关文件

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 主版本号源文件（使用根目录的 package.json 作为版本源）
VERSION_SOURCE="$PROJECT_ROOT/package.json"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 函数：从 JSON 文件读取版本号
get_version_from_json() {
    local file=$1
    if [ -f "$file" ]; then
        # 使用 grep 和 sed 提取版本号，支持多种格式
        grep -o '"version":\s*"[^"]*"' "$file" | sed 's/.*"version":\s*"\([^"]*\)".*/\1/' | head -1
    fi
}

# 函数：更新 JSON 文件中的版本号
update_json_version() {
    local file=$1
    local new_version=$2
    
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}警告: 文件不存在，跳过: $file${NC}"
        return 1
    fi
    
    # 使用 sed 更新版本号（兼容不同的格式）
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/\"version\":\s*\"[^\"]*\"/\"version\": \"$new_version\"/g" "$file"
    else
        # Linux
        sed -i "s/\"version\":\s*\"[^\"]*\"/\"version\": \"$new_version\"/g" "$file"
    fi
    
    echo -e "${GREEN}✓${NC} 更新 $file -> $new_version"
}

# 函数：更新 PKGBUILD 中的 pkgver
update_pkgbuild_version() {
    local file=$1
    local new_version=$2
    
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}警告: 文件不存在，跳过: $file${NC}"
        return 1
    fi
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^pkgver=.*/pkgver=$new_version/" "$file"
    else
        sed -i "s/^pkgver=.*/pkgver=$new_version/" "$file"
    fi
    
    echo -e "${GREEN}✓${NC} 更新 $file -> $new_version"
}

# 函数：更新 Cargo.toml 中的版本号
update_cargo_version() {
    local file=$1
    local new_version=$2
    
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}警告: 文件不存在，跳过: $file${NC}"
        return 1
    fi
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^version = \"[^\"]*\"/version = \"$new_version\"/" "$file"
    else
        sed -i "s/^version = \"[^\"]*\"/version = \"$new_version\"/" "$file"
    fi
    
    echo -e "${GREEN}✓${NC} 更新 $file -> $new_version"
}

# 函数：递增版本号（patch 版本 +1）
bump_patch_version() {
    local version=$1
    local major=$(echo "$version" | cut -d. -f1)
    local minor=$(echo "$version" | cut -d. -f2)
    local patch=$(echo "$version" | cut -d. -f3)
    
    # 如果版本号格式不正确，返回原版本
    if [ -z "$major" ] || [ -z "$minor" ] || [ -z "$patch" ]; then
        echo "$version"
        return 1
    fi
    
    # 递增 patch 版本
    patch=$((patch + 1))
    echo "$major.$minor.$patch"
}

# 主函数
main() {
    cd "$PROJECT_ROOT"
    
    echo -e "${GREEN}开始自动递增版本号...${NC}"
    echo ""
    
    # 从主版本源文件读取当前版本
    if [ ! -f "$VERSION_SOURCE" ]; then
        echo -e "${RED}错误: 找不到版本源文件: $VERSION_SOURCE${NC}"
        exit 1
    fi
    
    CURRENT_VERSION=$(get_version_from_json "$VERSION_SOURCE")
    
    if [ -z "$CURRENT_VERSION" ]; then
        echo -e "${RED}错误: 无法从 $VERSION_SOURCE 读取版本号${NC}"
        exit 1
    fi
    
    echo -e "当前版本: ${YELLOW}$CURRENT_VERSION${NC}"
    
    # 递增版本号
    NEW_VERSION=$(bump_patch_version "$CURRENT_VERSION")
    
    if [ "$NEW_VERSION" = "$CURRENT_VERSION" ]; then
        echo -e "${RED}错误: 版本号格式不正确: $CURRENT_VERSION${NC}"
        exit 1
    fi
    
    echo -e "新版本: ${GREEN}$NEW_VERSION${NC}"
    echo ""
    
    # 更新所有相关文件的版本号
    echo -e "${GREEN}正在同步版本号到所有文件...${NC}"
    
    # 1. 根目录 package.json
    update_json_version "$PROJECT_ROOT/package.json" "$NEW_VERSION"
    
    # 2. Desktop package.json
    update_json_version "$PROJECT_ROOT/apps/desktop/package.json" "$NEW_VERSION"
    
    # 3. Web package.json
    update_json_version "$PROJECT_ROOT/apps/web/package.json" "$NEW_VERSION"
    
    # 4. Tauri config
    update_json_version "$PROJECT_ROOT/apps/desktop/src-tauri/tauri.conf.json" "$NEW_VERSION"
    
    # 5. Cargo.toml
    update_cargo_version "$PROJECT_ROOT/apps/desktop/src-tauri/Cargo.toml" "$NEW_VERSION"
    
    # 6. AUR PKGBUILD
    update_pkgbuild_version "$PROJECT_ROOT/aur/PKGBUILD" "$NEW_VERSION"
    
    # 7. AUR PKGBUILD-binary
    update_pkgbuild_version "$PROJECT_ROOT/aur/PKGBUILD-binary" "$NEW_VERSION"
    
    echo ""
    echo -e "${GREEN}✅ 版本号已从 $CURRENT_VERSION 更新到 $NEW_VERSION${NC}"
    echo ""
    
    # 返回新版本号（供其他脚本使用）
    echo "$NEW_VERSION"
}

# 如果直接运行脚本，执行主函数
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi

