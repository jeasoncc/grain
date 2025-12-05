# PostgreSQL 修复步骤

## 🔧 问题

PostgreSQL 服务启动失败，错误提示：数据库格式版本过旧。

## ✅ 修复方法

### 方法 1: 使用修复脚本（推荐）

```bash
bash /home/lotus/project/book2/novel-editor/scripts/修复PostgreSQL.sh
```

### 方法 2: 手动执行命令

请按顺序执行以下命令：

```bash
# 1. 停止 PostgreSQL 服务
sudo systemctl stop postgresql.service

# 2. 删除旧数据目录（会丢失数据）
sudo rm -rf /var/lib/postgres/data

# 3. 初始化新的数据库集群
sudo -u postgres initdb -D /var/lib/postgres/data --locale=C --encoding=UTF8

# 4. 启动 PostgreSQL 服务
sudo systemctl start postgresql.service
sudo systemctl enable postgresql.service

# 5. 验证服务状态
sudo systemctl status postgresql.service

# 6. 创建项目数据库
sudo -u postgres psql -c "CREATE DATABASE visitor_db;"

# 7. 验证数据库创建
sudo -u postgres psql -l | grep visitor_db
```

## 📝 修复后的配置

### 1. 配置 API 项目环境变量

```bash
cd /home/lotus/project/book2/novel-editor/apps/api
cp env.example .env
```

### 2. 编辑 .env 文件

```bash
nano .env
```

如果没有设置 postgres 用户密码，使用：

```env
DATABASE_URL=postgresql://postgres@localhost:5432/visitor_db
PORT=4001
```

如果有密码，使用：

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/visitor_db
PORT=4001
```

### 3. 初始化数据库 Schema

```bash
cd /home/lotus/project/book2/novel-editor/apps/api
bun install
bun run db:push
```

### 4. 测试 API 服务器

```bash
bun run dev
```

## 🎯 完整修复命令（一键执行）

```bash
sudo systemctl stop postgresql.service && \
sudo rm -rf /var/lib/postgres/data && \
sudo -u postgres initdb -D /var/lib/postgres/data --locale=C --encoding=UTF8 && \
sudo systemctl start postgresql.service && \
sudo systemctl enable postgresql.service && \
sudo -u postgres psql -c "CREATE DATABASE visitor_db;" && \
echo "✅ PostgreSQL 修复完成！现在可以配置 API 项目了"
```

## 📚 相关文档

- [PostgreSQL 设置指南](./POSTGRES_SETUP.md)
- [API 部署指南](./API_ADMIN_SETUP.md)

