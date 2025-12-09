# 🔧 Microsoft Store 名称问题修复指南

## 🔍 问题原因

你的MSIX包被拒绝是因为：

### ❌ 当前配置（错误）
```xml
<Identity Name="Lotus.NovelEditor"
          Publisher="CN=Lotus" />
```

**问题**：这些是自定义的名称，不是Microsoft Partner Center分配的官方标识。

### ✅ 需要的配置（正确）
```xml
<Identity Name="你在Partner Center预留的应用名称"
          Publisher="CN=你的Publisher ID" />
```

**说明**：必须使用Partner Center提供的准确信息，不能自定义。

## 📋 修复步骤

### 步骤 1: 获取正确的Publisher ID

1. 登录 [Partner Center](https://partner.microsoft.com/dashboard)
2. 进入你的应用页面
3. 点击 **"Product identity"** 或 **"产品标识"**
4. 复制以下信息：
   - **Package/Identity/Name**: 例如 `12345YourCompany.NovelEditor`
   - **Package/Identity/Publisher**: 例如 `CN=12345678-1234-1234-1234-123456789ABC`
   - **Publisher display name**: 例如 `Your Company Name`

### 步骤 2: 配置 GitHub Secrets（推荐方式）

1. **进入仓库设置**：
   - 打开你的 GitHub 仓库
   - 点击 **Settings** → **Secrets and variables** → **Actions**

2. **添加以下 Secrets**：
   
   点击 **"New repository secret"** 按钮，添加：

   | Secret Name | 值 | 示例 |
   |------------|-----|------|
   | `MSIX_IDENTITY_NAME` | 从Partner Center复制的应用名称 | `12345YourCompany.NovelEditor` |
   | `MSIX_PUBLISHER` | 从Partner Center复制的Publisher ID | `CN=12345678-1234-1234-1234-123456789ABC` |
   | `MSIX_PUBLISHER_DISPLAY_NAME` | 你的公司/开发者名称 | `Your Company Name` |

3. **保存 Secrets**

### 步骤 3: 重新构建 MSIX

配置完成后，GitHub Actions 会自动使用这些信息构建 MSIX 包。

### 步骤 3: 触发构建

配置好 Secrets 后，有两种方式触发构建：

#### 方法 A: 推送 Tag（推荐）

```bash
# 创建并推送 tag
git tag desktop-v0.1.7
git push origin desktop-v0.1.7
```

#### 方法 B: 手动触发

1. 进入 GitHub 仓库
2. 点击 **Actions** 标签
3. 选择 **"Release Desktop App"** workflow
4. 点击 **"Run workflow"**
5. 选择分支并运行

### 步骤 4: 下载并验证 MSIX

1. 等待 GitHub Actions 构建完成（约 15-20 分钟）
2. 进入 **Actions** 页面，找到你的构建任务
3. 下载 **msix-package** artifact
4. 解压并检查 MSIX 文件

### 步骤 5: 上传到 Microsoft Store

1. 登录 [Partner Center](https://partner.microsoft.com/dashboard)
2. 进入你的应用
3. 创建新的提交
4. 上传 MSIX 文件
5. 填写应用信息
6. 提交审核

## ✅ 验证配置是否正确

构建完成后，你可以在 GitHub Actions 日志中看到：

```
📝 Package Identity:
   Name: 12345YourCompany.NovelEditor
   Publisher: CN=12345678-1234-1234-1234-123456789ABC
   Publisher Display Name: Your Company Name
   Version: 0.1.7.0
```

如果看到警告信息（⚠），说明 Secrets 未配置，使用了默认值。

## 📝 示例

### 正确的Identity配置示例

```xml
<!-- 示例 1: 个人开发者 -->
<Identity Name="12345JohnDoe.NovelEditor"
          Publisher="CN=12345678-1234-1234-1234-123456789ABC"
          Version="0.1.7.0" />

<!-- 示例 2: 公司开发者 -->
<Identity Name="12345LotusStudio.NovelEditor"
          Publisher="CN=ABCDEF12-3456-7890-ABCD-EF1234567890"
          Version="0.1.7.0" />
```

### 完整的AppxManifest.xml示例

```xml
<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
         xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities">
  
  <!-- 使用从Partner Center获取的正确信息 -->
  <Identity Name="12345YourCompany.NovelEditor"
            Publisher="CN=12345678-1234-1234-1234-123456789ABC"
            Version="0.1.7.0" />
  
  <Properties>
    <DisplayName>小说编辑器</DisplayName>
    <PublisherDisplayName>Your Company Name</PublisherDisplayName>
    <Logo>Assets\StoreLogo.png</Logo>
    <Description>专为小说创作者设计的现代化写作工具</Description>
  </Properties>
  
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.22621.0" />
  </Dependencies>
  
  <Resources>
    <Resource Language="zh-CN"/>
    <Resource Language="en-US"/>
  </Resources>
  
  <Applications>
    <Application Id="NovelEditor" 
                 Executable="novel-editor.exe" 
                 EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements DisplayName="小说编辑器"
                          Description="专为小说创作者设计的现代化写作工具，支持大纲管理、角色管理、场景编辑等功能"
                          BackgroundColor="transparent"
                          Square150x150Logo="Assets\Square150x150Logo.png"
                          Square44x44Logo="Assets\Square44x44Logo.png">
        <uap:DefaultTile Wide310x150Logo="Assets\Wide310x150Logo.png" 
                         Square310x310Logo="Assets\LargeTile.png" 
                         Square71x71Logo="Assets\SmallTile.png">
        </uap:DefaultTile>
        <uap:SplashScreen Image="Assets\SplashScreen.png" />
      </uap:VisualElements>
    </Application>
  </Applications>
  
  <Capabilities>
    <rescap:Capability Name="runFullTrust" />
  </Capabilities>
  
</Package>
```

## ⚠️ 常见错误

### 错误 1: 使用自定义的Publisher名称
```xml
<!-- ❌ 错误 -->
<Identity Publisher="CN=Lotus" />
<Identity Publisher="CN=MyCompany" />

<!-- ✅ 正确 - 必须使用Partner Center提供的GUID -->
<Identity Publisher="CN=12345678-1234-1234-1234-123456789ABC" />
```

### 错误 2: 应用名称不匹配
```xml
<!-- ❌ 错误 - 简单名称 -->
<Identity Name="NovelEditor" />

<!-- ✅ 正确 - 必须包含Publisher前缀 -->
<Identity Name="12345YourCompany.NovelEditor" />
```

### 错误 3: 版本号格式错误
```xml
<!-- ❌ 错误 -->
<Identity Version="0.1.7" />

<!-- ✅ 正确 - 必须是4段版本号 -->
<Identity Version="0.1.7.0" />
```

## 🔍 如何在Partner Center找到这些信息

### 方法 1: 通过应用页面

1. 登录 [Partner Center](https://partner.microsoft.com/dashboard)
2. 选择你的应用
3. 左侧菜单 → **Product management** → **Product identity**
4. 复制：
   - **Package/Identity/Name**
   - **Package/Identity/Publisher**

### 方法 2: 通过应用提交页面

1. 创建新的提交
2. 在 **Packages** 页面
3. 点击 **"Show details"** 或 **"显示详细信息"**
4. 查看 **"Reserved name"** 和 **"Publisher ID"**

### 方法 3: 下载现有的MSIX（如果有）

如果你之前成功上传过MSIX：

1. 下载之前的MSIX文件
2. 解压MSIX（改扩展名为.zip）
3. 查看 `AppxManifest.xml`
4. 复制正确的Identity信息

## 📞 需要帮助？

如果你已经获取了正确的信息，告诉我：

1. **Identity Name**: `你的应用名称`
2. **Publisher**: `你的Publisher ID`

我会帮你更新所有相关文件！

## 🚀 下一步

修复后：

1. ✅ 重新构建MSIX
2. ✅ 上传到Partner Center
3. ✅ 验证通过
4. ✅ 提交审核

---

**重要**: 不要猜测或自定义这些值，必须使用Partner Center提供的准确信息！
