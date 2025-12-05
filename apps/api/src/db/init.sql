-- PostgreSQL 数据库初始化脚本
-- 用于手动创建数据库（如果 DATABASE_URL 不包含数据库名）

-- 创建数据库（需要在 postgres 数据库下执行）
-- CREATE DATABASE visitor_db;

-- 切换到目标数据库后，Drizzle 会自动创建表结构
-- 或使用以下 SQL 手动创建：

CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY,
  ip VARCHAR(45) NOT NULL,
  user_agent TEXT NOT NULL,
  referer TEXT,
  path TEXT NOT NULL,
  query JSONB,
  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  device VARCHAR(50),
  browser VARCHAR(50),
  os VARCHAR(50),
  timestamp BIGINT NOT NULL,
  visited_at TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS ip_idx ON visitors(ip);
CREATE INDEX IF NOT EXISTS path_idx ON visitors(path);
CREATE INDEX IF NOT EXISTS timestamp_idx ON visitors(timestamp);
CREATE INDEX IF NOT EXISTS visited_at_idx ON visitors(visited_at);

