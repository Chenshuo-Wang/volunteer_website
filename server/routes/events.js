import { Hono } from 'hono';
import { db } from '../db/index.js';
import { formatEvent, getEventStatus, EVENT_STATUS_PRIORITY } from '../services/eventService.js';

const eventsRouter = new Hono();

// 通用创建活动逻辑
export async function createEvent(data) {
  const startTime = new Date(data.startTime).toISOString();
  const endTime = new Date(data.endTime).toISOString();
  const regDeadline = new Date(data.registrationDeadline).toISOString();
  const gradeLimit = data.gradeLimit || data.gradeRestriction || 'ALL';
  const hoursValue = parseFloat(data.hoursValue !== undefined ? data.hoursValue : 1.0);
  const requiredVolunteers = parseInt(data.requiredVolunteers, 10);

  const res = await db.execute(
    `INSERT INTO events (
      title, description, start_time, end_time, registration_deadline,
      location, leader_name, leader_contact, required_volunteers,
      grade_limit, hours_value
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      data.description || '',
      startTime,
      endTime,
      regDeadline,
      data.location || '',
      data.leaderName || null,
      data.leaderContact || null,
      requiredVolunteers,
      gradeLimit,
      hoursValue,
    ]
  );

  const newEvent = await db.queryOne('SELECT * FROM events WHERE id = ?', [res.id]);
  return formatEvent(newEvent, 0);
}

// 获取活动列表
eventsRouter.get('/', async (c) => {
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

  // 按照状态优先级排序：招募中(0) -> 已满员(1) -> 报名截止(2) -> 进行中(3) -> 已结束(4)
  formattedEvents.sort((a, b) => {
    const pA = EVENT_STATUS_PRIORITY[a.status] ?? 5;
    const pB = EVENT_STATUS_PRIORITY[b.status] ?? 5;
    if (pA !== pB) return pA - pB;
    return new Date(b.startTime) - new Date(a.startTime);
  });

  return c.json(formattedEvents);
});

// 发布活动（公开接口）
eventsRouter.post('/', async (c) => {
  const data = await c.req.json();
  try {
    const created = await createEvent(data);
    return c.json(created, 201);
  } catch (err) {
    console.error('[CREATE EVENT ERROR]', err);
    return c.json({ message: err.message }, 500);
  }
});

// 获取单个活动详情
eventsRouter.get('/:id', async (c) => {
  const eventId = Number(c.req.param('id'));
  const event = await db.queryOne('SELECT * FROM events WHERE id = ?', [eventId]);
  if (!event) {
    return c.json({ message: '活动不存在' }, 404);
  }

  const signupCountRes = await db.queryOne(
    'SELECT COUNT(*) as cnt FROM event_signups WHERE event_id = ?',
    [eventId]
  );
  const signupCount = Number(signupCountRes?.cnt || 0);

  return c.json(formatEvent(event, signupCount));
});

// 学生报名普通活动
eventsRouter.post('/:id/signup', async (c) => {
  const eventId = Number(c.req.param('id'));
  const data = await c.req.json();
  const studentId = Number(data.studentId);

  const event = await db.queryOne('SELECT * FROM events WHERE id = ?', [eventId]);
  if (!event) {
    return c.json({ message: '活动不存在' }, 404);
  }

  const student = await db.queryOne('SELECT * FROM students WHERE id = ?', [studentId]);
  if (!student) {
    return c.json({ message: '学生不存在' }, 404);
  }

  // 1. 基础状态检查
  const signupCountRes = await db.queryOne(
    'SELECT COUNT(*) as cnt FROM event_signups WHERE event_id = ?',
    [eventId]
  );
  const signupCount = Number(signupCountRes?.cnt || 0);
  const currentStatus = getEventStatus(event, signupCount);

  if (currentStatus !== '招募中') {
    return c.json({ message: `无法报名，当前状态：${currentStatus}` }, 400);
  }

  // 2. 年级限制检查 (grade_limit 如 "2023,2024" 或 "ALL")
  if (event.grade_limit && event.grade_limit !== 'ALL') {
    const allowedYears = event.grade_limit.split(',').map((y) => y.trim());
    if (!allowedYears.includes(String(student.enrollment_year))) {
      return c.json(
        { message: `抱歉，该活动仅限 ${event.grade_limit} 级学生报名` },
        403
      );
    }
  }

  // 3. 重复报名检查
  const existing = await db.queryOne(
    'SELECT id FROM event_signups WHERE student_id = ? AND event_id = ?',
    [student.id, event.id]
  );
  if (existing) {
    return c.json({ message: '您已经报名过该活动了' }, 409);
  }

  // 4. 执行报名
  try {
    await db.execute(
      `INSERT INTO event_signups (student_id, event_id, signup_time)
       VALUES (?, ?, ?)`,
      [student.id, event.id, new Date().toISOString()]
    );
    return c.json({ message: '报名成功！' }, 201);
  } catch (err) {
    console.error('[EVENT SIGNUP ERROR]', err);
    return c.json({ message: '报名失败，请稍后重试' }, 500);
  }
});

export default eventsRouter;
