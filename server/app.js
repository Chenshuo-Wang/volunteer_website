import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trimTrailingSlash } from 'hono/trailing-slash';
import { errorHandler } from './middleware/error.js';
import healthRouter from './routes/health.js';
import studentsRouter from './routes/students.js';
import eventsRouter from './routes/events.js';
import shiftsRouter from './routes/shifts.js';
import adminRouter from './routes/admin.js';

export function createApp() {
  const app = new Hono();

  // 0. 自动修剪尾部斜杠，防止 /api/health/ 等请求返回 404
  app.use(trimTrailingSlash());

  // 1. 全局跨域中间件（支持前端 Ajax、Vue 以及自定义请求头 X-Admin-Token）
  app.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'X-Admin-Token', 'Authorization'],
      credentials: true,
    })
  );

  // 2. 全局错误处理
  app.onError(errorHandler);

  // 3. 构建 API 路由模块
  const api = new Hono();
  api.route('/', healthRouter);
  api.route('/students', studentsRouter);
  api.route('/events', eventsRouter);
  api.route('/shifts', shiftsRouter);
  api.route('/admin', adminRouter);

  // 4. 双重挂载：确保无论是 /api/xxx 还是被边缘剥离前缀的 /xxx，均能 100% 精确匹配
  app.route('/api', api);
  app.route('/', api);

  return app;
}

export const app = createApp();
