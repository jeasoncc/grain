#!/bin/bash

# 版本号自动递增脚本
# 从主版本号文件读取当前版本，递增 patch 版本，然后同步到所有相关文件

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 主版本号源文件（使用根目录的 package.json 作为版本源）
VERSION_SOURCE="$PROJECT_ROOT/package.json"

# 检测是否在终端环境（避免颜色代码出现在 Git 提交信息中）
if [ -t 1 ]; then
    # 在终端中，使用颜色
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    RED='\033[0;31m'
    NC='\033[0m' # No Color
else
    # 不在终端中（如被 Git hook 调用），不使用颜色
    GREEN=''
    YELLOW=''
    RED=''
    NC=''
fi

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

# 函数：更新 Winget manifests 中的版本号（仅更新版本，不下载文件）
update_winget_version() {
    local new_version=$1
    local winget_dir="$PROJECT_ROOT/winget-manifests"
    
    if [ ! -d "$winget_dir" ]; then
        return 1
    fi
    
    # 更新版本文件
    if [ -f "$winget_dir/Jeason.Grain.yaml" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^PackageVersion: .*/PackageVersion: $new_version/" "$winget_dir/Jeason.Grain.yaml"
        else
            sed -i "s/^PackageVersion: .*/PackageVersion: $new_version/" "$winget_dir/Jeason.Grain.yaml"
        fi
        echo -e "${GREEN}✓${NC} 更新 winget-manifests/Jeason.Grain.yaml -> $new_version"
    fi
    
    # 更新安装器文件
    if [ -f "$winget_dir/Jeason.Grain.installer.yaml" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^PackageVersion: .*/PackageVersion: $new_version/" "$winget_dir/Jeason.Grain.installer.yaml"
        else
            sed -i "s/^PackageVersion: .*/PackageVersion: $new_version/" "$winget_dir/Jeason.Grain.installer.yaml"
        fi
        echo -e "${GREEN}✓${NC} 更新 winget-manifests/Jeason.Grain.installer.yaml -> $new_version"
    fi
    
    # 更新 locale 文件
    if [ -f "$winget_dir/Jeason.Grain.locale.zh-CN.yaml" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^PackageVersion: .*/PackageVersion: $new_version/" "$winget_dir/Jeason.Grain.locale.zh-CN.yaml"
        else
            sed -i "s/^PackageVersion: .*/PackageVersion: $new_version/" "$winget_dir/Jeason.Grain.locale.zh-CN.yaml"
        fi
        echo -e "${GREEN}✓${NC} 更新 winget-manifests/Jeason.Grain.locale.zh-CN.yaml -> $new_version"
    fi
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
    
    # 静默模式：不输出调试信息，只输出版本号
    SILENT_MODE="${SILENT_MODE:-false}"
    
    if [ "$SILENT_MODE" != "true" ]; then
        echo -e "${GREEN}开始自动递增版本号...${NC}" >&2
        echo "" >&2
    fi
    
    # 从主版本源文件读取当前版本
    if [ ! -f "$VERSION_SOURCE" ]; then
        echo -e "${RED}错误: 找不到版本源文件: $VERSION_SOURCE${NC}" >&2
        exit 1
    fi
    
    CURRENT_VERSION=$(get_version_from_json "$VERSION_SOURCE")
    
    if [ -z "$CURRENT_VERSION" ]; then
        echo -e "${RED}错误: 无法从 $VERSION_SOURCE 读取版本号${NC}" >&2
        exit 1
    fi
    
    if [ "$SILENT_MODE" != "true" ]; then
        echo -e "当前版本: ${YELLOW}$CURRENT_VERSION${NC}" >&2
    fi
    
    # 递增版本号
    NEW_VERSION=$(bump_patch_version "$CURRENT_VERSION")
    
    if [ "$NEW_VERSION" = "$CURRENT_VERSION" ]; then
        echo -e "${RED}错误: 版本号格式不正确: $CURRENT_VERSION${NC}" >&2
        exit 1
    fi
    
    if [ "$SILENT_MODE" != "true" ]; then
        echo -e "新版本: ${GREEN}$NEW_VERSION${NC}" >&2
        echo "" >&2
        echo -e "${GREEN}正在同步版本号到所有文件...${NC}" >&2
    fi
    
    # 更新所有相关文件的版本号（输出重定向到 stderr）
    if [ "$SILENT_MODE" != "true" ]; then
        # 1. 根目录 package.json
        update_json_version "$PROJECT_ROOT/package.json" "$NEW_VERSION" >&2
        
        # 2. Desktop package.json
        update_json_version "$PROJECT_ROOT/apps/desktop/package.json" "$NEW_VERSION" >&2
        
        # 3. Web package.json
        update_json_version "$PROJECT_ROOT/apps/web/package.json" "$NEW_VERSION" >&2
        
        # 4. Tauri config
        update_json_version "$PROJECT_ROOT/apps/desktop/src-tauri/tauri.conf.json" "$NEW_VERSION" >&2
        
        # 5. Cargo.toml
        update_cargo_version "$PROJECT_ROOT/apps/desktop/src-tauri/Cargo.toml" "$NEW_VERSION" >&2
        
        # 6. AUR PKGBUILD
        update_pkgbuild_version "$PROJECT_ROOT/aur/PKGBUILD" "$NEW_VERSION" >&2
        
        # 7. AUR PKGBUILD-binary
        update_pkgbuild_version "$PROJECT_ROOT/aur/PKGBUILD-binary" "$NEW_VERSION" >&2
        
        # 8. Snap snapcraft.yaml
        update_snap_version "$PROJECT_ROOT/snap/snapcraft.yaml" "$NEW_VERSION" >&2
        
        # 9. Flatpak manifest
        update_flatpak_version "$PROJECT_ROOT/flatpak/com.lotus.NovelEditor.yml" "$NEW_VERSION" >&2
        
        # 10. Winget manifests (仅更新版本号，不下载文件)
        update_winget_version "$NEW_VERSION" >&2
        
        echo "" >&2
        echo -e "${GREEN}✅ 版本号已从 $CURRENT_VERSION 更新到 $NEW_VERSION${NC}" >&2
        echo "" >&2
    else
        # 静默模式：不输出更新信息
        update_json_version "$PROJECT_ROOT/package.json" "$NEW_VERSION" >/dev/null 2>&1
        update_json_version "$PROJECT_ROOT/apps/desktop/package.json" "$NEW_VERSION" >/dev/null 2>&1
        update_json_version "$PROJECT_ROOT/apps/web/package.json" "$NEW_VERSION" >/dev/null 2>&1
        update_json_version "$PROJECT_ROOT/apps/desktop/src-tauri/tauri.conf.json" "$NEW_VERSION" >/dev/null 2>&1
        update_cargo_version "$PROJECT_ROOT/apps/desktop/src-tauri/Cargo.toml" "$NEW_VERSION" >/dev/null 2>&1
        update_pkgbuild_version "$PROJECT_ROOT/aur/PKGBUILD" "$NEW_VERSION" >/dev/null 2>&1
        update_pkgbuild_version "$PROJECT_ROOT/aur/PKGBUILD-binary" "$NEW_VERSION" >/dev/null 2>&1
        update_snap_version "$PROJECT_ROOT/snap/snapcraft.yaml" "$NEW_VERSION" >/dev/null 2>&1
        update_flatpak_version "$PROJECT_ROOT/flatpak/com.lotus.NovelEditor.yml" "$NEW_VERSION" >/dev/null 2>&1
        update_winget_version "$NEW_VERSION" >/dev/null 2>&1
    fi
    
    # 只输出纯净的版本号到 stdout（供 Git hook 使用）
    echo "$NEW_VERSION"
}

# 如果直接运行脚本，执行主函数
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi

