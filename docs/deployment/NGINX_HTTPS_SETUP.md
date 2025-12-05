# Nginx HTTPS 本地证书配置指南

## 📜 证书信息

你已经使用 mkcert 生成了本地 HTTPS 证书：

- **证书文件**: `/home/lotus/localhost+2.pem`
- **私钥文件**: `/home/lotus/localhost+2-key.pem`
- **有效域名**: `localhost`, `127.0.0.1`, `::1`
- **有效期至**: 2028年3月5日

## 🔐 第一步：准备证书文件（推荐）

为了安全和管理方便，建议将证书文件移动到专门的目录：

```bash
# 创建证书目录
sudo mkdir -p /etc/nginx/ssl

# 复制证书文件（保留原文件作为备份）
sudo cp /home/lotus/localhost+2.pem /etc/nginx/ssl/localhost.pem
sudo cp /home/lotus/localhost+2-key.pem /etc/nginx/ssl/localhost-key.pem

# 设置正确的权限（重要！）
sudo chmod 644 /etc/nginx/ssl/localhost.pem      # 证书文件可读
sudo chmod 600 /etc/nginx/ssl/localhost-key.pem  # 私钥文件仅所有者可读
sudo chown root:root /etc/nginx/ssl/*.pem        # 设置所有者为 root
```

## 📝 第二步：配置 Nginx HTTPS

### 方案 A：修改现有配置（如果已有 HTTP 配置）

如果你已经有 HTTP 的 nginx 配置，可以添加 HTTPS 支持：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name localhost;
    
    # HTTP 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name localhost;
    
    # SSL 证书配置
    ssl_certificate /etc/nginx/ssl/localhost.pem;
    ssl_certificate_key /etc/nginx/ssl/localhost-key.pem;
    
    # SSL 配置优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 你的网站根目录
    root /home/lotus/test-site;
    index index.html index.htm;
    
    location / {
        try_files $uri $uri/ =404;
    }
}
```

### 方案 B：创建新的 HTTPS 配置（推荐）

创建一个新的配置文件 `/etc/nginx/sites-available/localhost-https`：

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name localhost 127.0.0.1;
    
    # SSL 证书配置
    ssl_certificate /home/lotus/localhost+2.pem;
    ssl_certificate_key /home/lotus/localhost+2-key.pem;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 你的网站根目录（根据实际情况修改）
    root /home/lotus/test-site;
    index index.html index.htm;
    
    # 日志配置
    access_log /var/log/nginx/localhost-https-access.log;
    error_log /var/log/nginx/localhost-https-error.log;
    
    location / {
        try_files $uri $uri/ =404;
    }
}

# HTTP 重定向到 HTTPS（可选）
server {
    listen 80;
    listen [::]:80;
    server_name localhost 127.0.0.1;
    
    return 301 https://$server_name$request_uri;
}
```

## 🚀 第三步：启用配置

### 如果是使用 sites-available/sites-enabled 结构：

```bash
# 创建符号链接启用配置
sudo ln -s /etc/nginx/sites-available/localhost-https /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 如果测试通过，重新加载 nginx
sudo systemctl reload nginx
```

### 如果是使用 conf.d 结构：

```bash
# 直接复制配置文件
sudo cp localhost-https.conf /etc/nginx/conf.d/

# 测试配置
sudo nginx -t

# 重新加载 nginx
sudo systemctl reload nginx
```

## 🧪 第四步：测试 HTTPS

### 1. 测试配置语法

```bash
sudo nginx -t
```

应该看到：
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 2. 测试 HTTPS 访问

```bash
# 使用 curl 测试
curl -k https://localhost

# 或使用浏览器访问
# https://localhost
# https://127.0.0.1
```

### 3. 检查端口监听

```bash
sudo ss -tlnp | grep :443
```

应该看到 nginx 监听 443 端口。

## 🔧 常见问题排查

### 问题 1: 证书权限错误

**错误信息**: `SSL_CTX_use_PrivateKey_file("/path/to/key") failed`

