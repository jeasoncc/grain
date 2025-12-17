# 配置 MCP 文件系统权限

## 方法 1: 使用 MCP Filesystem Server（推荐）

在你的 `.kiro/settings/mcp.json` 文件中添加 filesystem server：

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/your/workspace"
      ]
    },
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
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_github_token_here"
      }
    }
  }
}
```

## 方法 2: 使用 Kiro 的内置权限设置

Kiro IDE 本身应该有一个设置来自动批准某些操作。查找：

1. **Settings** → **Kiro** → **Auto-approve tools**
2. 或者在 `.kiro/settings/` 中查找相关配置文件

## 方法 3: 在当前 MCP 配置中添加 autoApprove

在你的 mcp.json 中，为每个 server 添加 `autoApprove` 字段：

```json
{
  "mcpServers": {
    "playwright": {
      "command": "bunx",
      "args": ["@playwright/mcp@latest", "--browser", "chromium"],
      "autoApprove": ["*"]  // 自动批准所有工具调用
    }
  }
}
```

## 推荐配置

对于你当前的项目，我建议：

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "${workspaceFolder}"
      ],
      "autoApprove": [
        "read_file",
        "write_file",
        "list_directory",
        "search_files"
      ]
    },
    "playwright": {
      "command": "bunx",
      "args": [
        "@playwright/mcp@latest",
        "--browser",
        "chromium"
      ],
      "autoApprove": ["navigate", "screenshot", "click"]
    },
    "puppeteer": {
      "command": "bunx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-puppeteer"
      ],
      "env": {
        "PUPPETEER_BROWSER_URL": "http://localhost:1420"
      },
      "autoApprove": ["puppeteer_navigate", "puppeteer_screenshot"]
    }
  }
}
```

## 注意事项

⚠️ **安全提示**：
- 只对信任的工具使用 `autoApprove`
- 避免使用 `"autoApprove": ["*"]` 除非你完全信任该 MCP server
- 定期审查自动批准的工具列表

## 应用配置

1. 编辑 `.kiro/settings/mcp.json`
2. 保存文件
3. 重启 Kiro IDE 或重新连接 MCP servers
4. 配置会立即生效

## 验证配置

配置完成后，你可以：
1. 打开 Kiro 的 MCP Server 面板
2. 查看 filesystem server 是否已连接
3. 测试文件操作是否不再需要手动批准
