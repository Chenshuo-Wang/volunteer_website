import { db } from '../db/index.js';
import { getEventStatus } from './eventService.js';

// 计算学生累计总时长
export async function getStudentTotalHours(studentId) {
  const nowStr = new Date().toISOString();
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. 普通活动工时 (已结束)
  const eventRes = await db.queryOne(
    `SELECT SUM(e.hours_value) as sum_hours
     FROM events e
     JOIN event_signups es ON es.event_id = e.id
     WHERE es.student_id = ? AND e.end_time < ?`,
    [studentId, nowStr]
  );
  const eventHours = Number(eventRes?.sum_hours || 0);

  // 2. 周常岗位工时 (在今天之前)
  const shiftRes = await db.queryOne(
    `SELECT SUM(rs.hours_value) as sum_hours
     FROM recurring_shifts rs
     JOIN shift_signups ss ON ss.shift_id = rs.id
     WHERE ss.student_id = ? AND ss.date < ? AND ss.status != 'cancelled'`,
    [studentId, todayStr]
  );
  const shiftHours = Number(shiftRes?.sum_hours || 0);

  return Math.round((eventHours + shiftHours) * 10) / 10;
}

// 获取学生历史记录
export async function getStudentHistory(studentId) {
  const historyList = [];
  const todayStr = new Date().toISOString().slice(0, 10);

  // A. 普通活动记录
  const events = await db.query(
    `SELECT e.*, es.signup_time
     FROM events e
     JOIN event_signups es ON es.event_id = e.id
     WHERE es.student_id = ?`,
    [studentId]
  );

  for (const e of events) {
    const signupCountRes = await db.queryOne(
      'SELECT COUNT(*) as cnt FROM event_signups WHERE event_id = ?',
      [e.id]
    );
    const signupCount = Number(signupCountRes?.cnt || 0);
    const status = getEventStatus(e, signupCount);

    historyList.push({
      type: 'event',
      id: e.id,
      title: e.title,
      hours: e.hours_value,
      date: new Date(e.start_time).toISOString(),
      status,
    });
  }

  // B. 周常岗位记录
  const shifts = await db.query(
    `SELECT ss.*, rs.name as shift_name, rs.day_of_week, rs.hours_value as shift_hours
     FROM shift_signups ss
     JOIN recurring_shifts rs ON rs.id = ss.shift_id
     WHERE ss.student_id = ? AND ss.status != 'cancelled'`,
    [studentId]
  );

  const dayNames = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五' };
  for (const s of shifts) {
    const isPast = s.date < todayStr;
    historyList.push({
      type: 'shift',
      id: s.shift_id,
      title: `${s.shift_name} (周${dayNames[s.day_of_week] || s.day_of_week})`,
      hours: s.shift_hours,
      date: s.date,
      status: isPast ? '已完成' : '已参加',
    });
  }

  // C. 按日期倒序
  historyList.sort((a, b) => (a.date < b.date ? 1 : -1));
  return historyList;
}

// 格式化学生对象为前端所需的数据字典
export async function formatStudent(student, includeHistory = true) {
  if (!student) return null;

  const totalHours = await getStudentTotalHours(student.id);
  const fullClassName = `${student.enrollment_year}级${student.class_number}班`;

  const data = {
    id: student.id,
    name: student.name,
    phone: student.phone,
    enrollmentYear: student.enrollment_year,
    classNumber: student.class_number,
    fullClassName,
    qq: student.qq || null,
    wechat: student.wechat || null,
    totalHours,
    isAdmin: Boolean(student.is_admin),
  };

  if (includeHistory) {
    data.history = await getStudentHistory(student.id);
  }

  return data;
}
