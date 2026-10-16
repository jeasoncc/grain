# Microsoft Store 发布指南

GitHub Release 与 Microsoft Store 是两条独立发布流程。推送 `desktop-v*` 标签只构建和发布 GitHub 安装包；本仓库没有自动向 Partner Center 提交的工作流。

**不要提交 0.1.605：该版本没有可用的 Windows Org 写入实现。** Windows 修复候选版本为 0.1.606；候选版本号、成功打包或 GitHub Release 均不能代替实际 Windows 验证和商店审核。

## 独立 Org 产品，不更新旧应用

维护者已选择保留旧条目。2026-10-16 已在 Partner Center 实际创建独立的 **Grain Org** 产品，取得以下公开身份；不要重新创建产品或沿用旧包身份。

| 新产品字段 | Partner Center 分配值 |
| --- | --- |
| 名称 | Grain Org |
| Store / Product ID | `9PF3WZLSWZHX` |
| Package/Identity/Name | `Jeason.GrainOrg` |
| Package/Identity/Publisher | `CN=056C6E40-362E-4DC2-A03D-B19B795AA254` |
| Package/Properties/PublisherDisplayName | `Jeason` |
| Package Family Name | `Jeason.GrainOrg_b8ehwrfyfrjng` |

[新产品 Partner Center](https://partner.microsoft.com/en-us/dashboard/products/9PF3WZLSWZHX/overview)。这些标识不是账号凭据，也不表示产品已经发布。

下表仅用于识别**不得覆盖的历史产品**：

| 字段 | 值 |
| --- | --- |
| Product ID | `9NV7M2PW25B3` |
| 已有名称 | Wheat Editor / 小麦写作 |
| 发布者 | Jeason |
| Package/Identity/Name | `Jeason.5842835EA9EE6` |
| Package/Identity/Publisher | `CN=056C6E40-362E-4DC2-A03D-B19B795AA254` |
| Package Family Name | `Jeason.5842835EA9EE6_b8ehwrfyfrjng` |

- [现有商店页面](https://apps.microsoft.com/detail/9NV7M2PW25B3)
- [Microsoft 产品目录记录](https://displaycatalog.mp.microsoft.com/v7.0/products/9NV7M2PW25B3?market=US&languages=en-US)
- [Partner Center](https://partner.microsoft.com/dashboard)

`9N5LW3JBCXKF` 是 MSIX Packaging Tool，不是本应用。`scripts/build-msix.ps1` 已固定为上述实际分配的新身份，Windows readiness 与 Release 使用同一打包入口；无需另行配置 GitHub repository variables，不接受切换旧产品的身份参数。

历史 Windows readiness runs 曾生成 `Grain.WindowsReadiness` / `_readiness.msix` 测试包；这些旧产物**绝不能提交到 Store**。当前输出为 `grain_<版本>_x64.msix`，元数据 `purpose=store-candidate`，仍须通过安装验证和商店审核。

## 旧数据边界

当前应用直接编辑 `.org` 文件；旧富文本正文编辑器已移除。历史 IndexedDB 或 `grain.db` **不会自动转换为 Org 文件**，Windows 历史数据库恢复/迁移也没有成为本次普通文件支持的一部分。保留旧数据不等于能在新界面中打开旧作品。

因此保留 `9NV7M2PW25B3`，不以 Org 版自动更新它。Org 新产品也不宣传自动迁移；导入旧作品前必须备份并使用旧版导出，不用新版清理历史数据库。需要恢复 SQLite 时只操作明确授权的隔离副本。

## 提交前门禁

1. 在真正的 Windows 上运行 [Windows Native Readiness](https://github.com/jeasoncc/grain/actions/workflows/windows-readiness.yml)。检查全部原生文件、导出、时区与 workspace 权限测试，不接受零测试或失败后继续发布。
2. 下载同一 run 的 `windows-readiness-*` 和 `windows-msix-*` 产物，核对真实新产品身份、版本、SHA-256、安装结果、WebView2 运行时、窗口截图、保存/重启后的磁盘字节，以及清理结果。必须验证准备上传的同一个 `store-candidate` 包。
3. 如需同时创建 GitHub Release，只能在 Windows 门禁通过后创建 `desktop-v0.1.606` 标签。检查 Release Desktop App 的全部构建；其 MSIX job 仍对**将上传到 Release 的同一个包**执行安装 smoke，失败时不上传该 MSIX。单独向 Store 提交已验证的 readiness 候选不要求先创建 GitHub Release。
4. 使用 Windows App Certification Kit（WACK）在适用的 Windows 认证环境检查正式候选包。工具缺失、未识别报告或只成功构建都不等于通过。托管 runner 的检查不是 Microsoft Store 认证。
5. 更新准确的中英文 Org 新产品说明和真实新版截图，完成隐私、年龄分级、市场、定价与受限权限说明。

原生安全门禁包括无覆盖创建、过期 revision 拒绝、实际文件身份、目录/文件替换与 reparse 拒绝、写入竞争、ACL 保留及保留原件后的恢复核对。进程中断检查不证明断电恢复顺序或 POSIX 目录 fsync 等价性。

## 运行时与权限说明

- 当前包仅包含 x64 原生程序及图标；不经 MSI/NSIS 捕获，也不捆绑 WebView2。
- **需要 Microsoft Edge WebView2 Evergreen Runtime。** Windows 11 通常已有；不能假设每台 Windows 10 都已有。安装 smoke 会检查运行时，缺少时使用经过 Microsoft 签名验证的官方引导程序单独安装，并记录结果。这不证明 MSIX 自己能在干净机器上部署运行时。
- 包声明 `runFullTrust`，属于 Win32 桌面应用，不是 UWP 安全沙箱。用途：通过原生文件选择器取得用户明确授权的本地目录，使用 Windows 文件句柄完成 Org 文件读写和外部应用打开操作。
- 不申请 `broadFileSystemAccess`，不需要账号来编辑本地 Org 文件。不要把“本地正文”扩大宣传为“整个应用绝不访问网络”：用户配置的外部图表服务、打开的网页、更新和运行时分发均可能联网。
- Windows 原生文件监听、GNU 专用功能和历史数据库迁移有独立限制，见[桌面端指南](../apps/desktop/README.md)。

## 签名与包来源

`scripts/build-msix.ps1` 使用 Windows SDK MakeAppx/SignTool，生成短期、自签名、不可导出的测试私钥，并在完成后删除私钥证书。公开产物只含 `.cer`，不含 PFX 或密码。

此签名用于临时 Windows 验证，不是正式分发信誉。MSIX 可以按微软要求提交为未签名或自签名候选；Microsoft Store 审核通过后重新签名。**上传 MSIX 不要求先购买商业 Authenticode 证书。** EXE/MSI 商店路径的规则不同，不要混用。

绝不能要求普通用户安装临时 CI 证书或信任新的根 CA。实际安装与签名边界见 [MSIX 打包指南](./msix-packaging-guide.md)。

## Partner Center 操作

1. 使用有创建产品权限的开发者账号登录；密码和 MFA 只在微软登录页输入，不写进仓库、命令或聊天。
2. 打开已创建的独立 `Grain Org`（`9PF3WZLSWZHX`），不要进入旧条目创建 Org 更新，也不要重复保留另一个产品名。
3. 对照新产品「产品标识」、本页身份表和打包脚本；不要把显示名称当成 Package Identity。
4. 构建并验证正式身份候选后，在新产品的提交草稿上传 `.msix`；核对门户解析到的版本、身份和 x64 架构。用[产品资料](./marketing/windows-store-optimization.md)填写当前 Org 功能，避免旧 Lexical、Dexie、人物/世界观等过期描述。
5. 隐私政策填写可公开读取的 <https://github.com/jeasoncc/grain#privacy-policy>，不是 MIT LICENSE。支持链接使用 <https://github.com/jeasoncc/grain/issues>。
6. 据实完成年龄分级、隐私声明、受限权限、运行时要求、支持架构和旧格式说明；不猜测法律/隐私问卷答案。门户要求接受新版 Microsoft Application Developer Agreement 时，由维护者阅读并接受账户级协议，不能以应用发布请求代替这项法律决定。
7. 检查所有验证错误后提交审核，记录实际 submission ID、提交时间与状态；只有门户显示发布完成且商店可安装对应版本，才能报告“已上架”。不承诺固定审核时间。

API 自动化需要 Microsoft Entra 租户、关联 Partner Center 的应用及相应角色/凭据；GitHub 仓库写入权限不是商店权限。没有这些权限时，保留已验证包和资料，明确报告未提交，不能假造审核状态。

## 官方参考

- [创建 MSIX 提交](https://learn.microsoft.com/windows/apps/publish/publish-your-app/msix/create-app-submission)
- [应用包要求](https://learn.microsoft.com/windows/apps/publish/publish-your-app/msix/app-package-requirements)
- [MSIX 签名概述](https://learn.microsoft.com/windows/msix/package/signing-package-overview)
- [WebView2 分发要求](https://learn.microsoft.com/microsoft-edge/webview2/concepts/distribution)
- [Windows App Certification Kit](https://learn.microsoft.com/windows/uwp/debug-test-perf/windows-app-certification-kit)
