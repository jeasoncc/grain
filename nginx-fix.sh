#!/bin/bash
# Nginx 外网访问问题快速修复脚本

echo "=== Nginx 外网访问诊断和修复 ==="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 检查 Nginx 状态
echo -e "${YELLOW}1. 检查 Nginx 状态...${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx 正在运行${NC}"
else
    echo -e "${RED}❌ Nginx 未运行，尝试启动...${NC}"
    sudo systemctl start nginx
fi
echo ""

# 2. 检查监听端口
echo -e "${YELLOW}2. 检查监听端口...${NC}"
LISTENING=$(ss -tlnp | grep -E ":80|:1420" | grep -v "127.0.0.1")
if [ -n "$LISTENING" ]; then
    echo -e "${GREEN}✅ 发现监听端口：${NC}"
    echo "$LISTENING"
    # 检查是否监听 0.0.0.0
    if echo "$LISTENING" | grep -q "0.0.0.0"; then
        echo -e "${GREEN}✅ 监听所有网络接口（正确）${NC}"
    else
        echo -e "${RED}❌ 只监听本地接口，需要修改配置${NC}"
    fi
else
    echo -e "${RED}❌ 未找到监听 80 或 1420 端口${NC}"
fi
echo ""

# 3. 检查防火墙
echo -e "${YELLOW}3. 检查防火墙状态...${NC}"
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status 2>/dev/null)
    if echo "$UFW_STATUS" | grep -q "Status: active"; then
        echo -e "${YELLOW}防火墙已启用${NC}"
        echo "$UFW_STATUS"
        
        # 检查是否开放了 80 端口
        if echo "$UFW_STATUS" | grep -q "80/tcp"; then
            echo -e "${GREEN}✅ 80 端口已开放${NC}"
        else
            echo -e "${RED}❌ 80 端口未开放${NC}"
            echo -e "${YELLOW}是否要开放 80 端口？(y/n)${NC}"
            read -r response
            if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
                sudo ufw allow 80/tcp
                sudo ufw allow 443/tcp
                echo -e "${GREEN}✅ 已开放 80 和 443 端口${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}防火墙未启用或无法检查${NC}"
    fi
elif command -v firewall-cmd &> /dev/null; then
    echo "检测到 firewalld"
    FIREWALLD_STATUS=$(sudo firewall-cmd --list-all 2>/dev/null)
    echo "$FIREWALLD_STATUS"
else
    echo -e "${YELLOW}未检测到 ufw 或 firewalld${NC}"
fi
echo ""

# 4. 显示网络信息
echo -e "${YELLOW}4. 网络信息：${NC}"
INTERNAL_IP=$(hostname -I | awk '{print $1}')
EXTERNAL_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null)
echo "内网 IP: $INTERNAL_IP"
echo "外网 IP: $EXTERNAL_IP"
echo ""

# 5. 测试本地访问
echo -e "${YELLOW}5. 测试本地访问...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
    echo -e "${GREEN}✅ 本地访问正常${NC}"
else
    echo -e "${RED}❌ 本地访问失败${NC}"
fi
echo ""

# 6. 检查 Nginx 配置语法
echo -e "${YELLOW}6. 检查 Nginx 配置语法...${NC}"
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✅ Nginx 配置语法正确${NC}"
else
    echo -e "${RED}❌ Nginx 配置有错误：${NC}"
    sudo nginx -t
fi
echo ""

# 7. 诊断总结
echo -e "${YELLOW}=== 诊断总结 ===${NC}"
echo ""
echo "内网 IP: $INTERNAL_IP"
echo "外网 IP: $EXTERNAL_IP"
echo ""
echo "路由器端口转发配置应设置为："
echo "  外部端口 80 → 内部 IP $INTERNAL_IP → 内部端口 80"
echo ""
echo "从外网访问测试："
echo "  curl -I http://$EXTERNAL_IP"
echo ""
echo "如果无法访问，可能的原因："
echo "  1. 防火墙阻止了端口（最常见）"
echo "  2. 路由器端口转发配置错误"
echo "  3. 运营商封禁了 80 端口（国内常见）"
echo ""
echo "下一步操作："
echo "  1. 运行: sudo ufw allow 80/tcp && sudo ufw reload"
echo "  2. 检查路由器端口转发配置"
echo "  3. 如果 80 端口被封，考虑使用非标准端口（如 8080）"
echo ""






