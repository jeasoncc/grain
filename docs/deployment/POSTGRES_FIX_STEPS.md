# PostgreSQL 修复步骤

## 🔧 问题：数据库格式版本过旧

根据你的错误信息，需要重新初始化 PostgreSQL 数据库集群。

## 📝 手动修复步骤

### 步骤 1: 停止 PostgreSQL 服务

```bash
sudo systemctl stop postgresql.service
```

### 步骤 2: 备份并删除旧数据目录

```bash
# 备份旧数据（可选，如果需要保留）
sudo mv /var/lib/postgres/data /var/lib/postgres/data.old

# 或者直接删除（如果没有重要数据）
sudo rm -rf /var/lib/postgres/data
```

### 步骤 3: 初始化新的数据库集群

```bash
sudo -u postgres initdb -D /var/lib/postgres/data --locale=C --encoding=UTF8
```

### 步骤 4: 启动 PostgreSQL 服务

```bash
sudo systemctl start postgresql.service
sudo systemctl enable postgresql.service
```

### 步骤 5: 验证服务状态

```bash
sudo systemctl status postgresql.service
```

应该看到 `active (running)` 状态。

### 步骤 6: 创建项目数据库

```bash
sudo -u postgres psql -c "CREATE DATABASE visitor_db;"
```

### 步骤 7: 验证数据库创建

```bash
sudo -u postgres psql -l | grep visitor_db
```

应该能看到 `visitor_db` 数据库。

## ✅ 完成后的配置

1. **配置 API 项目环境变量**
   ```bash
   cd /home/lotus/project/book2/novel-editor/apps/api
   cp env.example .env
   ```

2. **编辑 .env 文件**
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/visitor_db
   PORT=4001
   ```

   如果没有设置 postgres 用户密码，可以连接为：
   ```env
   DATABASE_URL=postgresql://postgres@localhost:5432/visitor_db
   ```

3. **初始化数据库 Schema**
   ```bash
   cd /home/lotus/project/book2/novel-editor/apps/api
   bun install
   bun run db:push
   ```

4. **启动 API 服务器**
   ```bash
   bun run dev
   ```

## 🎯 快速命令（复制粘贴）

```bash
# 停止服务
sudo systemctl stop postgresql.service

# 删除旧数据
sudo rm -rf /var/lib/postgres/data

# 初始化新数据库
sudo -u postgres initdb -D /var/lib/postgres/data --locale=C --encoding=UTF8

# 启动服务
sudo systemctl start postgresql.service
sudo systemctl enable postgresql.service

# 创建数据库
sudo -u postgres psql -c "CREATE DATABASE visitor_db;"
```

## 🔍 如果还有问题

查看详细日志：

```bash
sudo journalctl -xeu postgresql.service --no-pager | tail -50
```

