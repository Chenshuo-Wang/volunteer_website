// 初始数据植入（与原 backend/init_db.py 保持 100% 一致）

export async function seedInitialData(db) {
  try {
    // 1. 创建默认管理员账号
    const existingAdmin = await db.queryOne('SELECT id FROM students WHERE phone = ?', ['admin']);
    if (!existingAdmin) {
      await db.execute(
        `INSERT INTO students (name, phone, password, enrollment_year, class_number, is_admin)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['管理员', 'admin', 'admin123', 2020, 0, 1]
      );
      console.log('[SEED] 默认管理员已创建: admin / admin123');
    }

    // 2. 检查是否已经有周常岗位数据
    const existingShift = await db.queryOne('SELECT id FROM recurring_shifts LIMIT 1');
    if (existingShift) {
      return;
    }

    // 3. 写入 14 个标准预设周常岗位
    const shiftsData = [];

    // 周二到周五：早上文明礼仪站岗 (7:35-7:55)
    for (const day of [2, 3, 4, 5]) {
      shiftsData.push({
        name: '文明礼仪站岗',
        day,
        start: '07:35',
        end: '07:55',
        capacity: 2,
        hours: 0.5,
        desc: '校门口文明礼仪站岗'
      });
    }

    // 周一到周五：中午食堂志愿 (11:40-12:00)
    for (const day of [1, 2, 3, 4, 5]) {
      shiftsData.push({
        name: '食堂志愿',
        day,
        start: '11:40',
        end: '12:00',
        capacity: 2,
        hours: 0.5,
        desc: '食堂午餐时段志愿服务'
      });
    }

    // 周二到周四：下午文明礼仪站岗 (16:45-17:05)
    for (const day of [2, 3, 4]) {
      shiftsData.push({
        name: '文明礼仪站岗',
        day,
        start: '16:45',
        end: '17:05',
        capacity: 2,
        hours: 0.5,
        desc: '校门口文明礼仪站岗'
      });
    }

    // 周五：下午文明礼仪站岗（提前30分钟：16:15-16:35）
    shiftsData.push({
      name: '文明礼仪站岗',
      day: 5,
      start: '16:15',
      end: '16:35',
      capacity: 2,
      hours: 0.5,
      desc: '校门口文明礼仪站岗（周五提前）'
    });

    // 周一到周四：下午食堂志愿 (17:10-17:20)
    for (const day of [1, 2, 3, 4]) {
      shiftsData.push({
        name: '食堂志愿',
        day,
        start: '17:10',
        end: '17:20',
        capacity: 2,
        hours: 0.5,
        desc: '食堂晚餐时段志愿服务'
      });
    }

    // 周五：下午食堂志愿（提前30分钟：16:40-16:50）
    shiftsData.push({
      name: '食堂志愿',
      day: 5,
      start: '16:40',
      end: '16:50',
      capacity: 2,
      hours: 0.5,
      desc: '食堂晚餐时段志愿服务（周五提前）'
    });

    for (const s of shiftsData) {
      await db.execute(
        `INSERT INTO recurring_shifts (name, day_of_week, start_time, end_time, capacity, hours_value, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [s.name, s.day, s.start, s.end, s.capacity, s.hours, s.desc]
      );
    }
    console.log(`[SEED] 周常岗位数据初始化完成，共创建 ${shiftsData.length} 个岗位。`);
  } catch (err) {
    console.error('[SEED ERROR] 初始化数据失败:', err);
  }
}
