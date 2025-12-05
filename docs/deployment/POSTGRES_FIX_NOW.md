# PostgreSQL 立即修复指南

## 🔧 修复 PostgreSQL 数据库格式问题

### 快速修复命令（复制粘贴执行）

```bash
# 1. 停止 PostgreSQL 服务
sudo systemctl stop postgresql.service

# 2. 删除旧数据目录（会丢失数据，但这是最快的修复方法）
sudo rm -rf /var/lib/postgres/data

# 3. 初始化新的数据库集群
sudo -u postgres initdb -D /var/lib/postgres/data --locale=C --encoding=UTF8

# 4. 启动 PostgreSQL 服务
sudo systemctl start postgresql.service
sudo systemctl enable postgresql.service

# 5. 验证服务是否运行
sudo systemctl status postgresql.service

# 6. 创建项目数据库
sudo -u postgres psql -c "CREATE DATABASE visitor_db;"

# 7. 验证数据库创建
sudo -u postgres psql -l | grep visitor_db
```

### 或使用自动修复脚本

```bash
bash /home/lotus/project/book2/novel-editor/scripts/fix-postgresql-simple.sh
```

## ✅ 修复后的配置步骤

### 1. 配置 API 项目环境变量

```bash
cd /home/lotus/project/book2/novel-editor/apps/api
cp env.example .env
```

### 2. 编辑 .env 文件

```bash
nano .env
```

设置为（如果没有设置 postgres 密码）：

```env
DATABASE_URL=postgresql://postgres@localhost:5432/visitor_db
PORT=4001
```

或者如果有密码：

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

### 4. 启动 API 服务器

```bash
bun run dev
```

## 🎯 完整命令序列（一键执行）

```bash
# 修复 PostgreSQL
sudo systemctl stop postgresql.service && \
sudo rm -rf /var/lib/postgres/data && \
sudo -u postgres initdb -D /var/lib/postgres/data --locale=C --encoding=UTF8 && \
sudo systemctl start postgresql.service && \
sudo systemctl enable postgresql.service && \
sudo -u postgres psql -c "CREATE DATABASE visitor_db;" && \
echo "✅ PostgreSQL 修复完成！"
```

