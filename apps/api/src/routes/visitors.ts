import { Elysia, t } from 'elysia'
import { addVisitor, queryVisitors, getStats } from '@/data/storage'
import { parseUserAgent, getClientIP } from '@/utils/visitor'
import { randomUUID } from 'crypto'
import { createVisitorSchema } from '@/schemas/visitor.schema'
import { ZodError } from 'zod'

export const visitorsRoutes = new Elysia({ prefix: '/visitors' })
	// 提交访客信息
	.post('/', async ({ body, headers, set }) => {
		try {
			// 验证输入
			const validatedData = createVisitorSchema.parse({
				ip: getClientIP(headers),
				path: body.path || headers.get('x-path') || '/',
				userAgent: body.userAgent || headers.get('user-agent') || '',
				referer: body.referer || headers.get('referer') || '',
				query: body.query,
				metadata: body.metadata,
			})

			const timestamp = Date.now()
			const { browser, os, device } = parseUserAgent(validatedData.userAgent || '')

			const visitor = {
				id: randomUUID(),
				ip: validatedData.ip,
				userAgent: validatedData.userAgent || '',
				referer: validatedData.referer,
				path: validatedData.path,
				query: validatedData.query || {},
				device,
				browser,
				os,
				timestamp,
				visitedAt: new Date(timestamp).toISOString(),
				metadata: validatedData.metadata || {},
			}

			await addVisitor(visitor)

			return {
				success: true,
				data: { id: visitor.id },
			}
		} catch (error) {
			// 处理验证错误
			if (error instanceof ZodError) {
				set.status = 400
				return {
					success: false,
					error: '输入数据格式无效',
					details: error.errors.map(e => ({
						field: e.path.join('.'),
						message: e.message,
					})),
				}
			}

			// 记录错误但不暴露给客户端
			console.error('[Visitor API] Error:', error instanceof Error ? error.message : 'Unknown error')

			set.status = 500
			return {
				success: false,
				error: '服务器内部错误',
			}
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

