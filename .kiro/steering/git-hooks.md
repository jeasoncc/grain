# Git Hooks 版本系统

本项目使用 pre-commit hook 自动递增版本号。

## 核心机制

```
git commit → .git/hooks/pre-commit → scripts/bump-version.sh → 更新版本文件 → 添加到当前提交
```

## 关键文件

| 文件 | 作用 |
|------|------|
| `.git/hooks/pre-commit` | 触发器，调用版本递增脚本 |
| `scripts/bump-version.sh` | 版本更新逻辑 |
| `package.json` | 主版本号（唯一真实来源） |

## 需要同步版本的文件

```
package.json                                   # 主版本
apps/desktop/package.json                      # Desktop 应用
apps/web/package.json                          # Web 应用
apps/desktop/src-tauri/tauri.conf.json         # Tauri 配置
apps/desktop/src-tauri/Cargo.toml              # Rust 配置
aur/PKGBUILD                                   # Arch Linux
aur/PKGBUILD-binary                            # Arch Linux 二进制
snap/snapcraft.yaml                            # Snap 包
flatpak/com.lotus.NovelEditor.yml              # Flatpak 包
winget-manifests/*.yaml                        # Windows 包管理器
```

## 添加新文件到版本同步（3 步）

### 1. 在 `scripts/bump-version.sh` 添加更新函数

根据文件格式选择模板：

```bash
# JSON 文件
update_json_version() {
    local file=$1 new_version=$2
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\":\s*\"[^\"]*\"/\"version\": \"$new_version\"/g" "$file"
    else
        sed -i "s/\"version\":\s*\"[^\"]*\"/\"version\": \"$new_version\"/g" "$file"
    fi
}

# YAML 文件
update_yaml_version() {
    local file=$1 new_version=$2
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^version: .*/version: '$new_version'/" "$file"
    else
        sed -i "s/^version: .*/version: '$new_version'/" "$file"
    fi
}

# TOML 文件
update_toml_version() {
    local file=$1 new_version=$2
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^version = \"[^\"]*\"/version = \"$new_version\"/" "$file"
    else
        sed -i "s/^version = \"[^\"]*\"/version = \"$new_version\"/" "$file"
    fi
}

# Shell 脚本 (PKGBUILD)
update_shell_version() {
    local file=$1 new_version=$2
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^pkgver=.*/pkgver=$new_version/" "$file"
    else
        sed -i "s/^pkgver=.*/pkgver=$new_version/" "$file"
    fi
}
```

### 2. 在两个模式中调用函数

```bash
# 非静默模式（约第 270 行）
update_newfile_version "$PROJECT_ROOT/path/to/newfile" "$NEW_VERSION" >&2

# 静默模式（约第 285 行）
update_newfile_version "$PROJECT_ROOT/path/to/newfile" "$NEW_VERSION" >/dev/null 2>&1
```

### 3. 在 `.git/hooks/pre-commit` 添加到暂存区

```bash
git add \
    package.json \
    # ... 其他文件 ...
    path/to/newfile \
    2>/dev/null || true
```

## 避免循环递增

### 问题原因
版本文件被更新但未添加到暂存区 → 下次提交又触发更新 → 无限循环

### 解决方案
1. **所有版本文件必须在 pre-commit 的 git add 中列出**
2. 智能跳过检测：只有版本/文档/图标文件时不触发递增

### 手动跳过版本递增

```bash
SKIP_VERSION_BUMP=true git commit -m "docs: 只更新文档"
```

## 常用命令

```bash
# 跳过版本递增
SKIP_VERSION_BUMP=true git commit -m "message"

# 手动递增版本
npm run version:bump

# 检查当前版本
grep '"version"' package.json

# 测试版本递增脚本
./scripts/bump-version.sh
```

## 故障排查

| 问题 | 原因 | 解决 |
|------|------|------|
| 循环提交 | 文件未加入暂存区 | 在 pre-commit 的 git add 中添加 |
| 版本号格式错误 | sed 正则不匹配 | 检查文件中版本号的确切格式 |
| 某些文件未更新 | 函数未调用或路径错误 | 检查 bump-version.sh 中的调用 |

## 详细文档

完整文档参见：`docs/githooks/readme.org`
