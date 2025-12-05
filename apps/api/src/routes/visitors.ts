import { Elysia, t } from 'elysia';
import { addVisitor, queryVisitors, getStats } from '@/data/storage';
import { parseUserAgent, getClientIP } from '@/utils/visitor';
import { randomUUID } from 'crypto';

export const visitorsRoutes = new Elysia({ prefix: '/visitors' })
  // 提交访客信息
  .post('/', async ({ body, headers }) => {
    try {
      const {
        path,
        query,
        referer,
        userAgent,
        metadata,
      } = body;
      
      const ip = getClientIP(headers);
      const timestamp = Date.now();
      const finalUserAgent = userAgent || headers.get('user-agent') || '';
      
      const { browser, os, device } = parseUserAgent(finalUserAgent);
      
      const visitor = {
        id: randomUUID(),
        ip,
        userAgent: finalUserAgent,
        referer: referer || headers.get('referer') || undefined,
        path: path || headers.get('x-path') || '/',
        query: query || {},
        device,
        browser,
        os,
        timestamp,
        visitedAt: new Date(timestamp).toISOString(),
        metadata: metadata || {},
      };
      
      await addVisitor(visitor);
      
      return {
        success: true,
        data: visitor,
      };
    } catch (error) {
      console.error('Error adding visitor:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    body: t.Object({
      path: t.Optional(t.String()),
      query: t.Optional(t.Record(t.String(), t.String())),
      referer: t.Optional(t.String()),
      userAgent: t.Optional(t.String()),
      metadata: t.Optional(t.Record(t.String(), t.Any())),
    }),
  })
  
  // 查询访客列表
  .get('/', async ({ query }) => {
    try {
      const {
        page = 1,
        pageSize = 50,
        startDate,
        endDate,
        ip,
        path,
      } = query;
      
      const result = await queryVisitors({
        page: typeof page === 'string' ? parseInt(page) : page,
        pageSize: typeof pageSize === 'string' ? parseInt(pageSize) : pageSize,
        startDate,
        endDate,
        ip,
        path,
      });
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Error querying visitors:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    query: t.Object({
      page: t.Optional(t.Union([t.Number(), t.String()])),
      pageSize: t.Optional(t.Union([t.Number(), t.String()])),
      startDate: t.Optional(t.String()),
      endDate: t.Optional(t.String()),
      ip: t.Optional(t.String()),
      path: t.Optional(t.String()),
    }),
  });

// 统计信息路由
export const statsRoute = new Elysia({ prefix: '/stats' })
  .get('/', async () => {
    try {
      const stats = await getStats();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

