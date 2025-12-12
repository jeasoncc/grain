# Git Hooks 自动版本号递增系统

本文档详细说明了项目中 Git Hooks 自动版本号递增系统的工作原理、涉及的文件以及如何正确配置。

## 🔄 系统工作原理

### 1. 触发机制
```bash
git commit -m "your message"
    ↓
.git/hooks/pre-commit 被触发
    ↓
检查是否应该跳过版本递增
    ↓
调用 scripts/bump-version.sh
    ↓
更新所有版本相关文件
    ↓
将更新的文件添加到当前提交
```

### 2. 核心组件

#### A. Pre-commit Hook (`.git/hooks/pre-commit`)
**作用**: 在每次提交前自动触发版本号递增

**关键逻辑**:
```bash
# 1. 检测跳过条件
if [ "$SKIP_VERSION_BUMP" = "true" ]; then
    exit 0
fi

# 2. 智能检测是否应该跳过
VERSION_FILES="package\.json|tauri\.conf\.json|Cargo\.toml|PKGBUILD|snapcraft\.yaml|winget-manifests/"
DOC_FILES="README\.md|docs/.*\.md|\.md$"
ICON_FILES="icons/.*|\.png$|\.ico$|\.icns$"

# 3. 调用版本递增脚本
NEW_VERSION=$(SILENT_MODE=true "$BUMP_SCRIPT_PATH" 2>/dev/null)

# 4. 将更新的文件添加到暂存区
git add [版本相关文件列表]
```

#### B. 版本递增脚本 (`scripts/bump-version.sh`)
**作用**: 实际执行版本号更新逻辑

**核心功能**:
- 从 `package.json` 读取当前版本
- 递增 patch 版本号 (0.1.47 → 0.1.48)
- 同步更新所有相关文件

## 📁 涉及的文件系统

### 1. 版本源文件
```
package.json                           # 主版本源 (version: "0.1.47")
```

### 2. 需要同步版本号的文件
```
# JavaScript/Node.js 项目文件
├── package.json                       # 根目录主配置
├── apps/desktop/package.json          # Desktop 应用配置
├── apps/web/package.json              # Web 应用配置

# Tauri 相关文件
├── apps/desktop/src-tauri/tauri.conf.json  # Tauri 配置
├── apps/desktop/src-tauri/Cargo.toml       # Rust 项目配置

# 包管理器配置文件
├── aur/PKGBUILD                       # Arch Linux 包配置
├── aur/PKGBUILD-binary                # Arch Linux 二进制包配置
├── snap/snapcraft.yaml               # Snap 包配置
├── flatpak/com.lotus.NovelEditor.yml  # Flatpak 包配置

# Windows 包管理器配置
├── winget-manifests/Jeason.NovelEditor.yaml
├── winget-manifests/Jeason.NovelEditor.installer.yaml
└── winget-manifests/Jeason.NovelEditor.locale.zh-CN.yaml
```

### 3. Git Hook 配置文件
```
.git/hooks/pre-commit                 # Pre-commit hook 脚本 (唯一需要的 hook)
scripts/bump-version.sh               # 版本递增逻辑脚本
```

**注意**: 项目只需要 `pre-commit` hook，其他 hook 文件（如 `post-commit`）已被清理。

## 🛠️ 如何添加新的版本同步文件

### 步骤 1: 在 `scripts/bump-version.sh` 中添加更新函数

```bash
# 函数：更新新文件类型的版本号
update_newfile_version() {
    local file=$1
    local new_version=$2
    
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}警告: 文件不存在，跳过: $file${NC}"
        return 1
    fi
    
    # 根据文件格式使用相应的 sed 命令
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS 版本
        sed -i '' "s/version: .*/version: $new_version/" "$file"
    else
        # Linux 版本
        sed -i "s/version: .*/version: $new_version/" "$file"
    fi
    
    echo -e "${GREEN}✓${NC} 更新 $file -> $new_version"
}
```

### 步骤 2: 在两个模式中调用更新函数

```bash
# 在非静默模式中添加 (约第 270 行)
# 11. 新文件类型
update_newfile_version "$PROJECT_ROOT/path/to/newfile.ext" "$NEW_VERSION" >&2

# 在静默模式中添加 (约第 285 行)
update_newfile_version "$PROJECT_ROOT/path/to/newfile.ext" "$NEW_VERSION" >/dev/null 2>&1
```

### 步骤 3: 在 `.git/hooks/pre-commit` 中添加文件到暂存区

```bash
git add \
    package.json \
    apps/desktop/package.json \
    # ... 其他现有文件 ...
    path/to/newfile.ext \              # 添加新文件
    winget-manifests/*.yaml 2>/dev/null || true
```

### 步骤 4: 更新跳过检测逻辑 (如果需要)

如果新文件应该被跳过检测逻辑识别，更新正则表达式：

