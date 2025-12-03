# 🔧 脚本工具说明

## 版本号管理脚本

### bump-version.sh

自动递增版本号的脚本。

**功能**：
- 从根目录 `package.json` 读取当前版本
- 自动递增 patch 版本（0.1.0 → 0.1.1）
- 同步更新所有相关文件的版本号

**使用**：
```bash
./scripts/bump-version.sh
```

**更新的文件**：
- `package.json` (根目录)
- `apps/desktop/package.json`
- `apps/web/package.json`
- `apps/desktop/src-tauri/tauri.conf.json`
- `apps/desktop/src-tauri/Cargo.toml`
- `aur/PKGBUILD`
- `aur/PKGBUILD-binary`

### set-version.sh

手动设置统一版本号的脚本。

**功能**：
- 将所有相关文件的版本号设置为指定值
- 验证版本号格式（X.Y.Z）

**使用**：
```bash
./scripts/set-version.sh 0.1.0
```

**示例**：
```bash
# 设置版本号为 0.1.0
./scripts/set-version.sh 0.1.0

# 设置版本号为 1.0.0
./scripts/set-version.sh 1.0.0
```

