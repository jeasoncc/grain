#!/bin/bash
# ============================================
# Rust 快速编译环境安装脚本
# ============================================
# 安装 mold 链接器和 sccache 编译缓存
# 支持: Ubuntu/Debian, Arch Linux, Fedora

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

# 检测包管理器
detect_package_manager() {
    if command -v pacman &> /dev/null; then
        echo "pacman"
    elif command -v apt &> /dev/null; then
        echo "apt"
    elif command -v dnf &> /dev/null; then
        echo "dnf"
    elif command -v brew &> /dev/null; then
        echo "brew"
    else
        echo "unknown"
    fi
}

# 安装 mold
install_mold() {
    info "检查 mold 链接器..."
    
    if command -v mold &> /dev/null; then
        success "mold 已安装: $(mold --version | head -1)"
        return 0
    fi
    
    local pm=$(detect_package_manager)
    info "使用 $pm 安装 mold..."
    
    case $pm in
        pacman)
            sudo pacman -S --noconfirm mold
            ;;
        apt)
            sudo apt update && sudo apt install -y mold
            ;;
        dnf)
            sudo dnf install -y mold
            ;;
        brew)
            brew install mold
            ;;
        *)
            error "未知的包管理器，请手动安装 mold"
            echo "  - Arch: sudo pacman -S mold"
            echo "  - Ubuntu/Debian: sudo apt install mold"
            echo "  - Fedora: sudo dnf install mold"
            echo "  - macOS: brew install mold"
            return 1
            ;;
    esac
    
    if command -v mold &> /dev/null; then
        success "mold 安装成功: $(mold --version | head -1)"
    else
        error "mold 安装失败"
        return 1
    fi
}

# 安装 sccache
install_sccache() {
    info "检查 sccache 编译缓存..."
    
    if command -v sccache &> /dev/null; then
        success "sccache 已安装: $(sccache --version)"
        return 0
    fi
    
    local pm=$(detect_package_manager)
    
    # 优先使用包管理器安装（更快）
    case $pm in
        pacman)
            info "使用 pacman 安装 sccache..."
            sudo pacman -S --noconfirm sccache
            ;;
        apt)
            # Ubuntu/Debian 可能没有 sccache 包，使用 cargo 安装
            info "使用 cargo 安装 sccache..."
            cargo install sccache
            ;;
        dnf)
            info "使用 dnf 安装 sccache..."
            sudo dnf install -y sccache
            ;;
        brew)
            info "使用 brew 安装 sccache..."
            brew install sccache
            ;;
        *)
            info "使用 cargo 安装 sccache..."
            cargo install sccache
            ;;
    esac
    
    if command -v sccache &> /dev/null; then
        success "sccache 安装成功: $(sccache --version)"
    else
        warn "sccache 安装失败，但这是可选的"
        return 0
    fi
}

# 安装 clang（mold 需要）
install_clang() {
    info "检查 clang..."
    
    if command -v clang &> /dev/null; then
        success "clang 已安装: $(clang --version | head -1)"
        return 0
    fi
    
    local pm=$(detect_package_manager)
    info "使用 $pm 安装 clang..."
    
    case $pm in
        pacman)
            sudo pacman -S --noconfirm clang
            ;;
        apt)
            sudo apt update && sudo apt install -y clang
            ;;
        dnf)
            sudo dnf install -y clang
            ;;
        brew)
            # macOS 自带 clang
            success "macOS 自带 clang"
            return 0
            ;;
        *)
            warn "请手动安装 clang"
            return 1
            ;;
    esac
    
    if command -v clang &> /dev/null; then
        success "clang 安装成功"
    fi
}

# 迁移旧的 cargo config
migrate_cargo_config() {
    info "检查 Cargo 配置..."
    
    local old_config="$HOME/.cargo/config"
    local new_config="$HOME/.cargo/config.toml"
    
    if [ -f "$old_config" ] && [ ! -f "$new_config" ]; then
        info "迁移 ~/.cargo/config 到 ~/.cargo/config.toml..."
        mv "$old_config" "$new_config"
        success "配置文件已迁移"
    elif [ -f "$old_config" ] && [ -f "$new_config" ]; then
        warn "两个配置文件都存在，请手动处理"
        echo "  旧: $old_config"
        echo "  新: $new_config"
    else
        success "Cargo 配置正常"
    fi
}

# 验证安装
verify_installation() {
    echo ""
    info "========== 安装验证 =========="
    
    # mold
    if command -v mold &> /dev/null; then
        success "mold: $(mold --version | head -1)"
    else
        error "mold: 未安装"
    fi
    
    # clang
    if command -v clang &> /dev/null; then
        success "clang: $(clang --version | head -1)"
    else
        warn "clang: 未安装（mold 需要）"
    fi
    
    # sccache
    if command -v sccache &> /dev/null; then
        success "sccache: $(sccache --version)"
    else
        warn "sccache: 未安装（可选）"
    fi
    
    # lld (备用)
    if command -v lld &> /dev/null; then
        success "lld: $(lld --version | head -1)"
    else
        info "lld: 未安装（备用链接器）"
    fi
    
    echo ""
    info "========== 使用说明 =========="
    echo "1. 项目已配置使用 mold 链接器"
    echo "2. 运行 'cargo build' 即可享受快速编译"
    echo "3. 如需启用 sccache，编辑 .cargo/config.toml 取消注释 rustc-wrapper"
    echo ""
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  Rust 快速编译环境安装"
    echo "=========================================="
    echo ""
    
    install_clang
    install_mold
    install_sccache
    migrate_cargo_config
    verify_installation
    
    success "安装完成！"
}

main "$@"
