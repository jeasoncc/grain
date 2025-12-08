# Git Hooks 使用指南

## 当前配置

### 已启用的 Hooks

#### pre-commit（已启用）
**位置：** `.git/hooks/pre-commit`

**功能：**
- 在提交**前**自动递增版本号
- 将版本号更改添加到**当前提交**中
- 你的提交会包含新的版本号

**工作流程：**
```bash
# 你执行
git commit -m "feat: add new feature"

# pre-commit 自动执行
# 1. 检测到不是版本号提交
# 2. 运行 scripts/bump-version.sh
# 3. 版本号 0.1.8 → 0.1.9
# 4. 将版本号文件添加到当前提交

# 最终提交包含
# - 你的代码更改
# - 版本号更新（0.1.9）
```

**跳过版本号递增：**
```bash
SKIP_VERSION_BUMP=true git commit -m "docs: update readme"
```

### 已禁用的 Hooks

#### post-commit.disabled（已禁用）
**原位置：** `.git/hooks/post-commit`（已重命名为 `.git/hooks/post-commit.disabled`）

**为什么禁用：**
- 之前同时启用 pre-commit 和 post-commit
- 导致每次提交触发**两次**版本号递增
- 产生额外的 "chore: bump version" 提交

**如果需要重新启用：**
```bash
mv .git/hooks/post-commit.disabled .git/hooks/post-commit
```

#### pre-commit-with-tests（备用）
**位置：** `.git/hooks/pre-commit-with-tests`

**功能：**
- 提交前运行测试
- 自动递增版本号
- 测试失败时可选择阻止提交或创建 Issue

**启用方式：**
```bash
# 1. 禁用当前的 pre-commit
mv .git/hooks/pre-commit .git/hooks/pre-commit.backup

# 2. 启用带测试的版本
mv .git/hooks/pre-commit-with-tests .git/hooks/pre-commit
```

## 版本号递增规则

### 自动递增
pre-commit hook 会自动递增 **patch** 版本号：
- 0.1.8 → 0.1.9
- 0.1.9 → 0.1.10
- 0.1.99 → 0.1.100

### 手动指定版本号
如果需要递增 minor 或 major 版本：

```bash
# 递增 minor 版本（0.1.8 → 0.2.0）
./scripts/bump-version.sh minor

# 递增 major 版本（0.1.8 → 1.0.0）
./scripts/bump-version.sh major

# 指定具体版本
./scripts/bump-version.sh 1.5.0
```

然后提交时跳过自动递增：
```bash
SKIP_VERSION_BUMP=true git commit -m "chore: bump version to 1.5.0"
```

## 更新的文件

版本号递增会自动更新以下文件：
- `package.json`
- `apps/desktop/package.json`
- `apps/web/package.json`
- `apps/desktop/src-tauri/tauri.conf.json`
- `apps/desktop/src-tauri/Cargo.toml`
- `aur/PKGBUILD`
- `aur/PKGBUILD-binary`

## 常见场景

### 场景 1：正常开发提交
```bash
# 修改代码
vim apps/desktop/src/main.ts

# 提交（自动递增版本号）
git add .
git commit -m "feat: add new feature"
# 版本号自动从 0.1.8 → 0.1.9
```

### 场景 2：只更新文档（不递增版本号）
```bash
# 修改文档
vim README.md

# 提交时跳过版本号递增
SKIP_VERSION_BUMP=true git commit -m "docs: update readme"
```

### 场景 3：发布新版本
```bash
# 1. 手动递增到 minor 版本
./scripts/bump-version.sh minor
# 0.1.8 → 0.2.0

# 2. 提交（跳过自动递增）
SKIP_VERSION_BUMP=true git add .
SKIP_VERSION_BUMP=true git commit -m "chore: release v0.2.0"

# 3. 创建 tag
git tag desktop-v0.2.0
git push origin desktop-v0.2.0
```

### 场景 4：批量提交（避免多次递增）
```bash
# 第一次提交（递增版本号）
git commit -m "feat: feature 1"
# 0.1.8 → 0.1.9

# 后续提交（跳过递增）
SKIP_VERSION_BUMP=true git commit -m "feat: feature 2"
SKIP_VERSION_BUMP=true git commit -m "fix: bug fix"

# 最后一次提交（再次递增）
git commit -m "feat: feature 3"
# 0.1.9 → 0.1.10
```

## 完全禁用自动版本号递增

如果你想完全禁用自动版本号递增：

```bash
# 方法 1：重命名 hook
mv .git/hooks/pre-commit .git/hooks/pre-commit.disabled

# 方法 2：设置环境变量（临时）
export SKIP_VERSION_BUMP=true

# 方法 3：修改 .bashrc 或 .zshrc（永久）
echo 'export SKIP_VERSION_BUMP=true' >> ~/.bashrc
```

## 重新启用

```bash
# 重新启用 pre-commit
mv .git/hooks/pre-commit.disabled .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# 或取消环境变量
unset SKIP_VERSION_BUMP
```

## 故障排查

### 问题 1：版本号没有递增
**原因：**
- hook 没有执行权限
- 设置了 `SKIP_VERSION_BUMP=true`

**解决：**
```bash
# 检查权限
ls -la .git/hooks/pre-commit

# 添加执行权限
chmod +x .git/hooks/pre-commit

# 检查环境变量
echo $SKIP_VERSION_BUMP
```

### 问题 2：版本号递增了两次
**原因：**
- 同时启用了 pre-commit 和 post-commit

**解决：**
```bash
# 禁用 post-commit
mv .git/hooks/post-commit .git/hooks/post-commit.disabled
```

### 问题 3：提交被阻止
**原因：**
- 使用了 pre-commit-with-tests 且测试失败

**解决：**
```bash
# 跳过测试
SKIP_TESTS=true git commit -m "your message"

# 或修复测试后重新提交
```

## 团队协作

### 分享 hooks 给团队成员

Git hooks 默认不会被提交到仓库，需要手动设置：

```bash
# 1. 创建 hooks 目录（已有）
mkdir -p .githooks

# 2. 复制 hooks
cp .git/hooks/pre-commit .githooks/

# 3. 提交到仓库
git add .githooks
git commit -m "chore: add git hooks"

# 4. 团队成员安装
ln -sf ../../.githooks/pre-commit .git/hooks/pre-commit
```

### 使用 Husky（可选）

如果想要更好的团队协作，可以考虑使用 Husky：

```bash
# 安装 Husky
bun add -D husky

# 初始化
bunx husky init

# 添加 pre-commit hook
echo './scripts/bump-version.sh' > .husky/pre-commit
```

## 参考

- [Git Hooks 官方文档](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [Husky 文档](https://typicode.github.io/husky/)
- 版本号递增脚本：`scripts/bump-version.sh`
