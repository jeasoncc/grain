# 数据库连接错误修复

## 🚨 错误：`role "user" does not exist`

### 问题原因

`.env` 文件中的 `DATABASE_URL` 使用了不存在的数据库角色 `user`。PostgreSQL 默认使用 `postgres` 作为超级用户。

### ✅ 解决方案

修复 `.env` 文件中的 `DATABASE_URL`：

#### 如果没有设置 postgres 密码：

```env
DATABASE_URL=postgresql://postgres@localhost:5432/visitor_db
```

#### 如果设置了 postgres 密码：

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/visitor_db
```

### 🔧 快速修复

```bash
cd /home/lotus/project/book2/novel-editor/apps/api

# 修复 .env 文件
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres@localhost:5432/visitor_db
PORT=4001
EOF
```

### 📝 验证连接

测试数据库连接：

```bash
# 测试 PostgreSQL 连接
sudo -u postgres psql -d visitor_db -c "SELECT version();"
```

### 🔍 其他常见问题

#### 1. 如果提示需要密码

编辑 `.env` 添加密码：
```bash
nano .env
```

#### 2. 如果数据库不存在

创建数据库：
```bash
sudo -u postgres psql -c "CREATE DATABASE visitor_db;"
```

#### 3. 如果连接被拒绝

检查 PostgreSQL 是否运行：
```bash
sudo systemctl status postgresql.service
```

