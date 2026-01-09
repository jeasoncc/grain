#!/bin/bash
# 检查开发环境配置

set -e

echo "🔍 检查 Grain 开发环境..."
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1: $(command -v $1)"
        if [ ! -z "$2" ]; then
            echo "  版本: $($1 $2 2>&1 | head -1)"
        fi
    else
        echo -e "${RED}✗${NC} $1: 未安装"
        return 1
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${YELLOW}⚠${NC} $1: 不存在"
    fi
}

echo "📦 核心工具"
check_command "bun" "--version" || echo "  安装: curl -fsSL https://bun.sh/install | bash"
check_command "node" "--version"
check_command "npm" "--version"
check_command "cargo" "--version"
check_command "rustc" "--version"
echo ""

echo "🔧 开发工具"
check_command "turbo" "--version" || echo "  安装: bun install -g turbo"
check_command "biome" "--version" || echo "  安装: bun install -g @biomejs/biome"
check_command "cargo-watch" "--version" || echo "  安装: cargo install cargo-watch"
check_command "cargo-nextest" "--version" || echo "  安装: cargo install cargo-nextest"
echo ""

echo "⚡ 性能工具（可选）"
check_command "mold" "--version" || echo "  安装: sudo pacman -S mold"
check_command "sccache" "--version" || echo "  安装: cargo install sccache"
check_command "htop" "--version" || echo "  安装: sudo pacman -S htop"
echo ""

echo "📝 配置文件"
check_file ".bunfig.toml"
check_file ".npmrc"
check_file ".cargo/config.toml"
check_file ".zshrc-grain"
check_file "turbo.json"
echo ""

echo "💾 系统资源"
echo "CPU: $(grep "model name" /proc/cpuinfo | head -1 | cut -d: -f2 | xargs)"
echo "核心数: $(nproc)"
echo "内存: $(free -h | grep Mem | awk '{print $2}')"
echo "已用: $(free -h | grep Mem | awk '{print $3}')"
echo "可用: $(free -h | grep Mem | awk '{print $7}')"
echo "磁盘: $(df -h / | tail -1 | awk '{print $2}')"
echo "已用: $(df -h / | tail -1 | awk '{print $3 " (" $5 ")"}')"
echo ""

echo "🌐 网络配置"
if [ -f ".bunfig.toml" ]; then
    echo -e "${GREEN}✓${NC} Bun 镜像: $(grep registry .bunfig.toml | head -1 | cut -d= -f2 | xargs)"
fi
if [ -f ".npmrc" ]; then
    echo -e "${GREEN}✓${NC} npm 镜像: $(grep registry .npmrc | head -1 | cut -d= -f2)"
fi
if [ -f ".cargo/config.toml" ]; then
    echo -e "${GREEN}✓${NC} Cargo 镜像: $(grep 'registry = "sparse' .cargo/config.toml | head -1 | cut -d'"' -f2)"
fi
echo ""

echo "📊 项目状态"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules 已安装"
else
    echo -e "${YELLOW}⚠${NC} node_modules 未安装，运行: bun install"
fi

if [ -d "apps/api-rust/target" ]; then
    echo -e "${GREEN}✓${NC} Rust target 已构建"
else
    echo -e "${YELLOW}⚠${NC} Rust target 未构建，运行: cargo build"
fi
echo ""

echo "✨ 环境检查完成！"
echo ""
echo "下一步："
echo "  1. 如果有缺失工具，运行: bash scripts/setup-dev-env.sh"
echo "  2. 加载环境变量: source .zshrc-grain"
echo "  3. 安装依赖: bun install"
echo "  4. 启动开发: bun run desktop:dev"
