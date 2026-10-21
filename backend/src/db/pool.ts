import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { config } from "../config.js";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool === null) {
    pool = mysql.createPool({
      host: config.DB_HOST,
      port: config.DB_PORT,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_NAME,
      waitForConnections: true,
      connectionLimit: config.DB_CONNECTION_LIMIT,
      queueLimit: 0,
      charset: "utf8mb4",
      timezone: "Z",
      dateStrings: true,
    });
  }

  return pool;
}

export async function query<T extends RowDataPacket>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const [rows] = await getPool().execute<T[]>(sql, params as any[]);
  return rows;
}

export async function execute(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [result] = await getPool().execute<ResultSetHeader>(sql, params as any[]);
  return result;
}

export async function dbHealth(): Promise<boolean> {
  try {
    await getPool().query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool !== null) {
    await pool.end();
    pool = null;
  }
}
