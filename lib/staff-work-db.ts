import { sql } from "@vercel/postgres";
import { hashAdminPassword, verifyAdminPasswordHash } from "@/lib/admin-password";
import type { StaffOfficeCode } from "@/lib/staff-offices";
import { isValidStaffOfficeCode } from "@/lib/staff-offices";
import { normalizeStaffLoginId } from "@/lib/staff-session";

let initDone = false;

export function hasStaffWorkDb(): boolean {
  const u = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  return !!u?.trim();
}

export async function ensureStaffWorkTables(): Promise<void> {
  if (!hasStaffWorkDb()) return;
  if (initDone) return;
  await sql`
    CREATE TABLE IF NOT EXISTS staff_members (
      id SERIAL PRIMARY KEY,
      login_id VARCHAR(64) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name VARCHAR(200) NOT NULL,
      office_code VARCHAR(64) NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS staff_work_submissions (
      id SERIAL PRIMARY KEY,
      staff_member_id INT NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
      report_date DATE NOT NULL,
      has_extra_tasks BOOLEAN NOT NULL DEFAULT FALSE,
      has_overtime BOOLEAN NOT NULL DEFAULT FALSE,
      overtime_hours NUMERIC(6,2),
      submitted_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS staff_work_task_lines (
      id SERIAL PRIMARY KEY,
      submission_id INT NOT NULL REFERENCES staff_work_submissions(id) ON DELETE CASCADE,
      line_order SMALLINT NOT NULL,
      task_type VARCHAR(16) NOT NULL DEFAULT 'regular',
      description TEXT NOT NULL,
      client_entity VARCHAR(300) NOT NULL,
      task_date DATE NOT NULL
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_staff_work_sub_staff_date
    ON staff_work_submissions (staff_member_id, report_date DESC)
  `;
  initDone = true;
}

export type StaffMemberRow = {
  id: number;
  loginId: string;
  fullName: string;
  officeCode: StaffOfficeCode;
  active: boolean;
};

