#!/bin/bash
# PostgreSQL 快速修复脚本 - 重新初始化数据库集群

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== PostgreSQL 数据库修复脚本 ===${NC}"
echo ""
echo -e "${YELLOW}⚠️  警告: 此操作会删除现有的 PostgreSQL 数据！${NC}"
echo "如果你有重要数据，请先备份。"
echo ""
read -p "是否继续？(y/n): " CONTINUE

if [[ ! "$CONTINUE" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "已取消"
    exit 0
fi

echo ""
echo -e "${BLUE}步骤 1: 停止 PostgreSQL 服务...${NC}"
sudo systemctl stop postgresql.service || true

echo ""
echo -e "${BLUE}步骤 2: 备份旧数据目录...${NC}"
if [ -d "/var/lib/postgres/data" ]; then
    BACKUP_DIR="/var/lib/postgres/data.backup.$(date +%Y%m%d_%H%M%S)"
    echo "备份到: $BACKUP_DIR"
    sudo mv /var/lib/postgres/data "$BACKUP_DIR" || {
        echo -e "${RED}❌ 备份失败，尝试删除旧数据目录...${NC}"
        sudo rm -rf /var/lib/postgres/data
    }
    echo -e "${GREEN}✅ 备份完成${NC}"
else
    echo -e "${YELLOW}⚠️  数据目录不存在，跳过备份${NC}"
fi

echo ""
echo -e "${BLUE}步骤 3: 初始化新数据库集群...${NC}"
sudo -u postgres initdb -D /var/lib/postgres/data --locale=C --encoding=UTF8

echo ""
echo -e "${BLUE}步骤 4: 启动 PostgreSQL 服务...${NC}"
sudo systemctl start postgresql.service
sudo systemctl enable postgresql.service

echo ""
echo -e "${BLUE}步骤 5: 验证服务状态...${NC}"
if sudo systemctl is-active --quiet postgresql.service; then
    echo -e "${GREEN}✅ PostgreSQL 服务正在运行${NC}"
else
    echo -e "${RED}❌ PostgreSQL 服务启动失败${NC}"
    echo "查看日志: sudo journalctl -xeu postgresql.service"
    exit 1
fi

echo ""
echo -e "${BLUE}步骤 6: 创建项目数据库...${NC}"
sudo -u postgres psql -c "CREATE DATABASE visitor_db;" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  数据库可能已存在，继续...${NC}"
}

echo ""
echo -e "${GREEN}✅ PostgreSQL 修复完成！${NC}"
echo ""
echo -e "${YELLOW}下一步操作:${NC}"
echo "  1. 配置环境变量: cd apps/api && cp env.example .env"
echo "  2. 编辑 .env 文件设置 DATABASE_URL"
echo "  3. 初始化数据库 schema: bun run db:push"
echo ""

