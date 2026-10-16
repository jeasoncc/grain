# 主题系统

## 配置权威

`app_config_dir()/config.json` 是唯一偏好配置来源。设置路由、主题选择器、偏好修改 actions 与 Zustand persist 镜像已删除。`useTheme` 等 hooks 只读取内存投影；组件不能建立另一套持久化偏好。

`src/pipes/configuration/configuration-document.pipe.ts` 先校验完整版本 1 文档，`src/flows/configuration/configuration.flow.ts` 再发布字体、主题、图标和其他投影。重载在 IO 之前撤销声明式配置 generation，完全校验后才重新开放；无效配置保留原视觉状态与 canonical Source/history，不回退到旧浏览器配置。

外部编辑不会自动应用。Open configuration file 交由系统默认应用打开固定路径；Reload configuration 显式重新读取。已有配置文件不回写；首次无文件启动才允许迁移和原子创建。

## 离线终端目录

数据来自 [iTerm2-Color-Schemes](https://github.com/mbadolato/iTerm2-Color-Schemes)，固定 revision `21f281d0834846eef984f75774638e7d16bac068`。`src/types/theme/iterm2/` 保存：

- `catalog.json`：811 个 Windows Terminal JSON 配色对象，保留原字段和值，按来源文件名排序。
- `provenance.json`：上游 revision、归档 SHA-256、来源集合摘要、目录 SHA-256 与生成规则。
- `LICENSE`、`CREDITS.md`：集合许可证、上游署名和个别作者权利说明。

主题加载不联网，不执行上游脚本。变更目录时必须同步固定来源、完整集合、摘要与署名，不添加名称推断或静默别名。

## 语义适配

`src/pipes/theme/terminal-theme.pipe.ts` 保留原始终端色板，并派生 Grain 的界面、编辑器、语法和状态角色。浅/深分类依据背景相对亮度；系统模式的两个名字必须分别通过浅/深校验。

`src/utils/themes.util.ts` 按精确上游名称查找，按需适配并缓存。旧手写主题只保留迁移所需的 key/name/type 元数据，不再分配或应用退役调色板。`getThemeByKey` 与 `getThemeByName` 都使用新目录的精确名称；`getLegacyThemeByKey` 仅供一次迁移。

语义适配校正可读性而不修改 `catalog.json` 或 `Theme.terminalPalette`：文本角色至少 4.5:1，边界与光标角色至少 3:1。危险操作使用 `destructive` / `destructiveForeground`，不能把适合按钮填充的暗红直接当成深色弹层文字。菜单获得焦点后使用成对的 accent 背景/前景。

界面使用 `--background`、`--foreground`、`--popover`、`--border`、`--destructive` 等语义变量；不要在业务组件中硬编码某一主题的颜色。

## 原生生命周期

主路由和 `main.tsx` 的分离 Source 启动分支都挂载 `ConfigurationLifecycle`，统一配置初始化、同步、主题监听、字体样式和错误反馈。可复用的 `DetachedOrgWindow` 视图不负责物理配置 IO。

每个挂载的主题生命周期只拥有一个 `prefers-color-scheme` listener，并在卸载时清理。`appearance.mode: "theme"` 使用指定主题；`"system"` 选择显式 lightTheme/darkTheme。DOM 适配更新语义变量、dark class 和 color-scheme，并清理被替代的过渡工作。

主窗口完成重载后调用 main-only `notify_configuration_reload`。Rust 只向登记且未关闭的 Source webview 分发无载荷 `grain:configuration-reload` DOM 事件；接收方重新读取固定文件，不信任事件传入的配置对象，也不反向广播。

分离窗口只能调用 `read_configuration_file`；创建、外部打开和通知均被原生窗口角色守卫拒绝。它的 Tauri capability 仍为 `permissions: []`，不为配置同步添加 core/plugin event 权限。Source 意图和投影继续使用既有绑定与 canonical history 协议。

## 验证边界

配置、迁移、主题适配及原生窗口等 23 个定向测试文件共 813 项通过；原生配置相关 Rust 测试 9 项通过。Tauri debug 构建通过。实际 Linux WebKitGTK 双窗口验证了启动字体/主题、正常/无效/丢失文件重载、视图身份保留及共享精确 Undo；浅/深弹层检查包含焦点后的危险操作文字。

这是定向验证，不是全仓库、跨平台、屏幕阅读器或 OS 高对比度认证。证据与限制见[运行时设计记录](../../design/doom-editor-runtime.md#file-only-configuration-cutover-2026-10-15)。用户配置示例见[主题指南](../THEMES_GUIDE.md)。
