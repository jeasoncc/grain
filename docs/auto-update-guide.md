# Grain 自动更新边界

## 当前状态

桌面 tag 发布只提供 GitHub Release 安装包，**不发布 `latest.json`，不承诺应用内自动更新可用**。请从 [GitHub Releases](https://github.com/jeasoncc/grain/releases) 选择相应版本与架构，手动下载安装包。

旧发布流程手写的清单为各平台填入空 `signature`，并把普通安装包 URL 当作更新资产。这不是可验证的签名更新发布，已从桌面工作流移除；不要通过跳过验签、使用空签名或复用其他平台文件来绕过错误。

`apps/desktop/src-tauri/tauri.conf.json` 仍包含 updater 公钥和清单地址。保留客户端配置不代表相应服务端资产已经发布；新 Release 没有清单时，应用内检查不能替代手动下载。

## 启用签名更新所需的完整契约

签名自动更新需要单独实现并验证以下链路，而非只增加一个 JSON 文件：

- 每个支持平台及架构都有匹配的 Tauri updater 资产和真实签名。
- 构建使用与客户端公钥匹配的私钥；私钥只保存在受保护的构建凭据中，不进入源码或 Release。
- 清单中的版本、平台键、资产 URL 与签名对应到同一份实际上传的字节。
- Windows、macOS 和 Linux 的更新资产按当前 Tauri updater 协议生成，不能假定所有普通安装包都能互换。
- 从已安装的旧版本实际完成检查、下载、验签、安装和重启，并确认用户配置与 Org 文件保持完整。

只有这些条件得到实际验证后，才能将发布标记为支持自动更新。GitHub 安装包打包成功不证明这条链路成立。

## 参考

- [当前发布工作流](automated-release-workflow.md)
- [Tauri Updater 文档](https://v2.tauri.app/plugin/updater/)
