import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "./pool.js";
import { toIso } from "../lib/time.js";

export type RecordType = "contact" | "project";
export type Service = "design" | "systems" | "consulting" | "mix";
export type Engagement = "project" | "longterm";

export interface CountBucket {
  today: number;
  week: number;
  total: number;
}

export interface ContactRecord {
  id: string;
  email: string;
  phone: string;
  title: string;
  message: string;
  createdAt: string;
}

export interface ProjectRecord {
  id: string;
  service: Service;
  engagement: Engagement;
  goal: string;
  timeline: { kind: "fixed" | "flexible" | "asap"; date: string | null } | null;
  budget: { range: string | null; unknown: boolean } | null;
  contact: { name: string; company: string; email: string; phone: string };
  consent: boolean;
  status: string;
  createdAt: string;
}

export type AdminRecord = ContactRecord | ProjectRecord;

interface ContactRow extends RowDataPacket {
  id: string;
  email: string;
  phone: string;
  title: string;
  message: string;
  created_at: string;
}

interface ProjectRow extends RowDataPacket {
  id: string;
  service: Service;
  engagement: Engagement;
  goal: string;
  timeline_kind: "fixed" | "flexible" | "asap" | null;
  timeline_date: string | null;
  budget_range: string | null;
  budget_unknown: number;
  contact_name: string;
  contact_company: string;
  contact_email: string;
  contact_phone: string;
  consent: number;
  status: string;
  created_at: string;
}

export interface RecordFilters {
  since?: string;
  service?: Service;
  status?: string;
  limit?: number;
}

export interface CreateContactInput {
  id: string;
  email: string;
  phone: string;
  title: string;
  message: string;
  ip: string | null;
}

export interface CreateProjectInput {
  id: string;
  service: Service;
  engagement: Engagement;
  goal: string;
  timeline: { kind: "fixed" | "flexible" | "asap"; date?: string | null } | null;
  budget: { range?: string | null; unknown?: boolean } | null;
  contact: { name: string; company: string; email: string; phone: string };
  consent: boolean;
  status: string;
  ip: string | null;
}

function mapContact(row: ContactRow): ContactRecord {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone ?? "",
    title: row.title,
    message: row.message,
    createdAt: toIso(row.created_at),
  };
}

function mapProject(row: ProjectRow): ProjectRecord {
  const timeline = row.timeline_kind
    ? { kind: row.timeline_kind, date: row.timeline_date ?? null }
    : null;

  const budget =
    row.budget_range === null && row.budget_unknown === 0
      ? null
      : { range: row.budget_range, unknown: row.budget_unknown === 1 };

  return {
    id: row.id,
    service: row.service,
    engagement: row.engagement,
    goal: row.goal,
    timeline,
    budget,
    contact: {
      name: row.contact_name,
      company: row.contact_company ?? "",
      email: row.contact_email,
      phone: row.contact_phone ?? "",
    },
    consent: row.consent === 1,
    status: row.status,
    createdAt: toIso(row.created_at),
  };
}

function whereClause(type: RecordType, filters: RecordFilters): { sql: string; params: unknown[] } {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.since && /^\d{4}-\d{2}-\d{2}$/.test(filters.since)) {
    where.push("created_at >= ?");
    params.push(`${filters.since} 00:00:00`);
  }

  if (type === "project") {
    if (filters.service) {
      where.push("service = ?");
      params.push(filters.service);
    }

    if (filters.status) {
      where.push("status = ?");
      params.push(filters.status.slice(0, 40));
    }
  }

  return {
    sql: where.length > 0 ? ` WHERE ${where.join(" AND ")}` : "",
    params,
  };
}

export async function createContact(input: CreateContactInput): Promise<void> {
  await execute(
    `INSERT INTO contacts (id, email, phone, title, message, ip, created_at)
     VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [input.id, input.email, input.phone, input.title, input.message, input.ip],
  );
}

export async function createProject(input: CreateProjectInput): Promise<void> {
  await execute(
    `INSERT INTO projects (
       id, service, engagement, goal, timeline_kind, timeline_date,
       budget_range, budget_unknown, contact_name, contact_company,
       contact_email, contact_phone, consent, status, ip, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [
      input.id,
      input.service,
      input.engagement,
      input.goal,
      input.timeline?.kind ?? null,
      input.timeline?.date ?? null,
      input.budget?.range ?? null,
      input.budget?.unknown === true ? 1 : 0,
      input.contact.name,
      input.contact.company,
      input.contact.email,
      input.contact.phone,
      input.consent ? 1 : 0,
      input.status,
      input.ip,
    ],
  );
}

export async function findRecords(type: RecordType, filters: RecordFilters = {}): Promise<AdminRecord[]> {
  const table = type === "contact" ? "contacts" : "projects";
  const limit = Math.max(1, Math.min(500, filters.limit ?? 500));
  const where = whereClause(type, filters);
  const rows = await query<ContactRow | ProjectRow>(
    `SELECT * FROM ${table}${where.sql} ORDER BY created_at DESC, id DESC LIMIT ${limit}`,
    where.params,
  );

  return type === "contact"
    ? (rows as ContactRow[]).map(mapContact)
    : (rows as ProjectRow[]).map(mapProject);
}

export async function countMatchingRecords(
  type: RecordType,
  filters: RecordFilters = {},
): Promise<number> {
  const table = type === "contact" ? "contacts" : "projects";
  const where = whereClause(type, filters);
  const rows = await query<RowDataPacket & { total: number }>(
    `SELECT COUNT(*) AS total FROM ${table}${where.sql}`,
    where.params,
  );

  return Number(rows[0]?.total ?? 0);
}

export async function recordCounts(
  type: RecordType,
  filters: RecordFilters = {},
): Promise<CountBucket> {
  const table = type === "contact" ? "contacts" : "projects";
  const where = whereClause(type, filters);
  const rows = await query<
    RowDataPacket & { total: number; today: number; week: number }
  >(
    `SELECT
       COUNT(*) AS total,
       COALESCE(SUM(created_at >= UTC_DATE()), 0) AS today,
       COALESCE(SUM(created_at >= DATE_SUB(UTC_DATE(), INTERVAL WEEKDAY(UTC_DATE()) DAY)), 0) AS week
     FROM ${table}${where.sql}`,
    where.params,
  );

  const row = rows[0];

  return {
    today: Number(row?.today ?? 0),
    week: Number(row?.week ?? 0),
    total: Number(row?.total ?? 0),
  };
}

export async function hasAnyRecords(): Promise<boolean> {
  const rows = await query<RowDataPacket & { total: number }>(
    "SELECT (SELECT COUNT(*) FROM contacts) + (SELECT COUNT(*) FROM projects) AS total",
  );

  return Number(rows[0]?.total ?? 0) > 0;
}

export function readAdminRecords(
  type: RecordType,
  since: string | null,
  limit: number,
  service?: Service,
  status?: string,
): Promise<{ type: RecordType; total: number; returned: number; records: AdminRecord[] }> {
  const filters: RecordFilters = {
    since: since ?? undefined,
    service,
    status,
    limit,
  };

  return Promise.all([
    countMatchingRecords(type, filters),
    findRecords(type, filters),
  ]).then(([total, records]) => ({
    type,
    total,
    returned: records.length,
    records,
  }));
}
