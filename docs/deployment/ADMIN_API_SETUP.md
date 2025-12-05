# 后台管理系统 API 配置指南

## 📋 概述

后台管理系统用于接收和管理网站访客信息。需要配置 nginx 将 API 请求转发到后台服务器。

## 🏗️ 架构

```
访客访问网站
    ↓
Web 网站 (nginx 443)
    ↓ (POST /api/visitors)
Nginx 反向代理
    ↓
后台 API 服务器 (localhost:4001)
    ↓
存储访客数据 (data/visitors.json)
```

## ⚙️ Nginx 配置

在你的 nginx 配置文件中添加以下配置：

```nginx
# 在 server 块中添加 API 转发
server {
    listen       443 ssl;
    server_name  localhost 127.0.0.1 szlh.top;

    # ... SSL 配置 ...

    root   /home/lotus/test-site;
    index  index.html index.htm;

    # API 请求转发到后台服务器
    location /api {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS 配置（如果需要）
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type";
        
        if ($request_method = OPTIONS) {
            return 204;
        }
    }

    # 静态文件服务
    location / {
        try_files $uri $uri/ =404;
    }
}
```

## 🚀 启动服务

### 1. 启动后台 API 服务器

```bash
cd /home/lotus/project/book2/novel-editor/apps/admin
bun install  # 首次安装依赖
bun run api:dev  # 开发模式
# 或
bun run api:start  # 生产模式
```

API 服务器将在 `http://localhost:4001` 运行。

### 2. 配置并重新加载 Nginx

```bash
# 测试配置
sudo nginx -t

# 重新加载
sudo systemctl reload nginx
```

### 3. 测试 API

```bash
# 健康检查
curl https://szlh.top/api/health

# 提交访客信息
curl -X POST https://szlh.top/api/visitors \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/about",
    "userAgent": "Mozilla/5.0..."
  }'
```

## 📝 Web 网站集成

在 web 网站中添加访客追踪代码。创建一个脚本文件：

```javascript
// 访客追踪脚本
(function() {
  // 获取当前页面信息
  const data = {
    path: window.location.pathname,
    query: Object.fromEntries(new URLSearchParams(window.location.search)),
    referer: document.referrer,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  };

  // 发送到后台
  fetch('/api/visitors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }).catch(() => {
    // 静默失败，不影响用户体验
  });
})();
```

将这个脚本添加到 web 项目的所有页面，或者在构建时自动注入。

## 🔧 后台管理界面

访问后台管理界面：

- 开发环境: `http://localhost:4000`
- 生产环境: 需要配置单独的域名或端口

### 启动前端开发服务器

```bash
cd /home/lotus/project/book2/novel-editor/apps/admin
bun run dev
```

## 📊 API 端点

### POST /api/visitors
提交访客信息

**请求体**:
```json
{
  "path": "/about",
  "query": {},
  "referer": "https://example.com",
  "userAgent": "Mozilla/5.0...",
  "metadata": {}
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "ip": "192.168.1.1",
    "path": "/about",
    "timestamp": 1234567890,
    ...
  }
}
```

### GET /api/visitors
查询访客列表

**查询参数**:
- `page`: 页码（默认 1）
- `pageSize`: 每页数量（默认 50）
- `startDate`: 开始日期 (ISO 格式)
- `endDate`: 结束日期 (ISO 格式)
- `ip`: IP 地址过滤
- `path`: 路径过滤

**响应**:
```json
{
  "success": true,
  "data": {
    "visitors": [...],
    "total": 1000
  }
}
```

### GET /api/stats
获取统计信息

**响应**:
```json
{
  "success": true,
  "data": {
    "total": 1000,
    "today": 50,
    "thisWeek": 300,
    "thisMonth": 800,
    "uniqueIPs": 200
  }
}
```

## 🔒 安全建议

1. **添加认证**: 为管理界面添加登录功能
2. **限制访问**: 只允许特定 IP 访问管理界面
3. **数据加密**: 敏感信息加密存储
4. **速率限制**: 防止 API 被滥用

## 📁 数据存储

当前使用 JSON 文件存储，位置：`apps/admin/data/visitors.json`

可以扩展为：
- SQLite 数据库
- PostgreSQL
- MongoDB

## 🐛 故障排除

### API 请求失败

1. 检查 API 服务器是否运行: `curl http://localhost:4001/api/health`
2. 检查 nginx 配置是否正确
3. 查看 nginx 错误日志: `sudo tail -f /var/log/nginx/error.log`
4. 查看 API 服务器日志

### CORS 错误

确保 nginx 配置中添加了 CORS 头，或者在后端 Express 中配置 CORS。

### 数据文件权限

确保 API 服务器有权限读写数据目录：
```bash
chmod -R 755 /home/lotus/project/book2/novel-editor/apps/admin/data
```

