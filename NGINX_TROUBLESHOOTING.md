# Nginx 外网访问问题排查指南

## 问题描述
外网无法访问网站，但已配置路由器端口映射。

## 排查步骤

### 1. 检查 Nginx 配置

#### 查看主配置文件
```bash
sudo cat /etc/nginx/nginx.conf
```

#### 查看站点配置
```bash
sudo ls -la /etc/nginx/sites-enabled/
sudo cat /etc/nginx/sites-enabled/*.conf
```

或者：
```bash
sudo ls -la /etc/nginx/conf.d/
sudo cat /etc/nginx/conf.d/*.conf
```

#### 检查配置语法
```bash
sudo nginx -t
```

### 2. 检查 Nginx 监听地址

**重要**: 确保 nginx 监听所有网络接口，而不是只监听 localhost。

#### 检查当前监听端口
```bash
sudo ss -tlnp | grep nginx
# 或
sudo netstat -tlnp | grep nginx
```

#### 正确的监听配置
```nginx
# ❌ 错误 - 只监听本地
listen 127.0.0.1:80;
listen localhost:80;

# ✅ 正确 - 监听所有接口
listen 80;
listen [::]:80;
listen *:80;
listen 0.0.0.0:80;
```

### 3. 检查防火墙设置

#### 检查防火墙状态
```bash
# Ubuntu/Debian (ufw)
sudo ufw status
sudo ufw status numbered

# CentOS/RHEL (firewalld)
sudo firewall-cmd --list-all

# 查看 iptables 规则
sudo iptables -L -n -v
```

#### 开放端口
```bash
# UFW
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# Firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 4. 检查 Nginx 服务状态

```bash
sudo systemctl status nginx
sudo systemctl is-active nginx
sudo systemctl is-enabled nginx
```

### 5. 检查端口是否被占用

```bash
sudo lsof -i :80
sudo lsof -i :443
```

### 6. 检查本地访问

```bash
# 本地访问测试
curl -I http://localhost
curl -I http://127.0.0.1

# 使用服务器内网 IP 测试
curl -I http://YOUR_INTERNAL_IP
```

### 7. 路由器配置检查清单

- ✅ 端口转发（端口映射）已配置
- ✅ 外部端口正确（通常是 80 或 443）
- ✅ 内部 IP 地址正确（服务器内网 IP）
- ✅ 内部端口正确（nginx 监听的端口）
- ✅ 协议类型正确（TCP）
- ✅ 路由器防火墙规则允许

### 8. 网络诊断

#### 检查服务器内网 IP
```bash
ip addr show
# 或
hostname -I
# 或
ifconfig
```

#### 检查外网 IP
```bash
curl ifconfig.me
# 或
curl ipinfo.io/ip
```

#### 从外网测试端口连通性
```bash
# 在外网机器上执行
telnet YOUR_PUBLIC_IP 80
# 或
nc -zv YOUR_PUBLIC_IP 80
```

### 9. 检查 Nginx 日志

```bash
# 访问日志
sudo tail -f /var/log/nginx/access.log

# 错误日志
sudo tail -f /var/log/nginx/error.log
```

### 10. 常见配置问题

#### 问题 1: Nginx 只监听 localhost
**解决**: 修改配置文件中的 `listen` 指令

```nginx
# 修改前
listen 127.0.0.1:80;

# 修改后
listen 80;
listen [::]:80;  # IPv6
```

#### 问题 2: 防火墙阻止
**解决**: 开放相应端口

#### 问题 3: 路由器端口转发配置错误
**解决**: 检查并重新配置路由器端口转发

#### 问题 4: 运营商封禁端口
**解决**: 
- 检查是否 80/443 端口被封（国内常见）
- 使用非标准端口（如 8080, 8443）
- 使用反向代理（Cloudflare 等）

### 11. 推荐的 Nginx 配置模板

```nginx
server {
    # 监听所有接口的 80 端口
    listen 80;
    listen [::]:80;
    
    # 服务器名称
    server_name your-domain.com www.your-domain.com;
    
    # 网站根目录
    root /var/www/html;
    index index.html index.htm;
    
    # 日志
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    
    # 默认文件
    location / {
        try_files $uri $uri/ =404;
    }
    
    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
    }
}
```

### 12. 针对 Next.js 应用的配置

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;
    
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

## 快速诊断命令

```bash
# 一键检查脚本
echo "=== Nginx 状态 ==="
sudo systemctl status nginx --no-pager | head -5

echo "=== 监听端口 ==="
sudo ss -tlnp | grep nginx

echo "=== 配置测试 ==="
sudo nginx -t

echo "=== 防火墙状态 ==="
sudo ufw status 2>/dev/null || sudo firewall-cmd --list-all 2>/dev/null

echo "=== 网络接口 ==="
ip addr show | grep "inet " | grep -v "127.0.0.1"
```

## 下一步行动

1. **先检查监听地址**: 确保 nginx 监听 `0.0.0.0:80` 而不是 `127.0.0.1:80`
2. **检查防火墙**: 确保端口已开放
3. **检查路由器配置**: 验证端口转发设置
4. **查看日志**: 检查 nginx 错误日志
5. **测试连通性**: 从外网测试端口是否开放

## 需要提供的信息

请运行以下命令并提供输出：

```bash
# 1. Nginx 配置
sudo cat /etc/nginx/sites-enabled/*.conf

# 2. 监听端口
sudo ss -tlnp | grep nginx

# 3. 防火墙状态
sudo ufw status

# 4. 本地 IP
hostname -I

# 5. 外网 IP
curl ifconfig.me
```

这样我可以更准确地帮你诊断问题。



