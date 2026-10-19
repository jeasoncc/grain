# Org Notes Snap 故障排查

本页只针对独立 Snap `org-notes`，不用于旧版应用的构建或数据迁移。完整身份、发布与验收契约见[Org Notes Snap 独立版](publishing-platforms-guide.md#org-notes-snap-独立版)，实现以[发布工作流](../.github/workflows/snap-publish.yml)、[Snap 配方](../snap/snapcraft.yaml)和[构建脚本](../snap/local/build.sh)为准。

## 1. 先确认应用、架构与频道

```bash
snap version
snap info org-notes
snap list org-notes
snap connections org-notes
snap debug confinement
```

- 正确显示名称为 **Org Notes**，Snap 名称为 `org-notes`，发布者为 Jeasonchen（`jeasoncc`），Snap ID 为 `Bjbd2JnV9QgH8kKAPg2QT0WxvESdCXTu`。当前配方版本为 `0.1.607`，仅构建 `amd64`，使用 `core24` 和 `strict`；不承诺 ARM 包可用。
- `snap info` 用于查看 Store 频道记录，`snap list` 用于核对本机实际版本、revision、跟踪频道与安装状态；两者不是同一个结果。未安装时 `snap list org-notes` 报告未找到，不代表可以换用同名旧应用。
- 本次只获准发布 **edge**，没有获准发布 stable。`snap-v*.*.*` 标签请求 edge；手动工作流虽然有频道选择器，也不构成发布 stable 的授权。配方中的 `grade: stable` 不是 stable 频道已开放的证明。
- 先到[Org Notes 商店页](https://snapcraft.io/org-notes)核对实际频道、版本与上述身份。注册成功、上传命令完成、构建附件或 Actions 绿灯都不能单独证明已公开。尚未公开时，不要把“找不到包 / 频道”当作本机权限错误，也不要默认改装 stable 或旧包。
- `core24` 是 Snap 基础运行环境，不是让用户手动安装旧版 Ubuntu 容器的指令。主机仍需正常运行 snapd 并支持 strict confinement；本项目原生验收环境为 Ubuntu 24.04 amd64。

`org-notes` 不覆盖 `novel-editor-app`、`xiaomiquan`，也不接管已有 `grain` 名称。不要卸载、改名或清理这些旧应用来排查新 Snap；旧作品不会自动升级或导入，需先在旧应用中导出并独立备份。

## 2. 图标不对、启动失败或窗口不是 Org Notes

在自己的图形桌面会话中从终端启动，保留实际错误：

```bash
snap run org-notes
```

不要用 `sudo` 启动图形应用，也不要直接执行 `/snap/.../bin/grain` 来绕过 Snap 启动器。SSH、无桌面容器或仅有浏览器预览的结果，不能替代真实 GTK/WebKit 窗口验收。

预期桌面启动项、窗口标题均为 **Org Notes**，Snap 专用 Tauri ID 为 `com.lotus.orgnotes`。包内可执行文件仍叫 `bin/grain`，这个内部文件名不表示启动了旧应用。桌面定义见 [`org-notes.desktop`](../snap/gui/org-notes.desktop)，图标源为 [`org-notes.png`](../snap/gui/org-notes.png)，包内图标为 `/snap/org-notes/current/meta/gui/org-notes.png`。

若菜单图标或名称仍是旧应用，先用上述命令区分本 Snap 与旧快捷方式；记录实际启动项和截图，不要修改旧应用的启动器。若窗口未出现，记录桌面会话类型、snapd 版本、已安装 revision、终端错误与接口连接状态。不要以“进程存在”代替可见窗口、可编辑内容和真实文件保存的检查。

## 3. 工作区无法选择、文件不可写或外部工具不可用

- 用应用的真实原生目录选择器选择**已存在**的工作区。优先把外部 Org 文件放在自己的普通、非隐藏文档目录，例如 `~/Documents/Org Notes`；目录含空格本身不应被当作错误。
- `home` 接口不等于任意路径访问权：隐藏目录、其他用户的目录、系统目录以及指向受限位置的链接都不能视为已授权。先在文件管理器确认当前用户本来就能读写目标目录，再查看 `snap connections org-notes`；不要用全局放宽文件权限解决沙箱边界。
- 可移动磁盘访问是可选权限。确实需要且接受该权限范围时，显式连接：

  ```bash
  sudo snap connect org-notes:removable-media
  ```

  该连接不能绕过磁盘本身的 Unix 权限，也不授予所有系统目录访问权。
- 目录选择器依赖正常的桌面会话和 portal。记录选择器是否实际出现、所选物理目录及失败日志；不要关闭 portal、AppArmor 或 seccomp，也不要改用 devmode/classic 来“修复”。
- `~/snap/org-notes/` 下的 Snap 私有数据与用户选择的外部 `.org` 文件不同。不要为重置界面删除日常用户数据或清空工作区；重要文件应另行备份，不能依赖卸载、恢复文件或缓存替代备份。
- 高级外部执行工具未随包提供；宿主机装有某个命令，也不保证 strict Snap 能调用它。不要把这类能力当作已支持功能，或通过扩大沙箱权限强行开放。

## 4. 输入可见但重启后没有内容

先备份，再用一个独立测试 `.org` 文件排查，避免覆盖日常作品：

1. 记下选择的工作区**真实物理路径**与文件名，打开已有文件并确认不是同名的另一份文件。默认工作区入口在界面中显示为 `Open Documents/Grain`；独立 Snap 身份不代表这个默认目录名已经改名。
2. 输入能辨认的 Unicode 文本，例如中文和 `café`，确认它在真实窗口中可见，然后显式按 **Ctrl+S**。不要假定未保存文本会在退出后自动保留。
3. 用文件管理器或另一个文本查看器检查该物理 `.org` 文件：修改是否真正落盘、内容是否完整。需要确认换行时应查看原始字节；截图、OCR 和编辑器界面不能证明 UTF-8 或 CRLF 字节正确。
4. 正常退出应用，确认这次应用的原生进程与 WebKit 子进程已全部结束，再用 `snap run org-notes` 启动。不要结束其他用户或无关应用的进程。
5. 重开同一工作区和文件，核对保存内容与物理文件；记录保存前后和重启后的差异。目录选择、默认工作区恢复与保存是不同检查项，不要把选择过目录等同于重启必定自动恢复该目录。

若只出现未保存内容丢失，不要承诺恢复一定成功；保留现有文件和可能的恢复材料，先独立备份再报告问题。

## 5. 原生 smoke 失败：只在可销毁机器上复现

[`scripts/test-linux-snap.mjs`](../scripts/test-linux-snap.mjs) 是有主机变更的发布验收工具，**禁止在日常工作机运行**。仅可在可销毁的 Ubuntu 24.04 amd64 VM/主机上，按[工作流](../.github/workflows/snap-publish.yml)准备依赖、sudo 和真实用户 systemd/桌面会话，并显式设置 `ORG_NOTES_DISPOSABLE_HOST=1`。该变量是风险确认，不会把普通机器自动变成安全测试环境。

脚本拒绝已有 `org-notes` 安装或残留主机状态，不会替用户清理后重试。它安装指定包，创建隔离临时用户与会话，只清理自己拥有的安装和资源，并保留证据。遇到拒绝时应换用干净的可销毁环境，不要删除日常用户状态以满足检查。

诊断时查看实际生成的 `report.json`、`native/native-smoke.json`、包元数据、日志、截图、原始 `.org` 样本和进程/清理记录；失败可能发生在安装、桌面会话、交互、字节核对、重启或清理阶段，不能只看最后一行输出。

若日志显示临时 UID 的 dconf / AT-SPI 仍访问 runner 的 HOME 或其他 UID 的 `/run/user/`，应修正用户管理器和 D-Bus 的激活环境，而不是放宽目录权限。脚本在私有桌面启动后，将隔离用户的 HOME、USER、LOGNAME、PATH、XDG_RUNTIME_DIR 和 DBUS_SESSION_BUS_ADDRESS 一并同步；仅给 smoke 主进程设置 `env -i` 不足以隔离按需激活的服务。

验收必须包括：

- 提供的包、snapd 安装的包与待上传包哈希相同，元数据为 `org-notes` / `amd64` / `core24` / `strict`。
- 真实原生进程标签为 `snap.org-notes.org-notes (enforce)`，`Seccomp: 2`，不能以关闭安全机制通过检查。
- 含空格的已有目录经真实 GTK 选择器选中；可见 Unicode 输入、显式 Ctrl+S 与物理文件字节一致。
- 默认工作区 Unicode/CRLF 样本通过字节检查；所有相关原生/WebKit 进程停止后，同一安装包重启重开成功。

本地 Ubuntu 24.04 amd64 VM 已通过上述原生检查；这不是未来每次构建或公开 Store 频道的保证。GTK 选择器由 [`linux-snap-accessibility.py`](../scripts/linux-snap-accessibility.py) 使用真实 AT-SPI 操作，网页控件通过截图 OCR 定位与实际键鼠输入操作；它不证明网页控件的屏幕阅读器支持。上传必须由工作流在同包验收通过、包哈希未变后执行，不能用另一个包的成功记录替代。

## 6. 屏幕阅读器无法访问网页编辑控件

当前 Snap runtime 的网页编辑控件屏幕阅读器访问有限，这是已披露的限制；普通键盘、鼠标编辑和原生目录选择器可用，不代表网页辅助功能树也已可用。

已在 snapd 2.77.1 / WebKitGTK 2.52.6 观察到 accessibility bus 上 `org.freedesktop.DBus.RequestName` 被 AppArmor 拒绝，网页辅助功能子树未导出。尚无已证实的狭窄应用侧修复。报告时附上实际版本与相关拒绝记录，区分原生选择器和网页编辑控件；不要添加宽泛 DBus 授权、手改 AppArmor 策略、关闭 portal/沙箱，或把 OCR smoke 成功描述为完整无障碍支持。

## 7. 构建失败与安全提交日志

构建和发布诊断应从 [Publish Org Notes Snap 的实际运行记录](https://github.com/jeasoncc/grain/actions/workflows/snap-publish.yml)及对应附件开始。工作流直接构建 Snap 原生二进制，不使用旧 DEB 提取流程；工具链和版本校验以源码为准，不在这里另维护一套安装命令。版本或标签不匹配、下载校验失败、构建失败、原生 smoke 失败、凭据缺失和 Store 上传失败必须分别报告；不要跳过校验或把构建成功当作发布成功。

运行时可按复现时间收集有限日志，例如刚刚复现后的十分钟：

```bash
sudo journalctl -u snapd --since "10 minutes ago" --no-pager
sudo journalctl -k --since "10 minutes ago" --no-pager
```

提交到 [GitHub Issues](https://github.com/jeasoncc/grain/issues)前，先审阅终端、日志、截图和证据文件，去除个人文档内容、用户名/私有路径及任何凭据。提供最小复现、实际版本/revision/频道、架构、接口状态、错误时间与相关日志片段；不要公开整个 home、环境变量转储或未经检查的完整附件。

`SNAPCRAFT_TOKEN` 只应注入工作流上传步骤。不要打印、导出、粘贴 secret 值，也不要把凭据或上传器日志复制到公共 artifacts；排查认证问题时只报告权限范围、失败阶段和脱敏错误。
