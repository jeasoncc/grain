#!/bin/bash

# Grain Web 快速启动脚本（使用已构建的文件）

set -e

echo "🌾 Grain Web 快速启动..."

# 创建运行时目录
mkdir -p logs run

# 检查构建产物
if [ ! -d "apps/desktop/dist" ]; then
    echo "❌ 前端未构建，请先运行: cd apps/desktop && bun run build:prod"
    exit 1
fi

if [ ! -f "apps/api-rust/target/release/grain-api" ]; then
    echo "❌ 后端未编译，请先运行: cargo build --release --manifest-path apps/api-rust/Cargo.toml"
    exit 1
fi

# 停止旧服务
if [ -f run/grain-api.pid ] || [ -f run/grain-web.pid ]; then
    echo "🛑 停止旧服务..."
    [ -f run/grain-api.pid ] && kill $(cat run/grain-api.pid) 2>/dev/null || true
    [ -f run/grain-web.pid ] && kill $(cat run/grain-web.pid) 2>/dev/null || true
    sleep 2
fi

# 启动后端
echo "🚀 启动后端..."
export GRAIN_HOST=127.0.0.1
export GRAIN_PORT=3030
export RUST_LOG=info

nohup ./apps/api-rust/target/release/grain-api > logs/grain-api.log 2>&1 &
echo $! > run/grain-api.pid

# 启动前端
echo "🌐 启动前端..."
cd apps/desktop
nohup bun run preview > ../../logs/grain-web.log 2>&1 &
echo $! > ../../run/grain-web.pid
cd ../..

echo ""
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务
if curl -f http://localhost:3030/api/workspaces > /dev/null 2>&1 && \
   curl -f http://localhost:4173 > /dev/null 2>&1; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ 服务启动成功！"
    echo ""
    echo "🌐 访问地址: http://localhost:4173"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo ""
    echo "⚠️  服务可能还在启动中"
    echo "   查看日志: tail -f logs/grain-api.log logs/grain-web.log"
fi

echo ""
echo "停止服务: kill \$(cat run/grain-api.pid run/grain-web.pid)"
