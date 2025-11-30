# ✅ Tauri 构建错误修复

## ❌ 错误

```
failed to read plugin permissions: failed to read file 
'/home/lotus/project/book2/novel-editor/src-tauri/...'
No such file or directory
```

## 🔍 原因

Tauri 构建时查找了错误的路径：
- **期望**: `/home/lotus/project/book2/novel-editor/src-tauri/`
- **实际**: `/home/lotus/project/book2/novel-editor/apps/desktop/src-tauri/`

这是 monorepo 迁移后的路径问题。

## ✅ 解决方案

### 1. 使用构建脚本（推荐）

```bash
# 使用提供的构建脚本
./scripts/build-desktop.sh
```

这个脚本会：
- ✅ 清理旧的构建
- ✅ 在正确的目录安装依赖
- ✅ 构建前端
- ✅ 验证构建结果
- ✅ 构建 Tauri 应用

### 2. 手动构建

```bash
# 1. 清理
cd apps/desktop
cargo clean
rm -rf dist

# 2. 安装依赖
bun install

# 3. 构建前端
bun run build

# 4. 验证
ls -la dist/

# 5. 构建 Tauri
bun tauri build
```

### 3. 使用 Turborepo

```bash
# 从根目录
bun run build --filter=desktop
cd apps/desktop
bun tauri build
```

## 🔧 GitHub Actions 修复

已更新工作流以：
1. ✅ 先在根目录安装依赖（monorepo）
2. ✅ 再在子目录安装依赖
3. ✅ 验证前端构建结果
4. ✅ 然后构建 Tauri

## 🎯 立即操作

### 清理并重新构建

```bash
# 1. 清理
cd apps/desktop/src-tauri
cargo clean
cd ../..
rm -rf dist

# 2. 使用构建脚本
cd ../..
./scripts/build-desktop.sh
```

### 或者手动步骤

```bash
cd apps/desktop

# 安装依赖
bun install

# 构建前端
bun run build

# 检查
ls -la dist/

# 构建 Tauri
bun tauri build
```

## 📊 构建检查清单

- [ ] 清理旧的构建缓存
- [ ] 安装依赖
- [ ] 构建前端
- [ ] 验证 dist/ 目录存在
- [ ] 构建 Tauri
- [ ] 检查 bundle/ 目录

## 🎊 结果

构建成功后，你会在以下位置找到安装包：

```
apps/desktop/src-tauri/target/release/bundle/
├── deb/
│   └── novel-editor_0.1.0_amd64.deb
├── rpm/
│   └── novel-editor-0.1.0-1.x86_64.rpm
└── appimage/
    └── novel-editor_0.1.0_amd64.AppImage
```

## 📚 相关文档

- [TAURI_BUILD_ERROR_ANALYSIS.md](./TAURI_BUILD_ERROR_ANALYSIS.md) - 详细分析

---

**使用构建脚本可以避免路径问题！** 🚀
