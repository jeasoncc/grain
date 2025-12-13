#!/bin/bash

# Git Tag 创建脚本
# 创建并推送 Git Tag 以触发 CI/CD 构建流程
# 支持 desktop, snap, aur, all 参数

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 版本号源文件
VERSION_SOURCE="$PROJECT_ROOT/package.json"

# 检测是否在终端环境
if [ -t 1 ]; then
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    RED='\033[0;31m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    GREEN=''
    YELLOW=''
    RED=''
    BLUE=''
    NC=''
fi

# 函数：从 JSON 文件读取版本号
get_version_from_json() {
    local file=$1
    if [ -f "$file" ]; then
        grep -o '"version":\s*"[^"]*"' "$file" | sed 's/.*"version":\s*"\([^"]*\)".*/\1/' | head -1
    fi
}

# 函数：显示帮助信息
show_help() {
    echo -e "${BLUE}Git Tag 创建脚本${NC}"
    echo ""
    echo "用法: $0 {命令}"
    echo ""
    echo -e "${YELLOW}🐧 Linux 发布命令（推荐）：${NC}"
    echo "  linux      - 智能 Linux 发布"
    echo "               • desktop + snap 立即触发"
    echo "               • flatpak, aur, aur-bin, ppa, copr, obs, gentoo"
    echo "                 在 desktop 完成后自动触发（无需创建 tag）"
    echo ""
    echo -e "${YELLOW}📦 单平台发布命令：${NC}"
    echo "  desktop    - 创建 desktop tag，触发桌面应用发布"
    echo "               完成后自动触发依赖平台"
    echo "  snap       - 创建 snap tag，触发 Snap Store 发布（独立构建）"
    echo "  winget     - 创建 winget tag，触发 Winget 发布"
    echo "  chocolatey - 创建 chocolatey tag，触发 Chocolatey 发布"
    echo "  scoop      - 创建 scoop tag，触发 Scoop 发布"
    echo "  homebrew   - 创建 homebrew tag，触发 Homebrew 发布"
    echo "  web        - 创建 web tag，触发 Web 应用部署"
    echo ""
    echo -e "${BLUE}📋 Linux 平台依赖关系：${NC}"
    echo "  独立平台: snap（从源码构建，不依赖 desktop）"
    echo "  依赖平台: flatpak, aur, aur-bin, ppa, copr, obs, gentoo"
    echo "           （需要 desktop 的 deb/rpm 文件，由 desktop 完成后自动触发）"
    echo ""
    echo "示例:"
    echo "  $0 linux        # 智能发布所有 Linux 平台（推荐）"
    echo "  $0 desktop      # 只发布 desktop（会自动触发依赖平台）"
    echo "  $0 snap         # 只发布 snap"
}

# 函数：创建并推送单个标签
create_and_push_tag() {
    local prefix=$1
    local version=$2
    local tag="${prefix}-v${version}"
    
    echo -e "${BLUE}正在创建标签: ${YELLOW}$tag${NC}"
    
    # 检查标签是否已存在
    if git rev-parse "$tag" >/dev/null 2>&1; then
        echo -e "${RED}错误: 标签 $tag 已存在${NC}"
        echo -e "${YELLOW}提示: 如需重新创建，请先删除旧标签:${NC}"
        echo -e "  git tag -d $tag"
        echo -e "  git push origin :refs/tags/$tag"
        return 1
    fi
    
    # 创建带注释的标签
    git tag -a "$tag" -m "Release $tag"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}错误: 创建标签失败${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✓${NC} 标签 $tag 创建成功"
    
    # 推送标签到远程
    echo -e "${BLUE}正在推送标签到远程...${NC}"
    git push origin "$tag"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}错误: 推送标签失败${NC}"
        echo -e "${YELLOW}提示: 请检查网络连接和远程仓库权限${NC}"
        # 删除本地标签
        git tag -d "$tag" >/dev/null 2>&1
        return 1
    fi
    
    echo -e "${GREEN}✓${NC} 标签 $tag 已推送到远程"
    return 0
}

