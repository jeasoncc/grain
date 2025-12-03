# Novel Editor AUR 发布指南

## 前置准备

### 1. 创建 AUR 账号

访问 https://aur.archlinux.org/register 注册账号

### 2. 配置 SSH 密钥

```bash
# 生成 SSH 密钥（如果还没有）
ssh-keygen -t ed25519 -C "your_email@example.com"

# 复制公钥
cat ~/.ssh/id_ed25519.pub
```

在 AUR 账号设置中添加 SSH 公钥：https://aur.archlinux.org/account/

### 3. 安装必要工具

```bash
# Arch Linux
sudo pacman -S base-devel git

# 安装 Bun（构建依赖）
curl -fsSL https://bun.sh/install | bash
```

## 发布步骤

### 1. 准备发布

```bash
# 确保代码已提交并推送到 GitHub
git add .
git commit -m "Release v0.1.0"
git push origin main

# 创建 Git tag
git tag -a v0.1.0 -m "Release version 0.1.0"
git push origin v0.1.0
```

### 2. 生成 SHA256 校验和

```bash
# 下载发布的源代码包
wget https://github.com/jeasoncc/novel-editor/archive/refs/tags/v0.1.0.tar.gz

# 生成 SHA256
sha256sum v0.1.0.tar.gz

# 更新 PKGBUILD 中的 sha256sums
```

### 3. 测试本地构建

```bash
cd aur

# 测试构建
makepkg -sf

# 测试安装
makepkg -si

# 测试运行
novel-editor

# 清理
makepkg -c
```

### 4. 生成 .SRCINFO

```bash
cd aur

# 生成 .SRCINFO 文件
makepkg --printsrcinfo > .SRCINFO
```

### 5. 克隆 AUR 仓库

```bash
# 首次发布
git clone ssh://aur@aur.archlinux.org/novel-editor.git aur-repo
cd aur-repo

# 复制文件
cp ../aur/PKGBUILD .
cp ../aur/.SRCINFO .
cp ../aur/novel-editor.desktop .
cp ../aur/README.md .
```

### 6. 提交到 AUR

```bash
# 添加文件
git add PKGBUILD .SRCINFO novel-editor.desktop README.md

# 提交
git commit -m "Initial release: v0.1.0"

# 推送到 AUR
git push origin master
```

## 更新版本

### 1. 更新版本号

编辑 `aur/PKGBUILD`：
```bash
pkgver=0.1.1  # 更新版本号
pkgrel=1      # 重置为 1
```

### 2. 更新 SHA256

```bash
# 下载新版本
wget https://github.com/jeasoncc/novel-editor/archive/refs/tags/v0.1.1.tar.gz

# 生成新的 SHA256
sha256sum v0.1.1.tar.gz

# 更新 PKGBUILD 中的 sha256sums
```

### 3. 测试并提交

```bash
cd aur

# 测试构建
makepkg -sf

# 生成 .SRCINFO
makepkg --printsrcinfo > .SRCINFO

# 提交到 AUR
cd ../aur-repo
cp ../aur/PKGBUILD .
cp ../aur/.SRCINFO .

git add PKGBUILD .SRCINFO
git commit -m "Update to v0.1.1"
git push origin master
```

## 自动化脚本

### 发布脚本

创建 `scripts/release-aur.sh`：

```bash
#!/bin/bash

set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 0.1.0"
  exit 1
fi

echo "🚀 Releasing Novel Editor v$VERSION to AUR..."

# 1. 创建 Git tag
echo "📝 Creating Git tag..."
git tag -a "v$VERSION" -m "Release version $VERSION"
git push origin "v$VERSION"

# 2. 等待 GitHub 生成源代码包
echo "⏳ Waiting for GitHub to generate source archive..."
sleep 5

# 3. 下载并生成 SHA256
echo "🔐 Generating SHA256..."
wget -q "https://github.com/jeasoncc/novel-editor/archive/refs/tags/v$VERSION.tar.gz"
SHA256=$(sha256sum "v$VERSION.tar.gz" | awk '{print $1}')
rm "v$VERSION.tar.gz"

echo "SHA256: $SHA256"

# 4. 更新 PKGBUILD
echo "📝 Updating PKGBUILD..."
sed -i "s/^pkgver=.*/pkgver=$VERSION/" aur/PKGBUILD
sed -i "s/^pkgrel=.*/pkgrel=1/" aur/PKGBUILD
sed -i "s/^sha256sums=.*/sha256sums=('$SHA256')/" aur/PKGBUILD

# 5. 生成 .SRCINFO
echo "📝 Generating .SRCINFO..."
cd aur
makepkg --printsrcinfo > .SRCINFO
cd ..

# 6. 提交到 AUR
echo "📤 Pushing to AUR..."
cd aur-repo
cp ../aur/PKGBUILD .
cp ../aur/.SRCINFO .

git add PKGBUILD .SRCINFO
git commit -m "Update to v$VERSION"
git push origin master

cd ..

echo "✅ Successfully released v$VERSION to AUR!"
echo "🔗 https://aur.archlinux.org/packages/novel-editor"
```

使用方法：
```bash
chmod +x scripts/release-aur.sh
./scripts/release-aur.sh 0.1.0
```

## 常见问题

### 1. Bun 不在官方仓库

用户需要先安装 Bun：
```bash
yay -S bun-bin
# 或
curl -fsSL https://bun.sh/install | bash
```

### 2. 构建失败

检查依赖是否完整：
```bash
pacman -S webkit2gtk gtk3 libappindicator-gtk3 rust cargo nodejs patchelf
```

### 3. 权限问题

确保 SSH 密钥已添加到 AUR 账号。

### 4. 推送失败

```bash
# 检查远程仓库
git remote -v

# 应该是：
# origin  ssh://aur@aur.archlinux.org/novel-editor.git
```

## AUR 包维护最佳实践

### 1. 及时更新

- 当上游发布新版本时，尽快更新 AUR 包
- 在 PKGBUILD 中添加更新日志

### 2. 响应用户反馈

- 定期检查 AUR 包页面的评论
- 及时修复用户报告的问题

### 3. 保持依赖最新

- 定期检查依赖是否有更新
- 测试新版本的兼容性

### 4. 文档完善

- 保持 README 更新
- 添加常见问题解答

## 相关链接

- **AUR 包页面**: https://aur.archlinux.org/packages/novel-editor
- **AUR 提交指南**: https://wiki.archlinux.org/title/AUR_submission_guidelines
- **PKGBUILD 文档**: https://wiki.archlinux.org/title/PKGBUILD
- **项目 GitHub**: https://github.com/jeasoncc/novel-editor

## 维护者信息

- **维护者**: Jeason
- **邮箱**: xiaomiquan@aliyun.com
- **GitHub**: @jeasoncc
