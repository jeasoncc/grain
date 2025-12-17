# MCP (Model Context Protocol) 配置文档

## 概述

本项目已配置 MCP 服务器用于自动化测试和浏览器控制。本文档说明所有已配置的 MCP 服务器、浏览器状态和使用方法。

## 目录

- [已配置的 MCP 服务器](#已配置的-mcp-服务器)
- [浏览器安装状态](#浏览器安装状态)
- [配置文件位置](#配置文件位置)
- [使用方法](#使用方法)
- [常见问题](#常见问题)
- [测试脚本](#测试脚本)

---

## 已配置的 MCP 服务器

### 1. Playwright MCP Server

**用途**: 浏览器自动化测试，用于 UI 测试和端到端测试

**配置**:
```json
{
  "playwright": {
    "command": "bunx",
    "args": [
      "@playwright/mcp@latest",
      "--browser",
      "chromium"
    ]
  }
}
```

**支持的浏览器**:
- ✅ **Chromium** (默认) - 已安装并测试通过
- ✅ **Firefox** - 已安装并测试通过
- ⚠️ **Webkit** - 未安装

**切换浏览器**: 修改 `--browser` 参数为 `"chromium"` 或 `"firefox"`

---

### 2. Puppeteer MCP Server

**用途**: 备用浏览器自动化工具，可连接到远程浏览器

**配置**:
```json
{
  "puppeteer": {
    "command": "bunx",
    "args": [
      "-y",
      "@modelcontextprotocol/server-puppeteer"
    ],
    "env": {
      "PUPPETEER_BROWSER_URL": "http://localhost:1420"
    }
  }
}
```

**特点**:
- 可以连接到已运行的浏览器实例
- 默认配置连接到本地开发服务器 (port 1420)
- 适合测试桌面应用的 Web 界面

---

### 3. GitHub MCP Server

**用途**: GitHub API 集成，用于仓库管理和自动化

**配置**:
```json
{
  "github": {
    "command": "uvx",
    "args": [
      "mcp-server-github"
    ],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "github_pat_***"
    }
  }
}
```

**功能**:
- 仓库操作
- Issue 和 PR 管理
- 代码搜索
- Workflow 触发

---

## 浏览器安装状态

### 安装位置
所有浏览器安装在: `~/.cache/ms-playwright/`

### 已安装的浏览器

| 浏览器 | 状态 | 版本 | 大小 | 路径 |
|--------|------|------|------|------|
| **Chromium** | ✅ 已安装 | 143.0.7499.4 (build 1200) | 164.7 MiB | `~/.cache/ms-playwright/chromium-1200` |
| **Firefox** | ✅ 已安装 | 144.0.2 (build 1497) | 98.4 MiB | `~/.cache/ms-playwright/firefox-1497` |
| **FFMPEG** | ✅ 已安装 | build 1011 | 2.3 MiB | `~/.cache/ms-playwright/ffmpeg-1011` |
| **Chromium Headless Shell** | ✅ 已安装 | 143.0.7499.4 (build 1200) | 109.7 MiB | `~/.cache/ms-playwright/chromium_headless_shell-1200` |

### 测试状态

**最后测试时间**: 2025-12-17

| 浏览器 | 启动测试 | 连接测试 | 页面加载 | 截图功能 |
|--------|----------|----------|----------|----------|
| Chromium | ✅ 通过 | ✅ 通过 | ✅ 通过 | ✅ 通过 |
| Firefox | ✅ 通过 | ✅ 通过 | ✅ 通过 | ✅ 通过 |

**测试应用**: http://localhost:1420 (Desktop App)

---

## 配置文件位置

### 工作区配置
```
.kiro/settings/mcp.json
```
- 项目级别的 MCP 配置
- 优先级高于用户级配置
- 版本控制中包含（已配置）

### 用户配置
```
~/.kiro/settings/mcp.json
```
- 全局用户级别配置
- 跨项目共享
- 不在版本控制中

### 配置优先级
```
用户配置 < 工作区配置
```

---

## 使用方法

### 1. 通过 Kiro IDE 使用 MCP

**在 Kiro 聊天界面中**:

```
请使用 Playwright 导航到 http://localhost:1420
```

```
请点击编辑器区域并输入文本 "Hello World"
```

```
请截图当前页面
```

### 2. 直接运行测试脚本

**测试浏览器兼容性**:
```bash
cd .kiro/specs/editor-ux-enhancements
bun run test-browsers.js
```

**运行完整的 Playwright 验证**:
```bash
cd .kiro/specs/editor-ux-enhancements
bun run playwright-verification.js
```

### 3. 手动使用 Playwright

**启动 Playwright MCP**:
```bash
bunx @playwright/mcp@latest --browser chromium
```

**切换到 Firefox**:
```bash
bunx @playwright/mcp@latest --browser firefox
```

---

## 常见问题

### Q1: 为什么每次都提示要安装浏览器？

**A**: 这是误解。浏览器只需要安装一次：

- ✅ 浏览器安装在 `~/.cache/ms-playwright/`
- ✅ 安装后会被永久缓存
- ✅ 只有 Playwright 版本更新时才需要重新下载
- ✅ `bunx` 不会每次都重新安装浏览器

**验证浏览器已安装**:
```bash
ls -la ~/.cache/ms-playwright/
```

### Q2: Chromium 和 Firefox 有什么区别？

**Chromium**:
- ✅ 更快的启动速度
- ✅ 更好的开发者工具
- ✅ 更广泛的 Web 标准支持
- 推荐用于日常开发测试

**Firefox**:
- ✅ 更好的隐私保护
- ✅ 不同的渲染引擎（Gecko）
- ✅ 用于跨浏览器兼容性测试
- 推荐用于兼容性验证

### Q3: 如何切换浏览器？

**方法 1**: 修改配置文件 `.kiro/settings/mcp.json`
```json
{
  "playwright": {
    "args": [
      "@playwright/mcp@latest",
      "--browser",
      "firefox"  // 改为 "chromium" 或 "firefox"
    ]
  }
}
```

**方法 2**: 直接在命令行指定
```bash
bunx @playwright/mcp@latest --browser firefox
```

### Q4: 如何安装其他浏览器？

**安装 Webkit**:
```bash
bunx playwright install webkit
```

**安装所有浏览器**:
```bash
bunx playwright install
```

### Q5: MCP 服务器无法连接怎么办？

**检查清单**:
1. ✅ 确认应用正在运行 (http://localhost:1420)
2. ✅ 确认浏览器已安装
3. ✅ 检查 MCP 配置文件语法正确
4. ✅ 重启 Kiro IDE
5. ✅ 查看 MCP 服务器日志

**查看已安装的浏览器**:
```bash
bunx playwright --version
ls ~/.cache/ms-playwright/
```

### Q6: 如何调试 MCP 测试？

**启用详细日志**:
```bash
DEBUG=pw:api bunx @playwright/mcp@latest --browser chromium
```

**使用非 headless 模式**:
在测试脚本中设置:
```javascript
browser = await chromium.launch({
  headless: false  // 可以看到浏览器窗口
});
```

---

## 测试脚本

### 可用的测试脚本

| 脚本 | 位置 | 用途 |
|------|------|------|
| `test-browsers.js` | `.kiro/specs/editor-ux-enhancements/` | 测试 Chromium 和 Firefox 兼容性 |
| `playwright-verification.js` | `.kiro/specs/editor-ux-enhancements/` | 完整的 UI 自动化测试 |
| `automated-verification.js` | `.kiro/specs/editor-ux-enhancements/` | 备用测试脚本（Puppeteer） |

### 运行测试前的准备

1. **启动桌面应用**:
```bash
cd apps/desktop
npm run dev
```
应用会在 http://localhost:1420 启动

2. **确认浏览器已安装**:
```bash
ls ~/.cache/ms-playwright/
```

3. **运行测试**:
```bash
cd .kiro/specs/editor-ux-enhancements
bun run test-browsers.js
```

---

## 相关文档

- [MCP 测试清单](../../.kiro/specs/editor-ux-enhancements/mcp-test-checklist.md)
- [浏览器测试报告](../../.kiro/specs/editor-ux-enhancements/browser-test-report.md)
- [手动测试指南](../../.kiro/specs/editor-ux-enhancements/manual-test-guide.md)

---

## 维护说明

### 更新浏览器

当 Playwright 版本更新时:
```bash
bunx playwright install
```

### 清理旧版本浏览器

```bash
# 查看占用空间
du -sh ~/.cache/ms-playwright/

# 清理所有浏览器（需要重新安装）
rm -rf ~/.cache/ms-playwright/
```

### 更新 MCP 配置

修改 `.kiro/settings/mcp.json` 后，需要：
1. 保存文件
2. 重启 Kiro IDE 或重新连接 MCP 服务器

---

## 总结

✅ **当前状态**: 所有 MCP 服务器已配置并可用
✅ **浏览器**: Chromium 和 Firefox 已安装并测试通过
✅ **测试脚本**: 可用且经过验证
✅ **文档**: 完整且最新

**下一步**: 使用 Kiro 的 MCP 集成进行自动化测试，参考 `mcp-test-checklist.md`

---

**最后更新**: 2025-12-17
**维护者**: AI Agent
**状态**: ✅ 生产就绪
