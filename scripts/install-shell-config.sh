#!/usr/bin/env bash

# ============================================================================
# Grain Shell 配置安装脚本
# ============================================================================
# 自动将 Grain shell 配置添加到用户的 shell 配置文件中

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}🌾 Grain Shell 配置安装器${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ============================================================================
# 检测已安装的 Shell
# ============================================================================

SHELLS=()
[ -x "$(command -v zsh)" ] && SHELLS+=("zsh")
[ -x "$(command -v fish)" ] && SHELLS+=("fish")
[ -x "$(command -v bash)" ] && SHELLS+=("bash")

if [ ${#SHELLS[@]} -eq 0 ]; then
  echo -e "${RED}❌ 未检测到任何 shell (zsh/fish/bash)${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} 检测到以下 shell: ${SHELLS[*]}"
echo

# ============================================================================
# 安装函数
# ============================================================================

install_zsh() {
  local zshrc="$HOME/.zshrc"
  local source_line="source \"$PROJECT_ROOT/.zshrc-grain\""
  
  if [ ! -f "$zshrc" ]; then
    echo -e "${YELLOW}⚠${NC}  ~/.zshrc 不存在，创建中..."
    touch "$zshrc"
  fi
  
  if grep -qF "$source_line" "$zshrc"; then
    echo -e "${YELLOW}⚠${NC}  Zsh 配置已存在，跳过"
    return
  fi
  
  echo "" >> "$zshrc"
  echo "# Grain 项目配置" >> "$zshrc"
  echo "$source_line" >> "$zshrc"
  echo -e "${GREEN}✓${NC} Zsh 配置已添加到 ~/.zshrc"
}

install_fish() {
  local fish_config="$HOME/.config/fish/config.fish"
  local fish_dir="$HOME/.config/fish"
  local source_line="source \"$PROJECT_ROOT/.config/fish/grain.fish\""
  
  if [ ! -d "$fish_dir" ]; then
    echo -e "${YELLOW}⚠${NC}  ~/.config/fish 不存在，创建中..."
    mkdir -p "$fish_dir"
  fi
  
  if [ ! -f "$fish_config" ]; then
    echo -e "${YELLOW}⚠${NC}  ~/.config/fish/config.fish 不存在，创建中..."
    touch "$fish_config"
  fi
  
  if grep -qF "$source_line" "$fish_config"; then
    echo -e "${YELLOW}⚠${NC}  Fish 配置已存在，跳过"
    return
  fi
  
  echo "" >> "$fish_config"
  echo "# Grain 项目配置" >> "$fish_config"
  echo "$source_line" >> "$fish_config"
  echo -e "${GREEN}✓${NC} Fish 配置已添加到 ~/.config/fish/config.fish"
}

install_bash() {
  local bashrc="$HOME/.bashrc"
  local source_line="source \"$PROJECT_ROOT/.bashrc-grain\""
  
  if [ ! -f "$bashrc" ]; then
    echo -e "${YELLOW}⚠${NC}  ~/.bashrc 不存在，创建中..."
    touch "$bashrc"
  fi
  
  if grep -qF "$source_line" "$bashrc"; then
    echo -e "${YELLOW}⚠${NC}  Bash 配置已存在，跳过"
    return
  fi
  
  echo "" >> "$bashrc"
  echo "# Grain 项目配置" >> "$bashrc"
  echo "$source_line" >> "$bashrc"
  echo -e "${GREEN}✓${NC} Bash 配置已添加到 ~/.bashrc"
}

# ============================================================================
# 交互式安装
# ============================================================================

echo "请选择要安装的 shell 配置："
echo
for i in "${!SHELLS[@]}"; do
  echo "  $((i+1)). ${SHELLS[$i]}"
done
echo "  a. 全部安装"
echo "  q. 退出"
echo

read -p "请输入选项 [1-${#SHELLS[@]}/a/q]: " choice

case "$choice" in
  q|Q)
    echo "已取消"
    exit 0
    ;;
  a|A)
    for shell in "${SHELLS[@]}"; do
      "install_$shell"
    done
    ;;
  [0-9]*)
    if [ "$choice" -ge 1 ] && [ "$choice" -le "${#SHELLS[@]}" ]; then
      shell="${SHELLS[$((choice-1))]}"
      "install_$shell"
    else
      echo -e "${RED}❌ 无效选项${NC}"
      exit 1
    fi
    ;;
  *)
    echo -e "${RED}❌ 无效选项${NC}"
    exit 1
    ;;
esac

# ============================================================================
# 完成
# ============================================================================

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ 安装完成！${NC}"
echo
echo "请执行以下命令使配置生效："
echo

for shell in "${SHELLS[@]}"; do
  case "$shell" in
    zsh)
      echo "  source ~/.zshrc"
      ;;
    fish)
      echo "  source ~/.config/fish/config.fish"
      ;;
    bash)
      echo "  source ~/.bashrc"
      ;;
  esac
done

echo
echo "或者重新打开终端"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
