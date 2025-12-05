#!/bin/bash
# 修复数据库连接配置

API_DIR="/home/lotus/project/book2/novel-editor/apps/api"
cd "$API_DIR"

echo "=== 修复数据库连接配置 ==="
echo ""

# 修复 .env 文件
if [ -f ".env" ]; then
    echo "修复 .env 文件..."
    sed -i 's|postgresql://user:password@|postgresql://postgres@|g' .env
    sed -i 's|DATABASE_URL=postgresql://user:|DATABASE_URL=postgresql://postgres:|g' .env
    echo "✅ .env 文件已修复"
else
    echo "创建 .env 文件..."
    cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres@localhost:5432/visitor_db
PORT=4001
EOF
    echo "✅ .env 文件已创建"
fi

echo ""
echo "当前配置:"
cat .env
echo ""

