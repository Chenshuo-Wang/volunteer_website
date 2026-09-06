import { Hono } from 'hono';
import { db } from '../db/index.js';
import { adminRequired } from '../middleware/auth.js';
import { formatStudent } from '../services/studentService.js';
import { createEvent } from './events.js';
import { getWeekRange, formatShift } from '../services/shiftService.js';

const adminRouter = new Hono();

// 全局应用管理员身份鉴权中间件
adminRouter.use('*', adminRequired);

// 管理周常任务的班级轮换
adminRouter.get('/rotations', async (c) => {
  const rotations = await db.query(
    'SELECT * FROM weekly_rotations ORDER BY week_start_date DESC'
  );
  return c.json(
    rotations.map((r) => ({
      id: r.id,
      weekStartDate: r.week_start_date,
      assignedClass: r.assigned_class_str,
    }))
  );
});

adminRouter.post('/rotations', async (c) => {
  const data = await c.req.json();
  const weekStartDate = String(data.weekStartDate).trim();
  const assignedClass = String(data.assignedClass).trim();

  if (!weekStartDate || !assignedClass) {
    return c.json({ message: '缺少必填参数' }, 400);
  }

  // 确保选择的是周一
  const { weekday } = getWeekRange(weekStartDate);
  if (weekday !== 1) {
    return c.json({ message: '必须选择周一作为开始日期' }, 400);
  }

  const existing = await db.queryOne(
    'SELECT id FROM weekly_rotations WHERE week_start_date = ?',
    [weekStartDate]
  );

  if (existing) {
    await db.execute(
      'UPDATE weekly_rotations SET assigned_class_str = ? WHERE week_start_date = ?',
      [assignedClass, weekStartDate]
    );
    return c.json({ message: '轮换已更新' }, 201);
  } else {
    await db.execute(
      'INSERT INTO weekly_rotations (week_start_date, assigned_class_str) VALUES (?, ?)',
      [weekStartDate, assignedClass]
    );
    return c.json({ message: '轮换已创建' }, 201);
  }
});

// 获取所有学生的统计数据（按工时倒序）
adminRouter.get('/students', async (c) => {
  const students = await db.query('SELECT * FROM students');
  const studentList = [];

  for (const s of students) {
    const formatted = await formatStudent(s, true);
    studentList.push(formatted);
  }

  studentList.sort((a, b) => b.totalHours - a.totalHours);
  return c.json(studentList);
});

// 管理员创建活动
adminRouter.post('/events', async (c) => {
  const data = await c.req.json();
  try {
    const created = await createEvent(data);
    return c.json(created, 201);
  } catch (err) {
    console.error('[ADMIN CREATE EVENT ERROR]', err);
    return c.json({ message: err.message }, 500);
  }
});

// 管理周常岗位：获取所有岗位
adminRouter.get('/shifts', async (c) => {
  const shifts = await db.query(
    'SELECT * FROM recurring_shifts ORDER BY day_of_week ASC, start_time ASC'
  );
  return c.json(shifts.map(formatShift));
});

