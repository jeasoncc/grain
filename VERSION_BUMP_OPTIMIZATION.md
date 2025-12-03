# 🎨 版本号递增脚本优化完成

## ✅ 已修复的问题

### 问题：版本号提交信息出现乱码

**之前的问题**:
```
chore: bump version to 开始自动递增版本号...�[0;32m✅ 版本号已从...
```

**原因**:
1. 脚本输出包含 ANSI 颜色代码（`\033[0;32m` 等）
2. 脚本输出包含中文调试信息
3. Git hook 捕获了所有输出，包括调试信息

**现在的效果**:
```
chore: bump version to 0.1.3
```

## 🔧 优化内容

### 1. 智能颜色检测

脚本现在会自动检测运行环境：

```bash
# 在终端中 - 显示彩色输出
./scripts/bump-version.sh

# 在 Git hook 中 - 不使用颜色
SILENT_MODE=true ./scripts/bump-version.sh

# 通过管道 - 自动禁用颜色
./scripts/bump-version.sh | cat
```

**实现原理**:
```bash
if [ -t 1 ]; then
    # 在终端中，使用颜色
    GREEN='\033[0;32m'
else
    # 不在终端中，不使用颜色
    GREEN=''
fi
```

### 2. 静默模式

新增 `SILENT_MODE` 环境变量：

```bash
# 正常模式 - 显示详细信息
./scripts/bump-version.sh

# 静默模式 - 只输出版本号
SILENT_MODE=true ./scripts/bump-version.sh
```

**输出对比**:

**正常模式**:
```
开始自动递增版本号...

当前版本: 0.1.2
新版本: 0.1.3

正在同步版本号到所有文件...
✓ 更新 package.json -> 0.1.3
✓ 更新 apps/desktop/package.json -> 0.1.3
...

✅ 版本号已从 0.1.2 更新到 0.1.3

0.1.3
```

**静默模式**:
```
0.1.3
```

### 3. 输出流分离

- **stdout**: 只输出纯净的版本号
- **stderr**: 输出调试信息和进度

```bash
# 捕获版本号（不包含调试信息）
VERSION=$(SILENT_MODE=true ./scripts/bump-version.sh)

# 使用版本号
git commit -m "chore: bump version to $VERSION"
```

### 4. 更新 Git Hooks

**pre-commit** 和 **post-commit** 现在使用静默模式：

```bash
# 使用静默模式，只获取版本号
NEW_VERSION=$(SILENT_MODE=true "$SCRIPT_PATH")

# 创建干净的提交信息
git commit -m "chore: bump version to $NEW_VERSION"
```

## 📊 优化效果对比

### 优化前

**提交信息**:
```
chore: bump version to 开始自动递增版本号...
�[0;32m当前版本: �[1;33m0.1.2�[0m
�[0;32m新版本: �[0;32m0.1.3�[0m
...
```

**问题**:
- ❌ 包含中文调试信息
- ❌ 包含 ANSI 颜色代码
- ❌ 包含多余的输出
- ❌ GitHub 显示乱码

### 优化后

**提交信息**:
```
chore: bump version to 0.1.3
```

**效果**:
- ✅ 只包含版本号
- ✅ 没有颜色代码
- ✅ 没有中文字符
- ✅ GitHub 显示正常

## 🧪 测试验证

运行测试脚本验证优化效果：

```bash
./scripts/test-bump-version.sh
```

测试内容：
1. ✅ 正常模式（终端输出）
2. ✅ 静默模式（Git hook 模式）
3. ✅ 管道模式
4. ✅ Git commit 消息格式

## 💡 使用指南

### 在终端中使用（有彩色输出）

```bash
./scripts/bump-version.sh
```

输出：
```
开始自动递增版本号...

当前版本: 0.1.2
新版本: 0.1.3

正在同步版本号到所有文件...
✓ 更新 package.json -> 0.1.3
✓ 更新 apps/desktop/package.json -> 0.1.3
✓ 更新 apps/web/package.json -> 0.1.3
✓ 更新 apps/desktop/src-tauri/tauri.conf.json -> 0.1.3
✓ 更新 apps/desktop/src-tauri/Cargo.toml -> 0.1.3
✓ 更新 aur/PKGBUILD -> 0.1.3
✓ 更新 aur/PKGBUILD-binary -> 0.1.3

✅ 版本号已从 0.1.2 更新到 0.1.3

0.1.3
```

### 在脚本中使用（只获取版本号）

