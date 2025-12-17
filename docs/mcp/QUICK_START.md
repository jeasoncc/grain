# MCP 快速开始指南

## 5 分钟快速上手

### 1. 确认浏览器已安装 ✅

```bash
ls ~/.cache/ms-playwright/
```

**应该看到**:
- `chromium-1200/` ✅
- `firefox-1497/` ✅
- `ffmpeg-1011/` ✅

**如果没有，运行**:
```bash
bunx playwright install chromium firefox
```

---

### 2. 启动桌面应用

```bash
cd apps/desktop
npm run dev
```

**等待看到**:
```
➜  Local:   http://localhost:1420/
```

---

### 3. 测试浏览器

```bash
cd .kiro/specs/editor-ux-enhancements
bun run test-browsers.js
```

**期望输出**:
```
✓ Chromium: PASSED
✓ Firefox: PASSED
Total: 2/2 browsers working
```

---

### 4. 使用 Kiro MCP

在 Kiro 聊天中输入:

```
请使用 Playwright 导航到 http://localhost:1420
```

```
请点击编辑器并输入 "Hello World"
```

```
请截图
```

---

## 常用命令

### 切换浏览器

**编辑** `.kiro/settings/mcp.json`:
```json
{
  "playwright": {
    "args": [
      "@playwright/mcp@latest",
      "--browser",
      "chromium"  // 或 "firefox"
    ]
  }
}
```

### 手动运行 Playwright

```bash
# Chromium
bunx @playwright/mcp@latest --browser chromium

# Firefox
bunx @playwright/mcp@latest --browser firefox
```

### 安装新浏览器

```bash
# 安装 Webkit
bunx playwright install webkit

# 安装所有
bunx playwright install
```

---

## 故障排除

### 问题: 浏览器启动失败

**解决**:
```bash
# 重新安装浏览器
bunx playwright install chromium firefox
```

### 问题: 无法连接到应用

**检查**:
1. 应用是否在运行？ `curl http://localhost:1420`
2. 端口是否被占用？ `lsof -i :1420`

### 问题: MCP 服务器无响应

**解决**:
1. 重启 Kiro IDE
2. 检查配置文件语法
3. 查看 MCP 日志

---

## 下一步

- 📖 阅读完整文档: [README.md](./README.md)
- ✅ 查看测试清单: [mcp-test-checklist.md](../../.kiro/specs/editor-ux-enhancements/mcp-test-checklist.md)
- 🧪 运行完整测试: `bun run playwright-verification.js`

---

**提示**: 浏览器只需要安装一次，会被永久缓存在 `~/.cache/ms-playwright/`
