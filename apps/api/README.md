# API 服务器

使用 Elysia + Bun + Drizzle ORM + PostgreSQL 构建的访客管理系统 API 服务器。

## 技术栈

- **运行环境**: Bun
- **Web 框架**: Elysia
- **数据库**: PostgreSQL
- **ORM**: Drizzle ORM
- **API 文档**: Swagger (自动生成)

## 项目结构

```
apps/api/
├── src/
│   ├── db/            # 数据库配置和 schema
│   │   ├── config.ts  # 数据库连接配置
│   │   ├── schema.ts  # Drizzle schema 定义
│   │   ├── migrate.ts # 迁移脚本
│   │   └── init.sql   # 手动初始化 SQL
│   ├── routes/        # API 路由
│   ├── data/          # 数据存储层（使用 Drizzle）
│   ├── types/         # TypeScript 类型定义
│   └── index.ts       # 服务器入口
├── drizzle/           # 数据库迁移文件（自动生成）
└── drizzle.config.ts  # Drizzle Kit 配置
```

## 快速开始

### 前置要求

1. **安装 PostgreSQL**
   ```bash
   # Ubuntu/Debian
   sudo apt install postgresql postgresql-contrib
   
   # Arch Linux
   sudo pacman -S postgresql
   ```

2. **创建数据库**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE visitor_db;
   \q
   ```

### 环境变量配置

复制 `.env.example` 并配置数据库连接：

```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
DATABASE_URL=postgresql://user:password@localhost:5432/visitor_db
PORT=4001
```

### 安装依赖

```bash
cd apps/api
bun install
```

### 数据库迁移

```bash
# 生成迁移文件
bun run db:generate

# 运行迁移
bun run db:migrate

# 或使用 push（直接同步 schema，不生成迁移文件）
bun run db:push
```

### 开发模式

```bash
bun run dev
```

服务器将在 `http://localhost:4001` 运行。

### 生产模式

```bash
bun run start
```

## 数据库管理

### 生成迁移文件

```bash
bun run db:generate
```

这会根据 schema 的变化生成迁移文件到 `drizzle/` 目录。

### 运行迁移

```bash
bun run db:migrate
```

### 直接推送 Schema（开发环境）

```bash
bun run db:push
```

这会直接将 schema 同步到数据库，不生成迁移文件。

### 打开 Drizzle Studio（可视化数据库）

```bash
bun run db:studio
```

## API 端点

### POST /api/visitors
提交访客信息

**请求体**:
```json
{
  "path": "/about",
  "query": {},
  "referer": "https://example.com",
  "userAgent": "Mozilla/5.0...",
  "metadata": {}
}
```

### GET /api/visitors
查询访客列表

**查询参数**:
- `page`: 页码（默认 1）
- `pageSize`: 每页数量（默认 50）
- `startDate`: 开始日期
- `endDate`: 结束日期
- `ip`: IP 地址过滤
- `path`: 路径过滤

### GET /api/stats
获取统计信息

返回：
```json
{
  "success": true,
  "data": {
    "total": 1000,
    "today": 50,
    "thisWeek": 300,
    "thisMonth": 800,
    "uniqueIPs": 200
  }
}
```

### GET /api/health
健康检查

### GET /swagger
Swagger API 文档

## 环境变量

- `DATABASE_URL`: PostgreSQL 连接字符串
  - 格式: `postgresql://user:password@host:port/database`
  - 或分别设置: `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`
- `PORT`: 服务器端口（默认 4001）

## 数据库 Schema

### visitors 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键，UUID |
| ip | VARCHAR(45) | IP 地址 |
| user_agent | TEXT | 用户代理 |
| referer | TEXT | 来源页面 |
| path | TEXT | 访问路径 |
| query | JSONB | 查询参数 |
| country | VARCHAR(100) | 国家 |
| region | VARCHAR(100) | 地区 |
| city | VARCHAR(100) | 城市 |
| device | VARCHAR(50) | 设备类型 |
| browser | VARCHAR(50) | 浏览器 |
| os | VARCHAR(50) | 操作系统 |
| timestamp | BIGINT | 时间戳 |
| visited_at | TIMESTAMPTZ | 访问时间 |
| metadata | JSONB | 扩展信息 |
| created_at | TIMESTAMPTZ | 创建时间 |

### 索引

- `ip_idx`: IP 地址索引
- `path_idx`: 路径索引
- `timestamp_idx`: 时间戳索引
- `visited_at_idx`: 访问时间索引

## 特性

- ✅ 类型安全的 API（使用 Elysia 类型系统）
- ✅ 类型安全的数据库操作（使用 Drizzle ORM）
- ✅ 自动生成的 Swagger 文档
- ✅ CORS 支持
- ✅ 数据库迁移支持
- ✅ 高性能（Bun 运行时 + PostgreSQL）
- ✅ 索引优化查询性能

## 开发

### 类型检查

```bash
bun run typecheck
```

### 代码格式化

```bash
bun run format
```

### Lint

```bash
bun run lint
```

## 部署

### 使用 Bun 运行

```bash
bun run start
```

### 使用 PM2（推荐生产环境）

```bash
pm2 start bun --name "api-server" -- run start
pm2 save
```

### 使用 systemd

创建服务文件 `/etc/systemd/system/api-server.service`:

```ini
[Unit]
Description=Visitor API Server
After=network.target postgresql.service

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/apps/api
Environment="DATABASE_URL=postgresql://user:pass@localhost:5432/visitor_db"
ExecStart=/usr/bin/bun run start
Restart=always

[Install]
WantedBy=multi-user.target
```

启用并启动服务：
```bash
sudo systemctl enable api-server
sudo systemctl start api-server
```

## 故障排除

### 数据库连接失败

1. 检查 PostgreSQL 是否运行: `sudo systemctl status postgresql`
2. 检查连接字符串是否正确
3. 检查数据库是否存在: `sudo -u postgres psql -l`
4. 检查用户权限

### 迁移失败

1. 检查数据库连接
2. 检查迁移文件是否正确
3. 查看错误日志
4. 可以手动运行 SQL: `src/db/init.sql`

## 性能优化

- 已添加索引优化查询
- 使用连接池（max: 10）
- 使用 BIGINT 存储时间戳以优化范围查询
