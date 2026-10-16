# MSIX 打包与信任边界

当前路径：Tauri 直接生成 `grain.exe` → `scripts/build-msix.ps1` → MakeAppx → 临时测试签名 → 实际安装验证。**不再捕获 MSI、不使用 cargo-packager、不依赖 MSIX Packaging Tool。**

成功生成 `.msix` 只证明打包工具接受输入，不能证明应用能启动、文件保存可用、WACK 通过或商店已发布。

## 输入与包内容

从仓库根目录构建 JavaScript 依赖，再在 `apps/desktop` 执行：

```powershell
bun run tauri build --no-bundle
```

在仓库根目录执行：

```powershell
./scripts/build-msix.ps1 -ReadinessOnly
```

默认输入为 `apps/desktop/src-tauri/target/release/grain.exe`。脚本读取真实 `tauri.conf.json` 版本，核验 PE machine 是 x64，直接放入：

```text
grain.exe
Assets/Square44x44Logo.png
Assets/Square150x150Logo.png
Assets/StoreLogo.png
AppxManifest.xml
```

前端嵌入 Tauri 可执行文件。不要先运行 NSIS/WiX 或从 MSI 解包再重建 MSIX；那些安装器不是本路径的运行时依赖。

## 身份与版本

Windows CI 使用独立测试身份 `Grain.WindowsReadiness`，Publisher 为 `CN=Grain Windows Readiness`，元数据 `purpose` 为 `readiness-only`，包名带 `_readiness`。它能真实安装运行，但不是 Store 分配的身份，不能提交商店。

正式商店模式不带 `-ReadinessOnly`，必须从新 Org 产品的 Partner Center「产品标识」取得并提供：

- `GRAIN_STORE_PRODUCT_ID`
- `GRAIN_STORE_IDENTITY`（Package/Identity/Name）
- `GRAIN_STORE_PUBLISHER`（Package/Identity/Publisher）

可通过同名脚本参数 `-StoreProductId`、`-StoreIdentity`、`-StorePublisher` 传入；Release job 使用同名 Actions repository variables。正式包元数据为 `store-candidate`，仍须安装验证和商店审核。

维护者已选择保留历史产品 `9NV7M2PW25B3`；脚本拒绝使用该 Product ID 或 `Jeason.5842835EA9EE6` 包身份。没有新身份时失败，不伪造 Store 标识，也不退回旧产品。

所有包都明确使用 `ProcessorArchitecture=x64`、Application Id `Grain` 和 `Windows.FullTrustApplication`。

三段桌面版本追加 `.0`，例如 `0.1.606` → `0.1.606.0`。各分量必须在 MSIX 允许范围内，不能硬编码成旧版本。Manifest 明确声明 `ProcessorArchitecture="x64"`，不能把 x64 EXE 标成 neutral。

Manifest 当前最低系统为 Windows 10 build 17763。一次 `windows-latest` 成功不代表已在所有最低版本、ARM64 仿真环境或文件系统上验证。当前没有原生 ARM64 MSIX。

`runFullTrust` 是桌面桥接能力，不是 UWP 沙箱保证。独立新产品必须使用自己由 Partner Center 分配的身份。

Manifest 的 UI 资源语言为 `en-US`，与当前主要英文界面一致；支持中文 Org 正文并不表示已有完整中文 UI。本地 EFS 加密对象不作为受支持的 workspace 内容，避免替换保存或派生副本丢失原有加密；Windows readiness 会在隔离 NTFS 环境实际核对此拒绝边界。

## WebView2 前置条件

此包**没有内置 WebView2 Runtime，也没有部署运行时的 MSI/NSIS 引导程序**。需要预先安装 [Microsoft Edge WebView2 Evergreen Runtime](https://developer.microsoft.com/microsoft-edge/webview2/consumer/)，不是只安装 Edge 浏览器。

Windows 安装 smoke 检查本机运行时，缺少时下载官方引导程序、验证 Microsoft Authenticode 签名后单独安装。报告会记录实际检测结果。这证明该测试环境具备运行时，不能宣传为 MSIX 能自动配置干净 Windows 10。

Microsoft Store 产品说明和系统要求必须公开此依赖；不得添加 Store 不处理的 AppInstaller 外部依赖并声称问题已解决。参见 [WebView2 分发文档](https://learn.microsoft.com/microsoft-edge/webview2/concepts/distribution)。

## 测试签名

构建脚本创建有效期 7 天、带代码签名用途的不可导出临时私钥，证书 Subject 必须匹配包 Publisher。SignTool 使用该证书签名，脚本在 `finally` 删除私钥。

公开产物包括 `.msix`、`test-signing.cer`、`AppxManifest.xml`、`package-info.json` 和工具日志。`.cer` 仅含公钥，不是可再次签名的 PFX。`package-info.json` 记录包与 EXE 的 SHA-256、版本、身份、架构及运行时依赖。

`scripts/test-windows-msix.ps1` 仅用于**可销毁的交互式管理员 Windows 环境**：

1. 拒绝覆盖已有的同身份 Store 安装，拒绝占用的 CDP 端口。
2. 只将本次代码签名叶证书加入 `LocalMachine\TrustedPeople`，不加入根证书库；用 SignTool 验证实际包。
3. `Add-AppxPackage` 安装后通过 AppsFolder 激活，核对真实进程、安装位置、包身份、版本、架构和窗口。
4. 对该应用临时配置 WebView2 loopback 调试，执行真实原生文件边界及可见编辑器保存/重启验证，保留截图与磁盘证据。
5. 检查 WACK 是否存在；若执行则要求实际成功退出和可识别的通过报告，缺失不能记成通过。
6. 停止本次应用、卸载本次包、移除本次证书、还原注册表覆盖。清理失败会使验证失败。

不要在个人工作环境运行此脚本，也不要将此临时证书提供给普通用户以绕过安装信任。测试笔记与保留原件留在一次性 runner 的 Documents 目录，最终随 runner 销毁。

## 正式分发

微软接受符合要求的未签名或自签名 MSIX 候选，在商店认证后重新签名；这条路径不要求先购买商业证书。临时 CI 签名不提供 Store 信任或长期旁加载信誉，GitHub 上的测试 MSIX 不是普通用户的一键旁加载包。

脱离商店的正式旁加载需要维护者另行提供受用户设备信任、匹配 Publisher 的签名策略，不在当前临时 CI 证书流程内。不能指导用户关闭系统安全功能、忽略安全软件告警或信任任意根 CA。

- [实际自动化与产物](./msix-automation-guide.md)
- [一次性 Windows 快速验证](./msix-quick-start.md)
- [商店提交及旧数据切换门禁](./microsoft-store-guide.md)
- [微软 MSIX 包签名说明](https://learn.microsoft.com/windows/msix/package/signing-package-overview)
- [测试证书与 TrustedPeople](https://learn.microsoft.com/windows/msix/package/create-certificate-package-signing)
