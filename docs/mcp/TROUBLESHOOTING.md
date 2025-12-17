# MCP 故障排除指南

## 目录

- [浏览器问题](#浏览器问题)
- [连接问题](#连接问题)
- [配置问题](#配置问题)
- [性能问题](#性能问题)
- [常见错误](#常见错误)

---

## 浏览器问题

### 问题: 浏览器未安装

**错误信息**:
```
Executable doesn't exist at /home/user/.cache/ms-playwright/chromium-1200/chrome
╔═════════════════════════════════════════════════════════════════════════╗
║ Looks like Playwright Test or Playwright was just installed or updated. ║
║ Please run the following command to download new browsers:              ║
║                                                                         ║
║     npx playwright install                                              ║
╚═════════════════════════════════════════════════════════════════════════╝
```

**原因**:
- 浏览器从未安装
- Playwright 版本更新后浏览器版本不匹配
- 缓存目录被清理

**解决方案**:

**方案 1**: 安装特定浏览器
```bash
bunx playwright install chromium
bunx playwright install firefox
```

**方案 2**: 安装所有浏览器
```bash
bunx playwright install
```

**方案 3**: 验证安装
```bash
ls -la ~/.cache/ms-playwright/
```

**预期输出**:
```
chromium-1200/
firefox-1497/
ffmpeg-1011/
chromium_headless_shell-1200/
```

---

### 问题: 浏览器版本不匹配

**错误信息**:
```
Browser version mismatch
Expected: chromium-1200
Found: chromium-1150
```

**原因**:
- Playwright 包更新了
- 浏览器缓存过期

**解决方案**:

```bash
# 清理旧版本
rm -rf ~/.cache/ms-playwright/chromium-*

# 重新安装
bunx playwright install chromium
```

---

### 问题: 浏览器启动失败

**错误信息**:
```
Failed to launch browser
Error: spawn EACCES
```

**原因**:
- 浏览器可执行文件没有执行权限
- 系统依赖缺失

**解决方案**:

**方案 1**: 修复权限
```bash
chmod +x ~/.cache/ms-playwright/chromium-1200/chrome-linux/chrome
```

**方案 2**: 安装系统依赖 (Ubuntu/Debian)
```bash
sudo apt-get install -y \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2
```

**方案 3**: 使用 Playwright 的依赖安装
```bash
bunx playwright install-deps chromium
```

---

### 问题: 浏览器崩溃

**错误信息**:
```
Browser closed unexpectedly
```

**原因**:
- 内存不足
- 系统资源限制
- 浏览器 bug

**解决方案**:

**方案 1**: 使用 headless 模式
```json
{
  "playwright": {
    "args": [
      "@playwright/mcp@latest",
      "--browser",
      "chromium",
      "--headless"
    ]
  }
}
```

**方案 2**: 增加系统资源限制
```bash
ulimit -n 4096
```

**方案 3**: 切换浏览器
```json
{
  "args": ["@playwright/mcp@latest", "--browser", "firefox"]
}
```

---

## 连接问题

### 问题: 无法连接到应用

**错误信息**:
```
net::ERR_CONNECTION_REFUSED at http://localhost:1420
```

**原因**:
- 应用未启动
- 端口被占用
- 防火墙阻止

**解决方案**:

**步骤 1**: 检查应用是否运行
```bash
curl http://localhost:1420
```

**步骤 2**: 检查端口占用
```bash
lsof -i :1420
```

**步骤 3**: 启动应用
```bash
cd apps/desktop
npm run dev
```

**步骤 4**: 等待应用就绪
```
➜  Local:   http://localhost:1420/
```

---

### 问题: MCP 服务器无响应

**错误信息**:
```
MCP server timeout
Connection lost
```

**原因**:
- MCP 服务器崩溃
- 网络问题
- 配置错误

**解决方案**:

**步骤 1**: 重启 Kiro IDE

**步骤 2**: 检查 MCP 配置
```bash
cat .kiro/settings/mcp.json | jq .
```

**步骤 3**: 手动测试 MCP 服务器
```bash
bunx @playwright/mcp@latest --browser chromium
```

**步骤 4**: 查看日志
```bash
# 启用调试日志
DEBUG=* bunx @playwright/mcp@latest --browser chromium
```

---

### 问题: Puppeteer 无法连接

**错误信息**:
```
Could not connect to browser at http://localhost:1420
```

**原因**:
- 浏览器未在指定端口运行
- URL 配置错误

**解决方案**:

**步骤 1**: 验证 URL
```bash
curl http://localhost:1420
```

**步骤 2**: 检查配置
```json
{
  "puppeteer": {
    "env": {
      "PUPPETEER_BROWSER_URL": "http://localhost:1420"
    }
  }
}
```

**步骤 3**: 使用正确的端口
```bash
# 检查应用实际运行的端口
lsof -i -P | grep LISTEN | grep node
```

---

## 配置问题

### 问题: JSON 语法错误

**错误信息**:
```
SyntaxError: Unexpected token } in JSON at position 123
```

**原因**:
- JSON 格式错误
- 多余的逗号
- 缺少引号

**解决方案**:

**步骤 1**: 验证 JSON 语法
```bash
cat .kiro/settings/mcp.json | jq .
```

**步骤 2**: 常见错误

❌ **错误**: 多余的逗号
```json
{
  "playwright": {
    "command": "bunx",
  }
}
```

✅ **正确**:
```json
{
  "playwright": {
    "command": "bunx"
  }
}
```

❌ **错误**: 缺少引号
```json
{
  playwright: {
    command: bunx
  }
}
```

✅ **正确**:
```json
{
  "playwright": {
    "command": "bunx"
  }
}
```

---

### 问题: 配置未生效

**症状**:
- 修改配置后没有变化
- 使用的是旧配置

**原因**:
- 配置文件未保存
- Kiro 未重新加载配置
- 修改了错误的配置文件

**解决方案**:

**步骤 1**: 确认配置文件位置
```bash
# 工作区配置（优先级高）
cat .kiro/settings/mcp.json

# 用户配置
cat ~/.kiro/settings/mcp.json
```

**步骤 2**: 保存并重启
1. 保存配置文件
2. 重启 Kiro IDE
3. 或重新连接 MCP 服务器

**步骤 3**: 验证配置
```bash
# 测试配置是否正确
bunx @playwright/mcp@latest --browser chromium --help
```

---

### 问题: 环境变量未设置

**错误信息**:
```
GITHUB_PERSONAL_ACCESS_TOKEN is not set
```

**原因**:
- 环境变量未在配置中定义
- Token 过期或无效

**解决方案**:

**方案 1**: 在配置中设置
```json
{
  "github": {
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "github_pat_***"
    }
  }
}
```

**方案 2**: 使用系统环境变量
```bash
export GITHUB_TOKEN="github_pat_***"
```

然后在配置中引用:
```json
{
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
  }
}
```

---

## 性能问题

### 问题: 浏览器启动慢

**症状**:
- 浏览器启动需要 10+ 秒
- 测试运行缓慢

**原因**:
- 系统资源不足
- 磁盘 I/O 慢
- 使用了 headful 模式

**解决方案**:

**方案 1**: 使用 headless 模式
```javascript
browser = await chromium.launch({
  headless: true
});
```

**方案 2**: 重用浏览器上下文
```javascript
// 不要每次都创建新浏览器
const browser = await chromium.launch();
const context = await browser.newContext();

// 重用 context
const page1 = await context.newPage();
const page2 = await context.newPage();
```

**方案 3**: 增加系统资源
```bash
# 检查内存使用
free -h

# 检查磁盘 I/O
iostat -x 1
```

---

### 问题: 测试超时

**错误信息**:
```
Timeout 30000ms exceeded
```

**原因**:
- 页面加载慢
- 元素未找到
- 网络延迟

**解决方案**:

**方案 1**: 增加超时时间
```javascript
await page.goto('http://localhost:1420', {
  timeout: 60000  // 60 秒
});
```

**方案 2**: 使用更宽松的等待条件
```javascript
await page.goto('http://localhost:1420', {
  waitUntil: 'domcontentloaded'  // 而不是 'networkidle'
});
```

**方案 3**: 检查网络
```bash
# 测试本地连接
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:1420
```

---

## 常见错误

### 错误 1: `bunx: command not found`

**解决**:
```bash
# 安装 Bun
curl -fsSL https://bun.sh/install | bash

# 重新加载 shell
source ~/.bashrc  # 或 ~/.zshrc
```

---

### 错误 2: `uvx: command not found`

**解决**:
```bash
# 安装 uv (Python 包管理器)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 或使用 pip
pip install uv
```

---

### 错误 3: `Permission denied`

**解决**:
```bash
# 修复浏览器权限
chmod -R +x ~/.cache/ms-playwright/

# 修复配置文件权限
chmod 644 .kiro/settings/mcp.json
```

---

### 错误 4: `ENOSPC: System limit for number of file watchers reached`

**解决**:
```bash
# 增加文件监视器限制
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

### 错误 5: `Protocol error: Connection closed`

**原因**:
- 浏览器崩溃
- 内存不足

**解决**:
```bash
# 检查系统资源
free -h
top

# 关闭其他应用释放内存
# 或使用更轻量的浏览器配置
```

---

## 调试技巧

### 1. 启用详细日志

```bash
# Playwright 调试
DEBUG=pw:api bunx @playwright/mcp@latest --browser chromium

# Puppeteer 调试
DEBUG=puppeteer:* bunx @modelcontextprotocol/server-puppeteer
```

### 2. 使用非 headless 模式

```javascript
const browser = await chromium.launch({
  headless: false,  // 可以看到浏览器窗口
  slowMo: 100       // 减慢操作速度
});
```

### 3. 截图调试

```javascript
// 在关键步骤截图
await page.screenshot({ path: 'debug-1.png' });
await page.click('button');
await page.screenshot({ path: 'debug-2.png' });
```

### 4. 控制台日志

```javascript
// 监听浏览器控制台
page.on('console', msg => console.log('Browser:', msg.text()));

// 监听错误
page.on('pageerror', error => console.error('Page error:', error));
```

### 5. 网络监控

```javascript
// 监听网络请求
page.on('request', request => {
  console.log('Request:', request.url());
});

page.on('response', response => {
  console.log('Response:', response.url(), response.status());
});
```

---

## 获取帮助

### 检查清单

在寻求帮助前，请确认:

- [ ] 浏览器已安装: `ls ~/.cache/ms-playwright/`
- [ ] 应用正在运行: `curl http://localhost:1420`
- [ ] 配置语法正确: `cat .kiro/settings/mcp.json | jq .`
- [ ] 已重启 Kiro IDE
- [ ] 已查看错误日志
- [ ] 已尝试手动运行 MCP 服务器

### 收集信息

提供以下信息:

```bash
# 系统信息
uname -a

# Bun 版本
bun --version

# Playwright 版本
bunx playwright --version

# 已安装的浏览器
ls -la ~/.cache/ms-playwright/

# 配置文件
cat .kiro/settings/mcp.json

# 错误日志
# (复制完整的错误信息)
```

---

## 相关文档

- [README.md](./README.md) - 完整文档
- [QUICK_START.md](./QUICK_START.md) - 快速开始
- [CONFIGURATION.md](./CONFIGURATION.md) - 配置参考

---

**最后更新**: 2025-12-17