// 管理周常岗位：创建岗位
adminRouter.post('/shifts', async (c) => {
  const data = await c.req.json();
  try {
    const res = await db.execute(
      `INSERT INTO recurring_shifts (name, day_of_week, start_time, end_time, capacity, hours_value, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        parseInt(data.dayOfWeek, 10),
        data.startTime,
        data.endTime,
        parseInt(data.capacity || 2, 10),
        parseFloat(data.hoursValue !== undefined ? data.hoursValue : 0.5),
        data.description || '',
      ]
    );

    const newShift = await db.queryOne('SELECT * FROM recurring_shifts WHERE id = ?', [res.id]);
    return c.json({ message: '岗位创建成功', shift: formatShift(newShift) }, 201);
  } catch (err) {
    return c.json({ message: `创建失败: ${err.message}` }, 500);
  }
});

// 管理周常岗位：更新岗位
adminRouter.put('/shifts', async (c) => {
  const data = await c.req.json();
  const shiftId = Number(data.id);
  if (!shiftId) {
    return c.json({ message: '缺少岗位ID' }, 400);
  }

  const shift = await db.queryOne('SELECT * FROM recurring_shifts WHERE id = ?', [shiftId]);
  if (!shift) {
    return c.json({ message: '岗位不存在' }, 404);
  }

  try {
    const name = data.name !== undefined ? data.name : shift.name;
    const dayOfWeek = data.dayOfWeek !== undefined ? parseInt(data.dayOfWeek, 10) : shift.day_of_week;
    const startTime = data.startTime !== undefined ? data.startTime : shift.start_time;
    const endTime = data.endTime !== undefined ? data.endTime : shift.end_time;
    const capacity = data.capacity !== undefined ? parseInt(data.capacity, 10) : shift.capacity;
    const hoursValue = data.hoursValue !== undefined ? parseFloat(data.hoursValue) : shift.hours_value;
    const description = data.description !== undefined ? data.description : shift.description;

    await db.execute(
      `UPDATE recurring_shifts
       SET name = ?, day_of_week = ?, start_time = ?, end_time = ?, capacity = ?, hours_value = ?, description = ?
       WHERE id = ?`,
      [name, dayOfWeek, startTime, endTime, capacity, hoursValue, description, shiftId]
    );

    const updated = await db.queryOne('SELECT * FROM recurring_shifts WHERE id = ?', [shiftId]);
    return c.json({ message: '岗位更新成功', shift: formatShift(updated) });
  } catch (err) {
    return c.json({ message: `更新失败: ${err.message}` }, 500);
  }
});

// 管理周常岗位：删除岗位
adminRouter.delete('/shifts', async (c) => {
  const shiftId = Number(c.req.query('id'));
  if (!shiftId) {
    return c.json({ message: '缺少岗位ID' }, 400);
  }

  const shift = await db.queryOne('SELECT * FROM recurring_shifts WHERE id = ?', [shiftId]);
  if (!shift) {
    return c.json({ message: '岗位不存在' }, 404);
  }

  await db.execute('DELETE FROM recurring_shifts WHERE id = ?', [shiftId]);
  return c.json({ message: '岗位删除成功' });
});

// 管理员查看报名情况 - 返回二维矩阵数据看板
adminRouter.get('/shifts/signups', async (c) => {
  const weekStartStr = c.req.query('week_start');
  const classFilter = c.req.query('class_name') || '';

  if (!weekStartStr) {
    return c.json({ message: '请提供week_start参数（周一日期）' }, 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartStr)) {
    return c.json({ message: '日期格式错误' }, 400);
  }

  const { friday } = getWeekRange(weekStartStr);

  // 获取该周所有岗位（按星期和时间排序）
  const shifts = await db.query(
    'SELECT * FROM recurring_shifts ORDER BY day_of_week ASC, start_time ASC'
  );

  const dayNames = { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五' };
  const columns = shifts.map((s) => ({
    id: s.id,
    label: `${s.name} ${s.start_time}(${dayNames[s.day_of_week] || s.day_of_week})`,
  }));

  // 获取该周所有报名记录 (周一到周五)
  const signups = await db.query(
    `SELECT * FROM shift_signups
     WHERE date >= ? AND date <= ? AND status != 'cancelled'`,
    [weekStartStr, friday]
  );

  // 按学生聚合 { [studentId]: { [shiftId]: status } }
  const studentSignupMap = {};
  for (const s of signups) {
    if (!studentSignupMap[s.student_id]) {
      studentSignupMap[s.student_id] = {};
    }
    studentSignupMap[s.student_id][s.shift_id] = s.status;
  }

  // 如果指定了班级筛选，加载该班级所有学生（含未报名的）
  if (classFilter) {
    const parts = classFilter.split('-');
    if (parts.length === 2) {
      const year = parseInt(parts[0], 10);
      const cls = parseInt(parts[1], 10);
      const allStudentsInClass = await db.query(
        'SELECT * FROM students WHERE enrollment_year = ? AND class_number = ? AND is_admin = 0',
        [year, cls]
      );
      for (const stu of allStudentsInClass) {
        if (!studentSignupMap[stu.id]) {
          studentSignupMap[stu.id] = {};
        }
      }
    }
  }

  const studentIds = Object.keys(studentSignupMap).map(Number);
  let students = [];
  if (studentIds.length > 0) {
    const placeholders = studentIds.map(() => '?').join(',');
    students = await db.query(
      `SELECT * FROM students WHERE id IN (${placeholders})`,
      studentIds
    );
  }

  const studentInfoMap = {};
  for (const stu of students) {
    studentInfoMap[stu.id] = stu;
  }

  // 构建行
  const rows = [];
  for (const sid of studentIds) {
    const stu = studentInfoMap[sid];
    if (!stu) continue;

    const fullClassName = `${stu.enrollment_year}级${stu.class_number}班`;
    const simpleClassName = `${stu.enrollment_year}-${stu.class_number}`;

    // 如果指定了班级筛选，过滤掉非该班级的学生
    if (classFilter && simpleClassName !== classFilter) {
      continue;
    }

    const signupData = studentSignupMap[sid] || {};
    const signupsObj = {};
    for (const s of shifts) {
      signupsObj[String(s.id)] = signupData[s.id] || null;
    }

    rows.push({
      studentId: sid,
      name: stu.name,
      class: fullClassName,
      signups: signupsObj,
    });
  }

  // 按姓名排序
  rows.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

  // 获取所有班级列表（供前端下拉框用）
  const classes = await db.query(
    'SELECT DISTINCT enrollment_year, class_number FROM students WHERE is_admin = 0 ORDER BY enrollment_year ASC, class_number ASC'
  );
  const classList = classes.map((c) => `${c.enrollment_year}-${c.class_number}`);

  return c.json({
    columns,
    rows,
    classList,
    weekStart: weekStartStr,
  });
});

export default adminRouter;
