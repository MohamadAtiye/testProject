import bcrypt from "bcryptjs";
import { config } from "../config.js";
import { upsertAdmin } from "../db/admins.js";
import { closePool } from "../db/pool.js";

const hash = await bcrypt.hash(config.ADMIN_PASSWORD, 12);
await upsertAdmin(config.ADMIN_EMAIL.toLowerCase(), hash);
await closePool();

console.log(`[admin] ensured ${config.ADMIN_EMAIL}`);
