#!/bin/bash

# GitHub 标签自动创建脚本
# 用法: ./scripts/setup-github-labels.sh [REPO_OWNER] [REPO_NAME]

set -e

REPO_OWNER="${1:-jeasoncc}"
REPO_NAME="${2:-novel-editor}"

echo "🏷️  为 $REPO_OWNER/$REPO_NAME 创建 GitHub 标签"
echo ""

# 检查 gh CLI 是否安装
if ! command -v gh &> /dev/null; then
    echo "❌ 错误: 需要安装 GitHub CLI (gh)"
    echo "安装: https://cli.github.com/"
    exit 1
fi

# 检查是否已登录
if ! gh auth status &> /dev/null; then
    echo "❌ 错误: 请先登录 GitHub CLI"
    echo "运行: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI 已就绪"
echo ""

# 定义标签 (名称:颜色:描述)
declare -a LABELS=(
    "bug:d73a4a:Something isn't working"
    "enhancement:a2eeef:New feature or request"
    "documentation:0075ca:Improvements or additions to documentation"
    "desktop:7057ff:Desktop application related"
    "web:008672:Web application related"
    "dependencies:0366d6:Pull requests that update a dependency file"
    "ci/cd:000000:CI/CD related changes"
    "automated:ededed:Automated changes"
    "aur:1d76db:AUR package related"
    "size/XS:c2e0c6:Extra small PR"
    "size/S:c2e0c6:Small PR"
    "size/M:fbca04:Medium PR"
    "size/L:ee9900:Large PR"
    "size/XL:d93f0b:Extra large PR"
    "breaking-change:b60205:Breaking change"
    "stale:fef2c0:No activity for a while"
    "pinned:0e8a16:Pinned issue or PR"
    "security:b60205:Security related"
    "roadmap:0e8a16:Roadmap item"
    "work-in-progress:fbca04:Work in progress"
    "rust:dea584:Rust/Cargo related"
    "good first issue:7057ff:Good for newcomers"
    "help wanted:008672:Extra attention is needed"
    "duplicate:cfd3d7:This issue or pull request already exists"
    "invalid:e4e669:This doesn't seem right"
    "wontfix:ffffff:This will not be worked on"
    "question:d876e3:Further information is requested"
)

echo "📝 创建标签..."
echo ""

SUCCESS_COUNT=0
SKIP_COUNT=0
ERROR_COUNT=0

for label_def in "${LABELS[@]}"; do
    IFS=':' read -r name color description <<< "$label_def"
    
    # 检查标签是否已存在
    if gh label list -R "$REPO_OWNER/$REPO_NAME" | grep -q "^$name"; then
        echo "⏭️  跳过: $name (已存在)"
        ((SKIP_COUNT++))
    else
        if gh label create "$name" \
            --repo "$REPO_OWNER/$REPO_NAME" \
            --color "$color" \
            --description "$description" 2>/dev/null; then
            echo "✅ 创建: $name"
            ((SUCCESS_COUNT++))
        else
            echo "❌ 失败: $name"
            ((ERROR_COUNT++))
        fi
    fi
done

echo ""
echo "📊 统计:"
echo "  - 成功创建: $SUCCESS_COUNT"
echo "  - 已存在: $SKIP_COUNT"
echo "  - 创建失败: $ERROR_COUNT"
echo ""

if [ $ERROR_COUNT -eq 0 ]; then
    echo "🎉 所有标签配置完成！"
else
    echo "⚠️  部分标签创建失败，请检查权限或手动创建"
fi

echo ""
echo "💡 提示: 你可以在 GitHub 仓库设置中查看和管理标签"
echo "   https://github.com/$REPO_OWNER/$REPO_NAME/labels"
