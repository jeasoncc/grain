# Git Hooks 版本系统快速指南

> 🤖 **AI 助手专用**: 如何正确配置自动版本号递增系统

## 🎯 核心原理

```
提交代码 → pre-commit hook → bump-version.sh → 更新版本文件 → 添加到当前提交
```

## 📁 关键文件

### 1. 控制文件
- `.git/hooks/pre-commit` - 触发器
- `scripts/bump-version.sh` - 版本更新逻辑

### 2. 版本源文件
- `package.json` - 主版本号 (唯一真实来源)

### 3. 需要同步的文件
```
package.json                                    # 主版本
apps/desktop/package.json                      # Desktop 应用
apps/web/package.json                          # Web 应用
apps/desktop/src-tauri/tauri.conf.json         # Tauri 配置
apps/desktop/src-tauri/Cargo.toml              # Rust 配置
aur/PKGBUILD                                   # Arch Linux
aur/PKGBUILD-binary                            # Arch Linux 二进制
snap/snapcraft.yaml                           # Snap 包
flatpak/com.lotus.Grain.yml                    # Flatpak 包
winget-manifests/*.yaml                        # Windows 包管理器
```

## 🔧 添加新文件到版本同步 (3 步骤)

### 步骤 1: 在 `scripts/bump-version.sh` 添加更新函数

```bash
# 根据文件格式选择模板:

# JSON 文件 (如 package.json)
update_json_version() {
    local file=$1
    local new_version=$2
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\":\s*\"[^\"]*\"/\"version\": \"$new_version\"/g" "$file"
    else
        sed -i "s/\"version\":\s*\"[^\"]*\"/\"version\": \"$new_version\"/g" "$file"
    fi
    echo -e "${GREEN}✓${NC} 更新 $file -> $new_version"
}

# YAML 文件 (如 snapcraft.yaml)
update_yaml_version() {
    local file=$1
    local new_version=$2
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^version: .*/version: '$new_version'/" "$file"
    else
        sed -i "s/^version: .*/version: '$new_version'/" "$file"
    fi
    echo -e "${GREEN}✓${NC} 更新 $file -> $new_version"
}

# TOML 文件 (如 Cargo.toml)
update_toml_version() {
    local file=$1
    local new_version=$2
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^version = \"[^\"]*\"/version = \"$new_version\"/" "$file"
    else
        sed -i "s/^version = \"[^\"]*\"/version = \"$new_version\"/" "$file"
    fi
    echo -e "${GREEN}✓${NC} 更新 $file -> $new_version"
}

# Shell 脚本 (如 PKGBUILD)
update_shell_version() {
    local file=$1
    local new_version=$2
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^pkgver=.*/pkgver=$new_version/" "$file"
    else
        sed -i "s/^pkgver=.*/pkgver=$new_version/" "$file"
    fi
    echo -e "${GREEN}✓${NC} 更新 $file -> $new_version"
}
```

### 步骤 2: 在两个地方调用函数

在 `scripts/bump-version.sh` 中找到这两个部分并添加:

```bash
# A. 非静默模式 (约第 270 行，在 "# 10. Winget manifests" 后)
# 11. 新文件
update_newfile_version "$PROJECT_ROOT/path/to/newfile" "$NEW_VERSION" >&2

# B. 静默模式 (约第 285 行，在最后一行前)
update_newfile_version "$PROJECT_ROOT/path/to/newfile" "$NEW_VERSION" >/dev/null 2>&1
```

### 步骤 3: 在 `.git/hooks/pre-commit` 添加到暂存区

```bash
# 找到 git add 部分，添加新文件:
git add \
    package.json \
    apps/desktop/package.json \
    apps/web/package.json \
    apps/desktop/src-tauri/tauri.conf.json \
    apps/desktop/src-tauri/Cargo.toml \
    aur/PKGBUILD \
    aur/PKGBUILD-binary \
    snap/snapcraft.yaml \
    flatpak/com.lotus.Grain.yml \
    winget-manifests/*.yaml \
    path/to/newfile \                    # 添加这行
    2>/dev/null || true
```

## 🚫 避免循环递增的关键点

### 1. 必须添加到暂存区
**所有被更新的版本文件都必须在 pre-commit hook 中添加到暂存区**

### 2. 跳过检测逻辑
如果新文件应该被识别为"版本文件"，更新检测正则:

```bash
# 在 .git/hooks/pre-commit 中找到这行并修改:
VERSION_FILES="package\.json|tauri\.conf\.json|Cargo\.toml|PKGBUILD|snapcraft\.yaml|winget-manifests/|newfile\.ext"
```

## 🔍 常见问题排查

### 问题: 文件被更新但循环提交
**原因**: 文件未添加到 pre-commit hook 的暂存区
**解决**: 在 `.git/hooks/pre-commit` 的 `git add` 部分添加该文件

### 问题: 版本号格式不正确
**原因**: sed 正则表达式不匹配文件格式
**解决**: 检查文件中版本号的确切格式，调整 sed 命令

### 问题: 某些文件版本号没有更新
**原因**: 更新函数未被调用或路径错误
**解决**: 检查函数调用和文件路径

## 🧪 测试新配置

```bash
# 1. 手动测试版本递增脚本
./scripts/bump-version.sh

# 2. 检查所有文件是否正确更新
grep -r "0\.1\." package.json apps/*/package.json aur/PKGBUILD* snap/snapcraft.yaml

# 3. 测试 pre-commit hook
echo "test" > test.txt
git add test.txt
git commit -m "test: verify version system"
rm test.txt
git add test.txt
git commit -m "cleanup: remove test file"
```

## 📋 文件格式示例

### JSON (package.json)
```json
{
  "version": "0.1.47"
}
```
**更新**: `"version": "0.1.47"` → `"version": "0.1.48"`

### YAML (snapcraft.yaml)
```yaml
version: '0.1.47'
```
**更新**: `version: '0.1.47'` → `version: '0.1.48'`

### TOML (Cargo.toml)
```toml
version = "0.1.47"
```
**更新**: `version = "0.1.47"` → `version = "0.1.48"`

### Shell (PKGBUILD)
```bash
pkgver=0.1.47
```
**更新**: `pkgver=0.1.47` → `pkgver=0.1.48`

## ⚡ 快速操作命令

```bash
# 跳过版本递增
SKIP_VERSION_BUMP=true git commit -m "docs: update only"

# 手动递增版本
npm run version:bump

# 检查当前版本
grep '"version"' package.json

# 查看暂存区状态
git diff --cached --name-only
```

---

**重要**: 每次修改版本系统后，务必测试完整的提交流程确保正常工作。