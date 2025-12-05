# Web 项目部署到 Nginx 指南

本指南说明如何将 Next.js web 项目打包并部署到 nginx 的 443 端口配置目录。

## 📋 前置条件

- ✅ 已完成 nginx HTTPS 配置（参考 [NGINX_HTTPS_SETUP.md](./NGINX_HTTPS_SETUP.md)）
- ✅ 证书文件已配置
- ✅ nginx 根目录已确定（默认：`/home/lotus/test-site`）

## 🚀 快速部署（推荐）

使用自动化脚本一键部署：

```bash
# 方法 1: 简单部署脚本（静态导出）
bash /home/lotus/project/book2/novel-editor/scripts/deploy-web-simple.sh

# 方法 2: 完整部署脚本（支持多种模式）
bash /home/lotus/project/book2/novel-editor/scripts/deploy-web-to-nginx.sh
```

## 📦 部署方式

### 方式 1: 静态导出（推荐）

将 Next.js 应用构建为静态文件，直接放在 nginx 目录下。

**优点**：
- ✅ 部署简单，无需运行 Node.js 服务器
- ✅ 性能好，nginx 直接服务静态文件
- ✅ 资源占用少

**步骤**：

1. **启用静态导出配置**

   脚本会自动修改 `next.config.ts` 启用静态导出，或手动修改：

   ```typescript
   // apps/web/next.config.ts
   const nextConfig: NextConfig = {
     output: "export",  // 启用静态导出
     // ... 其他配置
   };
   ```

2. **构建项目**

   ```bash
   cd /home/lotus/project/book2/novel-editor
   bun web:build:prod
   # 或
   cd apps/web
   bun run build
   ```

3. **复制到 nginx 目录**

   ```bash
   sudo mkdir -p /home/lotus/test-site
   sudo cp -r apps/web/out/* /home/lotus/test-site/
   sudo chown -R $USER:$USER /home/lotus/test-site
   ```

4. **配置 nginx**

   确保 nginx 配置指向正确的目录：

   ```nginx
   server {
       listen 443 ssl http2;
       server_name localhost;
       
       ssl_certificate /home/lotus/localhost+2.pem;
       ssl_certificate_key /home/lotus/localhost+2-key.pem;
       
       root /home/lotus/test-site;  # 指向部署目录
       index index.html;
       
       location / {
           try_files $uri $uri/ =404;
       }
   }
   ```

5. **重新加载 nginx**

   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### 方式 2: 反向代理

运行 Next.js 服务器，nginx 作为反向代理。

**优点**：
- ✅ 支持服务端渲染 (SSR)
- ✅ 支持 API 路由
- ✅ 更灵活

**步骤**：

1. **构建项目（标准模式）**

   ```bash
   cd /home/lotus/project/book2/novel-editor/apps/web
   bun run build
   ```

2. **启动 Next.js 服务器**

   ```bash
   cd /home/lotus/project/book2/novel-editor/apps/web
   bun start
   # 或
   NODE_ENV=production bun start
   ```

   Next.js 会在 `http://localhost:3000` 运行。

3. **配置 nginx 反向代理**

   ```nginx
   server {
       listen 443 ssl http2;
       server_name localhost;
       
       ssl_certificate /home/lotus/localhost+2.pem;
       ssl_certificate_key /home/lotus/localhost+2-key.pem;
       
       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **重新加载 nginx**

   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## 🔧 手动部署步骤

如果不想使用脚本，可以手动执行：

### 1. 修改 Next.js 配置启用静态导出

编辑 `apps/web/next.config.ts`：

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",  // 添加这一行
  images: {
    unoptimized: true,
  },
  // ... 其他配置保持不变
};

export default nextConfig;
```

### 2. 构建项目

```bash
cd /home/lotus/project/book2/novel-editor

# 安装依赖（如果还没有）
bun install

# 构建 web 项目
bun web:build:prod
# 或
cd apps/web
NODE_ENV=production bun run build
```

构建完成后，静态文件会在 `apps/web/out/` 目录。

### 3. 部署到 nginx 目录

```bash
# 备份现有文件（如果有）
sudo mv /home/lotus/test-site /home/lotus/test-site.backup.$(date +%Y%m%d)

# 创建目录
sudo mkdir -p /home/lotus/test-site

# 复制文件
sudo cp -r /home/lotus/project/book2/novel-editor/apps/web/out/* /home/lotus/test-site/

# 设置权限
sudo chown -R $USER:$USER /home/lotus/test-site
sudo chmod -R 755 /home/lotus/test-site
```

### 4. 验证 nginx 配置

```bash
# 检查配置语法
sudo nginx -t

# 查看 nginx 配置中的 root 目录
sudo grep -r "root" /etc/nginx/nginx.conf | grep -v "^#"
```

确保 nginx 配置中的 `root` 指向 `/home/lotus/test-site`。

### 5. 重新加载 nginx

```bash
sudo systemctl reload nginx
```

### 6. 测试访问

```bash
# 使用 curl 测试
curl -k https://localhost

# 浏览器访问
# https://localhost
```

## 📝 配置文件位置

- **Next.js 配置**: `apps/web/next.config.ts`
- **静态导出配置**: `apps/web/next.config.export.ts`
- **Nginx 配置**: `/etc/nginx/nginx.conf`
- **部署目录**: `/home/lotus/test-site`（根据你的 nginx 配置修改）

## 🔄 更新部署

当代码更新后，重新部署：

```bash
# 使用脚本自动部署
bash /home/lotus/project/book2/novel-editor/scripts/deploy-web-simple.sh
```

或者手动：

```bash
cd /home/lotus/project/book2/novel-editor/apps/web
bun run build
sudo cp -r out/* /home/lotus/test-site/
sudo systemctl reload nginx
```

## ⚠️ 常见问题

### 问题 1: 构建失败

**错误**: `Error: Image Optimization using Next.js' default loader is not compatible with 'output: export'`

**解决**: 确保配置中有 `images: { unoptimized: true }`

### 问题 2: 404 错误

**原因**: Next.js 路由没有正确配置

**解决**: 
- 检查 `trailingSlash` 配置
- 确保 nginx 配置了正确的 `try_files` 指令

### 问题 3: 资源文件 404

**原因**: 静态资源路径不正确

**解决**: 检查 `next.config.ts` 中的 `basePath` 和 `assetPrefix` 配置

### 问题 4: 页面空白

**原因**: JavaScript 文件加载失败

**解决**:
- 检查浏览器控制台错误
- 确认所有文件都已正确复制
- 检查文件权限

## 📊 部署检查清单

部署完成后，确认：

- [ ] 构建成功，`out/` 目录存在
- [ ] 文件已复制到 nginx 目录
- [ ] nginx 配置指向正确的目录
- [ ] nginx 配置测试通过 (`sudo nginx -t`)
- [ ] nginx 已重新加载
- [ ] 可以通过 `https://localhost` 访问
- [ ] 所有页面正常显示
- [ ] 静态资源（CSS、JS、图片）正常加载

## 🔗 相关文档

- [Nginx HTTPS 配置指南](./NGINX_HTTPS_SETUP.md)
- [Nginx HTTPS 快速开始](./NGINX_HTTPS_QUICK_START.md)
- [Web 项目开发文档](../web/README.md)

