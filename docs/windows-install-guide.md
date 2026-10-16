# Windows 安装指南

Grain 当前源码以本地 `.org` 文件为正文，不再提供旧富文本正文编辑器。**0.1.605 的 Windows Org 写入不可用，不要用它编辑或当作商店候选。** 请核对目标版本的 Windows 验证结果；安装包存在不代表文件读写已经可用。

## 获取安装包

[GitHub Releases](https://github.com/jeasoncc/grain/releases) 提供实际发布版本的 Windows x64 安装器：

- `.msi`：Windows Installer 安装包。
- `-setup.exe`：NSIS 安装器，**不是便携版**。
- `.msix`：另有严格的包身份与签名要求，见下文。

下载时核对仓库、标签、版本、架构与公布的 SHA-256。不要使用拼写相似的第三方 `grain` 包；本仓库没有可以据此承诺可用的 Winget、Chocolatey 或 Scoop 自动上架入口。

## Microsoft Store 与 MSIX

Org 版已创建**独立新产品 Grain Org**，Store ID `9PF3WZLSWZHX`，不会覆盖旧「小麦写作 / Wheat Editor」`9NV7M2PW25B3`。产品创建不等于发布；只有门户显示正式上线且对应版本可安装，才能作为商店来源。不能用旧链接冒充 Org 版。

当前 Windows CI 为 `Jeason.GrainOrg` 生成 `grain_<版本>_x64.msix`，`package-info.json` 标记 `store-candidate`，仍只代表待验证、待审核的候选。历史 `Grain.WindowsReadiness` / `_readiness.msix` 产物不能提交商店或提供普通用户安装。

临时自签名 CI 包不是 Store 签名包。不要把测试证书加入个人机器的根证书库，也不要按过期教程全局放宽信任。只有可销毁验证环境可以运行仓库的测试安装脚本，见 [MSIX 快速验证](./msix-quick-start.md)。

普通用户应使用实际可用的正式分发来源；脱离商店的长期 MSIX 旁加载需要维护者另行提供合适的受信任签名策略。

## 系统与运行时

- 当前 Windows 构建为 x64；没有原生 ARM64 MSIX。
- MSIX Manifest 最低系统声明为 Windows 10 build 17763。托管 Windows 验证不等于每个最低系统版本都已实测。
- **需要 Microsoft Edge WebView2 Evergreen Runtime**，不是仅安装 Edge 浏览器。
- 当前 MSIX 不包含或安装该运行时。Windows 11 通常已有，Windows 10 不保证；缺少时从[微软官方页面](https://developer.microsoft.com/microsoft-edge/webview2/consumer/)安装 Evergreen。CI 单独配置运行时不能证明 MSIX 能自行完成这一步。

不承诺未经实测的磁盘占用、系统版本或 ARM64 仿真结果。

## 第一次打开 Org 版

1. 点击 **Open Documents/Grain**，创建/打开系统 Documents 下的 `Grain` 文件夹；或用 **Choose another…** 授权本地目录。
2. 从文件树打开 `.org`，或使用 **New Org file** 创建笔记；编辑普通 Org 文本，`Ctrl-S` 保存。
3. 遇到过期磁盘 revision 或受保护路径时先核对外部改动，不反复强制覆盖。
4. Windows 某些安全边界不具备 Linux 等价实现，未知文件系统状态会拒绝操作。使用普通本地目录，不能假设 OneDrive、junction、符号链接或其他 reparse 目录与普通文件夹等价。

Windows 不提供当前实现可保证的 descriptor-bound 原生文件监听；活动笔记通过轮询核对，文件树也可手动刷新。完整文件、恢复及平台限制见[桌面端指南](../apps/desktop/README.md#file-mutation-rules)。

## 作品与旧版本数据

- 已保存正文在用户授权的 workspace 中，默认是 Documents/Grain；不是数据库内的独有正文。
- SQLite 派生索引不等于历史 `grain.db`。历史库可能是旧作品唯一副本，**不能作为缓存删除**。
- 旧 IndexedDB / `grain.db` 不自动导入新 Org 版；Windows 历史库恢复/迁移不属于当前普通 Org 支持。先备份，并使用旧版导出，再导入 Org 工作流。
- `.grain-*.tmp` 可能保留旧正文、阶段文件与事务记录；它们可被外部修改，不是不可变备份，不会自动安全擦除或清理。
- 普通未保存笔记没有通用重启恢复。卸载不等于清除 workspace、导出文件、备份及恢复原件。

## 安全提示、更新与卸载

SmartScreen 或安全软件告警不能仅凭“开源”判为误报。先停止运行，核对官方下载来源、哈希与签名，并按告警内容排查；不要关闭系统防护或盲目加白。

GitHub 安装包需要手动下载适用的新版本；没有有效签名的自动更新清单。Store 安装由实际发布的对应产品更新，不能把 GitHub 发布成功等同于 Store 已更新。

可在 Windows「设置 → 应用」卸载对应安装。先备份作品和需要保留的历史数据库；不要把卸载当作彻底数据擦除。

支持：<https://github.com/jeasoncc/grain/issues>。提交公开问题前删去正文、个人路径、数据库和凭据；隐私政策见 <https://github.com/jeasoncc/grain#privacy-policy>。
