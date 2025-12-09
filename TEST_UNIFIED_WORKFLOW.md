# 测试统一工作流

## 当前状态

✅ **已完成**：
- MSIX 构建已集成到 `release-desktop.yml`
- 删除了独立的 `build-msix.yml`
- 版本号已更新到 **0.1.17**
- 代码已推送到 main 分支

## 🧪 测试方法

### 方法 1：创建测试 Tag（推荐）

```bash
# 创建并推送 tag
git tag desktop-v0.1.17
git push origin desktop-v0.1.17
```

这将触发完整的发布流程，构建所有平台的包。

### 方法 2：手动触发工作流

1. 访问：https://github.com/jeasoncc/novel-editor/actions/workflows/release-desktop.yml
2. 点击 "Run workflow"
3. 选择 `main` 分支
4. 点击绿色的 "Run workflow" 按钮

## 📊 预期结果

### Job 1: publish-tauri（并行执行）

应该看到 5 个并行任务：
- ✅ macOS (aarch64-apple-darwin)
- ✅ macOS (x86_64-apple-darwin)
- ✅ Ubuntu 22.04
- ✅ Ubuntu 22.04 ARM
- ✅ Windows (MSI + NSIS)

### Job 2: build-msix（串行执行）

等待 Job 1 完成后：
- ✅ 构建 Windows 可执行文件
- ✅ 创建 MSIX 包
- ✅ 签名 MSIX
- ✅ 上传到 Release

### 最终产物

在 GitHub Release 中应该看到：

**Windows**:
- `novel-editor_0.1.17_x64_zh-CN.msi`
- `novel-editor_0.1.17_x64-setup.exe` (NSIS)
- `novel-editor_0.1.17_x64.msix`

**macOS**:
- `novel-editor_0.1.17_aarch64.dmg`
- `novel-editor_0.1.17_x64.dmg`

**Linux**:
- `novel-editor_0.1.17_amd64.deb`
- `novel-editor_0.1.17_amd64.AppImage`
- `novel-editor_0.1.17_x86_64.rpm`

## 🔍 监控构建

### 实时查看

```bash
# 列出最近的运行
gh run list --workflow=release-desktop.yml --limit 3

# 获取最新运行的 ID
RUN_ID=$(gh run list --workflow=release-desktop.yml --limit 1 --json databaseId --jq '.[0].databaseId')

# 实时监控
gh run watch $RUN_ID
```

### 查看日志

```bash
# 查看运行详情
gh run view $RUN_ID

# 查看失败的日志
gh run view $RUN_ID --log-failed
```

## ✅ 验证清单

构建完成后，验证以下内容：

- [ ] 所有 5 个平台构建成功
- [ ] MSIX job 成功执行
- [ ] GitHub Release 创建成功（草稿状态）
- [ ] Release 中包含所有 8 个安装包
- [ ] Artifacts 可以下载
- [ ] MSIX 文件大小合理（~10-20 MB）
- [ ] 版本号正确（0.1.17）

## 🐛 可能的问题

### 问题 1：MSIX job 失败

**原因**：Windows 主构建失败，导致没有可执行文件

**解决**：
1. 检查 Windows 构建日志
2. 确保 Tauri 构建成功
3. 验证可执行文件路径

### 问题 2：并发冲突

**原因**：多个 tag 同时推送

**解决**：
- 工作流已配置 `concurrency` 控制
- 同一个 ref 不会重复构建

### 问题 3：Release 未创建

**原因**：不是 tag 触发

**解决**：
- 确保推送了 tag（`desktop-v*.*.*`）
- 或者手动触发时选择了正确的分支

## 📝 下一步

构建成功后：

1. **验证 MSIX 包**
   ```bash
   # 下载 MSIX
   gh release download desktop-v0.1.17 --pattern "*.msix"
   
   # 在 Windows 上测试安装
   ```

2. **发布 Release**
   - 访问 Release 页面
   - 编辑草稿
   - 添加更新日志
   - 点击 "Publish release"

3. **上传到 Microsoft Store**
   - 下载 MSIX 包
   - 登录 Partner Center
   - 创建新提交
   - 上传 MSIX
   - 提交审核

## 🎉 成功标志

如果看到以下内容，说明统一工作流成功：

✅ 所有平台构建完成（~22 分钟）
✅ MSIX 包成功创建并签名
✅ Release 包含 8 个安装包
✅ 可以从 Release 页面下载所有文件

## 📚 相关命令

```bash
# 创建并推送 tag
git tag desktop-v0.1.17 && git push origin desktop-v0.1.17

# 查看工作流状态
gh run list --workflow=release-desktop.yml

# 下载所有产物
gh run download <run-id>

# 查看 Release
gh release view desktop-v0.1.17

# 下载 Release 文件
gh release download desktop-v0.1.17
```

## 🔗 链接

- **Actions**: https://github.com/jeasoncc/novel-editor/actions/workflows/release-desktop.yml
- **Releases**: https://github.com/jeasoncc/novel-editor/releases
- **工作流文件**: `.github/workflows/release-desktop.yml`
