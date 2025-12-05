// 数据库连接配置
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// 从环境变量获取数据库连接信息
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'visitor_db'}`;

// 创建 PostgreSQL 客户端
const client = postgres(connectionString, {
  max: 10,
});

// 创建 Drizzle 实例
export const db = drizzle(client, { schema });

// 导出客户端（用于迁移等操作）
export { client };

