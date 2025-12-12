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
    echo "用法: $0 {desktop|snap|aur|aur-bin|all}"
    echo ""
    echo "参数:"
    echo "  desktop  - 创建 desktop-v{version} 标签，触发桌面应用发布"
    echo "  snap     - 创建 snap-v{version} 标签，触发 Snap Store 发布"
    echo "  aur      - 创建 aur-v{version} 标签，触发 AUR 源码包发布"
    echo "  aur-bin  - 创建 aur-bin-v{version} 标签，触发 AUR 二进制包发布"
    echo "  all      - 创建所有标签"
    echo ""
    echo "示例:"
    echo "  $0 desktop    # 创建并推送 desktop-v0.1.39"
    echo "  $0 all        # 创建并推送所有标签"
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
        aur)
            create_and_push_tag "aur" "$VERSION"
            ;;
        aur-bin)
            create_and_push_tag "aur-bin" "$VERSION"
            ;;
        all)
            echo -e "${BLUE}创建所有标签...${NC}"
            echo ""
            
            local failed=0
            
            create_and_push_tag "desktop" "$VERSION" || failed=1
            echo ""
            
            create_and_push_tag "snap" "$VERSION" || failed=1
            echo ""
            
            create_and_push_tag "aur" "$VERSION" || failed=1
            echo ""
            
            create_and_push_tag "aur-bin" "$VERSION" || failed=1
            
            if [ $failed -eq 1 ]; then
                echo ""
                echo -e "${YELLOW}部分标签创建失败，请检查上述错误信息${NC}"
                exit 1
            fi
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
