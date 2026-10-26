import { db } from '../db/index.js';
import { getEventStatus } from './eventService.js';

// 计算学生累计总时长（只有管理员确认完成 status = 'completed' 的记录才增加工时）
export async function getStudentTotalHours(studentId) {
  // 1. 普通活动工时: 仅统计管理员确认完成的记录
  const eventRes = await db.queryOne(
    `SELECT SUM(e.hours_value) as sum_hours
     FROM events e
     JOIN event_signups es ON es.event_id = e.id
     WHERE es.student_id = ? AND es.status = 'completed'`,
    [studentId]
  );
  const eventHours = Number(eventRes?.sum_hours || 0);

  // 2. 周常岗位工时: 仅统计管理员确认完成的记录
  const shiftRes = await db.queryOne(
    `SELECT SUM(rs.hours_value) as sum_hours
     FROM recurring_shifts rs
     JOIN shift_signups ss ON ss.shift_id = rs.id
     WHERE ss.student_id = ? AND ss.status = 'completed'`,
    [studentId]
  );
  const shiftHours = Number(shiftRes?.sum_hours || 0);

  return Math.round((eventHours + shiftHours) * 10) / 10;
}

// 获取学生历史记录
export async function getStudentHistory(studentId) {
  const historyList = [];
  const now = new Date();

  // A. 普通活动记录
  const events = await db.query(
    `SELECT e.*, es.status as signup_status, es.signup_time
     FROM events e
     JOIN event_signups es ON es.event_id = e.id
     WHERE es.student_id = ?`,
    [studentId]
  );

  for (const e of events) {
    let displayStatus = '已报名';
    let hoursEarned = 0;
    const isEnded = new Date(e.end_time) <= now;

    if (e.signup_status === 'completed') {
      displayStatus = '已完成';
      hoursEarned = e.hours_value;
    } else if (e.signup_status === 'uncompleted') {
      displayStatus = '未完成';
      hoursEarned = 0;
    } else if (e.signup_status === 'pending' || isEnded) {
      displayStatus = '待确认';
      hoursEarned = 0;
    } else {
      displayStatus = '已报名';
      hoursEarned = 0;
    }

    historyList.push({
      type: 'event',
      id: e.id,
      title: e.title,
      hours: hoursEarned,
      hoursValue: e.hours_value,
      date: new Date(e.start_time).toISOString(),
      status: displayStatus,
    });
  }

  // B. 周常岗位记录
  const shifts = await db.query(
    `SELECT ss.*, rs.name as shift_name, rs.day_of_week, rs.start_time, rs.end_time, rs.hours_value as shift_hours
     FROM shift_signups ss
     JOIN recurring_shifts rs ON rs.id = ss.shift_id
     WHERE ss.student_id = ? AND ss.status != 'cancelled'`,
    [studentId]
  );

  const dayNames = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五' };
  for (const s of shifts) {
    let displayStatus = '已报名';
    let hoursEarned = 0;
    const shiftEnd = new Date(`${s.date}T${s.end_time || '23:59'}:00`);
    const isEnded = now >= shiftEnd;

    if (s.status === 'completed') {
      displayStatus = '已完成';
      hoursEarned = s.shift_hours;
    } else if (s.status === 'uncompleted') {
      displayStatus = '未完成';
      hoursEarned = 0;
    } else if (s.status === 'pending' || isEnded) {
      displayStatus = '待确认';
      hoursEarned = 0;
    } else {
      displayStatus = '已报名';
      hoursEarned = 0;
    }

    historyList.push({
      type: 'shift',
      id: s.shift_id,
      title: `${s.shift_name} (周${dayNames[s.day_of_week] || s.day_of_week})`,
      hours: hoursEarned,
      hoursValue: s.shift_hours,
      date: s.date,
      status: displayStatus,
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
