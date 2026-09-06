import { handle } from 'hono/vercel';
import { app } from '../server/app.js';

// Vercel Serverless Function 原生处理函数
export default handle(app);
