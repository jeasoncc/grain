# AUR 发布准备完成

## 已创建的文件

### 1. AUR 包文件
- ✅ `aur/PKGBUILD` - AUR 包构建脚本
- ✅ `aur/.SRCINFO` - AUR 包元数据
- ✅ `aur/novel-editor.desktop` - 桌面文件
- ✅ `aur/README.md` - AUR 包说明文档

### 2. 文档
- ✅ `docs/AUR发布指南.md` - 详细的发布指南
- ✅ `docs/AUR快速发布.md` - 快速开始指南

### 3. 自动化脚本
- ✅ `scripts/release-aur.sh` - 一键发布脚本
- ✅ `scripts/test-aur-build.sh` - 本地测试脚本

## 发布步骤

### 首次发布（只需一次）

#### 1. 注册 AUR 账号
访问：https://aur.archlinux.org/register

#### 2. 配置 SSH 密钥
```bash
# 生成密钥
ssh-keygen -t ed25519 -C "xiaomiquan@aliyun.com"

# 查看公钥
cat ~/.ssh/id_ed25519.pub
```
在 https://aur.archlinux.org/account/ 添加公钥

#### 3. 克隆 AUR 仓库
```bash
git clone ssh://aur@aur.archlinux.org/novel-editor.git aur-repo
```

#### 4. 首次提交
```bash
cd aur-repo

# 复制文件
cp ../aur/PKGBUILD .
cp ../aur/.SRCINFO .
cp ../aur/novel-editor.desktop .
cp ../aur/README.md .

# 提交
git add .
git commit -m "Initial release: v0.1.0"
git push origin master
```

### 后续更新（每次发布）

```bash
# 1. 创建 GitHub Release
git tag -a v0.1.0 -m "Release version 0.1.0"
git push origin v0.1.0

# 2. 运行发布脚本
./scripts/release-aur.sh 0.1.0
```

## 测试

### 本地测试构建
```bash
./scripts/test-aur-build.sh
```

### 用户安装测试
```bash
yay -S novel-editor
# 或
paru -S novel-editor
```

## PKGBUILD 说明

### 依赖项

**运行时依赖**：
- `webkit2gtk` - WebKit 渲染引擎
- `gtk3` - GTK3 图形库
- `libappindicator-gtk3` - 系统托盘支持

**构建依赖**：
- `rust` - Rust 编译器
- `cargo` - Rust 包管理器
- `bun` - JavaScript 运行时（需要用户先安装）
- `nodejs` - Node.js 运行时
- `patchelf` - ELF 二进制修补工具

**可选依赖**：
- `libfuse2` - 用于 AppImage 支持

### 构建流程

1. 从 GitHub 下载源代码
2. 使用 Bun 安装依赖
3. 构建前端资源
4. 使用 Tauri 构建桌面应用
5. 安装到系统

### 安装位置

- 二进制：`/usr/bin/novel-editor`
- 桌面文件：`/usr/share/applications/novel-editor.desktop`
- 图标：`/usr/share/icons/hicolor/*/apps/novel-editor.png`
- 许可证：`/usr/share/licenses/novel-editor/LICENSE`
- 文档：`/usr/share/doc/novel-editor/README.md`

## 注意事项

### 1. Bun 依赖

Bun 不在 Arch 官方仓库中，用户需要先安装：

```bash
# 从 AUR 安装
yay -S bun-bin

# 或使用官方脚本
curl -fsSL https://bun.sh/install | bash
```

在 PKGBUILD 中已将 `bun` 列为 `makedepends`，用户需要先安装。

### 2. 构建时间

首次构建可能需要 10-20 分钟，因为需要：
- 下载 Rust 依赖
- 编译 Tauri 后端
- 构建前端资源

### 3. 磁盘空间

构建过程需要约 2-3 GB 磁盘空间。

### 4. 网络连接

构建过程需要下载依赖，确保网络连接正常。

## 维护

### 更新版本

每次发布新版本时：

1. 更新 `aur/PKGBUILD` 中的 `pkgver`
2. 更新 `sha256sums`（脚本会自动完成）
3. 运行 `./scripts/release-aur.sh <version>`

### 响应用户反馈

定期检查 AUR 包页面的评论：
https://aur.archlinux.org/packages/novel-editor

### 保持依赖更新

定期检查依赖是否有更新，测试新版本的兼容性。

## 相关链接

- **AUR 包页面**：https://aur.archlinux.org/packages/novel-editor
- **项目 GitHub**：https://github.com/jeasoncc/novel-editor
- **AUR 提交指南**：https://wiki.archlinux.org/title/AUR_submission_guidelines
- **PKGBUILD 文档**：https://wiki.archlinux.org/title/PKGBUILD

## 下一步

1. ✅ 完成首次 AUR 提交
2. ✅ 测试用户安装流程
3. ✅ 在 README 中添加 AUR 安装说明
4. ✅ 在项目网站上添加 AUR 安装指南
5. ✅ 监控用户反馈和问题

## 快速命令参考

```bash
# 测试本地构建
./scripts/test-aur-build.sh

# 发布到 AUR
./scripts/release-aur.sh 0.1.0

# 手动测试安装
cd aur && makepkg -si

# 检查 PKGBUILD 语法
cd aur && namcap PKGBUILD

# 生成 .SRCINFO
cd aur && makepkg --printsrcinfo > .SRCINFO
```

## 成功标志

发布成功后，用户可以通过以下方式安装：

```bash
yay -S novel-editor
paru -S novel-editor
```

包页面会显示在：https://aur.archlinux.org/packages/novel-editor

## 维护者信息

- **维护者**：Jeason
- **邮箱**：xiaomiquan@aliyun.com
- **GitHub**：@jeasoncc

---

**准备就绪！** 🎉

现在你可以按照 `docs/AUR快速发布.md` 中的步骤进行首次发布了。
