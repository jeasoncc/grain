# MCP 配置参考

## 完整配置文件

**位置**: `.kiro/settings/mcp.json`

```json
{
  "mcpServers": {
    "playwright": {
      "command": "bunx",
      "args": [
        "@playwright/mcp@latest",
        "--browser",
        "chromium"
      ]
    },
    "puppeteer": {
      "command": "bunx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-puppeteer"
      ],
      "env": {
        "PUPPETEER_BROWSER_URL": "http://localhost:1420"
      }
    },
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
}
```

---

## Playwright MCP 配置详解

### 基本配置

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

### 配置选项

| 参数 | 值 | 说明 |
|------|-----|------|
| `command` | `"bunx"` | 使用 Bun 的 npx 等价命令 |
| `args[0]` | `"@playwright/mcp@latest"` | Playwright MCP 包 |
| `args[1]` | `"--browser"` | 浏览器选项标志 |
| `args[2]` | `"chromium"` \| `"firefox"` \| `"webkit"` | 浏览器类型 |

### 浏览器选项

#### Chromium (推荐)
```json
{
  "args": ["@playwright/mcp@latest", "--browser", "chromium"]
}
```
- ✅ 最快的启动速度
- ✅ 最好的开发者工具
- ✅ 基于 Chrome 的渲染引擎

#### Firefox
```json
{
  "args": ["@playwright/mcp@latest", "--browser", "firefox"]
}
```
- ✅ Gecko 渲染引擎
- ✅ 跨浏览器测试
- ✅ 更好的隐私保护

#### Webkit
```json
{
  "args": ["@playwright/mcp@latest", "--browser", "webkit"]
}
```
- ✅ Safari 的渲染引擎
- ⚠️ 需要单独安装: `bunx playwright install webkit`

### 高级配置

#### 指定浏览器路径
```json
{
  "playwright": {
    "command": "bunx",
    "args": [
      "@playwright/mcp@latest",
      "--browser",
      "chromium",
      "--executable-path",
      "/path/to/chrome"
    ]
  }
}
```

#### 启用调试模式
```json
{
  "playwright": {
    "command": "bunx",
    "args": [
      "@playwright/mcp@latest",
      "--browser",
      "chromium"
    ],
    "env": {
      "DEBUG": "pw:api"
    }
  }
}
```

---

## Puppeteer MCP 配置详解

### 基本配置

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

### 配置选项

| 参数 | 值 | 说明 |
|------|-----|------|
| `command` | `"bunx"` | 使用 Bun 运行 |
| `args[0]` | `"-y"` | 自动确认安装 |
| `args[1]` | `"@modelcontextprotocol/server-puppeteer"` | Puppeteer MCP 包 |
| `env.PUPPETEER_BROWSER_URL` | `"http://localhost:1420"` | 连接的浏览器 URL |

### 使用场景

**Puppeteer vs Playwright**:

| 特性 | Puppeteer | Playwright |
|------|-----------|------------|
| 浏览器支持 | Chrome/Chromium | Chrome, Firefox, Safari |
| 远程连接 | ✅ 支持 | ⚠️ 有限 |
| API 复杂度 | 简单 | 更强大 |
| 推荐用途 | 连接已运行的浏览器 | 完整的自动化测试 |

### 连接到远程浏览器

```json
{
  "env": {
    "PUPPETEER_BROWSER_URL": "http://remote-host:9222"
  }
}
```

---

## GitHub MCP 配置详解

### 基本配置

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

### 配置选项

| 参数 | 值 | 说明 |
|------|-----|------|
| `command` | `"uvx"` | Python 包管理器 uv 的运行命令 |
| `args[0]` | `"mcp-server-github"` | GitHub MCP 服务器 |
| `env.GITHUB_PERSONAL_ACCESS_TOKEN` | `"github_pat_***"` | GitHub Personal Access Token |

### 获取 GitHub Token

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 选择权限:
   - `repo` - 仓库访问
   - `workflow` - GitHub Actions
   - `read:org` - 组织读取
