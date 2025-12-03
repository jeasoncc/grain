#!/bin/bash

# 分支保护自动配置脚本
# 需要安装 GitHub CLI: https://cli.github.com/

set -e

REPO_OWNER="${1:-jeasoncc}"
REPO_NAME="${2:-novel-editor}"

echo "🛡️  配置分支保护规则"
echo "仓库: $REPO_OWNER/$REPO_NAME"
echo ""

# 检查 gh CLI 是否安装
if ! command -v gh &> /dev/null; then
    echo "❌ 错误: 需要安装 GitHub CLI (gh)"
    echo ""
    echo "安装方法:"
    echo "  macOS:   brew install gh"
    echo "  Linux:   https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
    echo "  Windows: https://github.com/cli/cli/releases"
    echo ""
    echo "或者手动配置:"
    echo "  访问: https://github.com/$REPO_OWNER/$REPO_NAME/settings/branches"
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

# 询问配置级别
echo "请选择配置级别:"
echo "1) 个人项目 (推荐) - 要求 CI，不要求审批"
echo "2) 小团队 - 要求 CI + 1 个审批"
echo "3) 严格模式 - 要求 CI + 2 个审批 + 签名提交"
echo "4) 自定义"
echo ""
read -p "选择 (1-4): " LEVEL

case $LEVEL in
    1)
        echo "📝 配置个人项目模式..."
        REQUIRE_REVIEWS=0
        REQUIRE_CODE_OWNER_REVIEWS=false
        REQUIRE_SIGNED_COMMITS=false
        REQUIRE_LINEAR_HISTORY=true
        ;;
    2)
        echo "📝 配置小团队模式..."
        REQUIRE_REVIEWS=1
        REQUIRE_CODE_OWNER_REVIEWS=false
        REQUIRE_SIGNED_COMMITS=false
        REQUIRE_LINEAR_HISTORY=true
        ;;
    3)
        echo "📝 配置严格模式..."
        REQUIRE_REVIEWS=2
        REQUIRE_CODE_OWNER_REVIEWS=true
        REQUIRE_SIGNED_COMMITS=true
        REQUIRE_LINEAR_HISTORY=true
        ;;
    4)
        echo "📝 自定义配置..."
        read -p "需要的审批数量 (0-6): " REQUIRE_REVIEWS
        read -p "要求代码所有者审批? (y/n): " CODE_OWNER
        REQUIRE_CODE_OWNER_REVIEWS=$([ "$CODE_OWNER" = "y" ] && echo "true" || echo "false")
        read -p "要求签名提交? (y/n): " SIGNED
        REQUIRE_SIGNED_COMMITS=$([ "$SIGNED" = "y" ] && echo "true" || echo "false")
        read -p "要求线性历史? (y/n): " LINEAR
        REQUIRE_LINEAR_HISTORY=$([ "$LINEAR" = "y" ] && echo "true" || echo "false")
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "⚙️  配置参数:"
echo "  - 需要审批数: $REQUIRE_REVIEWS"
echo "  - 代码所有者审批: $REQUIRE_CODE_OWNER_REVIEWS"
echo "  - 签名提交: $REQUIRE_SIGNED_COMMITS"
echo "  - 线性历史: $REQUIRE_LINEAR_HISTORY"
echo ""

read -p "确认配置? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "❌ 已取消"
    exit 0
fi

echo ""
echo "🔧 正在配置 main 分支保护..."

# 注意: gh CLI 的分支保护功能有限，建议使用 GitHub API
# 这里提供一个基本示例，完整配置建议使用 Web 界面

# 使用 GitHub API 配置分支保护
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/$REPO_OWNER/$REPO_NAME/branches/main/protection" \
  -f required_status_checks='{"strict":true,"contexts":["Lint and Type Check","Build Web","Build Desktop"]}' \
  -f enforce_admins=false \
  -f required_pull_request_reviews="{\"dismiss_stale_reviews\":false,\"require_code_owner_reviews\":$REQUIRE_CODE_OWNER_REVIEWS,\"required_approving_review_count\":$REQUIRE_REVIEWS}" \
  -f restrictions=null \
  -f required_linear_history=$REQUIRE_LINEAR_HISTORY \
  -f allow_force_pushes=false \
  -f allow_deletions=false \
  -f required_conversation_resolution=true \
  -f lock_branch=false \
  -f allow_fork_syncing=true \
  2>/dev/null && echo "✅ main 分支保护已配置" || echo "⚠️  配置失败，请手动配置"

echo ""
echo "📋 配置完成！"
echo ""
echo "验证配置:"
echo "  访问: https://github.com/$REPO_OWNER/$REPO_NAME/settings/branches"
echo ""
echo "测试分支保护:"
echo "  1. 尝试直接推送到 main (应该失败)"
echo "  2. 创建 PR 并合并 (应该成功)"
echo ""
echo "详细文档:"
echo "  查看: docs/branch-protection-guide.md"
