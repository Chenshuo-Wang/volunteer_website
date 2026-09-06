// 自动化端到端 API 逻辑验证套件
import { app } from '../server/app.js';
import { db } from '../server/db/index.js';

let failedTests = 0;
let passedTests = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
    failedTests++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
  }
}

async function request(path, options = {}) {
  const url = `http://localhost${path}`;
  const res = await app.fetch(new Request(url, options));
  let body = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }
  return { status: res.status, body, headers: res.headers };
}

async function runAllTests() {
  console.log('--- 启动 API 自动化验证测试套件 ---');
  await db.init();

  // 1. 健康检查
  await test('GET /api/ - 基础信息', async () => {
    const res = await request('/api');
    assertEqual(res.status, 200);
    assertEqual(res.body.status, 'ok');
  });

  await test('GET /api/health - 健康检查', async () => {
    const res = await request('/api/health');
    assertEqual(res.status, 200);
    assertEqual(res.body.status, 'healthy');
    assert(res.body.database.status === 'connected', 'Database should be connected');
  });

  // 2. 学生注册与登录
  const testPhone = '13900001111';
  await test('POST /api/students/register - 注册新学生', async () => {
    // 清理旧数据以防重复
    await db.execute('DELETE FROM students WHERE phone = ?', [testPhone]);

    const res = await request('/api/students/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '测试学生',
        phone: testPhone,
        password: 'password123',
        enrollmentYear: 2024,
        classNumber: 1,
        qq: '123456',
        wechat: 'wx123',
      }),
    });

    assertEqual(res.status, 201);
    assertEqual(res.body.message, '注册成功！');
    assertEqual(res.body.student.phone, testPhone);
    assertEqual(res.body.student.fullClassName, '2024级1班');
  });

  await test('POST /api/students/register - 重复手机号拦截 (409)', async () => {
    const res = await request('/api/students/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '重复学生',
        phone: testPhone,
        password: 'pass',
        enrollmentYear: 2024,
        classNumber: 1,
      }),
    });
    assertEqual(res.status, 409);
    assertEqual(res.body.message, '该手机号已被注册');
  });

  await test('POST /api/students/login - 登录成功', async () => {
    const res = await request('/api/students/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone,
        password: 'password123',
      }),
    });
    assertEqual(res.status, 200);
    assertEqual(res.body.message, '登录成功');
    assertEqual(res.body.student.name, '测试学生');
  });

  await test('POST /api/students/login - 密码错误拦截 (401)', async () => {
    const res = await request('/api/students/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone,
        password: 'wrong_password',
      }),
    });
    assertEqual(res.status, 401);
    assert(res.body.message.includes('密码错误'));
  });

  await test('GET /api/students/profile - 查询档案', async () => {
    const res = await request(`/api/students/profile?phone=${testPhone}`);
    assertEqual(res.status, 200);
    assertEqual(res.body.phone, testPhone);
    assert(Array.isArray(res.body.history), 'History should be an array');
  });

  await test('PUT /api/students/profile - 修改密码与资料', async () => {
    // 1. 旧密码错误
    const errRes = await request(`/api/students/profile?phone=${testPhone}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: 'wrong', newPassword: 'new123' }),
    });
    assertEqual(errRes.status, 401);

    // 2. 正确修改密码
    const okRes = await request(`/api/students/profile?phone=${testPhone}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: 'password123', newPassword: 'new123' }),
    });
    assertEqual(okRes.status, 200);
    assertEqual(okRes.body.message, '密码修改成功');

    // 恢复密码
    await request(`/api/students/profile?phone=${testPhone}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: 'new123', newPassword: 'password123' }),
    });
  });

  // 3. 管理员鉴权测试
  await test('GET /api/admin/rotations - 无 Token 拦截 (401)', async () => {
    const res = await request('/api/admin/rotations');
    assertEqual(res.status, 401);
  });

  await test('GET /api/admin/rotations - 普通学生 Token 越权拦截 (403)', async () => {
    const res = await request('/api/admin/rotations', {
      headers: { 'X-Admin-Token': testPhone },
    });
    assertEqual(res.status, 403);
  });

  await test('GET /api/admin/rotations - 管理员 Token 鉴权成功 (200)', async () => {
    const res = await request('/api/admin/rotations', {
      headers: { 'X-Admin-Token': 'admin' },
    });
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Rotations should be array');
  });

  // 4. 周常轮值与岗位排班
  const nextMonday = '2026-09-07';
  await test('POST /api/admin/rotations - 设置周轮换班级', async () => {
    const res = await request('/api/admin/rotations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': 'admin',
      },
      body: JSON.stringify({
        weekStartDate: nextMonday,
        assignedClass: '2024-1',
      }),
    });
    assertEqual(res.status, 201);

    // 查询公开接口
    const queryRes = await request(`/api/shifts/rotation?date=${nextMonday}`);
    assertEqual(queryRes.status, 200);
    assertEqual(queryRes.body.assignedClass, '2024-1');
  });

  // 5. 普通活动 CRUD 与报名规则
  let createdEventId = null;
  await test('POST /api/events - 创建普通活动', async () => {
    const res = await request('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '科技馆志愿者服务',
        description: '协助指引与讲解',
        startTime: '2026-10-01T09:00:00.000Z',
        endTime: '2026-10-01T12:00:00.000Z',
        registrationDeadline: '2026-09-30T18:00:00.000Z',
        location: '市科技馆',
        requiredVolunteers: 2, // 设置容量为 2
        gradeLimit: '2024',
        hoursValue: 3.0,
      }),
    });
    assertEqual(res.status, 201);
    assertEqual(res.body.title, '科技馆志愿者服务');
    assertEqual(res.body.status, '招募中');
    createdEventId = res.body.id;
  });

  await test('GET /api/events - 获取活动列表与优先级排序', async () => {
    const res = await request('/api/events');
    assertEqual(res.status, 200);
    assert(res.body.length > 0, 'Should have events');
    const found = res.body.find((e) => e.id === createdEventId);
    assert(Boolean(found), 'Created event must be in list');
  });

  await test('POST /api/events/:id/signup - 报名普通活动', async () => {
    const student = await db.queryOne('SELECT id FROM students WHERE phone = ?', [testPhone]);
    const res = await request(`/api/events/${createdEventId}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: student.id }),
    });
    assertEqual(res.status, 201);
    assertEqual(res.body.message, '报名成功！');

    // 重复报名拦截 (409)
    const dupRes = await request(`/api/events/${createdEventId}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: student.id }),
    });
    assertEqual(dupRes.status, 409);
    assertEqual(dupRes.body.message, '您已经报名过该活动了');

    // 管理员报名凑满 2 人
    const admin = await db.queryOne('SELECT id FROM students WHERE phone = ?', ['admin']);
    await db.execute(
      'INSERT INTO event_signups (student_id, event_id, signup_time) VALUES (?, ?, ?)',
      [admin.id, createdEventId, new Date().toISOString()]
    );

    // 活动状态更新为已满员
    const detailRes = await request(`/api/events/${createdEventId}`);
    assertEqual(detailRes.body.status, '已满员');
  });

  // 6. 周常岗位报名与限制
  await test('GET /api/shifts - 获取周常岗位列表', async () => {
    const res = await request('/api/shifts');
    assertEqual(res.status, 200);
    assert(res.body.length >= 14, 'Should have preset shifts');
  });

  await test('POST /api/shifts/:id/signup - 周常岗位报名成功与规则校验', async () => {
    const student = await db.queryOne('SELECT id FROM students WHERE phone = ?', [testPhone]);
    // 找一个周一 (day_of_week=1) 的岗位
    const mondayShift = await db.queryOne('SELECT * FROM recurring_shifts WHERE day_of_week = 1 LIMIT 1');
    assert(Boolean(mondayShift), 'Must have monday shift');

    // 清理该周该测试日期的旧报名，保证测试隔离幂等
    await db.execute('DELETE FROM shift_signups WHERE date = ?', [nextMonday]);

    const res = await request(`/api/shifts/${mondayShift.id}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: student.id,
        date: nextMonday,
      }),
    });
    assertEqual(res.status, 201);
    assertEqual(res.body.message, '报名成功！');

    // 检查我的报名列表
    const mySignupsRes = await request(`/api/shifts/my-signups?phone=${testPhone}`);
    assertEqual(mySignupsRes.status, 200);
    assert(mySignupsRes.body.length >= 1, 'Should show up in my-signups');
  });

  // 7. 管理员矩阵看板
  await test('GET /api/admin/shifts/signups - 获取周报名矩阵看板', async () => {
    const res = await request(`/api/admin/shifts/signups?week_start=${nextMonday}&class_name=2024-1`, {
      headers: { 'X-Admin-Token': 'admin' },
    });
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body.columns), 'Columns should be array');
    assert(Array.isArray(res.body.rows), 'Rows should be array');
    assert(Array.isArray(res.body.classList), 'ClassList should be array');
    const myRow = res.body.rows.find((r) => r.name === '测试学生');
    assert(Boolean(myRow), 'Test student should be in matrix row');
  });

  // 8. 管理员学生列表
  await test('GET /api/admin/students - 获取所有学生列表', async () => {
    const res = await request('/api/admin/students', {
      headers: { 'X-Admin-Token': 'admin' },
    });
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Students should be array');
  });

  console.log('====================================');
  console.log(`测试完成！通过: ${passedTests}, 失败: ${failedTests}`);
  console.log('====================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
