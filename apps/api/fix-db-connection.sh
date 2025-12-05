#!/bin/bash
# 修复数据库连接配置

API_DIR="/home/lotus/project/book2/novel-editor/apps/api"
cd "$API_DIR"

echo "=== 修复数据库连接配置 ==="
echo ""

# 检查 .env 文件
if [ -f ".env" ]; then
    echo "当前 .env 文件内容:"
    echo "---"
    cat .env | grep -E "(DATABASE_URL|DB_)" || echo "未找到数据库配置"
    echo "---"
    echo ""
fi

echo "创建/更新 .env 文件..."
cat > .env << 'EOF'
# 数据库配置
# 默认使用 postgres 用户（无需密码）
DATABASE_URL=postgresql://postgres@localhost:5432/visitor_db

# 如果有密码，使用以下格式：
# DATABASE_URL=postgresql://postgres:your_password@localhost:5432/visitor_db

# 服务器端口
PORT=4001
EOF

echo "✅ .env 文件已更新"
echo ""
echo "当前配置:"
cat .env
echo ""
echo "如果 PostgreSQL 设置了密码，请编辑 .env 文件添加密码"

