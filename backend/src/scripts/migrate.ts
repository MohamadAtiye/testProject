import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { config } from "../config.js";

async function connect(): Promise<mysql.Connection> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      return await mysql.createConnection({
        host: config.DB_HOST,
        port: config.DB_PORT,
        user: config.DB_USER,
        password: config.DB_PASSWORD,
        database: config.DB_NAME,
        charset: "utf8mb4",
        multipleStatements: true,
        timezone: "Z",
      });
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }

  throw lastError;
}

const connection = await connect();

try {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const migrationsDir = path.resolve(process.cwd(), "migrations");
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT version FROM schema_migrations WHERE version = ?",
      [file],
    );

    if (rows.length > 0) {
      console.log(`[migrate] skip ${file}`);
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    console.log(`[migrate] apply ${file}`);
    await connection.query(sql);
    await connection.query("INSERT INTO schema_migrations (version) VALUES (?)", [file]);
  }

  console.log("[migrate] done");
} finally {
  await connection.end();
}
