# Nginx HTTPS 配置 - 最简单的方法

你已经有了：
- ✅ 证书文件：`/home/lotus/localhost+2.pem`
- ✅ 私钥文件：`/home/lotus/localhost+2-key.pem`
- ✅ Nginx 已安装并运行

## 🎯 最简单的方法（3 步）

### 步骤 1: 编辑 nginx 配置文件

```bash
sudo nano /etc/nginx/nginx.conf
```

### 步骤 2: 添加 HTTPS 配置

在 `http {}` 块内，找到你的服务器配置（比如你已有的 1420 端口配置），在它后面添加以下配置：

```nginx
# HTTPS 服务器配置
server {
    listen       443 ssl http2;
    listen       [::]:443 ssl http2;
    server_name  localhost 127.0.0.1;

    ssl_certificate      /home/lotus/localhost+2.pem;
    ssl_certificate_key  /home/lotus/localhost+2-key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_session_cache    shared:SSL:10m;
    ssl_session_timeout  10m;

    root   /home/lotus/test-site;  # 修改为你的网站目录
    index  index.html index.htm;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

**或者**，如果你想启用 HTTP 自动重定向到 HTTPS，可以取消注释配置文件底部的 HTTPS 服务器块（第 108-127 行），并修改证书路径：

```nginx
server {
    listen       443 ssl;
    server_name  localhost;

    ssl_certificate      /home/lotus/localhost+2.pem;
    ssl_certificate_key  /home/lotus/localhost+2-key.pem;

    ssl_session_cache    shared:SSL:1m;
    ssl_session_timeout  5m;

    ssl_ciphers  HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers  on;

    root   /home/lotus/test-site;  # 修改这里
    index  index.html index.htm;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

### 步骤 3: 测试并重新加载

```bash
# 测试配置
sudo nginx -t

# 如果测试通过，重新加载 nginx
sudo systemctl reload nginx
```

### 步骤 4: 测试访问

```bash
# 使用 curl 测试
curl -k https://localhost

# 浏览器访问
# https://localhost
```

## 📝 完整配置示例

如果你想看完整的配置块，可以参考：

```bash
cat /home/lotus/project/book2/novel-editor/docs/deployment/nginx-https-config-block.conf
```

## 🔍 验证配置

```bash
# 1. 检查配置语法
sudo nginx -t

# 2. 检查 443 端口是否监听
sudo ss -tlnp | grep :443

# 3. 测试访问
curl -k https://localhost

# 4. 查看日志（如果有问题）
sudo tail -f /var/log/nginx/error.log
```

## ⚠️ 注意事项

1. **证书路径**：确保使用绝对路径 `/home/lotus/localhost+2.pem`
2. **文件权限**：私钥文件应该是 600 权限（`chmod 600 localhost+2-key.pem`）
3. **网站目录**：记得修改 `root` 指令为你的实际网站目录
4. **浏览器警告**：首次访问时浏览器可能显示警告，这是因为使用的是本地证书。如果已经运行了 `mkcert -install`，警告应该不会出现

## 🎉 完成！

配置完成后，你就可以通过 `https://localhost` 访问你的网站了！


