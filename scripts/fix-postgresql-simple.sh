#!/bin/bash
# PostgreSQL 快速修复脚本 - 重新初始化数据库

set -e

echo "=== PostgreSQL 数据库修复 ==="
echo ""

# 步骤 1: 停止服务
echo "步骤 1: 停止 PostgreSQL 服务..."
sudo systemctl stop postgresql.service || echo "服务可能已停止"

# 步骤 2: 备份并删除旧数据
echo ""
echo "步骤 2: 处理旧数据目录..."
if [ -d "/var/lib/postgres/data" ]; then
    echo "备份旧数据目录..."
    sudo mv /var/lib/postgres/data "/var/lib/postgres/data.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || {
        echo "无法备份，直接删除..."
        sudo rm -rf /var/lib/postgres/data
    }
fi

# 步骤 3: 初始化新数据库
echo ""
echo "步骤 3: 初始化新数据库集群..."
sudo -u postgres initdb -D /var/lib/postgres/data --locale=C --encoding=UTF8

# 步骤 4: 启动服务
echo ""
echo "步骤 4: 启动 PostgreSQL 服务..."
sudo systemctl start postgresql.service
sudo systemctl enable postgresql.service

# 步骤 5: 验证
echo ""
echo "步骤 5: 验证服务状态..."
sleep 2
if sudo systemctl is-active --quiet postgresql.service; then
    echo "✅ PostgreSQL 服务正在运行"
else
    echo "❌ 服务启动失败，查看日志："
    echo "   sudo journalctl -xeu postgresql.service"
    exit 1
fi

# 步骤 6: 创建数据库
echo ""
echo "步骤 6: 创建项目数据库..."
sudo -u postgres psql -c "CREATE DATABASE visitor_db;" 2>/dev/null && echo "✅ 数据库创建成功" || echo "⚠️  数据库可能已存在"

echo ""
echo "=== 修复完成 ==="
echo ""
echo "下一步："
echo "  1. cd /home/lotus/project/book2/novel-editor/apps/api"
echo "  2. cp env.example .env"
echo "  3. 编辑 .env 设置 DATABASE_URL"
echo "  4. bun install && bun run db:push"

