# API 服务器快速开始指南

## 🚀 快速设置（5 步）

### 步骤 1: 安装 PostgreSQL

```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Arch Linux
sudo pacman -S postgresql
sudo systemctl start postgresql.service
```

### 步骤 2: 创建数据库

```bash
sudo -u postgres psql
CREATE DATABASE visitor_db;
\q
```

### 步骤 3: 配置环境变量

```bash
cd /home/lotus/project/book2/novel-editor/apps/api
cp env.example .env
```

编辑 `.env` 文件：

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/visitor_db
PORT=4001
```

### 步骤 4: 安装依赖并初始化数据库

```bash
# 在仓库根目录安装，再进入 apps/api
bun install --frozen-lockfile
cd apps/api
bun run db:push  # 直接推送 schema 到数据库
```

### 步骤 5: 启动服务器

```bash
bun run dev
```

服务器将在 `http://localhost:4001` 运行。

## 📚 更多信息

- [完整 README](./README.md)
- [PostgreSQL 设置指南](../docs/deployment/POSTGRES_SETUP.md)
- [部署指南](../docs/deployment/API_ADMIN_SETUP.md)

