import { Hono } from 'hono';
import { db } from '../db/index.js';

const healthRouter = new Hono();

healthRouter.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: 'Volunteer Website Backend API is running',
    health: '/api/health',
  });
});

healthRouter.get('/health', async (c) => {
  let dbStatus = 'unknown';
  try {
    await db.queryOne('SELECT 1 as test');
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  const isPg = db.isPostgres();
  const responseData = {
    status: dbStatus === 'connected' ? 'healthy' : 'database_error',
    database: {
      type: isPg ? 'postgres' : 'sqlite',
      status: dbStatus,
      is_postgres: isPg,
    },
    environment: process.env.VERCEL ? 'vercel' : 'local',
  };

  return c.json(responseData, dbStatus === 'connected' ? 200 : 503);
});

healthRouter.get('/ping', async (c) => {
  return c.json({ status: 'pong', time: new Date().toISOString() });
});

export default healthRouter;
