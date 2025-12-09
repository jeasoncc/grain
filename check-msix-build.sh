#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  MSIX 构建状态检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 获取最新的 MSIX 构建状态
RUN_INFO=$(gh run list --workflow=build-msix.yml --limit 1 --json databaseId,status,conclusion,displayTitle,createdAt)

RUN_ID=$(echo "$RUN_INFO" | jq -r '.[0].databaseId')
STATUS=$(echo "$RUN_INFO" | jq -r '.[0].status')
CONCLUSION=$(echo "$RUN_INFO" | jq -r '.[0].conclusion')
TITLE=$(echo "$RUN_INFO" | jq -r '.[0].displayTitle')
CREATED=$(echo "$RUN_INFO" | jq -r '.[0].createdAt')

echo "运行 ID: $RUN_ID"
echo "标题: $TITLE"
echo "创建时间: $CREATED"
echo "状态: $STATUS"

if [ "$STATUS" = "completed" ]; then
    if [ "$CONCLUSION" = "success" ]; then
        echo "结果: ✅ 成功"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "  🎉 MSIX 包构建成功！"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "下载 MSIX 包："
        echo "1. 从 Artifacts 下载："
        echo "   gh run download $RUN_ID -n msix-package"
        echo ""
        echo "2. 从 Release 下载："
        echo "   https://github.com/jeasoncc/novel-editor/releases/tag/desktop-v0.1.15"
        echo ""
        echo "3. 查看工作流详情："
        echo "   gh run view $RUN_ID --web"
    else
        echo "结果: ❌ 失败 ($CONCLUSION)"
        echo ""
        echo "查看失败日志："
        echo "  gh run view $RUN_ID --log-failed"
    fi
elif [ "$STATUS" = "in_progress" ]; then
    echo "结果: ⏳ 构建中..."
    echo ""
    echo "查看实时日志："
    echo "  gh run watch $RUN_ID"
    echo ""
    echo "或在浏览器中查看："
    echo "  gh run view $RUN_ID --web"
else
    echo "结果: ⏸️  $STATUS"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
