# PostgreSQL 数据库设置指南

## 📋 概述

API 服务器使用 PostgreSQL 数据库存储访客信息，通过 Drizzle ORM 进行操作。

## 🔧 安装 PostgreSQL

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Arch Linux

```bash
sudo pacman -S postgresql

# 初始化数据库（首次安装）
sudo -u postgres initdb -D /var/lib/postgres/data

# 启动服务
sudo systemctl start postgresql.service
sudo systemctl enable postgresql.service
```

## 🗄️ 创建数据库

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 创建数据库
CREATE DATABASE visitor_db;

# 创建用户（可选）
CREATE USER visitor_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE visitor_db TO visitor_user;

# 退出
\q
```

## ⚙️ 配置环境变量

在 `apps/api/` 目录创建 `.env` 文件：

```env
DATABASE_URL=postgresql://visitor_user:your_secure_password@localhost:5432/visitor_db
PORT=4001
```

## 🚀 初始化数据库 Schema

```bash
cd /home/lotus/project/book2/novel-editor/apps/api

# 安装依赖
bun install

# 生成迁移文件
bun run db:generate

# 运行迁移
bun run db:migrate
```

## ✅ 验证设置

```bash
# 检查表是否存在
sudo -u postgres psql -d visitor_db -c "\dt"
```

## 📚 相关文档

- [API 项目 README](../apps/api/README.md)
