# ============================================================================
# Grain 项目专用 Fish 配置
# ============================================================================
# 在 ~/.config/fish/config.fish 中添加: source /path/to/grain-editor-monorepo/.config/fish/grain.fish

# ============================================================================
# 环境变量
# ============================================================================

# Bun
set -gx BUN_INSTALL "$HOME/.bun"
fish_add_path "$BUN_INSTALL/bin"

# Rust
fish_add_path "$HOME/.cargo/bin"
set -gx RUSTUP_DIST_SERVER "https://rsproxy.cn"
set -gx RUSTUP_UPDATE_ROOT "https://rsproxy.cn/rustup"

# Node.js 性能优化
set -gx NODE_OPTIONS "--max-old-space-size=8192"
set -gx NODE_ENV (test -n "$NODE_ENV"; and echo $NODE_ENV; or echo "development")

# Turbo 优化
set -gx TURBO_TELEMETRY_DISABLED 1
set -gx TURBO_FORCE false
set -gx TURBO_CACHE_DIR ".turbo"

# 编译优化
set -gx MAKEFLAGS "-j"(nproc)

# ============================================================================
# 项目别名 - 开发
# ============================================================================

# 快速启动
alias gd="bun run desktop:dev"
alias gw="bun run web:dev"
alias gm="bun run mobile:dev"
alias ga="bun run admin:dev"
alias gapi="bun run api:dev"
alias gr="bun run api-rust:dev"

# 构建
alias gb="bun run build:prod"
alias gbd="bun run build:prod:desktop"
alias gbw="bun run build:prod:web"
alias gbt="bun run build:test:desktop"

# 代码质量
alias gl="bun run lint"
alias gf="bun run format"
alias gc="bun run check"
alias gt="bun run test"
alias gtd="bun run test:desktop"

# 版本管理
alias gv="bun run version:bump"
alias gtag="bun run tag:help"

# ============================================================================
# 项目别名 - Cargo/Rust
# ============================================================================

alias cr="cargo run --manifest-path apps/api-rust/Cargo.toml"
alias cb="cargo build --release --manifest-path apps/api-rust/Cargo.toml"
alias cch="cargo check --manifest-path apps/api-rust/Cargo.toml"
alias ct="cargo test --manifest-path apps/api-rust/Cargo.toml"
alias cw="cargo watch -x check -x test"
alias cc="cargo clippy --manifest-path apps/api-rust/Cargo.toml"

# ============================================================================
# 项目别名 - 清理
# ============================================================================

alias clean-node="rm -rf node_modules apps/*/node_modules packages/*/node_modules"
alias clean-turbo="rm -rf .turbo apps/*/.turbo packages/*/.turbo"
alias clean-rust="cargo clean --manifest-path apps/api-rust/Cargo.toml"
alias clean-all="clean-node && clean-turbo && clean-rust && bun install"
alias clean-cache="clean-turbo && rm -rf ~/.cache/turbo"

# ============================================================================
# 通用别名 - 文件操作
# ============================================================================

# eza (ls 替代)
alias ls='eza --icons --group-directories-first'
alias ll='eza -l --icons --git --time-style=long-iso'
alias la='eza -la --icons --git'
alias lt='eza -T --icons --level=3 --git-ignore'
alias lz='eza -l --icons --sort=size'
alias lm='eza -l --icons --sort=modified'

# 快速导航
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias ~='cd ~'

# ============================================================================
# 通用别名 - 开发工具
# ============================================================================

# Git 增强
alias g='git'
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git pull'
alias gd='git diff'
alias gco='git checkout'
alias gb='git branch'
alias glog='git log --oneline --graph --decorate'

# 搜索增强
alias grep='rg'
alias cat='bat'
alias find='fd'

# 系统信息
alias df='df -h'
alias du='du -h'
alias free='free -h'

# ============================================================================
# 函数
# ============================================================================

# 创建目录并进入
function mkcd
    mkdir -p $argv[1]; and cd $argv[1]
