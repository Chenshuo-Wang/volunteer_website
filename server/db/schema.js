// 数据库表结构定义（同时兼容 PostgreSQL 与 SQLite）

export function getCreateTablesSQL(isPostgres) {
  if (isPostgres) {
    return `
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        enrollment_year INTEGER NOT NULL,
        class_number INTEGER NOT NULL,
        qq VARCHAR(50),
        wechat VARCHAR(50),
        password VARCHAR(100),
        is_admin BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        registration_deadline TIMESTAMPTZ NOT NULL,
        location VARCHAR(100),
        leader_name VARCHAR(50),
        leader_contact VARCHAR(50),
        required_volunteers INTEGER NOT NULL,
        grade_limit VARCHAR(100) DEFAULT 'ALL',
        hours_value DOUBLE PRECISION NOT NULL DEFAULT 1.0
      );

      CREATE TABLE IF NOT EXISTS event_signups (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        signup_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_event_signup UNIQUE (student_id, event_id)
      );

      CREATE TABLE IF NOT EXISTS recurring_shifts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        day_of_week INTEGER NOT NULL,
        start_time VARCHAR(10) NOT NULL,
        end_time VARCHAR(10) NOT NULL,
        capacity INTEGER DEFAULT 2,
        hours_value DOUBLE PRECISION DEFAULT 0.5,
        description VARCHAR(200)
      );

      CREATE TABLE IF NOT EXISTS weekly_rotations (
        id SERIAL PRIMARY KEY,
        week_start_date VARCHAR(20) UNIQUE NOT NULL,
        assigned_class_str VARCHAR(50) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS shift_signups (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        shift_id INTEGER NOT NULL REFERENCES recurring_shifts(id) ON DELETE CASCADE,
        date VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_shift_signup UNIQUE (shift_id, date, student_id)
      );
    `;
  }

  // SQLite DDL
  return `
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      enrollment_year INTEGER NOT NULL,
      class_number INTEGER NOT NULL,
      qq TEXT,
      wechat TEXT,
      password TEXT,
      is_admin INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      registration_deadline TEXT NOT NULL,
      location TEXT,
      leader_name TEXT,
      leader_contact TEXT,
      required_volunteers INTEGER NOT NULL,
      grade_limit TEXT DEFAULT 'ALL',
      hours_value REAL NOT NULL DEFAULT 1.0
    );

    CREATE TABLE IF NOT EXISTS event_signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      event_id INTEGER NOT NULL,
      signup_time TEXT DEFAULT (datetime('now')),
      UNIQUE (student_id, event_id)
    );

    CREATE TABLE IF NOT EXISTS recurring_shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      capacity INTEGER DEFAULT 2,
      hours_value REAL DEFAULT 0.5,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS weekly_rotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start_date TEXT UNIQUE NOT NULL,
      assigned_class_str TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shift_signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      shift_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE (shift_id, date, student_id)
    );
  `;
}
