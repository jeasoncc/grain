# Shell 配置指南

本文档说明如何配置 zsh、fish 和 bash 以优化 Grain 项目开发体验。

## 快速开始

### 1. Zsh (推荐)

在 `~/.zshrc` 末尾添加：

```bash
source /path/to/grain-editor-monorepo/.zshrc-grain
```

### 2. Fish

在 `~/.config/fish/config.fish` 末尾添加：

```fish
source /path/to/grain-editor-monorepo/.config/fish/grain.fish
```

### 3. Bash

在 `~/.bashrc` 末尾添加：

```bash
source /path/to/grain-editor-monorepo/.bashrc-grain
```

## 功能特性

### 🚀 项目快捷命令

| 命令 | 功能 |
|------|------|
| `gd` | 启动 Desktop 开发服务器 |
| `gw` | 启动 Web 开发服务器 |
| `gm` | 启动 Mobile 开发服务器 |
| `ga` | 启动 Admin 开发服务器 |
| `gr` | 启动 Rust API 服务器 |
| `gb` | 生产构建 |
| `gl` | 代码检查 |
| `gf` | 代码格式化 |
| `gt` | 运行测试 |

### 🦀 Rust 快捷命令

| 命令 | 功能 |
|------|------|
| `cr` | 运行 Rust API |
| `cb` | Release 构建 |
| `cch` | Cargo check |
| `ct` | 运行测试 |
| `cw` | Watch 模式 |
| `cc` | Clippy 检查 |

### 🧹 清理命令

| 命令 | 功能 |
|------|------|
| `clean-node` | 删除所有 node_modules |
| `clean-turbo` | 删除 Turbo 缓存 |
| `clean-rust` | 清理 Rust 构建 |
| `clean-all` | 完全清理并重新安装 |

### 📁 文件操作增强

| 命令 | 功能 |
|------|------|
| `ls` | eza 增强列表 |
| `ll` | 详细列表 + Git 状态 |
| `la` | 显示隐藏文件 |
| `lt` | 树状显示 (3 层) |
| `lz` | 按大小排序 |
| `lm` | 按修改时间排序 |

### 🔍 搜索增强

| 命令 | 功能 |
|------|------|
| `grep` → `rg` | ripgrep 快速搜索 |
| `cat` → `bat` | 语法高亮查看 |
| `find` → `fd` | 快速文件查找 |
| `ff <pattern>` | 模糊查找文件 |
| `rgg <pattern>` | 模糊搜索内容 |

### 🛠️ 实用函数

| 函数 | 功能 |
|------|------|
| `dev-info` | 显示开发工具版本 |
| `grain-status` | 显示项目状态 |
| `mkcd <dir>` | 创建目录并进入 |
| `gac <msg>` | Git add + commit |
| `port <num>` | 查看端口占用 |
| `backup <file>` | 快速备份文件 |

## 依赖工具

确保已安装以下工具（Arch Linux）：

```bash
sudo pacman -S zsh fish bash starship zoxide eza bat ripgrep fd fzf
```

## 性能优化

### Zsh 启动时间测量

在 `.zshrc-grain` 开头取消注释：

```bash
zmodload zsh/zprof
```

在末尾取消注释：

```bash
zprof
```

### 环境变量优化

- `NODE_OPTIONS="--max-old-space-size=8192"` - 8GB Node.js 内存
- `MAKEFLAGS="-j$(nproc)"` - 并行编译
- `TURBO_TELEMETRY_DISABLED=1` - 禁用遥测

## FZF 配置

所有 shell 都配置了 FZF 增强：

- `Ctrl+T` - 模糊查找文件（带预览）
- `Ctrl+R` - 历史命令搜索
- `Alt+C` - 模糊切换目录（带预览）

## Zoxide 智能跳转

```bash
z grain      # 跳转到最常访问的包含 grain 的目录
z desk       # 跳转到 desktop
zi           # 交互式选择
```

## 故障排查

### 命令未找到

确保工具已安装：

```bash
which starship zoxide eza bat rg fd fzf
```

### 补全不工作 (Zsh)

重新生成补全缓存：

```bash
rm ~/.zcompdump*
compinit
```

### 性能问题

检查启动时间：

```bash
# Zsh
time zsh -i -c exit

# Fish
time fish -i -c exit

# Bash
time bash -i -c exit
```

## 自定义配置

如需添加个人配置，在 `~/.zshrc` 中：

```bash
# 个人配置
export MY_VAR="value"

# 加载 Grain 配置
source /path/to/grain-editor-monorepo/.zshrc-grain

# 覆盖 Grain 配置
alias gd="my-custom-command"
```

## 相关文档

- [Arch Linux 环境配置](./arch-linux-setup.md)
- [性能调优指南](./performance-tuning.md)
- [开发环境检查](../../scripts/check-env.sh)
