import { Hono } from 'hono';
import { db } from '../db/index.js';
import { getWeekRange, formatShift, formatShiftSignup } from '../services/shiftService.js';

const shiftsRouter = new Hono();

// 公开接口：获取当前/指定周的轮值班级信息
shiftsRouter.get('/rotation', async (c) => {
  const dateStr = c.req.query('date') || new Date().toISOString().slice(0, 10);
  const { monday } = getWeekRange(dateStr);

  const rotation = await db.queryOne(
    'SELECT * FROM weekly_rotations WHERE week_start_date = ?',
    [monday]
  );

  if (rotation) {
    return c.json({
      weekStartDate: rotation.week_start_date,
      assignedClass: rotation.assigned_class_str,
    });
  } else {
    return c.json({
      weekStartDate: monday,
      assignedClass: null,
    });
  }
});

// 获取我的周常任务报名记录（必须位于 /:id 之前注册，避免参数路由抢占）
shiftsRouter.get('/my-signups', async (c) => {
  const phone = c.req.query('phone');
  if (!phone) {
    return c.json({ message: '缺少手机号参数' }, 400);
  }

  const student = await db.queryOne('SELECT * FROM students WHERE phone = ?', [phone.trim()]);
  if (!student) {
    return c.json({ message: '学生不存在' }, 404);
  }

  const signups = await db.query(
    `SELECT ss.*, rs.name as shift_name, rs.start_time, rs.end_time
     FROM shift_signups ss
     LEFT JOIN recurring_shifts rs ON rs.id = ss.shift_id
     WHERE ss.student_id = ?
     ORDER BY ss.date DESC`,
    [student.id]
  );

  const result = signups.map((s) => ({
    ...formatShiftSignup(s),
    shiftName: s.shift_name || '',
    shiftTime: s.start_time && s.end_time ? `${s.start_time} - ${s.end_time}` : '',
  }));

  return c.json(result);
});

// 获取所有周常岗位（按星期和时间排序）
shiftsRouter.get('/', async (c) => {
  const shifts = await db.query(
    'SELECT * FROM recurring_shifts ORDER BY day_of_week ASC, start_time ASC'
  );
  return c.json(shifts.map(formatShift));
});

// 获取单个岗位详情
shiftsRouter.get('/:id', async (c) => {
  const shiftId = Number(c.req.param('id'));
  const shift = await db.queryOne('SELECT * FROM recurring_shifts WHERE id = ?', [shiftId]);
  if (!shift) {
    return c.json({ message: '岗位不存在' }, 404);
  }
  return c.json(formatShift(shift));
});

// 学生报名周常任务
shiftsRouter.post('/:id/signup', async (c) => {
  const shiftId = Number(c.req.param('id'));
  const data = await c.req.json();

  if (!data.studentId || !data.date) {
    return c.json({ message: '缺少必填信息' }, 400);
  }

  const studentId = Number(data.studentId);
  const signupDateStr = String(data.date).trim();

  // 1. 验证岗位存在
  const shift = await db.queryOne('SELECT * FROM recurring_shifts WHERE id = ?', [shiftId]);
  if (!shift) {
    return c.json({ message: '岗位不存在' }, 404);
  }

  // 2. 验证学生存在
  const student = await db.queryOne('SELECT * FROM students WHERE id = ?', [studentId]);
  if (!student) {
    return c.json({ message: '学生不存在' }, 404);
  }

  // 3. 验证日期格式
  if (!/^\d{4}-\d{2}-\d{2}$/.test(signupDateStr)) {
    return c.json({ message: '日期格式错误，应为YYYY-MM-DD' }, 400);
  }

  // 4. 验证不能报名过去的日期
  const todayStr = new Date().toISOString().slice(0, 10);
  if (signupDateStr < todayStr) {
    return c.json({ message: '不能报名过去的日期' }, 400);
  }

  // 5. 验证日期的星期与岗位匹配 (1-5)
  const { monday, friday, weekday } = getWeekRange(signupDateStr);
  if (weekday > 5) {
    return c.json({ message: '周常任务仅限工作日（周一到周五）' }, 400);
  }

  if (weekday !== shift.day_of_week) {
    const dayNames = { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五' };
    return c.json(
      {
        message: `日期错误：该岗位是${dayNames[shift.day_of_week]}的岗位，您选择的日期是${dayNames[weekday]}`,
      },
      400
    );
  }

  // 6. 检查是否已经报名过该岗位
  const existing = await db.queryOne(
    `SELECT id FROM shift_signups
     WHERE shift_id = ? AND student_id = ? AND date = ? AND status != 'cancelled'`,
    [shiftId, studentId, signupDateStr]
  );
  if (existing) {
    return c.json({ message: '您已经报名过该岗位了' }, 400);
  }

  // 7. 检查容量限制
  const countRes = await db.queryOne(
    `SELECT COUNT(*) as cnt FROM shift_signups
     WHERE shift_id = ? AND date = ? AND status != 'cancelled'`,
    [shiftId, signupDateStr]
  );
  const signupCount = Number(countRes?.cnt || 0);
  if (signupCount >= shift.capacity) {
    return c.json({ message: `该岗位已满员（容量${shift.capacity}人）` }, 400);
  }

  // 8. 检查班级轮换限定
  const rotation = await db.queryOne(
    'SELECT * FROM weekly_rotations WHERE week_start_date = ?',
    [monday]
  );
  if (!rotation) {
    return c.json({ message: '该周尚未设置轮值班级，请联系管理员' }, 400);
  }

  const studentClass = `${student.enrollment_year}-${student.class_number}`;
  if (studentClass !== rotation.assigned_class_str) {
    return c.json(
      {
        message: `本周轮值班级为 ${rotation.assigned_class_str}，您的班级(${studentClass})不在轮值范围内`,
      },
      403
    );
  }

  // 9. 检查每周报名次数限制（每人每周最多 2 个）
  const weeklyCountRes = await db.queryOne(
    `SELECT COUNT(*) as cnt FROM shift_signups
     WHERE student_id = ? AND date >= ? AND date <= ? AND status != 'cancelled'`,
    [studentId, monday, friday]
  );
  const weeklyCount = Number(weeklyCountRes?.cnt || 0);
  if (weeklyCount >= 2) {
    return c.json({ message: '每人每周最多报名2个周常项目' }, 400);
  }

  // 10. 创建报名记录
  try {
    const res = await db.execute(
      `INSERT INTO shift_signups (student_id, shift_id, date, status, created_at)
       VALUES (?, ?, ?, 'pending', ?)`,
      [studentId, shiftId, signupDateStr, new Date().toISOString()]
    );

    const newSignup = await db.queryOne('SELECT * FROM shift_signups WHERE id = ?', [res.id]);
    return c.json(
      {
        message: '报名成功！',
        signup: formatShiftSignup(newSignup),
      },
      201
    );
  } catch (err) {
    console.error('[SHIFT SIGNUP ERROR]', err);
    return c.json({ message: '报名失败，请稍后重试' }, 500);
  }
});

export default shiftsRouter;
