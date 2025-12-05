# PostgreSQL 快速修复指南

## 🚨 问题：数据库格式版本过旧

如果你看到以下错误：
```
An old version of the database format was found.
Job for postgresql.service failed
```

## 🔧 快速修复（3 步）

### 方法 1: 使用修复脚本（推荐）

```bash
bash /home/lotus/project/book2/novel-editor/scripts/fix-postgresql.sh
```

### 方法 2: 手动修复

```bash
# 1. 停止服务
sudo systemctl stop postgresql.service

# 2. 删除旧数据目录（⚠️ 会丢失数据）
sudo rm -rf /var/lib/postgres/data

# 3. 初始化新数据库
sudo -u postgres initdb -D /var/lib/postgres/data --locale=C --encoding=UTF8

# 4. 启动服务
sudo systemctl start postgresql.service
sudo systemctl enable postgresql.service

# 5. 创建项目数据库
sudo -u postgres psql -c "CREATE DATABASE visitor_db;"
```

## ✅ 验证修复

```bash
# 检查服务状态
sudo systemctl status postgresql.service

# 测试连接
sudo -u postgres psql -d visitor_db -c "SELECT version();"
```

## 📝 后续配置

1. **配置环境变量**
   ```bash
   cd /home/lotus/project/book2/novel-editor/apps/api
   cp env.example .env
   # 编辑 .env 设置 DATABASE_URL
   ```

2. **初始化数据库 Schema**
   ```bash
   cd /home/lotus/project/book2/novel-editor/apps/api
   bun install
   bun run db:push
   ```

3. **启动 API 服务器**
   ```bash
   bun run dev
   ```

## 🔍 查看详细日志

如果还有问题，查看详细日志：

```bash
sudo journalctl -xeu postgresql.service
sudo tail -50 /var/lib/postgres/data/log/postgresql-*.log
```

