import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "./pool.js";

interface AdminRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
}

export interface Admin {
  id: number;
  email: string;
  passwordHash: string;
}

export async function findAdminByEmail(email: string): Promise<Admin | null> {
  const rows = await query<AdminRow>(
    "SELECT id, email, password_hash FROM admins WHERE email = ? LIMIT 1",
    [email],
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
  };
}

export async function upsertAdmin(email: string, passwordHash: string): Promise<void> {
  await execute(
    `INSERT INTO admins (email, password_hash)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [email, passwordHash],
  );
}
