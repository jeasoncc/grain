#!/bin/bash
# 修复 Admin 项目开发环境

cd /home/lotus/project/book2/novel-editor/apps/admin

echo "=== 修复 Admin 项目开发环境 ==="
echo ""

# 1. 清理缓存
echo "清理缓存文件..."
rm -rf src/routeTree.gen.ts .tanstack node_modules/.vite dist
echo "✅ 缓存已清理"

# 2. 检查路由文件
echo ""
echo "检查路由文件..."
if [ -d "src/routes" ] && [ "$(ls -A src/routes/*.tsx 2>/dev/null)" ]; then
    echo "✅ 路由文件存在"
    ls -1 src/routes/*.tsx | wc -l | xargs -I {} echo "   找到 {} 个路由文件"
else
    echo "❌ 路由文件缺失，请检查 src/routes/ 目录"
    exit 1
fi

echo ""
echo "=== 修复完成 ==="
echo ""
echo "现在可以启动开发服务器："
echo "  bun run dev"
echo ""