4. 生成并复制 token
5. 更新配置文件

### 安全建议

⚠️ **不要提交 token 到版本控制**

**方法 1**: 使用用户级配置
```bash
# 编辑用户配置
nano ~/.kiro/settings/mcp.json
```

**方法 2**: 使用环境变量
```json
{
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
  }
}
```

然后在 shell 中设置:
```bash
export GITHUB_TOKEN="github_pat_***"
```

---

## 配置文件优先级

### 加载顺序

1. **用户配置**: `~/.kiro/settings/mcp.json`
2. **工作区配置**: `.kiro/settings/mcp.json`

### 合并规则

- 工作区配置会**覆盖**用户配置
- 相同的服务器名称会被替换
- 不同的服务器会被合并

### 示例

**用户配置** (`~/.kiro/settings/mcp.json`):
```json
{
  "mcpServers": {
    "playwright": {
      "args": ["@playwright/mcp@latest", "--browser", "firefox"]
    },
    "github": {
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "user_token"
      }
    }
  }
}
```

**工作区配置** (`.kiro/settings/mcp.json`):
```json
{
  "mcpServers": {
    "playwright": {
      "args": ["@playwright/mcp@latest", "--browser", "chromium"]
    },
    "puppeteer": {
      "env": {
        "PUPPETEER_BROWSER_URL": "http://localhost:1420"
      }
    }
  }
}
```

**最终生效**:
```json
{
  "mcpServers": {
    "playwright": {
      "args": ["@playwright/mcp@latest", "--browser", "chromium"]  // 工作区覆盖
    },
    "puppeteer": {
      "env": {
        "PUPPETEER_BROWSER_URL": "http://localhost:1420"
      }
    },
    "github": {
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "user_token"  // 用户配置保留
      }
    }
  }
}
```

---

## 验证配置

### 检查配置语法

```bash
# 使用 jq 验证 JSON 语法
cat .kiro/settings/mcp.json | jq .
```

### 测试 MCP 服务器

```bash
# 测试 Playwright
bunx @playwright/mcp@latest --browser chromium --help

# 测试 Puppeteer
bunx @modelcontextprotocol/server-puppeteer --help

# 测试 GitHub
uvx mcp-server-github --help
```

---

## 常见配置问题

### 问题 1: 浏览器未找到

**错误**:
```
Executable doesn't exist at /home/user/.cache/ms-playwright/firefox-1497/firefox/firefox
```

**解决**:
```bash
bunx playwright install firefox
```

### 问题 2: 命令未找到

**错误**:
```
command not found: bunx
```

**解决**:
```bash
# 安装 Bun
curl -fsSL https://bun.sh/install | bash
```

### 问题 3: GitHub Token 无效

**错误**:
```
Bad credentials
```

**解决**:
1. 检查 token 是否正确
2. 确认 token 权限
3. 重新生成 token

---

## 最佳实践

### 1. 分离敏感信息

✅ **推荐**: 敏感信息放在用户配置
```bash
~/.kiro/settings/mcp.json  # 包含 tokens
```

✅ **推荐**: 项目配置不包含敏感信息
```bash
.kiro/settings/mcp.json  # 不包含 tokens
```

### 2. 使用版本锁定

⚠️ **不推荐**: 使用 `@latest`
```json
{
  "args": ["@playwright/mcp@latest"]
}
```

✅ **推荐**: 锁定版本
```json
{
  "args": ["@playwright/mcp@1.0.0"]
}
```

### 3. 环境特定配置

**开发环境**:
```json
{
  "playwright": {
    "args": ["@playwright/mcp@latest", "--browser", "chromium"]
  }
}
```

**CI/CD 环境**:
```json
{
  "playwright": {
    "args": ["@playwright/mcp@latest", "--browser", "chromium", "--headless"]
  }
}
```

---

## 相关文档

- [README.md](./README.md) - 完整文档
- [QUICK_START.md](./QUICK_START.md) - 快速开始
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 故障排除

---

**最后更新**: 2025-12-17
