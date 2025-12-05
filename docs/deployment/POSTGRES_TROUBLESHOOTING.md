# PostgreSQL 故障排除指南

## 🔍 问题：数据库格式版本过旧

当看到以下错误时：
```
An old version of the database format was found.
Job for postgresql.service failed because the control process exited with error code.
```

这通常意味着需要升级或重新初始化 PostgreSQL 数据库。

## 🛠️ 解决方案

### 方案 1: 重新初始化数据库集群（推荐，如果数据不重要）

如果你不需要保留旧数据，可以重新初始化数据库：

```bash
# 1. 停止 PostgreSQL 服务
sudo systemctl stop postgresql.service

# 2. 备份旧数据目录（如果存在）
sudo mv /var/lib/postgres/data /var/lib/postgres/data.old

# 3. 初始化新的数据库集群
sudo -u postgres initdb -D /var/lib/postgres/data

# 4. 启动 PostgreSQL 服务
sudo systemctl start postgresql.service

# 5. 验证服务状态
sudo systemctl status postgresql.service
```

### 方案 2: 升级现有数据库（保留数据）

如果你有重要数据需要保留，需要先升级数据库：

```bash
# 1. 查看当前 PostgreSQL 版本
sudo -u postgres psql -c "SELECT version();"

# 2. 按照 Arch Wiki 指南升级
# 参考: https://wiki.archlinux.org/title/PostgreSQL#Upgrading_PostgreSQL

# 3. 备份数据
sudo -u postgres pg_dumpall > backup.sql

# 4. 升级数据库（需要 root 权限）
sudo su - postgres
/usr/bin/pg_upgrade \
  --old-datadir=/var/lib/postgres/data \
  --new-datadir=/var/lib/postgres/data-new \
  --old-bindir=/usr/bin \
  --new-bindir=/usr/bin
```

### 方案 3: 快速修复（最简单）

如果你刚安装 PostgreSQL 或者数据不重要：

```bash
# 1. 停止服务
sudo systemctl stop postgresql.service

# 2. 删除旧数据目录
sudo rm -rf /var/lib/postgres/data

# 3. 初始化新数据库
sudo -u postgres initdb -D /var/lib/postgres/data --locale=C --encoding=UTF8

# 4. 启动服务
sudo systemctl start postgresql.service
sudo systemctl enable postgresql.service

# 5. 验证
sudo systemctl status postgresql.service
```

## 🗄️ 创建数据库

服务正常运行后，创建项目数据库：

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 在 psql 中执行
CREATE DATABASE visitor_db;

# 查看数据库列表
\l

# 退出
\q
```

## ✅ 验证设置

```bash
# 测试连接
sudo -u postgres psql -d visitor_db -c "SELECT version();"

# 查看所有数据库
sudo -u postgres psql -l
```

## 📝 常见问题

### 问题 1: 权限错误

如果遇到权限错误，检查数据目录权限：

```bash
sudo chown -R postgres:postgres /var/lib/postgres/data
sudo chmod 700 /var/lib/postgres/data
```

### 问题 2: 端口被占用

检查端口是否被占用：

```bash
sudo ss -tlnp | grep 5432
```

### 问题 3: 服务无法启动

查看详细错误日志：

```bash
sudo journalctl -xeu postgresql.service
sudo tail -50 /var/lib/postgres/data/log/postgresql-*.log
```

## 🔗 参考链接

- [Arch Linux PostgreSQL Wiki](https://wiki.archlinux.org/title/PostgreSQL)
- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)

