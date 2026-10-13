import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { openapi } from '@elysia/openapi';
import { visitorsRoutes, statsRoute } from './routes/visitors';

const PORT = parseInt(process.env.PORT || '4001');

const app = new Elysia()
  .use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
  .use(openapi({
    path: '/swagger',
    specPath: '/swagger/json',
    openapiVersion: '3.0.3',
    documentation: {
      info: {
        title: '访客管理系统 API',
        version: '1.0.0',
        description: '用于记录和管理网站访客信息的 API',
      },
      tags: [
        { name: 'visitors', description: '访客相关接口' },
        { name: 'stats', description: '统计信息接口' },
      ],
    },
  }))
  .group('/api', (app) =>
    app
      .use(visitorsRoutes)
      .use(statsRoute)
      .get('/health', () => ({ status: 'ok' }))
  )
  .listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    console.log(`📚 Swagger docs available at http://localhost:${PORT}/swagger`);
  });

export type App = typeof app;