```bash
# 方法 1: 使用静默模式
VERSION=$(SILENT_MODE=true ./scripts/bump-version.sh)
echo "新版本: $VERSION"

# 方法 2: 只捕获 stdout
VERSION=$(./scripts/bump-version.sh 2>/dev/null)
echo "新版本: $VERSION"

# 方法 3: 通过管道（自动禁用颜色）
VERSION=$(./scripts/bump-version.sh | tail -1)
echo "新版本: $VERSION"
```

### 在 Git Hook 中使用

```bash
# 使用静默模式
NEW_VERSION=$(SILENT_MODE=true "$SCRIPT_PATH")

# 创建提交
git commit -m "chore: bump version to $NEW_VERSION" --no-verify
```

## 🔍 技术细节

### 颜色检测机制

```bash
if [ -t 1 ]; then
    # stdout 是终端 - 使用颜色
    GREEN='\033[0;32m'
else
    # stdout 不是终端（管道/文件） - 不使用颜色
    GREEN=''
fi
```

### 输出流分离

```bash
# 调试信息输出到 stderr
echo "当前版本: $CURRENT_VERSION" >&2

# 版本号输出到 stdout
echo "$NEW_VERSION"
```

### 静默模式实现

```bash
if [ "$SILENT_MODE" != "true" ]; then
    # 显示详细信息
    echo "正在更新..." >&2
else
    # 静默执行
    update_version >/dev/null 2>&1
fi

# 始终输出版本号到 stdout
echo "$NEW_VERSION"
```

## 📋 相关文件

### 已优化的文件

1. **scripts/bump-version.sh**
   - 添加颜色检测
   - 添加静默模式
   - 分离输出流

2. **.git/hooks/pre-commit**
   - 使用静默模式
   - 清理提交信息

3. **.git/hooks/post-commit**
   - 使用静默模式
   - 清理提交信息

### 新增的文件

- **scripts/test-bump-version.sh** - 测试脚本

## 🎯 最佳实践

### 1. 手动更新版本号

```bash
# 运行脚本
./scripts/bump-version.sh

# 查看更改
git diff

# 提交
git add .
git commit -m "chore: release v0.1.3"
```

### 2. 自动化脚本中使用

```bash
#!/bin/bash

# 更新版本号
VERSION=$(SILENT_MODE=true ./scripts/bump-version.sh)

# 创建 tag
git tag "v$VERSION"

# 推送
git push origin main --tags

echo "Released version $VERSION"
```

### 3. CI/CD 中使用

```yaml
- name: Bump version
  run: |
    VERSION=$(SILENT_MODE=true ./scripts/bump-version.sh)
    echo "NEW_VERSION=$VERSION" >> $GITHUB_ENV

- name: Create release
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git add .
    git commit -m "chore: bump version to ${{ env.NEW_VERSION }}"
    git tag "v${{ env.NEW_VERSION }}"
    git push origin main --tags
```

## ⚠️ 注意事项

### 1. Git Hooks 已禁用

为了避免自动版本递增的问题，Git hooks 已被禁用：

```bash
# 当前状态
.git/hooks/pre-commit.disabled
.git/hooks/post-commit.disabled
```

如果需要重新启用：

```bash
# 启用 pre-commit
mv .git/hooks/pre-commit.disabled .git/hooks/pre-commit

# 启用 post-commit
mv .git/hooks/post-commit.disabled .git/hooks/post-commit
```

### 2. 推荐工作流程

**不推荐**: 每次提交自动递增版本号
- 会产生大量版本号提交
- 版本号失去意义
- 触发过多 CI

**推荐**: 手动控制版本号更新
- 在准备发布时更新版本号
- 版本号有明确意义
- 减少不必要的 CI 触发

## 🚀 下一步

1. ✅ 测试优化效果
   ```bash
   ./scripts/test-bump-version.sh
   ```

2. ✅ 验证提交信息
   ```bash
   # 做一次测试提交
   git add .
   git commit -m "test: 测试版本号优化"
   
   # 查看提交历史
   git log --oneline -5
   ```

3. ✅ 配置工作流程
   - 参考 [QUICK_FIX_GUIDE.md](QUICK_FIX_GUIDE.md)
   - 参考 [WORKFLOW_OPTIMIZATION_GUIDE.md](WORKFLOW_OPTIMIZATION_GUIDE.md)

## 📚 相关文档

- [快速修复指南](QUICK_FIX_GUIDE.md)
- [Workflow 优化指南](WORKFLOW_OPTIMIZATION_GUIDE.md)
- [分支管理指南](docs/branch-management-guide.md)

---

优化完成！现在版本号提交信息将清晰干净，不再出现乱码！🎉
