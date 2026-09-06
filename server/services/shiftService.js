// 周常任务与日期计算辅助服务

export function getWeekRange(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0 是周日, 1-6 是周一到周六
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const mon = new Date(y, m - 1, d + mondayOffset);
  const fri = new Date(y, m - 1, d + mondayOffset + 4);

  const fmt = (dt) =>
    dt.getFullYear() +
    '-' +
    String(dt.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(dt.getDate()).padStart(2, '0');

  return {
    monday: fmt(mon),
    friday: fmt(fri),
    weekday: day === 0 ? 7 : day, // 1 是周一，5 是周五，7 是周日
  };
}

export function formatShift(shift) {
  const startTime = shift.start_time || '';
  const endTime = shift.end_time || '';
  return {
    id: shift.id,
    name: shift.name,
    dayOfWeek: shift.day_of_week,
    startTime,
    endTime,
    timeRange: startTime && endTime ? `${startTime} - ${endTime}` : '',
    capacity: shift.capacity,
    hoursValue: Number(shift.hours_value || 0.5),
    description: shift.description || '',
  };
}

export function formatShiftSignup(signup) {
  return {
    id: signup.id,
    studentId: signup.student_id,
    shiftId: signup.shift_id,
    date: signup.date,
    status: signup.status,
    createdAt: signup.created_at ? new Date(signup.created_at).toISOString() : '',
  };
}