```bash
VERSION_FILES="package\.json|tauri\.conf\.json|Cargo\.toml|PKGBUILD|snapcraft\.yaml|winget-manifests/|newfile\.ext"
```

## 🚫 如何避免循环递增问题

### 问题原因
1. 版本文件被更新但未添加到暂存区
2. IDE 自动格式化触发新的提交
3. 形成无限循环

### 解决方案

#### 1. 确保所有版本文件都被添加到暂存区
```bash
# 在 .git/hooks/pre-commit 中
git add \
    [所有版本相关文件] \
    2>/dev/null || true
```

#### 2. 智能跳过检测
```bash
# 检查暂存区文件类型
STAGED_CHANGES=$(git diff --cached --name-only)

# 定义文件类型
VERSION_FILES="package\.json|tauri\.conf\.json|..."
DOC_FILES="README\.md|docs/.*\.md|\.md$"
ICON_FILES="icons/.*|\.png$|\.ico$|\.icns$"

# 如果只有这些类型的文件，跳过版本递增
if echo "$STAGED_CHANGES" | grep -v -E "($VERSION_FILES|$DOC_FILES|$ICON_FILES)" | grep -q .; then
    # 有其他类型文件，继续版本递增
    :
else
    # 只有版本/文档/图标文件，跳过
    exit 0
fi
```

#### 3. 手动跳过机制
```bash
# 临时跳过版本递增
SKIP_VERSION_BUMP=true git commit -m "docs: update documentation"

# 或设置环境变量
export SKIP_VERSION_BUMP=true
git commit -m "fix: version files only"
unset SKIP_VERSION_BUMP
```

## 📋 常见文件类型的更新函数模板

### JSON 文件 (package.json, tauri.conf.json)
```bash
update_json_version() {
    local file=$1
    local new_version=$2
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\":\s*\"[^\"]*\"/\"version\": \"$new_version\"/g" "$file"
    else
        sed -i "s/\"version\":\s*\"[^\"]*\"/\"version\": \"$new_version\"/g" "$file"
    fi
}
```

### YAML 文件 (snapcraft.yaml)
```bash
update_yaml_version() {
    local file=$1
    local new_version=$2
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^version: .*/version: '$new_version'/" "$file"
    else
        sed -i "s/^version: .*/version: '$new_version'/" "$file"
    fi
}
```

### TOML 文件 (Cargo.toml)
```bash
update_toml_version() {
    local file=$1
    local new_version=$2
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^version = \"[^\"]*\"/version = \"$new_version\"/" "$file"
    else
        sed -i "s/^version = \"[^\"]*\"/version = \"$new_version\"/" "$file"
    fi
}
```

### Shell 脚本文件 (PKGBUILD)
```bash
update_shell_version() {
    local file=$1
    local new_version=$2
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^pkgver=.*/pkgver=$new_version/" "$file"
    else
        sed -i "s/^pkgver=.*/pkgver=$new_version/" "$file"
    fi
}
```

## 🔍 调试和故障排除

### 1. 检查当前版本号
```bash
# 查看主版本号
grep '"version"' package.json

# 查看所有版本文件的版本号
grep -r "0\.1\." package.json apps/*/package.json aur/PKGBUILD* snap/snapcraft.yaml
```

### 2. 手动测试版本递增
```bash
# 直接运行版本递增脚本
./scripts/bump-version.sh

# 静默模式测试
SILENT_MODE=true ./scripts/bump-version.sh
```

### 3. 检查 Git Hook 状态
```bash
# 检查 pre-commit hook 是否可执行
ls -la .git/hooks/pre-commit

# 如果不可执行，添加执行权限
chmod +x .git/hooks/pre-commit
```

### 4. 查看暂存区状态
```bash
# 查看暂存区文件
git diff --cached --name-only

# 查看具体更改
git diff --cached
```

## 🎯 最佳实践

### 1. 提交消息规范
```bash
# 会触发版本递增的提交
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
git commit -m "refactor: improve code structure"

# 不会触发版本递增的提交 (只有版本文件)
git commit -m "chore: update version to 0.1.48"
```

### 2. 批量操作
```bash
# 更新图标后的完整流程
npm run icons:update          # 更新图标
git add .                     # 添加所有更改
git commit -m "feat: update application icons"  # 自动递增版本
```

### 3. 发布流程
```bash
# 1. 开发完成后提交
git commit -m "feat: implement new feature"  # 版本自动递增

# 2. 创建发布标签
npm run tag:desktop           # 创建 desktop-v0.1.X 标签

# 3. 推送到远程
git push origin main --tags   # 推送代码和标签
```

## 📚 相关文件参考

- `.git/hooks/pre-commit` - Pre-commit hook 脚本
- `scripts/bump-version.sh` - 版本递增逻辑
- `package.json` - 主版本源文件
- `docs/icon-configuration.md` - 图标配置指南
- `scripts/create-tag.sh` - 标签创建脚本

---

**注意**: 修改版本系统时，请确保测试所有相关功能，避免破坏自动化流程。