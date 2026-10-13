# Flatpak 和 Winget 发布指南

本文档介绍如何使用新添加的 npm 脚本来发布 Flatpak 和 Winget 包。

## 新增的 npm 脚本

### Flatpak 发布
```bash
# 创建 flatpak 标签并触发 Flatpak 构建
npm run tag:flatpak
```

### Winget 发布
```bash
# 创建 winget 标签并触发 Winget 发布
npm run tag:winget
```

### 所有平台发布
```bash
# 创建所有平台的标签（包括 desktop、snap、aur、aur-bin、flatpak、winget）
npm run tag:all
```

## 发布流程

### 1. Flatpak 发布流程

1. **创建标签**：
   ```bash
   npm run tag:flatpak
   ```

2. **自动触发**：
   - GitHub Actions 会自动检测 `flatpak-v*` 标签
   - 运行 `.github/workflows/flatpak-publish.yml` 工作流
   - 构建 Flatpak 包并上传为 artifact

3. **手动提交到 Flathub**：
   - 构建完成后，需要手动提交到 Flathub
   - 参考工作流输出的说明进行操作

### 2. Winget 发布流程

1. **确保 desktop 版本已发布**：
   ```bash
   npm run tag:desktop  # 如果还没有发布 desktop 版本
   ```

2. **创建 winget 标签**：
   ```bash
   npm run tag:winget
   ```

3. **自动发布**：
   - GitHub Actions 会自动检测 `winget-v*` 标签
   - 运行 `.github/workflows/winget-publish.yml` 工作流
   - 自动下载 MSI 文件并提交到 Microsoft winget-pkgs 仓库

## 标签命名规则

- **Desktop**: `desktop-v{version}` (例如: `desktop-v0.1.53`)
- **Snap**: `snap-v{version}` (例如: `snap-v0.1.53`)
- **AUR**: `aur-v{version}` (例如: `aur-v0.1.53`)
- **AUR Binary**: `aur-bin-v{version}` (例如: `aur-bin-v0.1.53`)
- **Flatpak**: `flatpak-v{version}` (例如: `flatpak-v0.1.53`)
- **Winget**: `winget-v{version}` (例如: `winget-v0.1.53`)

## 注意事项

### Flatpak
- 需要先有对应的 GitHub Release
- 如果没有 Release，工作流会失败并提示创建
- 构建成功后需要手动提交到 Flathub

### Winget
- 需要先发布 desktop 版本（MSI 文件）
- 工作流会自动下载 MSI 并计算 SHA256
- 自动提交到 Microsoft winget-pkgs 仓库

## 完整发布流程示例

如果要发布新版本到所有平台：

```bash
# 1. 更新版本号
npm run version:bump

# 2. 提交更改
git add .
git commit -m "chore: bump version to 0.1.54"
git push

# 3. 发布所有平台
npm run tag:all
```

或者分步发布：

```bash
# 1. 先发布 desktop 版本
npm run tag:desktop

# 2. 等待 desktop 构建完成后，发布其他平台
npm run tag:snap
npm run tag:aur
npm run tag:aur-bin
npm run tag:flatpak
npm run tag:winget
```

## 工作流文件

- **Flatpak**: `.github/workflows/flatpak-publish.yml`
- **Winget**: `.github/workflows/winget-publish.yml`
- **标签创建脚本**: `scripts/create-tag.sh`

## 故障排除

### Flatpak 构建失败
- 检查是否有对应的 GitHub Release
- 确保 `flatpak/com.lotus.Grain.yml` 文件正确

### Winget 发布失败
- 检查 MSI 文件是否存在于 GitHub Release 中
- 确保有 `WINGET_GITHUB_TOKEN` 权限
- 检查 winget 清单文件格式

### 标签已存在错误
如果标签已存在，需要先删除：
```bash
git tag -d flatpak-v0.1.53
git push origin :refs/tags/flatpak-v0.1.53
```

然后重新创建标签。