# Grain 简单部署指南（无 Docker）

最简单的 Web 部署方式：直接编译运行，不用 Docker。

## 方案 1：本地编译 + 直接运行（推荐）

### 1. 构建前端

```bash
cd apps/desktop
bun run build:prod
```

前端构建产物在 `apps/desktop/dist/`

### 2. 编译 Rust 后端

```bash
cd apps/api-rust
cargo build --release
```

二进制文件在 `apps/api-rust/target/release/grain-api`

### 3. 部署到服务器

```bash
# 上传前端静态文件
scp -r apps/desktop/dist/* user@server:/var/www/grain/

# 上传 Rust 二进制
scp apps/api-rust/target/release/grain-api user@server:/opt/grain/

# 上传 rust-core（如果需要）
# Rust 编译后是静态链接，通常不需要
```

### 4. 在服务器上运行

```bash
# 设置环境变量
export GRAIN_HOST=0.0.0.0
export GRAIN_PORT=3030
export RUST_LOG=info

# 运行后端
/opt/grain/grain-api
```

### 5. 配置 Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # 前端静态文件
    location / {
        root /var/www/grain;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3030/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 方案 2：使用 Systemd 服务

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
sudo systemctl status grain-api
```

## 方案 3：一键部署脚本

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🌾 Grain 部署开始..."

# 1. 构建前端
echo "📦 构建前端..."
cd apps/desktop
bun run build:prod
cd ../..

# 2. 编译后端
echo "🦀 编译 Rust 后端..."
cd apps/api-rust
cargo build --release
cd ../..

# 3. 上传到服务器
echo "📤 上传文件..."
SERVER="user@your-server.com"

# 上传前端
rsync -avz --delete apps/desktop/dist/ $SERVER:/var/www/grain/

# 上传后端
scp apps/api-rust/target/release/grain-api $SERVER:/opt/grain/

# 4. 重启服务
echo "🔄 重启服务..."
ssh $SERVER "sudo systemctl restart grain-api"

echo "✅ 部署完成！"
```

## 为什么不用 Docker？

1. **Rust 编译后是静态二进制**：不需要运行时依赖
2. **避免 9GB 构建上下文**：不需要复制整个 monorepo
3. **更简单**：直接运行，没有容器开销
4. **更快**：不需要构建镜像

## 如果一定要用 Docker

只在 `apps/api-rust` 目录内构建，不要在项目根目录：

```bash
# 进入 api-rust 目录
cd apps/api-rust

# 创建简单的 Dockerfile
cat > Dockerfile.simple << 'EOF'
FROM rust:1.83-slim as builder
WORKDIR /build
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=builder /build/target/release/grain-api /app/grain-api
CMD ["/app/grain-api"]
EOF

# 构建（只会复制 api-rust 目录，几 MB）
docker build -f Dockerfile.simple -t grain-api .
```

但这样会失败，因为缺少 `packages/rust-core`。

## 最佳实践

**对于 Turborepo + Rust 项目：**
- ✅ 本地编译 Rust
- ✅ 上传二进制到服务器
- ✅ 使用 Systemd 管理服务
- ❌ 不要用 Docker（除非你真的需要容器化）

**如果需要容器化：**
- 使用 GitHub Actions 编译
- 只上传二进制到 Docker 镜像
- 不要在本地构建 Docker 镜像
