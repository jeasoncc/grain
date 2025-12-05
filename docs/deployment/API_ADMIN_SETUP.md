# API 和后台管理系统部署指南

## 📋 项目概述

项目分为两个独立的应用：

1. **api** - 后端 API 服务器（Elysia + Bun）
   - 端口: 4001
   - 功能: 接收和存储访客信息，提供查询接口

2. **admin** - 前端管理界面（React + TanStack）
   - 端口: 4000 (开发)
   - 功能: 查看和管理访客信息

## 🏗️ 架构

```
访客访问网站
    ↓
Web 网站 (nginx 443)
    ↓ (POST /api/visitors)
Nginx 反向代理
    ↓
API 服务器 (localhost:4001, Bun + Elysia)
    ↓
存储访客数据 (data/visitors.json)

管理员访问管理界面
    ↓
Admin 前端 (nginx 或其他端口)
    ↓ (GET /api/visitors, /api/stats)
Nginx 反向代理
    ↓
API 服务器 (localhost:4001)
```

## ⚙️ Nginx 配置

### 完整配置示例

```nginx
server {
    listen       443 ssl;
    listen       [::]:443 ssl;
    http2        on;
    server_name  localhost 127.0.0.1 szlh.top;

    ssl_certificate      /home/lotus/pem/www.szlh.top.pem;
    ssl_certificate_key  /home/lotus/pem/www.szlh.top.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_session_cache    shared:SSL:10m;
    ssl_session_timeout  10m;

    # Web 网站静态文件
    root   /home/lotus/test-site;
    index  index.html index.htm;

    # API 请求转发到 Bun 服务器
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
    }

    # 静态文件服务
    location / {
        try_files $uri $uri/ =404;
    }
}

# 后台管理界面（可选：使用不同端口或域名）
server {
    listen       4002;
    server_name  localhost;

    root   /home/lotus/project/book2/novel-editor/apps/admin/dist;
    index  index.html;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:4001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 🚀 启动服务

### 1. 启动 API 服务器

```bash
cd /home/lotus/project/book2/novel-editor/apps/api
bun install  # 首次安装依赖
bun run dev  # 开发模式
# 或
bun run start  # 生产模式
```

API 服务器将在 `http://localhost:4001` 运行。

### 2. 启动前端开发服务器（可选）

```bash
cd /home/lotus/project/book2/novel-editor/apps/admin
bun install  # 首次安装依赖
bun run dev  # 开发模式
```

前端将在 `http://localhost:4000` 运行。

### 3. 构建前端（生产环境）

```bash
cd /home/lotus/project/book2/novel-editor/apps/admin
bun run build
```

构建输出在 `apps/admin/dist/` 目录。

### 4. 配置并重新加载 Nginx

```bash
# 编辑配置文件
sudo nano /etc/nginx/nginx.conf

# 测试配置
sudo nginx -t

# 重新加载
sudo systemctl reload nginx
```

## 📝 Web 网站集成

在 web 网站中添加访客追踪脚本：

```javascript
// 访客追踪脚本
(function() {
  const data = {
    path: window.location.pathname,
    query: Object.fromEntries(new URLSearchParams(window.location.search)),
    referer: document.referrer,
    userAgent: navigator.userAgent,
  };

  fetch('/api/visitors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }).catch(() => {
    // 静默失败
  });
})();
```

将脚本添加到所有页面，或在构建时自动注入。

## 🔧 使用 PM2 管理服务（推荐）

### 安装 PM2

```bash
npm install -g pm2
# 或
bun add -g pm2
```

### 启动 API 服务器

```bash
cd /home/lotus/project/book2/novel-editor/apps/api
pm2 start bun --name "api-server" -- run start
pm2 save
pm2 startup  # 设置开机自启
```

### 查看服务状态

```bash
pm2 list
pm2 logs api-server
pm2 restart api-server
pm2 stop api-server
```

## 📊 API 端点

所有 API 端点都以 `/api` 开头。

### POST /api/visitors
提交访客信息

### GET /api/visitors
查询访客列表（支持分页和筛选）

### GET /api/stats
获取统计信息

### GET /api/health
健康检查

### GET /swagger
Swagger API 文档（仅开发环境）

## 🔒 安全建议

1. **添加认证**: 为管理界面添加登录功能
2. **限制访问**: 只允许特定 IP 访问管理界面
3. **速率限制**: 防止 API 被滥用
4. **HTTPS**: 使用 HTTPS 保护数据传输

## 📁 数据存储

当前使用 JSON 文件存储，位置：`apps/api/data/visitors.json`

数据目录会在首次运行时自动创建。

可以扩展为：
- SQLite 数据库
- PostgreSQL
- MongoDB

## 🐛 故障排除

### API 服务器无法启动

1. 检查 Bun 是否安装: `bun --version`
2. 检查端口是否被占用: `lsof -i :4001`
3. 查看错误日志

### Nginx 代理失败

1. 检查 API 服务器是否运行: `curl http://localhost:4001/api/health`
2. 检查 nginx 配置: `sudo nginx -t`
3. 查看 nginx 错误日志: `sudo tail -f /var/log/nginx/error.log`

### CORS 错误

确保 API 服务器配置了 CORS（已在 Elysia 中配置）。

