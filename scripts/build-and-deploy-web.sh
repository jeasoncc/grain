#!/bin/bash
# 构建并部署 Web 项目到 Nginx

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== 构建并部署 Web 项目到 Nginx ===${NC}"
echo ""

PROJECT_ROOT="/home/lotus/project/book2/novel-editor"
WEB_DIR="$PROJECT_ROOT/apps/web"
NGINX_ROOT="/home/lotus/test-site"

cd "$PROJECT_ROOT" || exit 1

echo -e "${GREEN}📋 配置信息${NC}"
echo "  项目根目录: $PROJECT_ROOT"
echo "  Web 目录: $WEB_DIR"
echo "  Nginx 目录: $NGINX_ROOT"
echo ""

# 检查 Next.js 配置
echo -e "${BLUE}步骤 1: 检查 Next.js 配置...${NC}"
if grep -q 'output: "export"' "$WEB_DIR/next.config.ts"; then
    echo -e "${GREEN}✅ 静态导出已启用${NC}"
else
    echo -e "${YELLOW}⚠️  启用静态导出...${NC}"
    # 使用我们创建的导出配置
    if [ -f "$WEB_DIR/next.config.export.ts" ]; then
        cp "$WEB_DIR/next.config.ts" "$WEB_DIR/next.config.ts.backup"
        cp "$WEB_DIR/next.config.export.ts" "$WEB_DIR/next.config.ts"
        echo -e "${GREEN}✅ 已切换到静态导出配置${NC}"
    else
        echo -e "${RED}❌ 找不到静态导出配置文件${NC}"
        exit 1
    fi
fi

# 检查包管理器
if command -v bun &> /dev/null; then
    PKG_CMD="bun"
    echo -e "${GREEN}✅ 使用 Bun${NC}"
else
    PKG_CMD="npm"
    echo -e "${YELLOW}⚠️  使用 npm${NC}"
fi

# 安装依赖（如果需要）
echo ""
echo -e "${BLUE}步骤 2: 检查依赖...${NC}"
cd "$PROJECT_ROOT"
if [ ! -d "node_modules" ]; then
    echo "安装项目依赖..."
    $PKG_CMD install
else
    echo -e "${GREEN}✅ 依赖已安装${NC}"
fi

# 构建项目
echo ""
echo -e "${BLUE}步骤 3: 构建 Web 项目...${NC}"
cd "$WEB_DIR"
echo "运行构建命令: NODE_ENV=production $PKG_CMD run build"
NODE_ENV=production $PKG_CMD run build

# 检查构建输出
if [ ! -d "out" ]; then
    echo -e "${RED}❌ 构建失败: out 目录不存在${NC}"
    echo "请检查构建错误信息"
    exit 1
fi

OUT_SIZE=$(du -sh out | cut -f1)
FILE_COUNT=$(find out -type f | wc -l)
echo -e "${GREEN}✅ 构建完成${NC}"
echo "  输出目录: $WEB_DIR/out"
echo "  目录大小: $OUT_SIZE"
echo "  文件数量: $FILE_COUNT"
echo ""

# 部署到 nginx
echo -e "${BLUE}步骤 4: 部署到 Nginx 目录...${NC}"

# 备份现有文件
if [ -d "$NGINX_ROOT" ] && [ "$(ls -A $NGINX_ROOT 2>/dev/null)" ]; then
    BACKUP_DIR="${NGINX_ROOT}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "备份现有文件到: $BACKUP_DIR"
    mv "$NGINX_ROOT" "$BACKUP_DIR" 2>/dev/null || {
        echo "需要备份但目录不为空，继续部署..."
    }
fi

# 创建目录
mkdir -p "$NGINX_ROOT"

# 复制文件
echo "复制构建产物到 nginx 目录..."
cp -r out/* "$NGINX_ROOT/"

# 设置权限
chmod -R 755 "$NGINX_ROOT"

DEPLOYED_COUNT=$(find "$NGINX_ROOT" -type f | wc -l)
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo -e "${BLUE}📊 部署信息${NC}"
echo "  Nginx 目录: $NGINX_ROOT"
echo "  已部署文件数: $DEPLOYED_COUNT"
echo ""
echo -e "${YELLOW}📝 下一步操作${NC}"
echo "  1. 测试 nginx 配置: sudo nginx -t"
echo "  2. 重新加载 nginx: sudo systemctl reload nginx"
echo "  3. 访问网站:"
echo "     - https://localhost"
echo "     - https://127.0.0.1"
echo "     - https://szlh.top"
echo ""

