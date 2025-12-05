#!/bin/bash
# 批量修复所有使用 force-dynamic 的页面为 force-static

WEB_DIR="/home/lotus/project/book2/novel-editor/apps/web/src/app"

echo "正在修复所有使用 force-dynamic 的页面..."

# 查找所有包含 force-dynamic 的文件
FILES=$(grep -r "force-dynamic" "$WEB_DIR" --include="*.tsx" --include="*.ts" -l)

for file in $FILES; do
    echo "修复: $file"
    # 将 force-dynamic 替换为 force-static
    sed -i 's/export const dynamic = "force-dynamic";/export const dynamic = "force-static";/g' "$file"
    # 或者如果格式不同
    sed -i "s/export const dynamic = 'force-dynamic';/export const dynamic = 'force-static';/g" "$file"
done

echo "✅ 修复完成！"
echo "已修复的文件:"
echo "$FILES"

