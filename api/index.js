import { getRequestListener } from '@hono/node-server';
import { app } from '../server/app.js';

const listener = getRequestListener(app.fetch);

// Vercel Node.js Serverless Function 原生处理入口
export default (req, res) => {
  // 1. 优先通过 query param __route__ 还原原始请求路径
  if (req.url && req.url.includes('__route__=')) {
    try {
      const u = new URL(req.url, 'http://localhost');
      const route = u.searchParams.get('__route__');
      if (route && route.startsWith('/api')) {
        u.searchParams.delete('__route__');
        const search = u.searchParams.toString();
        req.url = route + (search ? `?${search}` : '');
      }
    } catch (e) {
      // ignore
    }
  } else {
    // 2. 回退通过 Vercel 边缘网关注入的 x-matched-path 还原原始请求路径
    const matched = req.headers['x-matched-path'];
    if (matched && matched.startsWith('/api') && matched !== '/api') {
      const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      req.url = matched + query;
    }
  }

  return listener(req, res);
};
