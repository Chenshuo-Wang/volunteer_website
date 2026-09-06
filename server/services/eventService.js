// 活动业务逻辑辅助函数

export function getEventStatus(event, signupCount) {
  const now = new Date();
  const endTime = new Date(event.end_time);
  const startTime = new Date(event.start_time);
  const regDeadline = new Date(event.registration_deadline);

  if (now > endTime) return '已结束';
  if (now > startTime) return '进行中';
  if (signupCount >= event.required_volunteers) return '已满员';
  if (now > regDeadline) return '报名截止';
  return '招募中';
}

export function formatEvent(event, signupCount) {
  return {
    id: event.id,
    title: event.title,
    description: event.description || '',
    startTime: new Date(event.start_time).toISOString(),
    endTime: new Date(event.end_time).toISOString(),
    location: event.location || '',
    requiredVolunteers: event.required_volunteers,
    currentVolunteers: signupCount,
    status: getEventStatus(event, signupCount),
    leaderName: event.leader_name || '',
    leaderContact: event.leader_contact || '',
    registrationDeadline: new Date(event.registration_deadline).toISOString(),
    gradeLimit: event.grade_limit || 'ALL',
    hoursValue: Number(event.hours_value || 1.0),
  };
}

export const EVENT_STATUS_PRIORITY = {
  '招募中': 0,
  '已满员': 1,
  '报名截止': 2,
  '进行中': 3,
  '已结束': 4,
};
