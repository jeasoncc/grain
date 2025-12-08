# Microsoft Store 发布指南

## 前置准备

### 1. 注册开发者账号

访问：https://partner.microsoft.com/dashboard

- 个人账号：$19/年
- 公司账号：$99/年

### 2. 创建应用

1. 登录 Partner Center
2. 点击 "新建应用"
3. 保留应用名称：`Novel Editor` 或 `小说编辑器`
4. 选择类型：桌面应用

## 方案 A：使用现有的 MSI/EXE（需要代码签名）

### 问题

Microsoft Store 要求应用必须有代码签名，否则会被拒绝。

### 解决方案

**购买代码签名证书**（$100-300/年）

推荐提供商：
- Sectigo: $199/年
- SSL.com: $159/年
- DigiCert: $474/年

### 签名步骤

```powershell
# 在 Windows 上使用 signtool
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com novel-editor.msi
```

## 方案 B：转换为 MSIX（推荐，微软提供签名）

### 优点

- ✅ 微软自动签名（免费）
- ✅ 自动更新
- ✅ 沙箱安全
- ✅ 符合商店要求

### 步骤

#### 1. 下载 GitHub Actions 构建的文件

1. 访问：https://github.com/jeasoncc/novel-editor/actions
2. 找到最新的 "Release Desktop App" workflow
3. 下载 `tauri-bundles-windows-latest` 产物
4. 解压得到 `.msi` 或 `.exe` 文件

#### 2. 在 Windows 上转换为 MSIX

**方式 1：使用 MSIX Packaging Tool（推荐）**

1. 从 Microsoft Store 安装 MSIX Packaging Tool
2. 打开工具，选择 "Application package"
3. 选择你的 `.msi` 或 `.exe` 文件
4. 填写应用信息：
   - Package name: `NovelEditor`
   - Publisher: `CN=你的名字`
   - Version: `0.1.11.0`
5. 按照向导完成打包
6. 生成 `.msix` 文件

**方式 2：使用命令行工具**

```powershell
# 安装 Windows SDK
# 下载：https://developer.microsoft.com/windows/downloads/windows-sdk/

# 使用 makeappx 打包
makeappx pack /d "C:\path\to\app" /p "novel-editor.msix"
```

#### 3. 上传到 Microsoft Store

1. 登录 Partner Center
2. 进入你的应用
3. 点击 "提交"
4. 上传 `.msix` 文件
5. 填写应用信息：
   - 描述
   - 截图
   - 分类：生产力
   - 年龄分级
6. 提交审核

#### 4. 等待审核

- 通常 1-3 个工作日
- 审核通过后自动发布

## 方案 C：暂时不发布到 Store（推荐）

### 理由

- Microsoft Store 需要投入（时间/金钱）
- 用户基数还小，ROI 不高
- 可以先通过其他渠道获得用户

### 替代方案

1. **GitHub Releases**（已有）
   - 用户直接下载
   - 会有 SmartScreen 警告，但可以跳过

2. **Winget**（推荐，免费）
   - 官方包管理器
   - 无需代码签名
   - 技术用户会用
   - 参考：`docs/winget-publish-guide.md`

3. **Chocolatey**
   - 第三方包管理器
   - 开发者常用

4. **直接下载**
   - 做一个简单的官网
   - 提供清晰的安装说明
   - 解释 SmartScreen 警告

## 推荐的发布顺序

### 第一阶段（现在）

1. ✅ GitHub Releases - 已完成
2. ✅ AUR - 已完成
3. ✅ Snap Store - 进行中
4. 📦 Winget - 下一步

### 第二阶段（用户 > 1000）

5. 💰 购买代码签名证书
6. 🏪 发布到 Microsoft Store

### 第三阶段（用户 > 5000）

7. 🍎 Mac App Store
8. 💰 考虑付费功能

## 当前建议

**不要急于发布到 Microsoft Store**

原因：
- 需要投入 $19-319/年
- 审核流程复杂
- 用户基数还小

**先做这些：**
1. 发布到 Winget（免费，官方）
2. 优化 GitHub Releases 的下载体验
3. 做一个简单的官网
4. 推广获得用户
5. 等用户增长后再考虑 Store

## 参考资源

- [Microsoft Store 开发者文档](https://docs.microsoft.com/windows/uwp/publish/)
- [MSIX 打包指南](https://docs.microsoft.com/windows/msix/)
- [代码签名指南](https://docs.microsoft.com/windows/win32/appxpkg/how-to-sign-a-package-using-signtool)
