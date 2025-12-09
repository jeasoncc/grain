# 使用商业代码签名证书

## 什么时候需要商业证书？

### ❌ 不需要商业证书的情况：
- 只通过 Microsoft Store 分发
- Store 会用他们的证书重新签名
- **自签名证书完全够用**

### ✅ 需要商业证书的情况：
- 直接分发 MSIX（不通过 Store）
- 通过企业内部渠道分发
- 需要显示公司名称而不是"未知发布者"

## 购买代码签名证书

### 推荐的证书颁发机构（CA）

1. **DigiCert**
   - 网址：https://www.digicert.com/
   - 价格：~$474/年
   - 验证时间：1-3 个工作日

2. **Sectigo (原 Comodo)**
   - 网址：https://sectigo.com/
   - 价格：~$200/年
   - 验证时间：1-5 个工作日

3. **GlobalSign**
   - 网址：https://www.globalsign.com/
   - 价格：~$300/年
   - 验证时间：1-3 个工作日

### 证书类型

选择 **"Code Signing Certificate"** 或 **"EV Code Signing Certificate"**

- **标准代码签名**：适合个人开发者
- **EV 代码签名**：需要硬件令牌，更高信任度

## 在 GitHub Actions 中使用商业证书

### 步骤 1：准备证书

将证书导出为 PFX 格式：
```powershell
# 如果证书在 Windows 证书存储中
Export-PfxCertificate -Cert "Cert:\CurrentUser\My\<thumbprint>" `
  -FilePath "certificate.pfx" `
  -Password (ConvertTo-SecureString -String "your-password" -Force -AsPlainText)
```

### 步骤 2：Base64 编码证书

```bash
# Linux/Mac
base64 -i certificate.pfx -o certificate.pfx.base64

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.pfx")) | Out-File certificate.pfx.base64
```

### 步骤 3：添加到 GitHub Secrets

在 GitHub 仓库设置中添加 Secrets：

1. 进入：Settings → Secrets and variables → Actions
2. 添加以下 Secrets：
   - `CERTIFICATE_BASE64`：证书的 Base64 编码内容
   - `CERTIFICATE_PASSWORD`：证书密码

### 步骤 4：更新工作流

修改 `.github/workflows/build-msix.yml`：

```yaml
# 签名 MSIX（使用商业证书）
- name: Sign MSIX with commercial certificate
  if: ${{ secrets.CERTIFICATE_BASE64 != '' }}
  shell: pwsh
  run: |
    Write-Output "使用商业证书签名..."
    
    # 解码证书
    $certBytes = [Convert]::FromBase64String("${{ secrets.CERTIFICATE_BASE64 }}")
    $certPath = "certificate.pfx"
    [IO.File]::WriteAllBytes($certPath, $certBytes)
    
    # 读取版本号
    $config = Get-Content 'apps/desktop/src-tauri/tauri.conf.json' | ConvertFrom-Json
    $version = $config.version
    $msixFile = "novel-editor_${version}_x64.msix"
    
    # 查找 SignTool
    $signTool = Get-ChildItem "C:\Program Files (x86)\Windows Kits\10\bin" -Recurse -Filter "signtool.exe" -ErrorAction SilentlyContinue | 
                Where-Object { $_.FullName -like "*\x64\*" } | 
                Select-Object -First 1 -ExpandProperty FullName
    
    if (-not $signTool) {
      Write-Error "未找到 SignTool"
      exit 1
    }
    
    # 使用商业证书签名
    & $signTool sign /fd SHA256 /f $certPath /p "${{ secrets.CERTIFICATE_PASSWORD }}" /tr http://timestamp.digicert.com /td SHA256 $msixFile
    
    if ($LASTEXITCODE -eq 0) {
      Write-Output "✓ 商业证书签名成功"
    } else {
      Write-Error "✗ 签名失败"
      exit 1
    }
    
    # 删除证书文件
    Remove-Item $certPath

# 签名 MSIX（回退到自签名）
- name: Sign MSIX with self-signed certificate
  if: ${{ secrets.CERTIFICATE_BASE64 == '' }}
  shell: pwsh
  run: |
    Write-Output "使用自签名证书..."
    # ... 现有的自签名代码 ...
```

## 时间戳服务器

使用商业证书时，建议添加时间戳：

```powershell
signtool sign /fd SHA256 /f cert.pfx /p password `
  /tr http://timestamp.digicert.com `
  /td SHA256 `
  file.msix
```

**时间戳服务器列表**：
- DigiCert: `http://timestamp.digicert.com`
- Sectigo: `http://timestamp.sectigo.com`
- GlobalSign: `http://timestamp.globalsign.com`

**作用**：即使证书过期，已签名的文件仍然有效。

## 验证签名

### 查看签名信息
```powershell
Get-AuthenticodeSignature novel-editor.msix | Format-List *
```

### 验证签名
```powershell
signtool verify /pa novel-editor.msix
```

## 成本对比

| 方案 | 成本 | 适用场景 |
|------|------|----------|
| 自签名证书 | 免费 | ✅ Microsoft Store 分发 |
| 标准代码签名 | $200-500/年 | 直接分发、企业分发 |
| EV 代码签名 | $400-800/年 | 需要最高信任度 |

## 推荐方案

### 对于你的情况：

✅ **继续使用自签名证书**

原因：
1. 你主要通过 Microsoft Store 分发
2. Store 会用他们的证书重新签名
3. 节省 $200-500/年 的成本
4. 完全满足需求

### 什么时候考虑商业证书：

- 需要在 Store 之外直接分发 MSIX
- 需要通过企业内部渠道分发
- 需要显示公司名称提升信任度

## 总结

对于 Microsoft Store 发布：
- ✅ **自签名证书完全够用**
- ✅ **Store 会重新签名**
- ✅ **用户看到的是 Microsoft 的签名**
- ✅ **无需购买商业证书**

商业证书仅在直接分发（不通过 Store）时才有价值。
