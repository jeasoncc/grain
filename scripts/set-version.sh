#!/bin/bash

# 设置统一版本号脚本
# 用法: ./scripts/set-version.sh 0.1.0

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 函数：更新 JSON 文件中的版本号
update_json_version() {
    local file=$1
    local new_version=$2
    
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}警告: 文件不存在，跳过: $file${NC}"
        return 1
    fi
    
    # 使用 sed 更新版本号
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\":\s*\"[^\"]*\"/\"version\": \"$new_version\"/g" "$file"
    else
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

# 函数：更新 snapcraft.yaml 中的版本号
update_snap_version() {
    local file=$1
    local new_version=$2
    
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}警告: 文件不存在，跳过: $file${NC}"
        return 1
    fi
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^version: .*/version: '$new_version'/" "$file"
    else
        sed -i "s/^version: .*/version: '$new_version'/" "$file"
    fi
    
    echo -e "${GREEN}✓${NC} 更新 $file -> $new_version"
}

# 函数：更新 Flatpak manifest 中的版本号
update_flatpak_version() {
    local file=$1
    local new_version=$2
    
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}警告: 文件不存在，跳过: $file${NC}"
        return 1
    fi
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/tag: v.*/tag: v$new_version/" "$file"
    else
        sed -i "s/tag: v.*/tag: v$new_version/" "$file"
    fi
    
    echo -e "${GREEN}✓${NC} 更新 $file -> $new_version"
}

# 主函数
main() {
    if [ -z "$1" ]; then
        echo -e "${RED}错误: 请提供版本号${NC}"
        echo "用法: $0 <version>"
        echo "示例: $0 0.1.0"
        exit 1
    fi
    
    NEW_VERSION="$1"
    
    # 验证版本号格式 (X.Y.Z)
    if ! echo "$NEW_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
        echo -e "${RED}错误: 版本号格式不正确，应为 X.Y.Z 格式${NC}"
        echo "示例: 0.1.0"
        exit 1
    fi
    
    cd "$PROJECT_ROOT"
    
    echo -e "${GREEN}设置版本号为: $NEW_VERSION${NC}"
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
    
    # 8. Snap snapcraft.yaml
    update_snap_version "$PROJECT_ROOT/snap/snapcraft.yaml" "$NEW_VERSION"
    
    # 9. Flatpak manifest
    update_flatpak_version "$PROJECT_ROOT/flatpak/com.lotus.NovelEditor.yml" "$NEW_VERSION"
    
    echo ""
    echo -e "${GREEN}✅ 所有文件版本号已设置为: $NEW_VERSION${NC}"
    echo ""
}

# 如果直接运行脚本，执行主函数
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi




