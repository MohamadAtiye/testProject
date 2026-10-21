import { readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { config } from "../config.js";
import { closePool } from "../db/pool.js";
import { hasAnyRecords } from "../db/records.js";

if (!config.SEED_DEMO) {
  console.log("[seed] disabled");
  process.exit(0);
}

if (await hasAnyRecords()) {
  console.log("[seed] records already exist, skipping");
  process.exit(0);
}

const connection = await mysql.createConnection({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  charset: "utf8mb4",
  multipleStatements: true,
  timezone: "Z",
});

try {
  const sql = await readFile(path.resolve(process.cwd(), "seeds/demo.sql"), "utf8");
  await connection.query(sql);
  console.log("[seed] demo records inserted");
} finally {
  await connection.end();
  await closePool();
}
