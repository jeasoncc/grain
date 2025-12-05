# 数据库设置指南

## 安装 PostgreSQL

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Arch Linux
```bash
sudo pacman -S postgresql
sudo systemctl start postgresql.service
sudo systemctl enable postgresql.service
```

## 创建数据库

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 创建数据库
CREATE DATABASE visitor_db;

# 创建用户（可选）
CREATE USER visitor_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE visitor_db TO visitor_user;

# 退出
\q
```

## 配置环境变量

复制环境变量示例文件：

```bash
cp env.example .env
```

编辑 `.env` 文件，设置数据库连接信息：

```env
DATABASE_URL=postgresql://visitor_user:your_password@localhost:5432/visitor_db
PORT=4001
```

## 运行数据库迁移

```bash
# 生成迁移文件
bun run db:generate

# 运行迁移
bun run db:migrate
```

或直接推送 schema（开发环境）：

```bash
bun run db:push
```

## 验证数据库

```bash
# 连接数据库
sudo -u postgres psql -d visitor_db

# 查看表
\dt

# 查看表结构
\d visitors

# 退出
\q
```

