#!/bin/bash
# Nginx HTTPS 快速配置脚本
# 使用 mkcert 生成的本地证书配置 HTTPS

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Nginx HTTPS 配置脚本 ===${NC}"
echo ""

# 证书文件路径
CERT_FILE="/home/lotus/localhost+2.pem"
KEY_FILE="/home/lotus/localhost+2-key.pem"

# 检查证书文件是否存在
if [ ! -f "$CERT_FILE" ]; then
    echo -e "${RED}❌ 错误: 证书文件不存在: $CERT_FILE${NC}"
    echo "请先运行: mkcert localhost 127.0.0.1 ::1"
    exit 1
fi

if [ ! -f "$KEY_FILE" ]; then
    echo -e "${RED}❌ 错误: 私钥文件不存在: $KEY_FILE${NC}"
    echo "请先运行: mkcert localhost 127.0.0.1 ::1"
    exit 1
fi

echo -e "${GREEN}✅ 证书文件检查通过${NC}"
echo "  证书: $CERT_FILE"
echo "  私钥: $KEY_FILE"
echo ""

# 检查 nginx 是否安装
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}❌ 错误: nginx 未安装${NC}"
    echo "请先安装 nginx:"
    echo "  sudo pacman -S nginx  # Arch Linux"
    echo "  sudo apt install nginx  # Ubuntu/Debian"
    exit 1
fi

echo -e "${GREEN}✅ Nginx 已安装${NC}"
nginx -v
echo ""

# 检查 nginx SSL 支持
if ! nginx -V 2>&1 | grep -q "ssl"; then
    echo -e "${YELLOW}⚠️  警告: Nginx 可能未编译 SSL 支持${NC}"
    echo "请确保安装了包含 SSL 模块的 nginx"
fi

# 读取网站根目录
read -p "请输入网站根目录路径 [默认: /home/lotus/test-site]: " ROOT_DIR
ROOT_DIR=${ROOT_DIR:-/home/lotus/test-site}

if [ ! -d "$ROOT_DIR" ]; then
    echo -e "${YELLOW}⚠️  警告: 目录不存在: $ROOT_DIR${NC}"
    read -p "是否创建该目录? (y/n): " CREATE_DIR
    if [[ "$CREATE_DIR" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        mkdir -p "$ROOT_DIR"
        echo "# HTTPS 测试页面" > "$ROOT_DIR/index.html"
        echo "<h1>HTTPS 配置成功！</h1>" >> "$ROOT_DIR/index.html"
        echo "<p>证书有效期至: 2028-03-05</p>" >> "$ROOT_DIR/index.html"
        echo -e "${GREEN}✅ 目录已创建${NC}"
    fi
fi

# 确定 nginx 配置目录
NGINX_CONF_DIR=""
if [ -d "/etc/nginx/sites-available" ]; then
    NGINX_CONF_DIR="/etc/nginx/sites-available"
    echo -e "${GREEN}✅ 检测到 sites-available 目录结构${NC}"
elif [ -d "/etc/nginx/conf.d" ]; then
    NGINX_CONF_DIR="/etc/nginx/conf.d"
    echo -e "${GREEN}✅ 检测到 conf.d 目录结构${NC}"
else
    echo -e "${YELLOW}⚠️  无法确定 nginx 配置目录结构${NC}"
    echo "请手动选择配置方式"
    exit 1
fi

# 生成配置文件
CONF_FILE="$NGINX_CONF_DIR/localhost-https.conf"
echo ""
echo -e "${BLUE}生成配置文件: $CONF_FILE${NC}"

cat > /tmp/nginx-https.conf <<EOF
# Nginx HTTPS 配置 - 使用 mkcert 本地证书
# 生成时间: $(date)

# HTTPS 服务器配置
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name localhost 127.0.0.1;
    
    # SSL 证书路径
    ssl_certificate $CERT_FILE;
    ssl_certificate_key $KEY_FILE;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 网站根目录
    root $ROOT_DIR;
    index index.html index.htm;
    
    # 日志配置
    access_log /var/log/nginx/localhost-https-access.log;
    error_log /var/log/nginx/localhost-https-error.log;
    
    location / {
        try_files \$uri \$uri/ =404;
    }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name localhost 127.0.0.1;
    
    return 301 https://\$server_name\$request_uri;
}
EOF

# 复制配置文件（需要 sudo）
echo ""
read -p "是否继续配置? (需要 sudo 权限) (y/n): " CONTINUE
if [[ ! "$CONTINUE" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "已取消"
    exit 0
fi

sudo cp /tmp/nginx-https.conf "$CONF_FILE"
echo -e "${GREEN}✅ 配置文件已创建: $CONF_FILE${NC}"

# 如果是 sites-available 结构，创建符号链接
if [ "$NGINX_CONF_DIR" = "/etc/nginx/sites-available" ]; then
    if [ ! -L "/etc/nginx/sites-enabled/localhost-https.conf" ]; then
        sudo ln -s "$CONF_FILE" /etc/nginx/sites-enabled/localhost-https.conf
        echo -e "${GREEN}✅ 已创建符号链接到 sites-enabled${NC}"
    fi
fi

# 测试 nginx 配置
echo ""
echo -e "${YELLOW}测试 nginx 配置...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx 配置测试通过${NC}"
else
    echo -e "${RED}❌ Nginx 配置测试失败${NC}"
    echo "请检查配置文件: $CONF_FILE"
    exit 1
fi

# 询问是否重新加载 nginx
echo ""
read -p "是否现在重新加载 nginx? (y/n): " RELOAD
if [[ "$RELOAD" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx 已重新加载${NC}"
    
    # 检查端口监听
    echo ""
    echo -e "${YELLOW}检查端口监听状态...${NC}"
    if sudo ss -tlnp | grep -q ":443"; then
        echo -e "${GREEN}✅ HTTPS (443) 端口正在监听${NC}"
    else
        echo -e "${YELLOW}⚠️  443 端口未监听，可能需要重启 nginx${NC}"
    fi
    
    if sudo ss -tlnp | grep -q ":80"; then
        echo -e "${GREEN}✅ HTTP (80) 端口正在监听${NC}"
    fi
fi

echo ""
echo -e "${BLUE}=== 配置完成 ===${NC}"
echo ""
echo -e "${GREEN}✅ 配置摘要:${NC}"
echo "  配置文件: $CONF_FILE"
echo "  证书文件: $CERT_FILE"
echo "  私钥文件: $KEY_FILE"
echo "  网站根目录: $ROOT_DIR"
echo ""
echo -e "${YELLOW}测试 HTTPS 访问:${NC}"
echo "  curl -k https://localhost"
echo "  或浏览器访问: https://localhost"
echo ""
echo -e "${YELLOW}查看日志:${NC}"
echo "  sudo tail -f /var/log/nginx/localhost-https-access.log"
echo "  sudo tail -f /var/log/nginx/localhost-https-error.log"
echo ""
echo -e "${YELLOW}如果遇到问题，请查看:${NC}"
echo "  docs/deployment/NGINX_HTTPS_SETUP.md"
echo ""


