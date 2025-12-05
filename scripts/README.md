# 🔧 脚本工具说明

## Web 项目部署脚本

### build-and-deploy-web.sh

将 Next.js web 项目构建为静态文件并部署到 nginx 目录。

**功能**：
- 自动启用 Next.js 静态导出配置
- 检查并安装项目依赖
- 构建 web 项目（生产模式）
- 将构建产物复制到 nginx 目录（`/home/lotus/test-site`）
- 自动备份现有文件
- 设置正确的文件权限

**使用**：
```bash
cd /home/lotus/project/book2/novel-editor
bash scripts/build-and-deploy-web.sh
```

**部署目录**：
- 默认部署到：`/home/lotus/test-site`
- 与 nginx 443 端口配置的根目录一致

**下一步操作**：
部署完成后，执行：
```bash
sudo nginx -t              # 测试配置
sudo systemctl reload nginx # 重新加载 nginx
```

然后访问：`https://localhost` 或 `https://szlh.top`

**相关文档**：
- [Web 部署指南](../docs/deployment/WEB_DEPLOY_TO_NGINX.md)
- [Nginx HTTPS 配置](../docs/deployment/NGINX_HTTPS_SETUP.md)

## 版本号管理脚本

### bump-version.sh

自动递增版本号的脚本。

**功能**：
- 从根目录 `package.json` 读取当前版本
- 自动递增 patch 版本（0.1.0 → 0.1.1）
- 同步更新所有相关文件的版本号

**使用**：
```bash
./scripts/bump-version.sh
```

**更新的文件**：
- `package.json` (根目录)
- `apps/desktop/package.json`
- `apps/web/package.json`
- `apps/desktop/src-tauri/tauri.conf.json`
- `apps/desktop/src-tauri/Cargo.toml`
- `aur/PKGBUILD`
- `aur/PKGBUILD-binary`

### set-version.sh

手动设置统一版本号的脚本。

**功能**：
- 将所有相关文件的版本号设置为指定值
- 验证版本号格式（X.Y.Z）

**使用**：
```bash
./scripts/set-version.sh 0.1.0
```

**示例**：
```bash
# 设置版本号为 0.1.0
./scripts/set-version.sh 0.1.0

# 设置版本号为 1.0.0
./scripts/set-version.sh 1.0.0
```

