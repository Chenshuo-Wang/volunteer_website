import { db } from '../db/index.js';

/**
 * 自动同步考勤状态：
 * 当活动或周常岗位结束时，将所有状态仍为 'signed_up' (或未确认) 的参与者归为 'pending' (待审核确认)
 */
export async function syncAttendanceStatus() {
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. 同步已结束校园活动的参与者为 pending
  await db.execute(
    `UPDATE event_signups
     SET status = 'pending'
     WHERE (status IS NULL OR status = 'signed_up')
       AND event_id IN (SELECT id FROM events WHERE end_time <= ?)`,
    [nowIso]
  );

  // 2. 同步已结束周常岗位的参与者为 pending
  const activeShifts = await db.query(
    `SELECT ss.id, ss.date, rs.end_time
     FROM shift_signups ss
     JOIN recurring_shifts rs ON rs.id = ss.shift_id
     WHERE (ss.status = 'signed_up' OR ss.status IS NULL)
       AND ss.status != 'cancelled'`
  );

  for (const s of activeShifts) {
    if (!s.date || !s.end_time) continue;
    const shiftEnd = new Date(`${s.date}T${s.end_time}:00`);
    if (now >= shiftEnd) {
      await db.execute('UPDATE shift_signups SET status = ? WHERE id = ?', ['pending', s.id]);
    }
  }
}

/**
 * 获取分类项目考勤与工时审核数据
 */