# 主函数
main() {
    local tag_type=$1
    
    # 检查参数
    if [ -z "$tag_type" ]; then
        show_help
        exit 1
    fi
    
    # 处理帮助参数
    case $tag_type in
        -h|--help|help)
            show_help
            exit 0
            ;;
    esac
    
    cd "$PROJECT_ROOT"
    
    # 读取版本号
    if [ ! -f "$VERSION_SOURCE" ]; then
        echo -e "${RED}错误: 找不到版本源文件: $VERSION_SOURCE${NC}"
        exit 1
    fi
    
    VERSION=$(get_version_from_json "$VERSION_SOURCE")
    
    if [ -z "$VERSION" ]; then
        echo -e "${RED}错误: 无法从 $VERSION_SOURCE 读取版本号${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}当前版本: ${YELLOW}$VERSION${NC}"
    echo ""
    
    # 检查是否有未提交的更改
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo -e "${YELLOW}警告: 存在未提交的更改${NC}"
        echo -e "${YELLOW}建议先提交所有更改再创建标签${NC}"
        read -p "是否继续? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}已取消${NC}"
            exit 1
        fi
    fi
    
    # 根据参数创建标签
    case $tag_type in
        desktop)
            create_and_push_tag "desktop" "$VERSION"
            ;;
        snap)
            create_and_push_tag "snap" "$VERSION"
            ;;
        aur|aur-bin|flatpak|ppa|copr|obs|gentoo)
            echo -e "${YELLOW}⚠️  $tag_type 平台依赖 desktop 构建${NC}"
            echo -e "${YELLOW}   这些平台会在 desktop 构建完成后自动触发${NC}"
            echo ""
            echo -e "${BLUE}推荐使用:${NC}"
            echo -e "  npm run tag:linux    # 智能发布所有 Linux 平台"
            echo -e "  npm run tag:desktop  # 只发布 desktop（会自动触发依赖平台）"
            exit 1
            ;;
        winget)
            create_and_push_tag "winget" "$VERSION"
            ;;
        chocolatey)
            create_and_push_tag "chocolatey" "$VERSION"
            ;;
        scoop)
            create_and_push_tag "scoop" "$VERSION"
            ;;
        homebrew)
            create_and_push_tag "homebrew" "$VERSION"
            ;;
        web)
            create_and_push_tag "web" "$VERSION"
            ;;

        linux)
            # Linux 智能发布：
            # 1. 创建 desktop tag（触发构建，完成后自动触发依赖平台）
            # 2. 创建 snap tag（独立构建，立即触发）
            echo -e "${BLUE}🐧 Linux 智能发布流程${NC}"
            echo ""
            echo -e "${YELLOW}📋 发布流程说明：${NC}"
            echo -e "  1. desktop 构建完成后会自动触发: flatpak, aur, aur-bin, ppa, copr, obs, gentoo"
            echo -e "  2. snap 独立构建，立即触发"
            echo ""
            
            local failed=0
            
            # Step 1: 创建 desktop tag（触发构建，完成后自动触发依赖平台）
            echo -e "${BLUE}📦 Step 1: 创建 desktop tag${NC}"
            echo -e "${YELLOW}   构建完成后将自动触发: flatpak, aur, aur-bin, ppa, copr, obs, gentoo${NC}"
            create_and_push_tag "desktop" "$VERSION" || failed=1
            echo ""
            
            # Step 2: 创建 snap tag（独立构建，立即触发）
            echo -e "${BLUE}🚀 Step 2: 创建 snap tag（独立构建，立即触发）${NC}"
            create_and_push_tag "snap" "$VERSION" || failed=1
            
            if [ $failed -eq 1 ]; then
                echo ""
                echo -e "${YELLOW}部分标签创建失败，请检查上述错误信息${NC}"
                exit 1
            fi
            
            echo ""
            echo -e "${GREEN}🎉 Linux 发布流程已启动！${NC}"
            echo -e "${BLUE}📋 发布状态：${NC}"
            echo -e "  • ${GREEN}desktop${NC} - 正在构建..."
            echo -e "  • ${GREEN}snap${NC} - 正在构建（独立）"
            echo -e "  • ${YELLOW}flatpak, aur, aur-bin, ppa, copr, obs, gentoo${NC}"
            echo -e "    └─ 等待 desktop 构建完成后自动触发"
            ;;
        all)
            echo -e "${BLUE}创建所有平台标签...${NC}"
            echo ""
            echo -e "${YELLOW}📋 说明：${NC}"
            echo -e "  • desktop 完成后会自动触发: flatpak, aur, aur-bin, ppa, copr, obs, gentoo"
            echo -e "  • snap, winget, chocolatey, scoop, homebrew, web 独立触发"
            echo ""
            
            local failed=0
            
            # 核心平台
            create_and_push_tag "desktop" "$VERSION" || failed=1
            echo ""
            
            # 独立平台
            create_and_push_tag "snap" "$VERSION" || failed=1
            echo ""
            
            create_and_push_tag "winget" "$VERSION" || failed=1
            echo ""
            
            create_and_push_tag "chocolatey" "$VERSION" || failed=1
            echo ""
            
            create_and_push_tag "scoop" "$VERSION" || failed=1
            echo ""
            
            create_and_push_tag "homebrew" "$VERSION" || failed=1
            echo ""
            
            create_and_push_tag "web" "$VERSION" || failed=1
            
            if [ $failed -eq 1 ]; then
                echo ""
                echo -e "${YELLOW}部分标签创建失败，请检查上述错误信息${NC}"
                exit 1
            fi
            
            echo ""
            echo -e "${GREEN}🎉 所有平台发布流程已启动！${NC}"
            echo -e "${BLUE}📋 依赖平台将在 desktop 完成后自动触发${NC}"
            ;;
        *)
            echo -e "${RED}错误: 未知参数 '$tag_type'${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}✅ 完成！CI/CD 构建将自动触发${NC}"
}

# 执行主函数
main "$@"
