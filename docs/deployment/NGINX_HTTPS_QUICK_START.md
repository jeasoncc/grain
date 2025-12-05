# Nginx HTTPS 快速配置指南

## 🚀 快速开始（3 步配置）

### 方法一：使用自动化脚本（推荐）

```bash
# 运行自动化配置脚本
bash /home/lotus/project/book2/novel-editor/scripts/setup-nginx-https.sh
```

脚本会自动：
- ✅ 检查证书文件
- ✅ 生成 nginx 配置
- ✅ 测试配置语法
- ✅ 重新加载 nginx

### 方法二：手动配置

#### 步骤 1: 创建配置文件

将以下内容保存到 `/etc/nginx/conf.d/localhost-https.conf`：

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name localhost 127.0.0.1;
    
    ssl_certificate /home/lotus/localhost+2.pem;
    ssl_certificate_key /home/lotus/localhost+2-key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    root /home/lotus/test-site;  # 修改为你的网站目录
    index index.html index.htm;
    
    location / {
        try_files $uri $uri/ =404;
    }
}
```

#### 步骤 2: 测试配置

```bash
sudo nginx -t
```

#### 步骤 3: 重新加载 nginx

```bash
sudo systemctl reload nginx
```

### 步骤 3: 测试访问

```bash
# 使用 curl 测试
curl -k https://localhost

# 或浏览器访问
# https://localhost
```

## 📋 配置文件位置参考

根据你的 nginx 安装方式，配置文件可能在不同位置：

- **标准安装**: `/etc/nginx/sites-available/` 和 `/etc/nginx/sites-enabled/`
- **包管理器安装**: `/etc/nginx/conf.d/`
- **自定义安装**: 查看 `/etc/nginx/nginx.conf` 中的 `include` 指令

## 🔍 验证配置

```bash
# 1. 检查配置语法
sudo nginx -t

# 2. 检查端口监听
sudo ss -tlnp | grep :443

# 3. 测试 HTTPS 访问
curl -k https://localhost

# 4. 查看日志
sudo tail -f /var/log/nginx/error.log
```

## 📝 完整文档

详细配置说明和故障排除，请查看：

- [完整配置指南](./NGINX_HTTPS_SETUP.md)
- [配置示例文件](./nginx-https.conf.example)

## ⚠️ 常见问题

**Q: 浏览器显示"不安全"警告？**  
A: 这是正常的，因为使用的是本地证书。需要在浏览器中信任 mkcert 的根证书。运行：
```bash
mkcert -install
```

**Q: 配置文件应该放在哪里？**  
A: 查看 `/etc/nginx/nginx.conf` 中的 `include` 指令，通常是在 `/etc/nginx/conf.d/` 或 `/etc/nginx/sites-available/`

**Q: 如何添加 HTTP 到 HTTPS 的重定向？**  
查看配置示例文件中的 HTTP 重定向配置块。


