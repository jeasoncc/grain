// Drizzle ORM Schema 定义
import { pgTable, text, timestamp, jsonb, varchar, bigint, index } from 'drizzle-orm/pg-core';

// 访客表
export const visitors = pgTable('visitors', {
  id: text('id').primaryKey(),
  
  // 基本信息
  ip: varchar('ip', { length: 45 }).notNull(),
  userAgent: text('user_agent').notNull(),
  referer: text('referer'),
  
  // 访问信息
  path: text('path').notNull(),
  query: jsonb('query'),
  
  // 地理位置（可选）
  country: varchar('country', { length: 100 }),
  region: varchar('region', { length: 100 }),
  city: varchar('city', { length: 100 }),
  
  // 设备信息
  device: varchar('device', { length: 50 }),
  browser: varchar('browser', { length: 50 }),
  os: varchar('os', { length: 50 }),
  
  // 时间信息
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
  visitedAt: timestamp('visited_at', { withTimezone: true }).notNull(),
  
  // 扩展信息
  metadata: jsonb('metadata'),
  
  // 创建时间（数据库级别）
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // 索引优化查询
  ipIdx: index('ip_idx').on(table.ip),
  pathIdx: index('path_idx').on(table.path),
  timestampIdx: index('timestamp_idx').on(table.timestamp),
  visitedAtIdx: index('visited_at_idx').on(table.visitedAt),
}));

// 导出类型
export type VisitorRow = typeof visitors.$inferSelect;
export type NewVisitorRow = typeof visitors.$inferInsert;
