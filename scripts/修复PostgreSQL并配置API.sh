#!/bin/bash
# PostgreSQL 修复并配置 API 项目

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== PostgreSQL 修复和 API 配置 ===${NC}"
echo ""

# ===== 第一部分：修复 PostgreSQL =====
echo -e "${BLUE}--- 第一部分：修复 PostgreSQL ---${NC}"

echo -e "${YELLOW}步骤 1: 停止 PostgreSQL 服务...${NC}"
sudo systemctl stop postgresql.service || echo "服务可能已停止"

echo -e "${YELLOW}步骤 2: 删除旧数据目录...${NC}"
if [ -d "/var/lib/postgres/data" ]; then
    sudo rm -rf /var/lib/postgres/data
    echo -e "${GREEN}✅ 已删除旧数据目录${NC}"
fi

echo -e "${YELLOW}步骤 3: 初始化新数据库集群...${NC}"
sudo -u postgres initdb -D /var/lib/postgres/data --locale=C --encoding=UTF8
echo -e "${GREEN}✅ 数据库初始化完成${NC}"

echo -e "${YELLOW}步骤 4: 启动 PostgreSQL 服务...${NC}"
sudo systemctl start postgresql.service
sudo systemctl enable postgresql.service
sleep 2

if sudo systemctl is-active --quiet postgresql.service; then
    echo -e "${GREEN}✅ PostgreSQL 服务正在运行${NC}"
else
    echo -e "${RED}❌ 服务启动失败${NC}"
    exit 1
fi

echo -e "${YELLOW}步骤 5: 创建项目数据库...${NC}"
sudo -u postgres psql -c "CREATE DATABASE visitor_db;" 2>/dev/null && \
    echo -e "${GREEN}✅ 数据库 visitor_db 创建成功${NC}" || \
    echo -e "${YELLOW}⚠️  数据库可能已存在${NC}"

# ===== 第二部分：配置 API 项目 =====
echo ""
echo -e "${BLUE}--- 第二部分：配置 API 项目 ---${NC}"

API_DIR="/home/lotus/project/book2/novel-editor/apps/api"

if [ ! -d "$API_DIR" ]; then
    echo -e "${RED}❌ API 项目目录不存在: $API_DIR${NC}"
    exit 1
fi

cd "$API_DIR"

echo -e "${YELLOW}步骤 6: 配置环境变量...${NC}"
if [ ! -f ".env" ]; then
    if [ -f "env.example" ]; then
        cp env.example .env
        echo -e "${GREEN}✅ 已创建 .env 文件${NC}"
    else
        echo "DATABASE_URL=postgresql://postgres@localhost:5432/visitor_db" > .env
        echo "PORT=4001" >> .env
        echo -e "${GREEN}✅ 已创建 .env 文件${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env 文件已存在，跳过${NC}"
fi

echo ""
echo -e "${YELLOW}步骤 7: 安装依赖...${NC}"
if command -v bun &> /dev/null; then
    bun install
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
else
    echo -e "${RED}❌ Bun 未安装，请先安装 Bun${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}步骤 8: 初始化数据库 Schema...${NC}"
bun run db:push && \
    echo -e "${GREEN}✅ 数据库 Schema 初始化完成${NC}" || {
    echo -e "${RED}❌ Schema 初始化失败${NC}"
    echo "请检查数据库连接配置"
    exit 1
}

echo ""
echo -e "${GREEN}=== ✅ 全部完成！ ===${NC}"
echo ""
echo -e "${BLUE}下一步操作：${NC}"
echo "  1. 启动 API 服务器: cd $API_DIR && bun run dev"
echo "  2. 启动管理界面: cd ../admin && bun run dev"
echo "  3. 访问 API 文档: http://localhost:4001/swagger"
echo ""

