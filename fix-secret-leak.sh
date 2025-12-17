#!/bin/bash

echo "🔧 修复 Git 历史中的敏感信息泄露"
echo ""
echo "⚠️  重要提示："
echo "1. 这个脚本会重写 Git 历史"
echo "2. 你需要立即撤销泄露的 GitHub token"
echo "3. 访问: https://github.com/settings/tokens"
echo "4. 找到并删除泄露的 token"
echo ""
read -p "是否继续? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

echo ""
echo "📝 步骤 1: 备份当前分支"
git branch backup-before-fix

echo ""
echo "📝 步骤 2: 使用 filter-branch 移除敏感文件"
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .kiro/settings/mcp.json" \
  --prune-empty --tag-name-filter cat -- --all

echo ""
echo "📝 步骤 3: 清理引用"
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "✅ 完成！现在你可以强制推送："
echo "   git push origin main --force"
echo ""
echo "⚠️  记住："
echo "1. 立即撤销泄露的 GitHub token"
echo "2. 通知所有协作者重新克隆仓库"