export async function verifyStaffMemberLogin(
  loginId: string,
  password: string
): Promise<StaffMemberRow | null> {
  if (!hasStaffWorkDb()) return null;
  await ensureStaffWorkTables();
  const lid = normalizeStaffLoginId(loginId);
  const pass = (password ?? "").trim();
  if (!lid || !pass) return null;
  const { rows } = await sql`
    SELECT id, login_id, password_hash, full_name, office_code, active
    FROM staff_members WHERE login_id = ${lid} LIMIT 1
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  if (!r.active) return null;
  const hash = String(r.password_hash ?? "");
  if (!verifyAdminPasswordHash(pass, hash)) return null;
  const office = String(r.office_code ?? "");
  if (!isValidStaffOfficeCode(office)) return null;
  return {
    id: Number(r.id),
    loginId: String(r.login_id),
    fullName: String(r.full_name),
    officeCode: office,
    active: Boolean(r.active),
  };
}

export async function listStaffMembers(activeOnly = false): Promise<StaffMemberRow[]> {
  if (!hasStaffWorkDb()) return [];
  await ensureStaffWorkTables();
  const { rows } = activeOnly
    ? await sql`
        SELECT id, login_id, full_name, office_code, active
        FROM staff_members WHERE active = TRUE ORDER BY full_name ASC
      `
    : await sql`
        SELECT id, login_id, full_name, office_code, active
        FROM staff_members ORDER BY full_name ASC
      `;
  return rows
    .map((r) => {
      const office = String(r.office_code ?? "");
      if (!isValidStaffOfficeCode(office)) return null;
      return {
        id: Number(r.id),
        loginId: String(r.login_id),
        fullName: String(r.full_name),
        officeCode: office,
        active: Boolean(r.active),
      };
    })
    .filter((x): x is StaffMemberRow => x != null);
}

export async function createStaffMember(input: {
  loginId: string;
  password: string;
  fullName: string;
  officeCode: StaffOfficeCode;
}): Promise<StaffMemberRow> {
  if (!hasStaffWorkDb()) throw new Error("POSTGRES_URL غير متوفر");
  await ensureStaffWorkTables();
  const lid = normalizeStaffLoginId(input.loginId);
  const fullName = input.fullName.trim();
  const pass = input.password.trim();
  if (!lid || lid.length < 2) throw new Error("معرّف الدخول قصير");
  if (!fullName) throw new Error("الاسم مطلوب");
  if (pass.length < 4) throw new Error("كلمة المرور قصيرة");
  if (!isValidStaffOfficeCode(input.officeCode)) throw new Error("مكتب غير صالح");
  const password_hash = hashAdminPassword(pass);
  try {
    const { rows } = await sql`
      INSERT INTO staff_members (login_id, password_hash, full_name, office_code)
      VALUES (${lid}, ${password_hash}, ${fullName}, ${input.officeCode})
      RETURNING id, login_id, full_name, office_code, active
    `;
    const r = rows[0];
    return {
      id: Number(r.id),
      loginId: String(r.login_id),
      fullName: String(r.full_name),
      officeCode: input.officeCode,
      active: Boolean(r.active),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/unique|duplicate/i.test(msg)) throw new Error("معرّف الدخول مستخدم مسبقاً");
    throw e;
  }
}

export type StaffTaskLineInput = {
  description: string;
  clientEntity: string;
  taskDate: string;
  taskType?: "regular" | "overtime";
  lineOrder: number;
};

export async function insertStaffWorkSubmission(
  staffMemberId: number,
  input: {
    reportDate: string;
    hasExtraTasks: boolean;
    hasOvertime: boolean;
    overtimeHours: number | null;
    lines: StaffTaskLineInput[];
  }
): Promise<number> {
  if (!hasStaffWorkDb()) throw new Error("POSTGRES_URL غير متوفر");
  await ensureStaffWorkTables();
  if (input.lines.length === 0) throw new Error("أضف مهمة واحدة على الأقل");

  const { rows: subRows } = await sql`
    INSERT INTO staff_work_submissions (
      staff_member_id, report_date, has_extra_tasks, has_overtime, overtime_hours
    )
    VALUES (
      ${staffMemberId},
      ${input.reportDate}::date,
      ${input.hasExtraTasks},
      ${input.hasOvertime},
      ${input.overtimeHours}
    )
    RETURNING id
  `;
  const submissionId = Number(subRows[0]?.id);
  for (const line of input.lines) {
    await sql`
      INSERT INTO staff_work_task_lines (
        submission_id, line_order, task_type, description, client_entity, task_date
      )
      VALUES (
        ${submissionId},
        ${line.lineOrder},
        ${line.taskType ?? "regular"},
        ${line.description.trim()},
        ${line.clientEntity.trim()},
        ${line.taskDate}::date
      )
    `;
  }
  return submissionId;
}

export type StaffSubmissionListRow = {
  id: number;
  staffMemberId: number;
  staffName: string;
  officeCode: string;
  loginId: string;
  reportDate: string;
  hasExtraTasks: boolean;
  hasOvertime: boolean;
  overtimeHours: number | null;
  submittedAt: string;
  lines: Array<{
    lineOrder: number;
    taskType: string;
    description: string;
    clientEntity: string;
    taskDate: string;
  }>;
};

export async function listStaffWorkSubmissions(opts?: {
  fromDate?: string;
  toDate?: string;
  staffMemberId?: number;
  limit?: number;
}): Promise<StaffSubmissionListRow[]> {
  if (!hasStaffWorkDb()) return [];
  await ensureStaffWorkTables();
  const limit = Math.min(Math.max(opts?.limit ?? 200, 1), 500);

  let subs;
  if (opts?.staffMemberId && opts?.fromDate && opts?.toDate) {
    ({ rows: subs } = await sql`
      SELECT s.id, s.staff_member_id, s.report_date, s.has_extra_tasks, s.has_overtime,
             s.overtime_hours, s.submitted_at,
             m.full_name, m.office_code, m.login_id
      FROM staff_work_submissions s
      JOIN staff_members m ON m.id = s.staff_member_id
      WHERE s.staff_member_id = ${opts.staffMemberId}
        AND s.report_date >= ${opts.fromDate}::date
        AND s.report_date <= ${opts.toDate}::date
      ORDER BY s.submitted_at DESC
      LIMIT ${limit}
    `);
  } else if (opts?.staffMemberId) {
    ({ rows: subs } = await sql`
      SELECT s.id, s.staff_member_id, s.report_date, s.has_extra_tasks, s.has_overtime,
             s.overtime_hours, s.submitted_at,
             m.full_name, m.office_code, m.login_id
      FROM staff_work_submissions s
      JOIN staff_members m ON m.id = s.staff_member_id
      WHERE s.staff_member_id = ${opts.staffMemberId}
      ORDER BY s.submitted_at DESC
      LIMIT ${limit}
    `);
  } else if (opts?.fromDate && opts?.toDate) {
    ({ rows: subs } = await sql`
      SELECT s.id, s.staff_member_id, s.report_date, s.has_extra_tasks, s.has_overtime,
             s.overtime_hours, s.submitted_at,
             m.full_name, m.office_code, m.login_id
      FROM staff_work_submissions s
      JOIN staff_members m ON m.id = s.staff_member_id
      WHERE s.report_date >= ${opts.fromDate}::date
        AND s.report_date <= ${opts.toDate}::date
      ORDER BY s.submitted_at DESC
      LIMIT ${limit}
    `);
  } else {
    ({ rows: subs } = await sql`
      SELECT s.id, s.staff_member_id, s.report_date, s.has_extra_tasks, s.has_overtime,
             s.overtime_hours, s.submitted_at,
             m.full_name, m.office_code, m.login_id
      FROM staff_work_submissions s
      JOIN staff_members m ON m.id = s.staff_member_id
      ORDER BY s.submitted_at DESC
      LIMIT ${limit}
    `);
  }

  if (subs.length === 0) return [];

  const linesBySub = new Map<number, StaffSubmissionListRow["lines"]>();
  for (const s of subs) {
    const sid = Number(s.id);
    const { rows: lineRows } = await sql`
      SELECT line_order, task_type, description, client_entity, task_date
      FROM staff_work_task_lines
      WHERE submission_id = ${sid}
      ORDER BY line_order ASC
    `;
    linesBySub.set(
      sid,
      lineRows.map((l) => ({
        lineOrder: Number(l.line_order),
        taskType: String(l.task_type),
        description: String(l.description),
        clientEntity: String(l.client_entity),
        taskDate: String(l.task_date).slice(0, 10),
      }))
    );
  }

  return subs.map((s) => ({
    id: Number(s.id),
    staffMemberId: Number(s.staff_member_id),
    staffName: String(s.full_name),
    officeCode: String(s.office_code),
    loginId: String(s.login_id),
    reportDate: String(s.report_date).slice(0, 10),
    hasExtraTasks: Boolean(s.has_extra_tasks),
    hasOvertime: Boolean(s.has_overtime),
    overtimeHours: s.overtime_hours != null ? Number(s.overtime_hours) : null,
    submittedAt: new Date(String(s.submitted_at)).toISOString(),
    lines: linesBySub.get(Number(s.id)) ?? [],
  }));
}
