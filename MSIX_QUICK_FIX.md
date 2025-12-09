# 🚀 MSIX 名称问题快速修复

## ❌ 问题

Microsoft Store 拒绝你的 MSIX 包，提示：
> "包装/身份/名称 不符合"

## ✅ 解决方案（3 步）

### 1️⃣ 获取正确信息

登录 [Partner Center](https://partner.microsoft.com/dashboard)，找到：

- **Product identity** → **Package/Identity/Name**
  - 例如：`12345YourCompany.NovelEditor`
- **Product identity** → **Package/Identity/Publisher**  
  - 例如：`CN=12345678-1234-1234-1234-123456789ABC`

### 2️⃣ 配置 GitHub Secrets

进入仓库 **Settings** → **Secrets and variables** → **Actions**

添加 3 个 secrets：

| Secret 名称 | 值（从 Partner Center 复制） |
|------------|---------------------------|
| `MSIX_IDENTITY_NAME` | 你的应用名称 |
| `MSIX_PUBLISHER` | 你的 Publisher ID |
| `MSIX_PUBLISHER_DISPLAY_NAME` | 你的公司名称 |

### 3️⃣ 重新构建

```bash
git tag desktop-v0.1.7
git push origin desktop-v0.1.7
```

等待构建完成，下载 MSIX，上传到 Microsoft Store。

## 📝 示例

假设你从 Partner Center 获取到：
- Name: `12345Lotus.NovelEditor`
- Publisher: `CN=ABCD1234-5678-90AB-CDEF-1234567890AB`
- Display Name: `Lotus Studio`

那么配置：
- `MSIX_IDENTITY_NAME` = `12345Lotus.NovelEditor`
- `MSIX_PUBLISHER` = `CN=ABCD1234-5678-90AB-CDEF-1234567890AB`
- `MSIX_PUBLISHER_DISPLAY_NAME` = `Lotus Studio`

## ⚠️ 重要提示

- ✅ 必须使用 Partner Center 提供的**准确信息**
- ❌ 不能自定义或猜测这些值
- ✅ Publisher ID 是一个 GUID 格式的字符串
- ❌ 不是简单的 `CN=Lotus` 或 `CN=YourName`

## 🔍 如何验证

构建完成后，在 GitHub Actions 日志中查找：

```
📝 Package Identity:
   Name: 12345Lotus.NovelEditor
   Publisher: CN=ABCD1234-5678-90AB-CDEF-1234567890AB
   ...
```

如果看到 `⚠ 使用默认值`，说明 Secrets 未正确配置。

## 📚 详细文档

查看 [MICROSOFT_STORE_NAME_FIX.md](./MICROSOFT_STORE_NAME_FIX.md) 了解更多细节。