export async function getAttendanceGrouped() {
  // 先执行一次自动状态同步
  await syncAttendanceStatus();

  const now = new Date();

  // A. 校园活动考勤数据
  const events = await db.query('SELECT * FROM events ORDER BY start_time DESC');
  const eventList = [];

  let totalPending = 0;
  let totalCompleted = 0;
  let totalUncompleted = 0;

  for (const ev of events) {
    const isEnded = new Date(ev.end_time) <= now;
    const isStarted = new Date(ev.start_time) <= now;

    const signups = await db.query(
      `SELECT es.id as signup_id, es.status, es.signup_time,
              s.id as student_id, s.name, s.phone, s.enrollment_year, s.class_number
       FROM event_signups es
       JOIN students s ON s.id = es.student_id
       WHERE es.event_id = ?
       ORDER BY es.signup_time ASC`,
      [ev.id]
    );

    let eventPending = 0;
    let eventCompleted = 0;
    let eventUncompleted = 0;

    const participants = signups.map((su) => {
      let st = su.status || 'signed_up';
      // 如果活动已结束但状态仍为 signed_up，逻辑上归为 pending
      if (isEnded && st === 'signed_up') {
        st = 'pending';
      }

      if (st === 'pending') {
        eventPending++;
        totalPending++;
      } else if (st === 'completed') {
        eventCompleted++;
        totalCompleted++;
      } else if (st === 'uncompleted') {
        eventUncompleted++;
        totalUncompleted++;
      }

      return {
        signupId: su.signup_id,
        studentId: su.student_id,
        name: su.name,
        phone: su.phone,
        className: `${su.enrollment_year}级${su.class_number}班`,
        status: st,
        signupTime: su.signup_time,
      };
    });

    eventList.push({
      id: ev.id,
      title: ev.title,
      description: ev.description,
      location: ev.location,
      startTime: ev.start_time,
      endTime: ev.end_time,
      hoursValue: Number(ev.hours_value || 1.0),
      requiredVolunteers: ev.required_volunteers,
      isEnded,
      isStarted,
      totalParticipants: participants.length,
      pendingCount: eventPending,
      completedCount: eventCompleted,
      uncompletedCount: eventUncompleted,
      participants,
    });
  }

  // B. 周常岗位考勤数据（按岗位和日期分组）
  const shifts = await db.query(
    'SELECT * FROM recurring_shifts ORDER BY day_of_week ASC, start_time ASC'
  );
  const shiftMap = {};
  for (const s of shifts) {
    shiftMap[s.id] = s;
  }

  const shiftSignups = await db.query(
    `SELECT ss.id as signup_id, ss.shift_id, ss.date, ss.status, ss.created_at,
            s.id as student_id, s.name, s.phone, s.enrollment_year, s.class_number,
            rs.name as shift_name, rs.day_of_week, rs.start_time, rs.end_time, rs.hours_value
     FROM shift_signups ss
     JOIN students s ON s.id = ss.student_id
     JOIN recurring_shifts rs ON rs.id = ss.shift_id
     WHERE ss.status != 'cancelled'
     ORDER BY ss.date DESC, rs.day_of_week ASC, rs.start_time ASC`
  );

  const dayNames = { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五' };

  // 按 `${shift_id}_${date}` 分组
  const shiftGroupMap = {};
  for (const su of shiftSignups) {
    const key = `${su.shift_id}_${su.date}`;
    const shiftEnd = new Date(`${su.date}T${su.end_time}:00`);
    const isEnded = now >= shiftEnd;

    let st = su.status || 'signed_up';
    if (isEnded && st === 'signed_up') {
      st = 'pending';
    }

    if (st === 'pending') {
      totalPending++;
    } else if (st === 'completed') {
      totalCompleted++;
    } else if (st === 'uncompleted') {
      totalUncompleted++;
    }

    if (!shiftGroupMap[key]) {
      shiftGroupMap[key] = {
        key,
        shiftId: su.shift_id,
        shiftName: su.shift_name,
        date: su.date,
        dayOfWeek: su.day_of_week,
        dayName: dayNames[su.day_of_week] || `周${su.day_of_week}`,
        timeRange: `${su.start_time} - ${su.end_time}`,
        hoursValue: Number(su.hours_value || 0.5),
        isEnded,
        pendingCount: 0,
        completedCount: 0,
        uncompletedCount: 0,
        participants: [],
      };
    }

    if (st === 'pending') {
      shiftGroupMap[key].pendingCount++;
    } else if (st === 'completed') {
      shiftGroupMap[key].completedCount++;
    } else if (st === 'uncompleted') {
      shiftGroupMap[key].uncompletedCount++;
    }

    shiftGroupMap[key].participants.push({
      signupId: su.signup_id,
      studentId: su.student_id,
      name: su.name,
      phone: su.phone,
      className: `${su.enrollment_year}级${su.class_number}班`,
      status: st,
      signupTime: su.created_at,
    });
  }

  const shiftList = Object.values(shiftGroupMap);

  return {
    summary: {
      totalPending,
      totalCompleted,
      totalUncompleted,
      totalEvents: eventList.length,
      totalShiftGroups: shiftList.length,
    },
    events: eventList,
    shifts: shiftList,
  };
}

/**
 * 更新活动报名考勤状态
 */
export async function updateEventSignupStatus(signupId, status) {
  const allowed = ['pending', 'completed', 'uncompleted', 'signed_up'];
  if (!allowed.includes(status)) {
    throw new Error(`无效的状态值: ${status}`);
  }

  const existing = await db.queryOne('SELECT id FROM event_signups WHERE id = ?', [signupId]);
  if (!existing) {
    throw new Error('报名记录不存在');
  }

  await db.execute('UPDATE event_signups SET status = ? WHERE id = ?', [status, signupId]);
  return { signupId, status };
}

/**
 * 更新周常岗位报名考勤状态
 */
export async function updateShiftSignupStatus(signupId, status) {
  const allowed = ['pending', 'completed', 'uncompleted', 'signed_up'];
  if (!allowed.includes(status)) {
    throw new Error(`无效的状态值: ${status}`);
  }

  const existing = await db.queryOne('SELECT id FROM shift_signups WHERE id = ?', [signupId]);
  if (!existing) {
    throw new Error('报名记录不存在');
  }

  await db.execute('UPDATE shift_signups SET status = ? WHERE id = ?', [status, signupId]);
  return { signupId, status };
}

/**
 * 批量更新活动参与者状态
 */
export async function batchUpdateEventAttendance(eventId, status) {
  const allowed = ['pending', 'completed', 'uncompleted'];
  if (!allowed.includes(status)) {
    throw new Error(`无效的状态值: ${status}`);
  }

  await db.execute(
    'UPDATE event_signups SET status = ? WHERE event_id = ? AND status != ?',
    [status, eventId, status]
  );
  return { eventId, status };
}

/**
 * 批量更新周常岗位特定日期的参与者状态
 */
export async function batchUpdateShiftAttendance(shiftId, date, status) {
  const allowed = ['pending', 'completed', 'uncompleted'];
  if (!allowed.includes(status)) {
    throw new Error(`无效的状态值: ${status}`);
  }

  await db.execute(
    'UPDATE shift_signups SET status = ? WHERE shift_id = ? AND date = ? AND status != ? AND status != "cancelled"',
    [status, shiftId, date, status]
  );
  return { shiftId, date, status };
}
