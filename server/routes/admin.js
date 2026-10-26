import { Hono } from 'hono';
import { db } from '../db/index.js';
import { adminRequired } from '../middleware/auth.js';
import { formatStudent } from '../services/studentService.js';
import { createEvent } from './events.js';
import { formatEvent } from '../services/eventService.js';
import { getWeekRange, formatShift } from '../services/shiftService.js';
import {
  getAttendanceGrouped,
  updateEventSignupStatus,
  updateShiftSignupStatus,
  batchUpdateEventAttendance,
  batchUpdateShiftAttendance,
} from '../services/attendanceService.js';

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

// 管理员获取所有活动列表（附带报名人数与状态）
adminRouter.get('/events', async (c) => {
  const events = await db.query('SELECT * FROM events ORDER BY start_time DESC');
  const formattedEvents = [];
  for (const e of events) {
    const signupCountRes = await db.queryOne(
      'SELECT COUNT(*) as cnt FROM event_signups WHERE event_id = ?',
      [e.id]
    );
    const signupCount = Number(signupCountRes?.cnt || 0);
    formattedEvents.push(formatEvent(e, signupCount));
  }
  return c.json(formattedEvents);
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

// 管理员修改活动
adminRouter.put('/events/:id', async (c) => {
  const eventId = Number(c.req.param('id'));
  if (!eventId) {
    return c.json({ message: '缺少活动ID' }, 400);
  }

  const existing = await db.queryOne('SELECT * FROM events WHERE id = ?', [eventId]);
  if (!existing) {
    return c.json({ message: '活动不存在' }, 404);
  }

  const data = await c.req.json();

  const title = data.title !== undefined ? String(data.title).trim() : existing.title;
  const description = data.description !== undefined ? String(data.description) : (existing.description || '');
  const startTime = data.startTime ? new Date(data.startTime).toISOString() : existing.start_time;
  const endTime = data.endTime ? new Date(data.endTime).toISOString() : existing.end_time;
  const regDeadline = data.registrationDeadline ? new Date(data.registrationDeadline).toISOString() : existing.registration_deadline;
  const location = data.location !== undefined ? String(data.location).trim() : (existing.location || '');
  const leaderName = data.leaderName !== undefined ? data.leaderName : existing.leader_name;
  const leaderContact = data.leaderContact !== undefined ? data.leaderContact : existing.leader_contact;
  const requiredVolunteers = data.requiredVolunteers !== undefined ? parseInt(data.requiredVolunteers, 10) : existing.required_volunteers;
  const gradeLimit = data.gradeLimit || data.gradeRestriction || existing.grade_limit || 'ALL';
  const hoursValue = data.hoursValue !== undefined ? parseFloat(data.hoursValue) : existing.hours_value;

  try {
    await db.execute(
      `UPDATE events
       SET title = ?, description = ?, start_time = ?, end_time = ?, registration_deadline = ?,
           location = ?, leader_name = ?, leader_contact = ?, required_volunteers = ?,
           grade_limit = ?, hours_value = ?
       WHERE id = ?`,
      [
        title,
        description,
        startTime,
        endTime,
        regDeadline,
        location,
        leaderName,
        leaderContact,
        requiredVolunteers,
        gradeLimit,
        hoursValue,
        eventId,
      ]
    );

    const updatedEvent = await db.queryOne('SELECT * FROM events WHERE id = ?', [eventId]);
    const signupCountRes = await db.queryOne(
      'SELECT COUNT(*) as cnt FROM event_signups WHERE event_id = ?',
      [eventId]
    );
    const signupCount = Number(signupCountRes?.cnt || 0);

    return c.json({
      message: '活动修改成功！',
      event: formatEvent(updatedEvent, signupCount),
    });
  } catch (err) {
    console.error('[ADMIN UPDATE EVENT ERROR]', err);
    return c.json({ message: `修改活动失败: ${err.message}` }, 500);
  }
});

// 管理员删除单个活动
adminRouter.delete('/events/:id', async (c) => {
  const eventId = Number(c.req.param('id'));
  if (!eventId) {
    return c.json({ message: '缺少活动ID' }, 400);
  }

  const event = await db.queryOne('SELECT * FROM events WHERE id = ?', [eventId]);
  if (!event) {
    return c.json({ message: '活动不存在' }, 404);
  }

  await db.execute('DELETE FROM event_signups WHERE event_id = ?', [eventId]);
  await db.execute('DELETE FROM events WHERE id = ?', [eventId]);
  return c.json({ message: '活动删除成功' });
});

// 管理员清空所有活动
adminRouter.delete('/events', async (c) => {
  await db.execute('DELETE FROM event_signups');
  await db.execute('DELETE FROM events');
  return c.json({ message: '所有活动及报名记录已清空' });
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
        'SELECT * FROM students WHERE enrollment_year = ? AND class_number = ? AND NOT is_admin',
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
    'SELECT DISTINCT enrollment_year, class_number FROM students WHERE NOT is_admin ORDER BY enrollment_year ASC, class_number ASC'
  );
  const classList = classes.map((c) => `${c.enrollment_year}-${c.class_number}`);

  return c.json({
    columns,
    rows,
    classList,
    weekStart: weekStartStr,
  });
});

// 1. 获取考勤与工时审核数据（按活动/周常项目分类）
adminRouter.get('/attendance', async (c) => {
  try {
    const data = await getAttendanceGrouped();
    return c.json(data);
  } catch (err) {
    console.error('[GET ATTENDANCE ERROR]', err);
    return c.json({ message: `获取考勤数据失败: ${err.message}` }, 500);
  }
});

// 2. 更新单个活动参与者状态
adminRouter.put('/attendance/event-signup', async (c) => {
  const data = await c.req.json();
  const signupId = Number(data.signupId);
  const status = String(data.status);

  if (!signupId || !status) {
    return c.json({ message: '缺少参数' }, 400);
  }

  try {
    const res = await updateEventSignupStatus(signupId, status);
    return c.json({ message: '更新成功', ...res });
  } catch (err) {
    return c.json({ message: err.message }, 400);
  }
});

// 3. 更新单个周常参与者状态
adminRouter.put('/attendance/shift-signup', async (c) => {
  const data = await c.req.json();
  const signupId = Number(data.signupId);
  const status = String(data.status);

  if (!signupId || !status) {
    return c.json({ message: '缺少参数' }, 400);
  }

  try {
    const res = await updateShiftSignupStatus(signupId, status);
    return c.json({ message: '更新成功', ...res });
  } catch (err) {
    return c.json({ message: err.message }, 400);
  }
});

// 4. 批量更新考勤状态
adminRouter.post('/attendance/batch', async (c) => {
  const data = await c.req.json();
  const { type, id, date, status } = data;

  if (!type || !status) {
    return c.json({ message: '缺少必填参数' }, 400);
  }

  try {
    if (type === 'event') {
      const eventId = Number(id);
      await batchUpdateEventAttendance(eventId, status);
      return c.json({ message: '活动参与者考勤已批量更新' });
    } else if (type === 'shift') {
      const shiftId = Number(id);
      await batchUpdateShiftAttendance(shiftId, date, status);
      return c.json({ message: '周常参与者考勤已批量更新' });
    } else {
      return c.json({ message: '未知的项目类型' }, 400);
    }
  } catch (err) {
    return c.json({ message: err.message }, 500);
  }
});

// ==================== 工时补录模块 ====================

// 获取所有补录历史记录
adminRouter.get('/makeup', async (c) => {
  try {
    const records = await db.query(
      `SELECT m.*, s.name as student_name, s.phone, s.enrollment_year, s.class_number
       FROM makeup_records m
       JOIN students s ON s.id = m.student_id
       ORDER BY m.created_at DESC, m.id DESC`
    );

    const formatted = records.map((r) => ({
      id: r.id,
      studentId: r.student_id,
      studentName: r.student_name,
      phone: r.phone,
      className: `${r.enrollment_year}级${r.class_number}班`,
      title: r.title,
      date: r.date,
      hoursValue: Number(r.hours_value || 0),
      description: r.description || '',
      eventId: r.event_id || null,
      createdAt: r.created_at,
    }));

    return c.json(formatted);
  } catch (err) {
    console.error('[GET MAKEUP RECORDS ERROR]', err);
    return c.json({ message: `获取补录记录失败: ${err.message}` }, 500);
  }
});

// 按活动批量补录工时
adminRouter.post('/makeup/event', async (c) => {
  const data = await c.req.json();
  let title = data.title ? String(data.title).trim() : '';
  let date = data.date ? String(data.date).trim() : '';
  let hoursValue = parseFloat(data.hoursValue);
  const description = data.description ? String(data.description).trim() : '';
  const eventId = data.eventId ? Number(data.eventId) : null;
  const studentIds = Array.isArray(data.studentIds) ? data.studentIds.map(Number).filter(Boolean) : [];

  // 如果关联了已有活动且未手动指定部分字段，从已有活动读取默认值
  if (eventId) {
    const ev = await db.queryOne('SELECT * FROM events WHERE id = ?', [eventId]);
    if (ev) {
      if (!title) title = ev.title;
      if (!date) date = new Date(ev.start_time).toISOString().slice(0, 10);
      if (isNaN(hoursValue) || hoursValue <= 0) hoursValue = Number(ev.hours_value || 1.0);
    }
  }

  if (!title || !date || isNaN(hoursValue) || hoursValue <= 0) {
    return c.json({ message: '请完整填写活动名称、日期和有效的志愿工时' }, 400);
  }

  if (studentIds.length === 0) {
    return c.json({ message: '请至少选择一名参与学生' }, 400);
  }

  try {
    const nowIso = new Date().toISOString();
    let insertedCount = 0;

    for (const sid of studentIds) {
      await db.execute(
        `INSERT INTO makeup_records (student_id, title, date, hours_value, description, event_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sid, title, date, hoursValue, description || null, eventId, nowIso]
      );
      insertedCount++;
    }

    return c.json(
      {
        message: `批量补录成功！已为 ${insertedCount} 名学生发放工时`,
        count: insertedCount,
      },
      201
    );
  } catch (err) {
    console.error('[MAKEUP BATCH EVENT ERROR]', err);
    return c.json({ message: `批量补录失败: ${err.message}` }, 500);
  }
});

// 按单个学生补录工时
adminRouter.post('/makeup/student', async (c) => {
  const data = await c.req.json();
  const studentId = Number(data.studentId);
  const title = data.title ? String(data.title).trim() : '';
  const date = data.date ? String(data.date).trim() : '';
  const hoursValue = parseFloat(data.hoursValue);
  const description = data.description ? String(data.description).trim() : '';
  const eventId = data.eventId ? Number(data.eventId) : null;

  if (!studentId || !title || !date || isNaN(hoursValue) || hoursValue <= 0) {
    return c.json({ message: '请选择学生并完整填写补录项目名称、日期及有效工时' }, 400);
  }

  const student = await db.queryOne('SELECT id, name FROM students WHERE id = ?', [studentId]);
  if (!student) {
    return c.json({ message: '目标学生不存在' }, 404);
  }

  try {
    const res = await db.execute(
      `INSERT INTO makeup_records (student_id, title, date, hours_value, description, event_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [studentId, title, date, hoursValue, description || null, eventId, new Date().toISOString()]
    );

    return c.json(
      {
        message: `已成功为 ${student.name} 补录 ${hoursValue} 小时工时！`,
        id: res.id,
      },
      201
    );
  } catch (err) {
    console.error('[MAKEUP SINGLE STUDENT ERROR]', err);
    return c.json({ message: `单人补录失败: ${err.message}` }, 500);
  }
});

// 撤销/删除某条补录记录
adminRouter.delete('/makeup/:id', async (c) => {
  const recordId = Number(c.req.param('id'));
  if (!recordId) {
    return c.json({ message: '缺少记录ID' }, 400);
  }

  const existing = await db.queryOne('SELECT id FROM makeup_records WHERE id = ?', [recordId]);
  if (!existing) {
    return c.json({ message: '补录记录不存在' }, 404);
  }

  await db.execute('DELETE FROM makeup_records WHERE id = ?', [recordId]);
  return c.json({ message: '补录记录已撤销删除' });
});

export default adminRouter;
