# 主题指南

Grain 通过 `config.json` 选择主题，不提供设置页、主题选择器或主题切换按钮。

## 配置文件与重载

在 Execute command 中运行 **Open configuration file**，由系统默认应用打开原生应用配置目录中的 `config.json`。Linux 路径为 `$XDG_CONFIG_HOME/com.lotus.grain/config.json`；未设置 `XDG_CONFIG_HOME` 时为 `~/.config/com.lotus.grain/config.json`。

保存文件后运行 **Reload configuration**。主题不会因外部编辑器保存而自动切换；Grain 也不会回写已有配置文件。

固定主题的完整最小示例：

```json
{
  "version": 1,
  "appearance": {
    "mode": "theme",
    "theme": "Catppuccin Mocha"
  }
}
```

省略其他字段会使用默认值。配置是严格 JSON，不支持注释或尾随逗号；需要说明文字时可使用字符串字段 `$comment`。

## 跟随系统

```json
{
  "version": 1,
  "appearance": {
    "mode": "system",
    "lightTheme": "GitHub",
    "darkTheme": "Catppuccin Mocha",
    "transitions": false
  }
}
```

`lightTheme` 必须是浅色配色，`darkTheme` 必须是深色配色。分类依据背景亮度，不依据名称是否包含 Light/Dark。`transitions` 控制主题颜色过渡。

## 配色来源与名称

内置 811 套 [iTerm2-Color-Schemes](https://github.com/mbadolato/iTerm2-Color-Schemes) 配色，无需联网下载或执行上游脚本。使用精确上游名称，例如 `GitHub`、`GitHub Dark`、`Catppuccin Mocha`；大小写和空格不可随意更改。旧的 `default-dark` 等手写主题 key 不是新文件的别名。

完整名称及原始终端颜色见 [catalog.json](../../apps/desktop/src/types/theme/iterm2/catalog.json)。当前固定上游 revision 为 `21f281d0834846eef984f75774638e7d16bac068`；源归档、文件集合与目录摘要见 [provenance.json](../../apps/desktop/src/types/theme/iterm2/provenance.json)。集合许可证与个别作者权利说明分别见 [LICENSE](../../apps/desktop/src/types/theme/iterm2/LICENSE) 和 [CREDITS.md](../../apps/desktop/src/types/theme/iterm2/CREDITS.md)。

原始背景、前景、光标和 ANSI 16 色保留在目录中；Grain 的界面、语法、状态和边界颜色是为可读性派生的语义颜色，不宣称与终端像素逐项相同。

## 错误与迁移

- 未知名称、错误的系统浅/深色配对或其他无效配置都会拒绝整份重载，不会静默选择相似主题。
- 重载失败保留之前的视觉偏好、Source 和共享 Undo；修复文件后再次 Reload。
- 主窗口与分离 Source 窗口使用同一文件，主窗口重载会通知已登记的分离窗口重新读取。
- 仅在首次启动且文件不存在时迁移旧偏好。旧主题名称若恰好存在于终端目录中便保留；退役手写配色会明确提示改用 `GitHub` 或 `GitHub Dark`，并写入首次生成文件的 `$comment`。
- 已有文件始终优先，不会从浏览器存储恢复第二套主题配置；后续重载发现文件丢失也不会自动重建。

字体、保存和工作流配置见[桌面端文件配置说明](../../apps/desktop/README.md#file-configuration)。实现边界见[主题系统文档](./development/THEME_SYSTEM.md)。
