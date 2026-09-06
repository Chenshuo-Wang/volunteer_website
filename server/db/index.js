import os from 'os';
import path from 'path';
import fs from 'fs';
import { getCreateTablesSQL } from './schema.js';
import { seedInitialData } from './seed.js';

let isPostgres = false;
let pgPool = null;
let sqliteDb = null;
let initialized = false;

// 格式化 SQL 参数占位符：将 ? 替换为 PostgreSQL 的 $1, $2, $3
function formatSqlForPg(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// 统一数据库访问接口
export const db = {
  isPostgres: () => isPostgres,

  async init() {
    if (initialized) return;

    const rawDbUrl = process.env.DATABASE_URL;
    if (rawDbUrl && (rawDbUrl.startsWith('postgres://') || rawDbUrl.startsWith('postgresql://'))) {
      isPostgres = true;
      let connectionString = rawDbUrl.replace('postgres://', 'postgresql://');

      // 动态导入 pg 模块
      const { default: pg } = await import('pg');
      const { Pool } = pg;

      const poolConfig = {
        connectionString,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };

      // 云端 PostgreSQL（如 Neon, Supabase 等）通常需要 SSL
      if (
        connectionString.includes('neon') ||
        connectionString.includes('supabase') ||
        connectionString.includes('pooler') ||
        connectionString.includes('sslmode=require') ||
        process.env.PGSSLMODE === 'require'
      ) {
        poolConfig.ssl = { rejectUnauthorized: false };
      }

      pgPool = new Pool(poolConfig);

      // 执行建表 DDL
      const ddl = getCreateTablesSQL(true);
      await pgPool.query(ddl);
      console.log('[DB] PostgreSQL 连接并初始化表结构成功');
    } else {
      isPostgres = false;
      // 使用 Node.js 原生内置的 node:sqlite
      const { DatabaseSync } = await import('node:sqlite');

      let dbFile = '';
      if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        dbFile = path.join(os.tmpdir(), 'volunteer.db');
      } else {
        const dataDir = path.join(process.cwd(), 'instance');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        dbFile = path.join(dataDir, 'volunteer.db');
      }

      sqliteDb = new DatabaseSync(dbFile);
      // 开启 WAL 模式以提升并发读写性能
      sqliteDb.exec("PRAGMA journal_mode = WAL;");

      const ddl = getCreateTablesSQL(false);
      sqliteDb.exec(ddl);
      console.log(`[DB] SQLite 初始化成功 (${dbFile})`);
    }

    initialized = true;

    // 植入初始种子数据 (默认管理员与 14 个周常岗位)
    await seedInitialData(this);
  },

  async query(sql, params = []) {
    await this.init();
    if (isPostgres) {
      const formatted = formatSqlForPg(sql);
      const res = await pgPool.query(formatted, params);
      return res.rows;
    } else {
      const stmt = sqliteDb.prepare(sql);
      const rows = stmt.all(...params);
      return rows.map(r => ({ ...r }));
    }
  },

  async queryOne(sql, params = []) {
    await this.init();
    if (isPostgres) {
      const formatted = formatSqlForPg(sql);
      const res = await pgPool.query(formatted, params);
      return res.rows[0] || null;
    } else {
      const stmt = sqliteDb.prepare(sql);
      const row = stmt.get(...params);
      return row ? { ...row } : null;
    }
  },

  async execute(sql, params = []) {
    await this.init();
    if (isPostgres) {
      let runSql = sql;
      const trimmed = sql.trim();
      const isInsert = trimmed.toUpperCase().startsWith('INSERT');
      if (isInsert && !trimmed.toUpperCase().includes('RETURNING')) {
        runSql = `${trimmed} RETURNING id`;
      }
      const formatted = formatSqlForPg(runSql);
      const res = await pgPool.query(formatted, params);
      const insertedId = res.rows?.[0]?.id;
      return {
        id: insertedId !== undefined ? Number(insertedId) : null,
        changes: res.rowCount,
      };
    } else {
      const stmt = sqliteDb.prepare(sql);
      const res = stmt.run(...params);
      return {
        id: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : null,
        changes: res.changes,
      };
    }
  },
};
