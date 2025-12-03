#!/bin/bash

# 分支清理脚本
# 用于清理已合并和过期的分支

set -e

echo "🌿 Git 分支清理工具"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否在 Git 仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ 错误: 不在 Git 仓库中${NC}"
    exit 1
fi

# 获取当前分支
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 当前分支: $CURRENT_BRANCH"
echo ""

# 更新远程信息
echo "🔄 更新远程信息..."
git fetch --prune
echo ""

# 1. 显示所有分支
echo "📋 所有分支:"
echo ""
echo "本地分支:"
git branch -v
echo ""
echo "远程分支:"
git branch -r
echo ""

# 2. 查找已合并到 main 的分支
echo "🔍 查找已合并到 main 的分支..."
MERGED_BRANCHES=$(git branch --merged main | grep -v "^\*" | grep -v "main" | grep -v "develop" || true)

if [ -z "$MERGED_BRANCHES" ]; then
    echo -e "${GREEN}✅ 没有已合并的分支需要清理${NC}"
else
    echo -e "${YELLOW}已合并的分支:${NC}"
    echo "$MERGED_BRANCHES"
    echo ""
    
    read -p "是否删除这些本地分支? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "$MERGED_BRANCHES" | xargs -n 1 git branch -d
        echo -e "${GREEN}✅ 已删除本地已合并分支${NC}"
    else
        echo "⏭️  跳过删除本地分支"
    fi
fi

echo ""

# 3. 查找远程已删除但本地还有引用的分支
echo "🔍 查找远程已删除的分支引用..."
STALE_BRANCHES=$(git branch -vv | grep ': gone]' | awk '{print $1}' || true)

if [ -z "$STALE_BRANCHES" ]; then
    echo -e "${GREEN}✅ 没有过期的分支引用${NC}"
else
    echo -e "${YELLOW}过期的分支引用:${NC}"
    echo "$STALE_BRANCHES"
    echo ""
    
    read -p "是否删除这些本地分支? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "$STALE_BRANCHES" | xargs -n 1 git branch -D
        echo -e "${GREEN}✅ 已删除过期分支${NC}"
    else
        echo "⏭️  跳过删除过期分支"
    fi
fi

echo ""

# 4. 查找长时间未更新的分支
echo "🔍 查找 3 个月以上未更新的分支..."
echo ""

THREE_MONTHS_AGO=$(date -d "3 months ago" +%s 2>/dev/null || date -v-3m +%s 2>/dev/null || echo "0")

OLD_BRANCHES=()
while IFS= read -r branch; do
    # 跳过 main 和 develop
    if [[ "$branch" == "main" ]] || [[ "$branch" == "develop" ]] || [[ "$branch" == "$CURRENT_BRANCH" ]]; then
        continue
    fi
    
    # 获取分支最后提交时间
    LAST_COMMIT=$(git log -1 --format=%ct "$branch" 2>/dev/null || echo "0")
    
    if [ "$LAST_COMMIT" -lt "$THREE_MONTHS_AGO" ] && [ "$LAST_COMMIT" != "0" ]; then
        LAST_DATE=$(git log -1 --format=%cd --date=short "$branch" 2>/dev/null || echo "unknown")
        OLD_BRANCHES+=("$branch (最后更新: $LAST_DATE)")
    fi
done < <(git branch | sed 's/^[* ]*//')

if [ ${#OLD_BRANCHES[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ 没有长时间未更新的分支${NC}"
else
    echo -e "${YELLOW}长时间未更新的分支:${NC}"
    printf '%s\n' "${OLD_BRANCHES[@]}"
    echo ""
    
    read -p "是否删除这些分支? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for branch_info in "${OLD_BRANCHES[@]}"; do
            branch=$(echo "$branch_info" | cut -d' ' -f1)
            git branch -D "$branch"
        done
        echo -e "${GREEN}✅ 已删除长时间未更新的分支${NC}"
    else
        echo "⏭️  跳过删除旧分支"
    fi
fi

echo ""

# 5. 远程分支清理
echo "🌐 远程分支管理"
echo ""

read -p "是否查看远程分支? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "远程分支列表:"
    git branch -r | grep -v "HEAD"
    echo ""
    
    read -p "是否要删除某个远程分支? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "输入要删除的远程分支名称 (不含 origin/): " REMOTE_BRANCH
        if [ -n "$REMOTE_BRANCH" ]; then
            read -p "确认删除远程分支 '$REMOTE_BRANCH'? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git push origin --delete "$REMOTE_BRANCH"
                echo -e "${GREEN}✅ 已删除远程分支 $REMOTE_BRANCH${NC}"
            fi
        fi
    fi
fi

echo ""

# 6. 显示清理后的状态
echo "📊 清理后的分支状态:"
echo ""
echo "本地分支:"
git branch -v
echo ""

BRANCH_COUNT=$(git branch | wc -l | tr -d ' ')
REMOTE_BRANCH_COUNT=$(git branch -r | grep -v "HEAD" | wc -l | tr -d ' ')

echo "📈 统计:"
echo "  - 本地分支数: $BRANCH_COUNT"
echo "  - 远程分支数: $REMOTE_BRANCH_COUNT"
echo ""

if [ "$BRANCH_COUNT" -le 3 ]; then
    echo -e "${GREEN}✅ 分支数量合理${NC}"
elif [ "$BRANCH_COUNT" -le 5 ]; then
    echo -e "${YELLOW}⚠️  分支数量较多，建议定期清理${NC}"
else
    echo -e "${RED}⚠️  分支数量过多，建议清理${NC}"
fi

echo ""
echo "💡 提示:"
echo "  - 定期运行此脚本保持仓库整洁"
echo "  - 配置 GitHub 自动删除已合并的分支"
echo "  - 使用规范的分支命名"
echo ""
echo "🎉 清理完成！"
