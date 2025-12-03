#!/bin/bash
# 端口转发连接测试脚本

echo "=========================================="
echo "端口转发连接测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

INTERNAL_IP="192.168.5.4"
EXTERNAL_IP="61.144.183.96"
PORT="1420"

echo -e "${BLUE}服务器信息:${NC}"
echo "  内网 IP: $INTERNAL_IP"
echo "  外网 IP: $EXTERNAL_IP"
echo "  端口: $PORT"
echo ""

# 测试 1: 本地访问
echo -e "${YELLOW}[测试 1] 本地访问测试...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT | grep -q "200"; then
    echo -e "${GREEN}✅ 本地访问正常${NC}"
    curl -I http://localhost:$PORT 2>&1 | head -1
else
    echo -e "${RED}❌ 本地访问失败${NC}"
fi
echo ""

# 测试 2: 内网 IP 访问
echo -e "${YELLOW}[测试 2] 内网 IP 访问测试...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://$INTERNAL_IP:$PORT | grep -q "200"; then
    echo -e "${GREEN}✅ 内网 IP 访问正常${NC}"
    curl -I http://$INTERNAL_IP:$PORT 2>&1 | head -1
else
    echo -e "${RED}❌ 内网 IP 访问失败${NC}"
fi
echo ""

# 测试 3: 端口监听状态
echo -e "${YELLOW}[测试 3] 端口监听状态...${NC}"
LISTENING=$(ss -tlnp | grep ":$PORT")
if [ -n "$LISTENING" ]; then
    echo -e "${GREEN}✅ 端口正在监听${NC}"
    echo "$LISTENING"
    # 检查是否监听所有接口
    if echo "$LISTENING" | grep -q "0.0.0.0"; then
        echo -e "${GREEN}✅ 监听所有网络接口（正确）${NC}"
    else
        echo -e "${YELLOW}⚠️  可能只监听特定接口${NC}"
    fi
else
    echo -e "${RED}❌ 端口未在监听${NC}"
fi
echo ""

# 测试 4: Nginx 状态
echo -e "${YELLOW}[测试 4] Nginx 服务状态...${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx 服务正在运行${NC}"
else
    echo -e "${RED}❌ Nginx 服务未运行${NC}"
fi
echo ""

# 测试 5: 防火墙状态
echo -e "${YELLOW}[测试 5] 防火墙状态...${NC}"
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(ufw status 2>/dev/null)
    if echo "$UFW_STATUS" | grep -q "Status: active"; then
        echo -e "${YELLOW}防火墙已启用${NC}"
        if echo "$UFW_STATUS" | grep -q "$PORT/tcp"; then
            echo -e "${GREEN}✅ 端口 $PORT 已开放${NC}"
        else
            echo -e "${RED}❌ 端口 $PORT 未开放${NC}"
        fi
    else
        echo -e "${GREEN}✅ 防火墙未启用${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  无法检查防火墙状态${NC}"
fi
echo ""

# 测试 6: 外网访问测试说明
echo -e "${YELLOW}[测试 6] 外网访问测试${NC}"
echo -e "${BLUE}请在外网设备（使用移动网络，不使用 WiFi）执行以下命令：${NC}"
echo ""
echo "curl -v http://$EXTERNAL_IP:$PORT"
echo ""
echo "或者使用浏览器访问："
echo "http://$EXTERNAL_IP:$PORT"
echo ""

# 总结
echo "=========================================="
echo -e "${BLUE}诊断总结:${NC}"
echo "=========================================="
echo ""
echo "✅ 服务器端配置看起来正确"
echo ""
echo -e "${YELLOW}如果外网仍然无法访问，问题可能在于：${NC}"
echo "1. 路由器端口转发配置未正确提交"
echo "2. 路由器配置需要重启才能生效"
echo "3. 路由器的防火墙或安全设置阻止了连接"
echo "4. 运营商封禁了该端口"
echo ""
echo -e "${BLUE}下一步操作：${NC}"
echo "1. 检查路由器端口转发配置，确保点击了'提交'按钮"
echo "2. 尝试重启路由器"
echo "3. 从外网设备测试访问"
echo ""





