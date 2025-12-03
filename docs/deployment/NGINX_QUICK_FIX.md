# Nginx 外网访问问题 - 快速修复指南

## 📊 当前状态

根据检查结果：

- ✅ **Nginx 配置正确**: 监听 `0.0.0.0:80`（所有接口）
- ✅ **本地访问正常**: 返回 200 OK
- ✅ **服务正在运行**: Nginx 正常运行
- 🌐 **内网 IP**: `192.168.5.4`
- 🌐 **外网 IP**: `61.144.183.96`

## 🔍 最可能的问题

### 1. 防火墙阻止（最常见）⭐

**检查方法：**
```bash
sudo ufw status
```

**如果防火墙启用了但没有开放 80 端口，执行：**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

### 2. 运营商封禁 80 端口（国内常见）⭐

**国内很多运营商封禁了 80 和 443 端口！**

**解决方案：使用非标准端口**

修改 nginx 配置使用 8080 或 1420 端口（你已经配置了 1420）：

```bash
# 路由器端口转发设置为：
外部端口 1420 → 内部 IP 192.168.5.4 → 内部端口 1420
```

然后外网访问：`http://61.144.183.96:1420`

### 3. 路由器端口转发配置错误

**检查清单：**
- [ ] 外部端口：80（或 1420）
- [ ] 内部 IP：`192.168.5.4` ✅
- [ ] 内部端口：80（或 1420）
- [ ] 协议：TCP
- [ ] 状态：已启用

## 🚀 快速修复步骤

### 步骤 1: 检查并修复防火墙

```bash
# 查看防火墙状态
sudo ufw status

# 如果防火墙启用，开放端口
sudo ufw allow 80/tcp comment 'Nginx HTTP'
sudo ufw allow 443/tcp comment 'Nginx HTTPS'
sudo ufw allow 1420/tcp comment 'Nginx Custom Port'

# 重新加载
sudo ufw reload

# 验证
sudo ufw status numbered
```

### 步骤 2: 测试端口连通性

```bash
# 在服务器上测试端口是否监听
sudo ss -tlnp | grep ":80\|:1420"

# 从局域网其他设备测试（替换为你的设备 IP）
curl -I http://192.168.5.4

# 从外网测试（在外网设备上执行）
curl -I http://61.144.183.96
curl -I http://61.144.183.96:1420
```

### 步骤 3: 如果 80 端口被封，使用 1420 端口

你的 nginx 已经配置了 1420 端口：

```nginx
server {
    listen 1420;
    server_name _;
    root /home/lotus/test-site;
}
```

**路由器端口转发配置：**
```
服务名称: Web Server
外部端口: 1420
内部 IP: 192.168.5.4
内部端口: 1420
协议: TCP
状态: 启用
```

**外网访问：**
```
http://61.144.183.96:1420
```

### 步骤 4: 查看日志排查

```bash
# 查看 Nginx 访问日志
sudo tail -f /var/log/nginx/access.log

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 从外网访问时，观察日志是否有请求记录
```

## 🎯 推荐的配置方案

### 方案 A: 使用非标准端口（推荐，避免端口封禁）

**1. 修改 Nginx 配置（如果需要）**

```bash
sudo nano /etc/nginx/nginx.conf
```

确保有类似配置：
```nginx
server {
    listen 1420;
    listen [::]:1420;
    server_name _;
    
    root /home/lotus/test-site;
    index index.html index.htm;
}
```

**2. 重启 Nginx**
```bash
sudo nginx -t  # 测试配置
sudo systemctl reload nginx  # 重新加载
```

**3. 配置路由器**
```
外部端口: 1420
内部 IP: 192.168.5.4
内部端口: 1420
```

**4. 开放防火墙端口**
```bash
sudo ufw allow 1420/tcp
sudo ufw reload
```

### 方案 B: 使用域名 + Cloudflare（最佳方案）

1. 购买域名
2. 配置 DNS 指向你的 IP
3. 使用 Cloudflare 作为反向代理（可以绕过端口封禁）
4. 配置 SSL 证书

## 📝 快速诊断命令

运行诊断脚本：
```bash
bash /home/lotus/project/book2/novel-editor/nginx-fix.sh
```

或者手动运行这些命令：

```bash
# 1. 防火墙状态
sudo ufw status verbose

# 2. 端口监听
sudo ss -tlnp | grep nginx

# 3. 本地测试
curl -I http://localhost
curl -I http://192.168.5.4

# 4. 配置测试
sudo nginx -t

# 5. 查看日志
sudo tail -20 /var/log/nginx/error.log
```

## ✅ 检查清单

按照这个清单逐一检查：

- [ ] **防火墙已开放 80/1420 端口**
  ```bash
  sudo ufw allow 80/tcp
  sudo ufw allow 1420/tcp
  sudo ufw reload
  ```

- [ ] **路由器端口转发正确配置**
  - 外部端口: 80 或 1420
  - 内部 IP: 192.168.5.4
  - 内部端口: 80 或 1420

- [ ] **Nginx 配置正确**
  ```bash
  sudo nginx -t
  sudo systemctl reload nginx
  ```

- [ ] **从局域网测试成功**
  ```bash
  curl -I http://192.168.5.4
  ```

- [ ] **从外网测试端口连通性**
  ```bash
  # 在外网机器执行
  telnet 61.144.183.96 80
  # 或
  nc -zv 61.144.183.96 80
  ```

## 🔧 最可能需要的操作

基于你的情况，**最可能的问题和解决方案**：

### 问题 1: 防火墙阻止

```bash
# 检查
sudo ufw status

# 如果防火墙启用，执行：
sudo ufw allow 80/tcp
sudo ufw allow 1420/tcp
sudo ufw reload
```

### 问题 2: 80 端口被封禁（国内常见）

**使用你已经配置的 1420 端口：**

1. **路由器端口转发设置为：**
   ```
   外部 1420 → 192.168.5.4:1420
   ```

2. **开放防火墙：**
   ```bash
   sudo ufw allow 1420/tcp
   sudo ufw reload
   ```

3. **外网访问：**
   ```
   http://61.144.183.96:1420
   ```

## 📞 如果还是无法访问

请提供以下信息：

1. **防火墙状态**
   ```bash
   sudo ufw status verbose
   ```

2. **端口监听详情**
   ```bash
   sudo ss -tlnp | grep nginx
   ```

3. **从外网测试结果**
   ```bash
   # 在外网机器上执行
   curl -v http://61.144.183.96
   curl -v http://61.144.183.96:1420
   ```

4. **路由器端口转发配置截图或详细信息**

5. **Nginx 日志（如果有访问尝试）**
   ```bash
   sudo tail -50 /var/log/nginx/access.log
   sudo tail -50 /var/log/nginx/error.log
   ```

这样我可以更准确地帮你定位问题！