end

# 快速查找文件
function ff
    fd $argv[1] | fzf --preview 'bat --color=always {}'
end

# 快速查找内容
function rgg
    rg --color=always --line-number --no-heading --smart-case $argv | fzf --ansi --preview "bat --color=always {1} --highlight-line {2}"
end

# Git 快速提交
function gac
    git add -A; and git commit -m "$argv"
end

# 查看端口占用
function port
    lsof -i :$argv[1]
end

# 快速备份
function backup
    cp $argv[1] "$argv[1].backup."(date +%Y%m%d_%H%M%S)
end

# 显示开发工具版本
function dev-info
    echo "📦 开发环境信息"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔧 Bun:      "(bun --version 2>/dev/null; or echo '未安装')
    echo "🟢 Node:     "(node --version 2>/dev/null; or echo '未安装')
    echo "📦 npm:      "(npm --version 2>/dev/null; or echo '未安装')
    echo "🦀 Rust:     "(rustc --version 2>/dev/null | cut -d' ' -f2; or echo '未安装')
    echo "📦 Cargo:    "(cargo --version 2>/dev/null | cut -d' ' -f2; or echo '未安装')
    echo "⚡ Turbo:    "(turbo --version 2>/dev/null; or echo '未安装')
    echo "🎨 Biome:    "(biome --version 2>/dev/null; or echo '未安装')
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
end

# 项目状态检查
function grain-status
    echo "🌾 Grain 项目状态"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📂 当前目录: "(pwd)
    echo "🌿 Git 分支: "(git branch --show-current 2>/dev/null; or echo '非 Git 仓库')
    echo "📝 Git 状态: "(git status -s 2>/dev/null | wc -l)" 个文件变更"
    echo "📦 Node 模块: "(test -d node_modules; and echo '已安装'; or echo '未安装')
    echo "🦀 Rust 构建: "(test -d apps/api-rust/target; and echo '已构建'; or echo '未构建')
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
end

# ============================================================================
# FZF 配置
# ============================================================================

if type -q fzf
    # FZF 默认选项
    set -gx FZF_DEFAULT_OPTS "
        --height 40%
        --layout=reverse
        --border
        --inline-info
        --color=fg:#d0d0d0,bg:#121212,hl:#5f87af
        --color=fg+:#d0d0d0,bg+:#262626,hl+:#5fd7ff
        --color=info:#afaf87,prompt:#d7005f,pointer:#af5fff
        --color=marker:#87ff00,spinner:#af5fff,header:#87afaf
    "

    # 使用 fd 作为默认命令
    if type -q fd
        set -gx FZF_DEFAULT_COMMAND 'fd --type f --hidden --follow --exclude .git'
        set -gx FZF_CTRL_T_COMMAND "$FZF_DEFAULT_COMMAND"
        set -gx FZF_ALT_C_COMMAND 'fd --type d --hidden --follow --exclude .git'
    end

    # 预览
    set -gx FZF_CTRL_T_OPTS "--preview 'bat --color=always --line-range :500 {}'"
    set -gx FZF_ALT_C_OPTS "--preview 'eza -T --icons --level=2 {}'"
end

# ============================================================================
# 工具初始化
# ============================================================================

# Starship 提示符
if type -q starship
    starship init fish | source
end

# Zoxide (智能 cd)
if type -q zoxide
    zoxide init fish | source
    alias cd='z'
end

# fnm (Node 版本管理)
if type -q fnm
    fnm env --use-on-cd | source
end

# Kiro 集成
if test "$TERM_PROGRAM" = "kiro"
    source (kiro --locate-shell-integration-path fish 2>/dev/null)
end

# ============================================================================
# 欢迎信息
# ============================================================================

echo "✨ Grain 开发环境已加载 (Fish)"
echo "💡 输入 'dev-info' 查看工具版本"
echo "📊 输入 'grain-status' 查看项目状态"
