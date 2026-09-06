import { Hono } from 'hono';
import { db } from '../db/index.js';
import { formatStudent } from '../services/studentService.js';

const studentsRouter = new Hono();

// 学生注册接口
studentsRouter.post('/register', async (c) => {
  const data = await c.req.json();

  // 必填字段检查
  const requiredFields = ['name', 'phone', 'password', 'enrollmentYear', 'classNumber'];
  const missing = requiredFields.some((f) => data[f] === undefined || data[f] === null || data[f] === '');
  if (missing) {
    return c.json({ message: '缺少必填信息' }, 400);
  }

  const phone = String(data.phone).trim();

  // 检查手机号是否已存在
  const existing = await db.queryOne('SELECT id FROM students WHERE phone = ?', [phone]);
  if (existing) {
    return c.json({ message: '该手机号已被注册' }, 409);
  }

  try {
    const res = await db.execute(
      `INSERT INTO students (name, phone, password, enrollment_year, class_number, qq, wechat, is_admin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        phone,
        data.password,
        Number(data.enrollmentYear),
        Number(data.classNumber),
        data.qq || null,
        data.wechat || null,
        0,
      ]
    );

    const newStudent = await db.queryOne('SELECT * FROM students WHERE id = ?', [res.id]);
    const formatted = await formatStudent(newStudent, true);

    return c.json(
      {
        message: '注册成功！',
        student: formatted,
      },
      201
    );
  } catch (err) {
    console.error('[STUDENT REGISTER ERROR]', err);
    return c.json({ message: `注册失败: ${err.message}` }, 500);
  }
});

// 学生登录接口
studentsRouter.post('/login', async (c) => {
  const data = await c.req.json();
  const phone = data.phone ? String(data.phone).trim() : '';
  const password = data.password ? String(data.password) : '';

  if (!phone || !password) {
    return c.json({ message: '请输入手机号和密码' }, 400);
  }

  const student = await db.queryOne('SELECT * FROM students WHERE phone = ?', [phone]);
  if (!student) {
    return c.json({ message: '手机号未注册' }, 404);
  }

  if (student.password !== password) {
    return c.json({ message: '密码错误，如忘记密码请联系管理员' }, 401);
  }

  const formatted = await formatStudent(student, true);
  return c.json(
    {
      message: '登录成功',
      student: formatted,
    },
    200
  );
});

// 获取学生个人档案
studentsRouter.get('/profile', async (c) => {
  const phone = c.req.query('phone');
  if (!phone) {
    return c.json({ message: '请提供手机号' }, 400);
  }

  const student = await db.queryOne('SELECT * FROM students WHERE phone = ?', [phone.trim()]);
  if (!student) {
    return c.json({ message: '未找到该学生' }, 404);
  }

  const formatted = await formatStudent(student, true);
  return c.json(formatted);
});

// 更新学生信息（修改密码或联系方式）
studentsRouter.put('/profile', async (c) => {
  const phone = c.req.query('phone');
  if (!phone) {
    return c.json({ message: '请提供手机号' }, 400);
  }

  const student = await db.queryOne('SELECT * FROM students WHERE phone = ?', [phone.trim()]);
  if (!student) {
    return c.json({ message: '未找到该学生' }, 404);
  }

  const data = await c.req.json();

  // 如果要修改密码，需要验证旧密码
  if ('oldPassword' in data && 'newPassword' in data) {
    if (student.password !== data.oldPassword) {
      return c.json({ message: '旧密码错误' }, 401);
    }

    await db.execute('UPDATE students SET password = ? WHERE id = ?', [data.newPassword, student.id]);
    return c.json({ message: '密码修改成功' }, 200);
  }

  // 其他信息更新（如 QQ、微信）
  const newQq = 'qq' in data ? data.qq : student.qq;
  const newWechat = 'wechat' in data ? data.wechat : student.wechat;

  await db.execute('UPDATE students SET qq = ?, wechat = ? WHERE id = ?', [newQq, newWechat, student.id]);

  const updatedStudent = await db.queryOne('SELECT * FROM students WHERE id = ?', [student.id]);
  const formatted = await formatStudent(updatedStudent, true);

  return c.json({ message: '信息更新成功', student: formatted }, 200);
});

export default studentsRouter;
