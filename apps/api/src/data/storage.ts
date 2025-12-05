// 使用 Drizzle ORM 的 PostgreSQL 存储实现
import { db } from '@/db/config';
import { visitors, type NewVisitorRow } from '@/db/schema';
import { Visitor } from '@/types/visitor';
import { like, gte, lte, desc, sql, count, and } from 'drizzle-orm';

// 将数据库行转换为 Visitor 类型
function rowToVisitor(row: typeof visitors.$inferSelect): Visitor {
  return {
    id: row.id,
    ip: row.ip,
    userAgent: row.userAgent,
    referer: row.referer || undefined,
    path: row.path,
    query: (row.query as Record<string, string>) || {},
    country: row.country || undefined,
    region: row.region || undefined,
    city: row.city || undefined,
    device: row.device || undefined,
    browser: row.browser || undefined,
    os: row.os || undefined,
    timestamp: row.timestamp,
    visitedAt: row.visitedAt.toISOString(),
    metadata: (row.metadata as Record<string, unknown>) || {},
  };
}

// 添加新访客
export async function addVisitor(visitor: Visitor): Promise<void> {
  const newVisitor: NewVisitorRow = {
    id: visitor.id,
    ip: visitor.ip,
    userAgent: visitor.userAgent,
    referer: visitor.referer || null,
    path: visitor.path,
    query: visitor.query || null,
    country: visitor.country || null,
    region: visitor.region || null,
    city: visitor.city || null,
    device: visitor.device || null,
    browser: visitor.browser || null,
    os: visitor.os || null,
    timestamp: visitor.timestamp,
    visitedAt: new Date(visitor.visitedAt),
    metadata: visitor.metadata || null,
  };

  await db.insert(visitors).values(newVisitor);
}

// 查询访客
export async function queryVisitors(params: {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  ip?: string;
  path?: string;
}): Promise<{ visitors: Visitor[]; total: number }> {
  const page = params.page || 1;
  const pageSize = params.pageSize || 50;
  const offset = (page - 1) * pageSize;

  // 构建查询条件
  const conditions = [];
  
  if (params.startDate) {
    const start = new Date(params.startDate).getTime();
    conditions.push(gte(visitors.timestamp, start));
  }
  
  if (params.endDate) {
    const end = new Date(params.endDate).getTime();
    conditions.push(lte(visitors.timestamp, end));
  }
  
  if (params.ip) {
    conditions.push(like(visitors.ip, `%${params.ip}%`));
  }
  
  if (params.path) {
    conditions.push(like(visitors.path, `%${params.path}%`));
  }

  // 构建 where 子句
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // 获取总数
  const totalResult = await db
    .select({ count: count() })
    .from(visitors)
    .where(whereClause);

  const total = Number(totalResult[0]?.count || 0);

  // 获取分页数据
  const rows = await db
    .select()
    .from(visitors)
    .where(whereClause)
    .orderBy(desc(visitors.timestamp))
    .limit(pageSize)
    .offset(offset);

  return {
    visitors: rows.map(rowToVisitor),
    total,
  };
}

// 获取统计信息
export async function getStats(): Promise<{
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  uniqueIPs: number;
}> {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;
  const oneMonth = 30 * oneDay;

  // 总数
  const totalResult = await db.select({ count: count() }).from(visitors);
  const total = Number(totalResult[0]?.count || 0);

  // 今天
  const todayStart = now - oneDay;
  const todayResult = await db
    .select({ count: count() })
    .from(visitors)
    .where(gte(visitors.timestamp, todayStart));
  const today = Number(todayResult[0]?.count || 0);

  // 本周
  const weekStart = now - oneWeek;
  const weekResult = await db
    .select({ count: count() })
    .from(visitors)
    .where(gte(visitors.timestamp, weekStart));
  const thisWeek = Number(weekResult[0]?.count || 0);

  // 本月
  const monthStart = now - oneMonth;
  const monthResult = await db
    .select({ count: count() })
    .from(visitors)
    .where(gte(visitors.timestamp, monthStart));
  const thisMonth = Number(monthResult[0]?.count || 0);

  // 唯一 IP 数
  const uniqueIPResult = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${visitors.ip})` })
    .from(visitors);
  const uniqueIPs = Number(uniqueIPResult[0]?.count || 0);

  return {
    total,
    today,
    thisWeek,
    thisMonth,
    uniqueIPs,
  };
}
