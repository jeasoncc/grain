# Microsoft Store 发布指南

GitHub Release 与 Microsoft Store 是两条独立发布流程。推送 `desktop-v*` 标签只构建和发布 GitHub 安装包；本仓库没有自动向 Partner Center 提交的工作流。

**不要提交 0.1.605：该版本没有可用的 Windows Org 写入实现。** Windows 修复候选版本为 0.1.606；候选版本号、成功打包或 GitHub Release 均不能代替实际 Windows 验证和商店审核。

## 已存在的产品身份

以下身份来自现有 Microsoft Store 产品目录，必须与目标应用的 Partner Center「产品标识」再次核对：

| 字段 | 值 |
| --- | --- |
| Product ID | `9NV7M2PW25B3` |
| 已有名称 | Wheat Editor / 小麦写作 |
| 发布者 | Jeason |
| Package/Identity/Name | `Jeason.5842835EA9EE6` |
| Package/Identity/Publisher | `CN=056C6E40-362E-4DC2-A03D-B19B795AA254` |
| Package Family Name | `Jeason.5842835EA9EE6_b8ehwrfyfrjng` |
| 当前 MSIX 构建架构 | `x64` |

- [现有商店页面](https://apps.microsoft.com/detail/9NV7M2PW25B3)
- [Microsoft 产品目录记录](https://displaycatalog.mp.microsoft.com/v7.0/products/9NV7M2PW25B3?market=US&languages=en-US)
- [Partner Center](https://partner.microsoft.com/dashboard)

`9N5LW3JBCXKF` 是 MSIX Packaging Tool，不是本应用。不要把包名或 Publisher 改成项目名称、GitHub 用户名或任意证书主题。

## 先决定旧用户的数据兼容性

当前应用直接编辑 `.org` 文件；旧富文本正文编辑器已移除。历史 IndexedDB 或 `grain.db` **不会自动转换为 Org 文件**，Windows 历史数据库恢复/迁移也没有成为本次普通文件支持的一部分。保留旧数据不等于能在新界面中打开旧作品。

更新既有条目前必须由维护者明确决定：

- 保留旧条目，为 Org 版建立独立产品；取得新产品身份后再更新 MSIX 身份和相关文档。
- 接受既有产品的格式切换，并明确告知旧用户先备份、使用旧版导出作品，再升级。不能宣传为无缝迁移，也不能用新版清理历史数据库。

商店可自动更新。仅在升级后的发行说明中提到迁移限制，不能保证用户在更新前看见提示。没有作出兼容性决定时，不提交既有产品更新。

## 提交前门禁

1. 在真正的 Windows 上运行 [Windows Native Readiness](https://github.com/jeasoncc/grain/actions/workflows/windows-readiness.yml)。检查全部原生文件、导出、时区与 workspace 权限测试，不接受零测试或失败后继续发布。
2. 下载同一 run 的 `windows-readiness-*` 和 `windows-msix-*` 产物，检查完整日志、实际包版本/身份/哈希、安装结果、WebView2 运行时、真实窗口截图、保存/重启后的磁盘字节，以及清理结果。
3. Windows 修复通过后才创建 `desktop-v0.1.606` 标签。检查 Release Desktop App 的全部构建；其 MSIX job 还会对**将上传到 Release 的同一个包**运行安装和应用 smoke。失败时不上传该 MSIX 到 Release。
4. 使用 Windows App Certification Kit（WACK）在适用的 Windows 认证环境检查正式候选包。工具缺失、未识别报告或只成功构建都不等于通过。托管 runner 的检查不是 Microsoft Store 认证。
5. 明确旧数据兼容性决定、更新准确的中英文产品说明和真实新版截图，完成隐私、年龄分级、市场、定价与受限权限说明。

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

1. 使用有该产品权限的开发者账号登录；密码和 MFA 只在微软登录页输入，不写进仓库、命令或聊天。
2. 核对目标产品身份和已有提交，避免同时通过网页和 API 修改同一草稿。
3. 创建新提交，上传通过上述门禁的正式候选 `.msix`；核对 Partner Center 解析到的版本、身份和 x64 架构。
4. 用[产品资料草稿](./marketing/windows-store-optimization.md)替换旧的 Lexical、Dexie、人物/世界观等不符合当前 Org 版的说明。名称变更必须使用账号已保留的应用名称。
5. 隐私政策填写可公开读取的 <https://github.com/jeasoncc/grain#privacy-policy>，不是 MIT LICENSE。支持链接使用 <https://github.com/jeasoncc/grain/issues>。
6. 据实完成年龄分级、隐私声明、受限权限、运行时要求、支持架构和旧格式说明；不代替维护者猜测法律/隐私问卷答案。
7. 检查所有验证错误后提交审核，记录实际 submission ID、提交时间与状态；只有门户显示发布完成且商店可安装对应版本，才能报告“已上架”。不承诺固定审核时间。

API 自动化需要 Microsoft Entra 租户、关联 Partner Center 的应用及相应角色/凭据；GitHub 仓库写入权限不是商店权限。没有这些权限时，保留已验证包和资料，明确报告未提交，不能假造审核状态。

## 官方参考

- [创建 MSIX 提交](https://learn.microsoft.com/windows/apps/publish/publish-your-app/msix/create-app-submission)
- [应用包要求](https://learn.microsoft.com/windows/apps/publish/publish-your-app/msix/app-package-requirements)
- [MSIX 签名概述](https://learn.microsoft.com/windows/msix/package/signing-package-overview)
- [WebView2 分发要求](https://learn.microsoft.com/microsoft-edge/webview2/concepts/distribution)
- [Windows App Certification Kit](https://learn.microsoft.com/windows/uwp/debug-test-perf/windows-app-certification-kit)
