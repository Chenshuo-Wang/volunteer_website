import { db } from '../db/index.js';

// 管理员权限校验中间件（与原 Flask @admin_required 逻辑 100% 一致）
export async function adminRequired(c, next) {
  const token = c.req.header('X-Admin-Token');
  if (!token) {
    return c.json({ message: '未授权访问' }, 401);
  }

  const adminStudent = await db.queryOne(
    'SELECT * FROM students WHERE phone = ?',
    [token]
  );

  if (!adminStudent || !adminStudent.is_admin) {
    return c.json({ message: '无效的管理权限' }, 403);
  }

  c.set('admin', adminStudent);
  await next();
}