**解决方案**:
```bash
sudo chmod 600 /etc/nginx/ssl/localhost-key.pem
sudo chown root:root /etc/nginx/ssl/localhost-key.pem
```

### 问题 2: 证书路径错误

**错误信息**: `certificate "/path/to/cert" not found`

**解决方案**: 检查证书路径是否正确，使用绝对路径。

### 问题 3: SSL 模块未启用

**错误信息**: `unknown directive "ssl_certificate"`

**解决方案**:
```bash
# 检查 nginx 是否编译了 SSL 模块
nginx -V 2>&1 | grep -o with-http_ssl_module

# 如果没有，需要重新编译 nginx 或安装包含 SSL 的版本
```

### 问题 4: 端口被占用

**错误信息**: `bind() to 0.0.0.0:443 failed`

**解决方案**:
```bash
# 检查哪个进程占用了 443 端口
sudo lsof -i :443

# 或使用
sudo ss -tlnp | grep :443
```

## 📋 快速配置脚本

创建一个快速配置脚本 `setup-nginx-https.sh`：

```bash
#!/bin/bash

CERT_DIR="/etc/nginx/ssl"
CERT_SOURCE="/home/lotus/localhost+2.pem"
KEY_SOURCE="/home/lotus/localhost+2-key.pem"

echo "=== 配置 Nginx HTTPS ==="

# 1. 创建证书目录
sudo mkdir -p $CERT_DIR

# 2. 复制证书文件
sudo cp $CERT_SOURCE $CERT_DIR/localhost.pem
sudo cp $KEY_SOURCE $CERT_DIR/localhost-key.pem

# 3. 设置权限
sudo chmod 644 $CERT_DIR/localhost.pem
sudo chmod 600 $CERT_DIR/localhost-key.pem
sudo chown root:root $CERT_DIR/*.pem

echo "✅ 证书文件已准备完成"

# 4. 测试 nginx 配置
echo "测试 nginx 配置..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ 配置测试通过"
    echo "运行以下命令重新加载 nginx:"
    echo "  sudo systemctl reload nginx"
else
    echo "❌ 配置测试失败，请检查配置文件"
fi
```

## 🎯 完整配置示例（适用于你的项目）

基于你的项目结构，这里是一个完整的配置示例：

```nginx
# /etc/nginx/sites-available/novel-editor-https

# HTTPS 服务器配置
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name localhost 127.0.0.1;
    
    # SSL 证书
    ssl_certificate /home/lotus/localhost+2.pem;
    ssl_certificate_key /home/lotus/localhost+2-key.pem;
    
    # SSL 优化配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 网站根目录（根据你的实际路径修改）
    root /home/lotus/test-site;
    index index.html index.htm;
    
    # 日志
    access_log /var/log/nginx/novel-editor-https-access.log;
    error_log /var/log/nginx/novel-editor-https-error.log;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    # 如果需要代理到后端服务（例如 Next.js）
    # location /api {
    #     proxy_pass http://127.0.0.1:3000;
    #     proxy_set_header Host $host;
    #     proxy_set_header X-Real-IP $remote_addr;
    # }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name localhost 127.0.0.1;
    
    return 301 https://$server_name$request_uri;
}
```

## ✅ 验证清单

配置完成后，使用以下清单验证：

- [ ] 证书文件存在且权限正确
- [ ] nginx 配置语法测试通过 (`sudo nginx -t`)
- [ ] nginx 已重新加载 (`sudo systemctl reload nginx`)
- [ ] 443 端口正在监听 (`sudo ss -tlnp | grep :443`)
- [ ] 可以通过 `https://localhost` 访问
- [ ] 浏览器显示证书有效（不会有安全警告，因为是本地证书）
- [ ] HTTP 自动重定向到 HTTPS（如果配置了重定向）

## 🔗 相关资源

- [mkcert 文档](https://github.com/FiloSottile/mkcert)
- [Nginx SSL 配置文档](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Nginx 安全配置最佳实践](https://ssl-config.mozilla.org/#server=nginx)


