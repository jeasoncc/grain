#!/bin/bash

# 测试版本号递增脚本
# 验证输出是否干净，没有颜色代码

echo "🧪 测试版本号递增脚本"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUMP_SCRIPT="$SCRIPT_DIR/bump-version.sh"

# 测试 1: 正常模式（在终端中）
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  测试 1: 正常模式（终端输出）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "运行: $BUMP_SCRIPT"
echo ""

# 保存当前版本
CURRENT_VERSION=$(grep -o '"version":\s*"[^"]*"' package.json | sed 's/.*"version":\s*"\([^"]*\)".*/\1/' | head -1)
echo "当前版本: $CURRENT_VERSION"
echo ""

# 测试 2: 静默模式（模拟 Git hook 调用）
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  测试 2: 静默模式（Git hook 模式）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "运行: SILENT_MODE=true $BUMP_SCRIPT"
echo ""

# 捕获输出
OUTPUT=$(SILENT_MODE=true "$BUMP_SCRIPT" 2>&1)
EXIT_CODE=$?

echo "退出码: $EXIT_CODE"
echo "输出内容: '$OUTPUT'"
echo ""

# 检查输出是否只包含版本号
if [[ "$OUTPUT" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "✅ 输出格式正确：纯净的版本号"
else
    echo "❌ 输出格式错误：包含额外内容"
fi

# 检查是否包含颜色代码
if echo "$OUTPUT" | grep -q $'\033'; then
    echo "❌ 输出包含颜色代码"
else
    echo "✅ 输出不包含颜色代码"
fi

# 检查是否包含中文
if echo "$OUTPUT" | grep -qP '[\p{Han}]'; then
    echo "❌ 输出包含中文字符"
else
    echo "✅ 输出不包含中文字符"
fi

echo ""

# 测试 3: 管道模式（模拟被其他脚本调用）
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  测试 3: 管道模式"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "运行: $BUMP_SCRIPT | cat"
echo ""

# 通过管道捕获输出（这会禁用颜色）
PIPED_OUTPUT=$("$BUMP_SCRIPT" 2>/dev/null | cat)

echo "输出内容: '$PIPED_OUTPUT'"
echo ""

if [[ "$PIPED_OUTPUT" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "✅ 管道输出格式正确"
else
    echo "❌ 管道输出格式错误"
fi

if echo "$PIPED_OUTPUT" | grep -q $'\033'; then
    echo "❌ 管道输出包含颜色代码"
else
    echo "✅ 管道输出不包含颜色代码"
fi

echo ""

# 测试 4: 模拟 Git commit 消息
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  测试 4: 模拟 Git commit 消息"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

VERSION=$(SILENT_MODE=true "$BUMP_SCRIPT" 2>/dev/null)
COMMIT_MSG="chore: bump version to $VERSION"

echo "提交消息: '$COMMIT_MSG'"
echo ""

# 检查提交消息
if [[ "$COMMIT_MSG" =~ ^chore:\ bump\ version\ to\ [0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "✅ 提交消息格式正确"
else
    echo "❌ 提交消息格式错误"
fi

if echo "$COMMIT_MSG" | grep -q $'\033'; then
    echo "❌ 提交消息包含颜色代码"
else
    echo "✅ 提交消息不包含颜色代码"
fi

if echo "$COMMIT_MSG" | grep -qP '[\p{Han}]'; then
    echo "❌ 提交消息包含中文字符"
else
    echo "✅ 提交消息不包含中文字符"
fi

echo ""

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📊 测试总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "✅ 所有测试完成"
echo ""
echo "💡 建议："
echo "  1. 在终端中运行脚本时，会显示彩色输出"
echo "  2. 在 Git hook 中使用 SILENT_MODE=true"
echo "  3. 通过管道调用时，自动禁用颜色"
echo ""
echo "📝 示例用法："
echo "  # 终端中（有颜色）"
echo "  ./scripts/bump-version.sh"
echo ""
echo "  # Git hook 中（无颜色）"
echo "  VERSION=\$(SILENT_MODE=true ./scripts/bump-version.sh)"
echo "  git commit -m \"chore: bump version to \$VERSION\""
echo ""
