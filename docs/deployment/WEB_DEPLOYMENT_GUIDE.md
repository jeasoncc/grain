# Grain Web 部署指南

将 Desktop 项目部署为 Web 应用的完整指南。

## 架构说明

```
用户浏览器
    ↓
前端静态文件 (Vite 构建) → Nginx/Vercel/Netlify
    ↓ HTTP API
Rust 后端 (api-rust) → Docker/VPS
    ↓
SQLite 数据库
```

## 快速开始

### 方式 1：一键部署（推荐）

```bash
# 在项目根目录执行
bash scripts/deploy-web.sh
```

访问 `http://localhost` 即可使用。

### 方式 2：手动部署

#### 步骤 1：构建前端

```bash
cd apps/desktop
bun run build:prod
```

构建产物在 `apps/desktop/dist/`

#### 步骤 2：部署后端

**使用 Docker Compose（推荐）：**

```bash
# 在项目根目录
docker-compose up -d
```

**直接运行：**

```bash
cd apps/api-rust
cargo run --release
```

## 环境变量配置

### 前端环境变量

创建 `apps/desktop/.env.production`：

```bash
# API 后端地址
VITE_API_URL=https://api.yourdomain.com

# 或使用相对路径（前后端同域名）
# VITE_API_URL=/api
```

### 后端环境变量

```bash
# 监听地址
GRAIN_HOST=0.0.0.0

# 监听端口
GRAIN_PORT=3030

# 日志级别
RUST_LOG=info

# 数据目录（可选，默认 ~/.grain）
GRAIN_DATA_DIR=/path/to/data
```

## 部署到生产环境

### 前端部署选项

#### 选项 A：Vercel/Netlify（静态托管）

1. 构建前端：
```bash
cd apps/desktop
bun run build:prod
```

2. 上传 `dist/` 目录到 Vercel/Netlify

3. 配置环境变量 `VITE_API_URL`

#### 选项 B：Nginx（自托管）

1. 复制构建产物：
```bash
cp -r apps/desktop/dist/* /var/www/grain/
```

2. 配置 Nginx（参考 `nginx.conf`）

### 后端部署选项

#### 选项 A：Docker（推荐）

```bash
# 构建镜像
docker build -f apps/api-rust/Dockerfile -t grain-api:latest .

# 运行容器
docker run -d \
  --name grain-api \
  -p 3030:3030 \
  -v /path/to/data:/app/data \
  -e GRAIN_HOST=0.0.0.0 \
  -e GRAIN_PORT=3030 \
  grain-api:latest
```

#### 选项 B：Systemd 服务

创建 `/etc/systemd/system/grain-api.service`：

```ini
[Unit]
Description=Grain API Server
After=network.target

[Service]
Type=simple
User=grain
WorkingDirectory=/opt/grain
ExecStart=/opt/grain/grain-api
Environment="GRAIN_HOST=0.0.0.0"
Environment="GRAIN_PORT=3030"
Environment="RUST_LOG=info"
Restart=always

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl enable grain-api
sudo systemctl start grain-api
```

## 常用命令

### Docker Compose

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看状态
docker-compose ps
```

### 健康检查

```bash
# 检查 API
curl http://localhost:3030/api/workspaces

# 检查前端
curl http://localhost
```

## 故障排查

### 前端无法连接后端

1. 检查 `VITE_API_URL` 配置
2. 检查 CORS 设置
3. 查看浏览器控制台错误

### 后端启动失败

1. 检查端口是否被占用：`lsof -i :3030`
2. 查看日志：`docker-compose logs api`
3. 检查数据库文件权限

### 数据库问题

```bash
# 查看数据库位置
docker-compose exec api ls -la /app/data

# 备份数据库
docker-compose exec api cp /app/data/grain.db /app/data/grain.db.backup
```

## 性能优化

### 前端优化

- 启用 Gzip/Brotli 压缩
- 配置 CDN
- 启用浏览器缓存

### 后端优化

- 使用 `--release` 构建
- 配置数据库连接池
- 启用日志轮转

## 安全建议

1. 使用 HTTPS（Let's Encrypt）
2. 配置防火墙规则
3. 定期备份数据库
4. 限制 API 访问频率
5. 使用环境变量管理敏感信息

## 监控和日志

### 查看日志

```bash
# API 日志
docker-compose logs -f api

# Nginx 日志
docker-compose logs -f web
```

### 日志轮转

配置 Docker 日志驱动：

```yaml
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 相关文档

- [Desktop 应用文档](../desktop/README.md)
- [API 服务器文档](../api-server.md)
- [部署架构](./DEPLOYMENT.md)
