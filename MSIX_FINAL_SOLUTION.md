# MSIX 打包最终方案

## 问题回顾

尝试了多种方案来为 Tauri 应用创建 MSIX 包：

### ❌ 方案 1: cargo-packager
- **问题**: cargo-packager 不支持 `msix` 格式
- **可用格式**: all, default, app, dmg, wix, nsis, deb, appimage, pacman
- **结论**: 无法使用

### ❌ 方案 2: msixbundle-rs
- **问题**: 该工具未发布到 crates.io
- **错误**: `could not find 'msixbundle' in registry 'crates-io'`
- **结论**: 无法通过 `cargo install` 安装

### ✅ 方案 3: Windows SDK MakeAppx（最终方案）
- **工具**: Microsoft 官方的 MakeAppx.exe
- **优势**: 
  - GitHub Actions Windows 环境自带
  - 官方支持，稳定可靠
  - 无需额外安装
- **结论**: 成功！

## 实现步骤

### 1. 构建 Tauri 应用
```bash
bun run tauri build
```
生成 `novel-editor.exe`

### 2. 创建 MSIX 包结构
```
msix-package/
├── novel-editor.exe          # 主程序
├── AppxManifest.xml          # 清单文件
└── Assets/                   # 图标资源
    ├── Square44x44Logo.png
    ├── Square150x150Logo.png
    └── StoreLogo.png
```

### 3. 生成 AppxManifest.xml
包含应用元数据：
- Identity: 应用标识和版本
- Properties: 显示名称、发布者
- Dependencies: Windows 版本要求
- Applications: 可执行文件和视觉元素
- Capabilities: 权限（runFullTrust）

### 4. 使用 MakeAppx 打包
```powershell
makeappx pack /d msix-package /p novel-editor_x.x.x_x64.msix /o
```

### 5. 使用 SignTool 签名
```powershell
# 创建自签名证书
New-SelfSignedCertificate -Subject "CN=Lotus" ...

# 签名 MSIX
signtool sign /fd SHA256 /f cert.pfx /p password novel-editor.msix
```

## 当前状态

- ✅ 工作流已更新：`.github/workflows/build-msix.yml`
- ✅ 版本号：**0.1.15**
- ✅ 标签已推送：`desktop-v0.1.15`
- ⏳ 构建进行中：Run ID 20054303299

## 查看构建

```bash
# 使用脚本
./check-msix-build.sh

# 实时监控
gh run watch 20054303299

# 浏览器查看
gh run view 20054303299 --web
```

## 构建成功后

### 下载 MSIX 包
```bash
gh run download 20054303299 -n msix-package
```

或访问：https://github.com/jeasoncc/novel-editor/releases/tag/desktop-v0.1.15

### 上传到 Microsoft Store

1. 登录 [Partner Center](https://partner.microsoft.com/dashboard)
2. 创建新应用提交
3. 上传 `novel-editor_0.1.15_x64.msix`
4. 填写应用信息：
   - 应用名称：Novel Editor
   - 描述：一个现代化的小说编辑器
   - 截图和图标
   - 分类和定价
5. 提交审核（1-3 个工作日）

## 注意事项

### ✅ 关于自签名证书

**当前使用自签名证书，这完全没问题！**

- 自签名证书**仅用于打包过程**
- Microsoft Store **会移除你的签名**
- Store **会用他们的官方证书重新签名**
- 用户下载时**已经是 Microsoft 签名的包**
- **无需购买商业代码签名证书**（除非你要在 Store 之外直接分发）

详见：`docs/msix-commercial-cert-guide.md`

### ⚠️ 版本格式

MSIX 要求版本号为 4 段格式（如 0.1.15.0），我们自动在版本号后添加 `.0`。

### ⚠️ 首次提交

Microsoft Store 首次审核通常需要更长时间（可能 3-5 个工作日）。

## 相关文档

- `docs/microsoft-store-guide.md` - Microsoft Store 发布完整指南
- `docs/msix-packaging-guide.md` - MSIX 打包详细说明
- `.github/workflows/build-msix.yml` - 自动化构建工作流
