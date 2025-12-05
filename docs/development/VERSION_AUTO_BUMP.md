# 🔄 版本号自动递增功能

## 📋 功能说明

本项目已配置自动版本号递增功能，会在每次 Git 提交时自动递增版本号（patch 版本 +1），并同步更新所有相关文件的版本号。

## 🎯 支持的版本号文件

版本号会自动同步到以下所有文件：

1. ✅ `package.json` (根目录)
2. ✅ `apps/desktop/package.json`
3. ✅ `apps/web/package.json`
4. ✅ `apps/desktop/src-tauri/tauri.conf.json`
5. ✅ `apps/desktop/src-tauri/Cargo.toml`
6. ✅ `aur/PKGBUILD`
7. ✅ `aur/PKGBUILD-binary`

## 🔧 实现方式

### 方案 1: Pre-commit Hook（推荐，已启用）

在**提交前**自动递增版本号，版本号的更新会包含在当前的提交中。

- **Hook 位置**: `.git/hooks/pre-commit`
- **脚本位置**: `scripts/bump-version.sh`
- **优点**: 版本号更新和代码更改在同一个提交中
- **缺点**: 无

### 方案 2: Post-commit Hook（可选）

在**提交后**自动递增版本号，并创建一个新的提交。

- **Hook 位置**: `.git/hooks/post-commit`
- **脚本位置**: `scripts/bump-version.sh`
- **优点**: 版本号更新是独立的提交
- **缺点**: 会创建额外的提交

**注意**: 默认使用 pre-commit hook。如果使用 post-commit hook，需要删除或禁用 pre-commit hook。

## 📝 使用方法

### 正常提交

直接提交代码即可，版本号会自动递增：

```bash
git add .
git commit -m "feat: 添加新功能"
# 版本号会自动从 0.1.0 递增到 0.1.1，并包含在提交中
```

### 跳过版本递增

如果不想自动递增版本号，可以使用环境变量：

```bash
SKIP_VERSION_BUMP=true git commit -m "docs: 更新文档"
```

### 手动运行版本递增脚本

也可以手动运行脚本：

```bash
./scripts/bump-version.sh
```

## 🔍 版本号规则

版本号遵循 [语义化版本](https://semver.org/) 规范：`MAJOR.MINOR.PATCH`

- **递增规则**: 只递增 PATCH 版本（0.1.0 → 0.1.1）
- **版本源**: 以根目录 `package.json` 的版本号为基准
- **同步**: 所有相关文件都会同步到相同版本号

## 📊 版本号递增示例

```
0.1.0 → 0.1.1 → 0.1.2 → 0.1.3 ...
```

## ⚙️ 配置说明

### 启用/禁用 Hook

#### 禁用 Pre-commit Hook

```bash
# 重命名即可禁用
mv .git/hooks/pre-commit .git/hooks/pre-commit.disabled
```

#### 启用 Pre-commit Hook

```bash
# 恢复即可启用
mv .git/hooks/pre-commit.disabled .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

#### 切换为 Post-commit Hook

1. 禁用 pre-commit hook:
   ```bash
   mv .git/hooks/pre-commit .git/hooks/pre-commit.disabled
   ```

2. 启用 post-commit hook:
   ```bash
   chmod +x .git/hooks/post-commit
   ```

## 🛠️ 脚本详情

### bump-version.sh

版本递增脚本，功能包括：

- 从根目录 `package.json` 读取当前版本
- 自动递增 patch 版本号
- 同步更新所有相关文件的版本号
- 支持 macOS 和 Linux 系统

### 脚本位置

```
scripts/bump-version.sh
```

## 🐛 故障排除

### Hook 不执行

1. 检查 hook 文件权限:
   ```bash
   ls -l .git/hooks/pre-commit
   # 应该是 -rwxr-xr-x
   ```

2. 如果没有执行权限，添加权限:
   ```bash
   chmod +x .git/hooks/pre-commit
   ```

### 版本号格式错误

如果版本号格式不正确（不是 `X.Y.Z` 格式），脚本会报错。请确保版本号遵循语义化版本规范。

### 跳过版本递增

如果版本号文件已在暂存区（手动更新），hook 会跳过自动递增，避免重复更新。

## 📚 相关文档

- [语义化版本规范](https://semver.org/)
- [Git Hooks 文档](https://git-scm.com/docs/githooks)

## 🔄 更新日志

- **2024-12-03**: 初始版本，支持自动递增和同步所有版本号文件

---

**状态**: ✅ 已启用  
**Hook 类型**: Pre-commit（推荐）




