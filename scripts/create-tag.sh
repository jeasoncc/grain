#!/bin/bash

# Git Tag 创建脚本
# 创建并推送 Git Tag 以触发 CI/CD 构建流程
# 
# 发布架构：
# - desktop tag 仅构建并发布 GitHub Release 安装包，不触发外部渠道
# - snap tag 独立触发（从源码构建）
# - web tag 独立触发

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
    CYAN='\033[0;36m'
    NC='\033[0m'
else
    GREEN=''
    YELLOW=''
    RED=''
    BLUE=''
    CYAN=''
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
    echo -e "${BLUE}Git Tag 发布脚本${NC}"
    echo ""
    echo "用法: $0 {命令}"
    echo ""
    echo -e "${CYAN}GitHub 安装包发布：${NC}"
    echo -e "  ${GREEN}desktop${NC}  - Windows/macOS/Linux 安装包（推荐）"
    echo "           仅上传 GitHub Release，不触发外部包管理器"
    echo ""
    echo -e "${CYAN}独立发布命令：${NC}"
    echo -e "  ${GREEN}snap${NC}     - 独立 Snap Store 发布，需先确认包名和凭据"
    echo -e "  ${GREEN}web${NC}      - Web 应用部署"
    echo ""
    echo -e "${CYAN}组合命令：${NC}"
    echo -e "  ${GREEN}linux${NC}    - desktop + snap"
    echo -e "  ${GREEN}all${NC}      - desktop + snap + web"
    echo ""
    echo "其他渠道只保留手动 workflow_dispatch；使用前检查包名归属、权限和实际发布步骤。"
    echo "这些命令不生成自动更新清单；下载入口为 GitHub Release 安装包。"
    echo ""
    echo "示例: $0 desktop"
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
            echo -e "${BLUE}🖥️  发布桌面应用${NC}"
            echo ""
            echo -e "${YELLOW}📋 发布流程：${NC}"
            echo -e "  1. 构建 Windows (MSI, NSIS, MSIX)"
            echo -e "  2. 构建 macOS (DMG, APP)"
            echo -e "  3. 构建 Linux (DEB, RPM, AppImage)"
            echo -e "  4. 上传 GitHub Release，不触发外部包管理器"
            echo ""
            create_and_push_tag "desktop" "$VERSION"
            
            echo ""
            echo -e "${GREEN}🎉 Desktop 发布已启动！${NC}"
            echo ""
            echo -e "${CYAN}在 GitHub Actions 检查全部打包任务及对应 Release 安装包。${NC}"
            echo "外部渠道和签名自动更新不在本次发布范围内。"
            ;;
            
        snap)
            echo -e "${BLUE}📦 发布 Snap 包${NC}"
            echo ""
            create_and_push_tag "snap" "$VERSION"
            
            echo ""
            echo -e "${GREEN}🎉 Snap 发布已启动！${NC}"
            echo -e "${YELLOW}⏱️  预计时间: 10-15 分钟${NC}"
            ;;
            
        web)
            echo -e "${BLUE}🌐 部署 Web 应用${NC}"
            echo ""
            create_and_push_tag "web" "$VERSION"
            
            echo ""
            echo -e "${GREEN}🎉 Web 部署已启动！${NC}"
            echo -e "${YELLOW}⏱️  预计时间: 5-10 分钟${NC}"
            ;;
            
            
        # 保留 linux 命令作为 desktop + snap 的组合
        linux)
            echo -e "${BLUE}Linux 安装包与独立 Snap 标签${NC}"
            echo ""
            echo -e "${YELLOW}📋 发布流程：${NC}"
            echo -e "  1. desktop: 构建 DEB, RPM, AppImage"
            echo -e "     └─ 仅上传 GitHub Release，不触发其他 Linux 渠道"
            echo -e "  2. snap: 独立构建发布到 Snap Store"
            echo ""
            
            local failed=0
            
            echo -e "${BLUE}📦 Step 1: 创建 desktop tag${NC}"
            create_and_push_tag "desktop" "$VERSION" || failed=1
            echo ""
            
            echo -e "${BLUE}📦 Step 2: 创建 snap tag${NC}"
            create_and_push_tag "snap" "$VERSION" || failed=1
            
            if [ $failed -eq 1 ]; then
                echo ""
                echo -e "${YELLOW}部分标签创建失败，请检查上述错误信息${NC}"
                exit 1
            fi
            
            echo ""
            echo -e "${GREEN}Desktop 与 Snap 构建已启动。${NC}"
            echo -e "${YELLOW}⏱️  预计总时间: 20-30 分钟${NC}"
            ;;
            
        all)
            echo -e "${BLUE}创建 desktop、snap 和 web 标签${NC}"
            echo ""
            echo -e "${YELLOW}📋 发布流程：${NC}"
            echo -e "  1. desktop: 构建所有桌面包，仅上传 GitHub Release"
            echo -e "  2. snap: 独立构建发布到 Snap Store"
            echo -e "  3. web: 部署 Web 应用"
            echo ""
            
            local failed=0
            
            echo -e "${BLUE}📦 Step 1: 创建 desktop tag${NC}"
            create_and_push_tag "desktop" "$VERSION" || failed=1
            echo ""
            
            echo -e "${BLUE}📦 Step 2: 创建 snap tag${NC}"
            create_and_push_tag "snap" "$VERSION" || failed=1
            echo ""
            
            echo -e "${BLUE}📦 Step 3: 创建 web tag${NC}"
            create_and_push_tag "web" "$VERSION" || failed=1
            
            if [ $failed -eq 1 ]; then
                echo ""
                echo -e "${YELLOW}部分标签创建失败，请检查上述错误信息${NC}"
                exit 1
            fi
            
            echo ""
            echo -e "${GREEN}Desktop、Snap 和 Web 构建已启动。${NC}"
            echo ""
            echo -e "${CYAN}📋 发布状态：${NC}"
            echo -e "  • desktop - 正在构建 GitHub Release 安装包"
            echo -e "  • snap - 正在构建"
            echo -e "  • web - 正在部署"
            echo ""
            echo -e "${YELLOW}⏱️  预计总时间: 25-35 分钟${NC}"
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
    echo -e "${BLUE}📊 查看构建状态: https://github.com/jeasoncc/grain/actions${NC}"
}

# 执行主函数
main "$@"
