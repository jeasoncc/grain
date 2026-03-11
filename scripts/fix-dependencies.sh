#!/bin/bash

# 依赖安装脚本
# Dependency Installation Script

echo "🔧 开始修复依赖问题..."
echo "================================"

# 1. 清理环境
echo ""
echo "步骤 1/4: 清理旧文件..."
pkill -9 bun 2>/dev/null
pkill -9 npm 2>/dev/null
sleep 2
rm -rf node_modules
rm -f bun.lockb package-lock.json
echo "✓ 清理完成"

# 2. 验证 ajv 版本
echo ""
echo "步骤 2/4: 验证 package.json..."
if grep -q '"ajv": "\^8.12.0"' package.json; then
    echo "✓ ajv 版本已更新为 ^8.12.0"
else
    echo "❌ ajv 版本未更新，请检查 package.json"
    exit 1
fi

# 3. 安装依赖
echo ""
echo "步骤 3/4: 安装依赖（这可能需要 5-10 分钟）..."
echo "请耐心等待..."
bun install

if [ $? -eq 0 ]; then
    echo "✓ 依赖安装成功"
else
    echo "❌ bun install 失败，尝试使用 npm..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✓ npm install 成功"
    else
        echo "❌ 安装失败，请手动检查"
        exit 1
    fi
fi

# 4. 验证关键依赖
echo ""
echo "步骤 4/4: 验证关键依赖..."

if [ -f node_modules/ajv/dist/core.js ]; then
    echo "✓ ajv v8 已安装"
else
    echo "❌ ajv v8 未正确安装"
    exit 1
fi

if [ -f node_modules/.bin/turbo ]; then
    echo "✓ turbo 已安装"
else
    echo "❌ turbo 未正确安装"
    exit 1
fi

# 显示 ajv 版本
echo ""
echo "已安装的 ajv 版本:"
cat node_modules/ajv/package.json | grep '"version"'

echo ""
echo "================================"
echo "✅ 依赖安装完成！"
echo ""
echo "下一步："
echo "1. 配置 Admin 密码: cd apps/admin && bun run scripts/generate-password-hash.ts 'YourPassword'"
echo "2. 启动开发服务器: npm run dev"
echo ""
