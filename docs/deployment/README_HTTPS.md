# Nginx HTTPS 配置文档索引

你已经使用 mkcert 生成了本地 HTTPS 证书，现在需要配置 nginx 使用这些证书。

## 📚 文档导航

根据你的需求选择适合的文档：

### 🚀 快速开始（推荐）

1. **[最简单的方法](./NGINX_HTTPS_SIMPLE_GUIDE.md)** - 3 步配置，直接编辑 nginx.conf
   - 最简单直接
   - 适合快速配置

2. **[快速配置指南](./NGINX_HTTPS_QUICK_START.md)** - 使用自动化脚本或手动配置
   - 提供自动化脚本
   - 包含手动配置步骤

### 📖 详细文档

3. **[完整配置指南](./NGINX_HTTPS_SETUP.md)** - 详细的配置说明和故障排除
   - 完整的配置选项
   - 故障排除指南
   - 最佳实践

### 📄 配置文件示例

4. **[配置块示例](./nginx-https-config-block.conf)** - 可直接复制的配置块
5. **[完整配置示例](./nginx-https.conf.example)** - 完整的服务器配置示例

## 🎯 你的证书信息

- **证书文件**: `/home/lotus/localhost+2.pem`
- **私钥文件**: `/home/lotus/localhost+2-key.pem`
- **有效期至**: 2028-03-05
- **支持的域名**: localhost, 127.0.0.1, ::1

## ⚡ 最快配置方法

如果你想最快配置，直接运行：

```bash
# 方法 1: 使用自动化脚本
bash /home/lotus/project/book2/novel-editor/scripts/setup-nginx-https.sh

# 方法 2: 手动编辑配置文件（3步）
sudo nano /etc/nginx/nginx.conf
# 然后添加 HTTPS 配置块（参考 NGINX_HTTPS_SIMPLE_GUIDE.md）

# 测试并重载
sudo nginx -t && sudo systemctl reload nginx
```

## 📞 需要帮助？

查看 [完整配置指南](./NGINX_HTTPS_SETUP.md) 中的"常见问题排查"部分。


