# 构建错误修复完成

## 问题总结

构建过程中遇到两个主要问题：

1. **Cargo 构建错误**: `unexpected argument '--bundles' found`
2. **AUR 打包路径错误**: PKGBUILD 无法找到构建的二进制文件

## 修复内容

### 1. 修复 Tauri 构建命令

**文件**: `scripts/test-local-build.sh`

**问题**: 使用了 Tauri v1 的 `--bundles` 参数，但项目使用的是 Tauri v2

**修复**: 移除了 `--bundles deb,rpm` 参数，改为直接使用 `bun run tauri build`

```bash
# 修复前
bun run tauri build -- --bundles deb,rpm

# 修复后
bun run tauri build
```

Tauri v2 会自动构建所有配置的 bundle 格式。

### 2. 修复 AUR 打包路径问题

**文件**: `aur/PKGBUILD-binary` 和 `scripts/test-aur-from-binary.sh`

**问题**: 
- 测试脚本将文件复制到临时目录
- PKGBUILD 使用 `$startdir/../` 相对路径查找项目文件
- 路径不匹配导致找不到二进制文件

**修复**:
1. 在测试脚本中保存项目根目录路径
2. 通过环境变量 `PROJECT_ROOT` 传递给 PKGBUILD
3. PKGBUILD 优先使用环境变量，回退到相对路径

```bash
# scripts/test-aur-from-binary.sh
PROJECT_ROOT=$(pwd)
export PROJECT_ROOT="$PROJECT_ROOT"
```

```bash
# aur/PKGBUILD-binary
local project_root="${PROJECT_ROOT:-$startdir/..}"
local build_dir="$project_root/apps/desktop/src-tauri/target/release"
```

## 测试结果

### 本地构建测试

```bash
./scripts/test-local-build.sh
```

✅ 成功构建：
- 二进制文件: `apps/desktop/src-tauri/target/release/novel-editor` (16M)
- DEB 包: `novel-editor_0.1.0_amd64.deb`
- RPM 包: `novel-editor-0.1.0-1.x86_64.rpm`

注意: AppImage 构建失败（缺少 linuxdeploy），但不影响 AUR 发布。

### AUR 打包测试

```bash
./scripts/test-aur-from-binary.sh
```

✅ 成功打包和安装：
- 包文件: `novel-editor-0.1.0-1-x86_64.pkg.tar.zst` (6.3M)
- 调试包: `novel-editor-debug-0.1.0-1-x86_64.pkg.tar.zst` (516K)
- 安装位置: `/usr/bin/novel-editor`

## 验证

```bash
$ which novel-editor
/usr/bin/novel-editor

$ ls -lh /usr/bin/novel-editor
-rwxr-xr-x 13M root 3 Dec 21:44 /usr/bin/novel-editor
```

## 下一步

1. ✅ 本地构建成功
2. ✅ AUR 打包成功
3. ✅ 安装测试成功
4. ⏭️ 测试应用功能
5. ⏭️ 准备 GitHub Release
6. ⏭️ 发布到 AUR

## 相关文件

- `scripts/test-local-build.sh` - 本地构建脚本
- `scripts/test-aur-from-binary.sh` - AUR 打包测试脚本
- `aur/PKGBUILD-binary` - AUR 包构建配置
- `apps/desktop/src-tauri/tauri.conf.json` - Tauri 配置

## 技术说明

### Tauri v2 变化

Tauri v2 移除了 `--bundles` 参数，改为：
- 使用 `tauri.conf.json` 中的 `bundle.targets` 配置
- 默认构建所有配置的格式
- 可以使用 `--target` 指定特定平台

### PKGBUILD 最佳实践

对于本地测试的 PKGBUILD：
- 使用环境变量传递动态路径
- 提供回退机制（相对路径）
- 在 package() 函数中验证文件存在
- 使用 `error` 函数提供清晰的错误信息

## 卸载测试包

如果需要卸载测试安装的包：

```bash
sudo pacman -R novel-editor
```
