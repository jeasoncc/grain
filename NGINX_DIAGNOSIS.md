# Nginx 外网访问问题诊断报告

## 当前状态分析

### ✅ 已确认正常的部分

1. **Nginx 监听配置正确**
   - 监听 `0.0.0.0:80` ✅（监听所有网络接口）
   - 监听 `0.0.0.0:1420` ✅
   - 配置格式正确

2. **本地服务正常**
   - 本地访问返回 200 OK ✅
   - Nginx 服务正在运行 ✅

3. **网络信息**
   - 内网 IP: `192.168.5.4`
   - 外网 IP: `61.144.183.96`

### ⚠️ 可能的问题

## 问题排查清单

### 1. 防火墙检查（最可能的原因）

```bash
# 检查防火墙状态
sudo ufw status verbose

# 如果没有启用，启用并开放端口
sudo ufw enable
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 1420/tcp  # 如果你要用 1420 端口
sudo ufw reload

# 或者检查 iptables
sudo iptables -L INPUT -n -v | grep -E "80|1420"
```

**如果防火墙阻止了端口，需要添加规则：**
```bash
sudo ufw allow from any to any port 80 proto tcp
sudo ufw allow from any to any port 1420 proto tcp
```

### 2. 路由器端口转发配置检查

请确认路由器中的端口转发配置：

```
外部端口 → 内部 IP → 内部端口
   80    → 192.168.5.4 →   80
  或
  1420   → 192.168.5.4 →  1420
```

**检查点：**
- ✅ 内部 IP 是否正确：`192.168.5.4`
- ✅ 外部端口是否与内部端口一致
- ✅ 协议类型：TCP
- ✅ 端口转发是否启用

### 3. 运营商端口封禁（国内常见）

**重要**：国内很多运营商封禁了 80 和 443 端口！

**解决方案：**
- 使用非标准端口（如 8080, 8443, 1420 等）
- 或者使用域名 + 反向代理服务（Cloudflare）

### 4. SELinux 检查（如果使用）

```bash
# 检查 SELinux 状态
getenforce

# 如果启用了 SELinux，需要允许 nginx 访问网络
sudo setsebool -P httpd_can_network_connect 1
```

### 5. 测试端口连通性

```bash
# 在服务器上测试
nc -zv 0.0.0.0 80

# 从局域网其他机器测试（使用内网 IP）
curl -I http://192.168.5.4
telnet 192.168.5.4 80

# 从外网测试（使用外网 IP）
# 在外部网络执行：
curl -I http://61.144.183.96
telnet 61.144.183.96 80
```

## 推荐的解决方案

### 方案 1: 检查并修复防火墙（优先）

```bash
# 1. 检查防火墙状态
sudo ufw status

# 2. 如果防火墙已启用但没有开放端口，执行：
sudo ufw allow 80/tcp comment 'Nginx HTTP'
sudo ufw allow 443/tcp comment 'Nginx HTTPS'

# 3. 如果需要使用 1420 端口
sudo ufw allow 1420/tcp comment 'Nginx Custom Port'

# 4. 重新加载防火墙
sudo ufw reload

# 5. 验证
sudo ufw status numbered
```

### 方案 2: 使用非标准端口（如果 80 端口被封）

如果 80 端口被运营商封禁，建议使用非标准端口，如 8080：

```nginx
server {
    listen 8080;  # 使用非标准端口
    listen [::]:8080;
    server_name _;
    
    location / {
        root   /home/lotus/test-site;
        index  index.html index.htm;
    }
}
```

然后路由器端口转发设置为：
```
外部端口 8080 → 内部 IP 192.168.5.4 → 内部端口 8080
```

访问时使用：`http://61.144.183.96:8080`

### 方案 3: 针对你的 Next.js 网站的配置

如果你想让外网访问 Next.js 网站，需要配置反向代理：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name _;  # 或者你的域名
    
    # 日志
    access_log /var/log/nginx/novel-editor-access.log;
    error_log /var/log/nginx/novel-editor-error.log;
    
    location / {
        proxy_pass http://127.0.0.1:3000;  # Next.js 默认端口
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## 快速诊断脚本

运行以下命令进行完整诊断：

```bash
#!/bin/bash
echo "=== Nginx 配置诊断 ==="
echo ""
echo "1. Nginx 状态："
systemctl is-active nginx && echo "✅ Nginx 正在运行" || echo "❌ Nginx 未运行"

echo ""
echo "2. 监听端口："
ss -tlnp | grep -E ":80|:1420|:443" | grep nginx || echo "未找到 nginx 监听"

echo ""
echo "3. 防火墙状态："
sudo ufw status 2>/dev/null || echo "无法检查防火墙（需要 root）"

echo ""
echo "4. 本地访问测试："
curl -I http://localhost 2>&1 | head -1

echo ""
echo "5. 内网 IP："
hostname -I | awk '{print $1}'

echo ""
echo "6. 外网 IP："
curl -s ifconfig.me

echo ""
echo "7. 端口监听详情："
sudo ss -tlnp | grep nginx
```

## 下一步操作

### 步骤 1: 检查防火墙
```bash
sudo ufw status
# 如果没有开放 80 端口，执行：
sudo ufw allow 80/tcp
sudo ufw reload
```

### 步骤 2: 验证路由器配置
- 登录路由器管理界面
- 检查端口转发规则
- 确认：外部端口 80 → 内部 IP 192.168.5.4 → 内部端口 80

### 步骤 3: 测试连通性
```bash
# 从局域网测试
curl -I http://192.168.5.4

# 从外网测试（在外网机器上）
curl -I http://61.144.183.96
```

### 步骤 4: 如果 80 端口被封，改用非标准端口
```bash
# 修改 nginx 配置，使用 8080 或其他端口
# 然后路由器映射：外部 8080 → 内部 8080
```

## 常见问题 FAQ

### Q: 为什么本地能访问，外网不能？
A: 通常是防火墙阻止或路由器端口转发未正确配置。

### Q: 80 端口被运营商封禁怎么办？
A: 使用非标准端口（如 8080, 8888），或通过 Cloudflare 等 CDN 服务。

### Q: 如何确认端口是否开放？
A: 在外网使用 `telnet YOUR_IP 80` 或 `nc -zv YOUR_IP 80` 测试。

## 需要你提供的信息

为了更准确地诊断，请运行以下命令并提供输出：

```bash
# 1. 防火墙状态
sudo ufw status verbose

# 2. 防火墙规则
sudo ufw status numbered

# 3. Nginx 配置测试
sudo nginx -t

# 4. 端口监听详情
sudo ss -tlnp | grep nginx

# 5. 从内网测试
curl -v http://192.168.5.4
```



