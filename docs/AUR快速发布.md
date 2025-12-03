# AUR 快速发布指南

## 一键发布

```bash
# 发布到 AUR
./scripts/release-aur.sh 0.1.0
```

## 首次设置（只需一次）

### 1. 注册 AUR 账号

访问 https://aur.archlinux.org/register

### 2. 添加 SSH 密钥

```bash
# 生成密钥（如果没有）
ssh-keygen -t ed25519 -C "xiaomiquan@aliyun.com"

# 查看公钥
cat ~/.ssh/id_ed25519.pub
```

在 https://aur.archlinux.org/account/ 添加公钥

### 3. 克隆 AUR 仓库

```bash
# 在项目根目录执行
git clone ssh://aur@aur.archlinux.org/novel-editor.git aur-repo
```

### 4. 首次提交

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

## 后续更新

每次发布新版本时：

```bash
# 1. 更新代码并创建 tag
git add .
git commit -m "Release v0.1.1"
git push origin main
git tag -a v0.1.1 -m "Release version 0.1.1"
git push origin v0.1.1

# 2. 运行发布脚本
./scripts/release-aur.sh 0.1.1
```

## 手动发布（如果脚本失败）

```bash
# 1. 下载源代码
wget https://github.com/jeasoncc/novel-editor/archive/refs/tags/v0.1.0.tar.gz

# 2. 生成 SHA256
sha256sum v0.1.0.tar.gz

# 3. 更新 PKGBUILD
cd aur
# 编辑 PKGBUILD，更新 pkgver 和 sha256sums

# 4. 生成 .SRCINFO
makepkg --printsrcinfo > .SRCINFO

# 5. 测试构建
makepkg -sf

# 6. 提交到 AUR
cd ../aur-repo
cp ../aur/PKGBUILD .
cp ../aur/.SRCINFO .
git add PKGBUILD .SRCINFO
git commit -m "Update to v0.1.0"
git push origin master
```

## 验证发布

```bash
# 检查 AUR 包页面
xdg-open https://aur.archlinux.org/packages/novel-editor

# 测试安装
yay -S novel-editor
```

## 常见问题

### Q: 推送失败 "Permission denied"
A: 检查 SSH 密钥是否已添加到 AUR 账号

### Q: "Repository not found"
A: 确保已在 AUR 网站上创建了包（首次提交会自动创建）

### Q: SHA256 不匹配
A: 重新下载源代码包并生成 SHA256

### Q: 构建失败
A: 检查依赖是否完整，运行 `makepkg -sf` 查看详细错误

## 相关命令

```bash
# 测试本地构建
cd aur && makepkg -sf

# 安装测试
cd aur && makepkg -si

# 清理构建文件
cd aur && makepkg -c

# 查看包信息
cd aur && makepkg --printsrcinfo

# 检查 PKGBUILD 语法
cd aur && namcap PKGBUILD

# 检查构建的包
cd aur && namcap *.pkg.tar.zst
```

## 维护清单

- [ ] 创建 AUR 账号
- [ ] 添加 SSH 密钥
- [ ] 克隆 AUR 仓库到 `aur-repo/`
- [ ] 首次提交 PKGBUILD
- [ ] 测试本地构建
- [ ] 验证 AUR 包页面
- [ ] 添加到 README 的安装说明

## 下一步

发布完成后，在项目 README 中添加 AUR 安装说明：

```markdown
### Arch Linux (AUR)

\`\`\`bash
yay -S novel-editor
# 或
paru -S novel-editor
\`\`\`
```
