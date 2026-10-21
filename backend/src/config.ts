import "dotenv/config";
import { z } from "zod";

const booleanString = (defaultValue: "0" | "1") =>
  z
    .enum(["0", "1", "true", "false"])
    .default(defaultValue)
    .transform((value) => value === "1" || value === "true");

const commaList = (defaultValue: string) =>
  z
    .string()
    .default(defaultValue)
    .transform((value) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    );

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default("info"),

  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().default("stadtloewe"),
  DB_USER: z.string().default("stadtloewe"),
  DB_PASSWORD: z.string().default("stadtloewe"),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters")
    .default("dev-only-change-me-please-32-chars-min"),
  JWT_ISSUER: z.string().default("stadtloewe"),
  JWT_AUDIENCE: z.string().default("stadtloewe-api"),
  JWT_EXPIRES_IN: z.string().default("1h"),
  JWT_COOKIE_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(3600),

  COOKIE_SECURE: booleanString("0"),
  TRUST_PROXY: booleanString("0"),
  ALLOWED_ORIGINS: commaList(
    "http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173",
  ),

  ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  ADMIN_PASSWORD: z.string().min(8).default("testPass123"),

  SEED_DEMO: booleanString("1"),

  ML_BASE_URL: z.string().url().default("http://127.0.0.1:8000"),
  ML_API_KEY: z.string().min(8).default("dev-ml-key"),
  ML_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),

  ASSIST_RATE_LIMIT: z.coerce.number().int().positive().default(20),
  ASSIST_RATE_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(5),
  LOGIN_RATE_WINDOW_MS: z.coerce.number().int().positive().default(300_000),
  CONTACT_RATE_LIMIT: z.coerce.number().int().positive().default(10),
  PROJECT_RATE_LIMIT: z.coerce.number().int().positive().default(10),
  RATE_WINDOW_MS: z.coerce.number().int().positive().default(60_000),

  METRICS_TOKEN: z.string().default(""),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
