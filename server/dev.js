import { serve } from '@hono/node-server';
import { app } from './app.js';
import { db } from './db/index.js';
import 'dotenv/config';

const port = Number(process.env.PORT || 5000);

async function start() {
  await db.init();
  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      console.log(`[SERVER] 志愿网站 Node.js + Hono 后端服务已启动: http://localhost:${info.port}`);
      console.log(`[SERVER] 健康检查接口: http://localhost:${info.port}/api/health`);
    }
  );
}

start().catch((err) => {
  console.error('[SERVER FAILED TO START]', err);
  process.exit(1);
});
