#!/bin/bash

# Grain Web 一键部署脚本
# 执行: bash scripts/deploy-web.sh

set -e

echo "🌾 Grain Web 一键部署..."

# ============================================
# 0. 创建运行时目录
# ============================================
mkdir -p logs run

# ============================================
# 1. 构建前端（只构建 desktop）
# ============================================
echo ""
echo "📦 构建前端..."
cd apps/desktop
bun run build:prod
cd ../..

# ============================================
# 2. 编译 Rust 后端
# ============================================
echo ""
echo "🦀 编译 Rust 后端..."
cargo build --release --manifest-path apps/api-rust/Cargo.toml

# ============================================
# 3. 停止旧服务
# ============================================
if [ -f run/grain-api.pid ] || [ -f run/grain-web.pid ]; then
    echo ""
    echo "🛑 停止旧服务..."
    [ -f run/grain-api.pid ] && kill $(cat run/grain-api.pid) 2>/dev/null || true
    [ -f run/grain-web.pid ] && kill $(cat run/grain-web.pid) 2>/dev/null || true
    sleep 2
fi

# ============================================
# 4. 启动后端服务
# ============================================
echo ""
echo "🚀 启动后端服务..."

# 监听所有网络接口，允许局域网访问
export GRAIN_HOST=0.0.0.0
export GRAIN_PORT=3030
export RUST_LOG=info

nohup ./apps/api-rust/target/release/grain-api > logs/grain-api.log 2>&1 &
API_PID=$!
echo "$API_PID" > run/grain-api.pid

# ============================================
# 5. 启动前端服务
# ============================================
echo "🌐 启动前端服务..."

cd apps/desktop
nohup bun run preview > ../../logs/grain-web.log 2>&1 &
WEB_PID=$!
cd ../..
echo "$WEB_PID" > run/grain-web.pid

# ============================================
# 6. 等待并检查
# ============================================
echo ""
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务
API_OK=false
WEB_OK=false

if curl -f http://localhost:3030/api/workspaces > /dev/null 2>&1; then
    API_OK=true
fi

if curl -f http://localhost:4173 > /dev/null 2>&1; then
    WEB_OK=true
fi

# ============================================
# 7. 显示结果
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 部署完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$API_OK" = true ] && [ "$WEB_OK" = true ]; then
    echo "✅ 所有服务运行正常"
    echo ""
    echo "🌐 访问地址: http://localhost:4173"
    echo ""
else
    echo "⚠️  服务可能还在启动中，请稍等片刻"
    echo ""
    if [ "$API_OK" = false ]; then
        echo "❌ API 服务未就绪"
        echo "   查看日志: tail -f logs/grain-api.log"
    fi
    if [ "$WEB_OK" = false ]; then
        echo "❌ 前端服务未就绪"
        echo "   查看日志: tail -f logs/grain-web.log"
    fi
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "管理命令："
echo "  查看日志: tail -f logs/grain-api.log logs/grain-web.log"
echo "  停止服务: kill \$(cat run/grain-api.pid run/grain-web.pid)"
echo "  重新部署: bash scripts/deploy-web.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
