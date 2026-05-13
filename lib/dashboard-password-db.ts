import { sql } from "@vercel/postgres";
import { hasAdminDirectoryDb } from "@/lib/admin-directory-db";
import { hashAdminPassword } from "@/lib/admin-password";

function normalizeLoginPassword(raw: string): string {
  return (raw ?? "").trim().replace(/[\u200b-\u200d\u2060\ufeff]/g, "");
}

let tableReady = false;

async function ensureDashboardLoginPasswordTable(): Promise<void> {
  if (!hasAdminDirectoryDb()) return;
  if (tableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS dashboard_login_password (
      singleton SMALLINT PRIMARY KEY DEFAULT 1,
      password_hash TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT dashboard_login_password_one_row CHECK (singleton = 1)
    )
  `;
  tableReady = true;
}

/** هل يوجد في القاعدة كلمة مرور تستبدل متغيرات البيئة عند الدخول؟ */
export async function hasDashboardPasswordOverride(): Promise<boolean> {
  if (!hasAdminDirectoryDb()) return false;
  await ensureDashboardLoginPasswordTable();
  const { rows } = await sql`SELECT 1 FROM dashboard_login_password WHERE singleton = 1 LIMIT 1`;
  return rows.length > 0;
}

export async function getDashboardPasswordOverrideHash(): Promise<string | null> {
  if (!hasAdminDirectoryDb()) return null;
  await ensureDashboardLoginPasswordTable();
  const { rows } =
    await sql`SELECT password_hash FROM dashboard_login_password WHERE singleton = 1 LIMIT 1`;
  if (rows.length === 0) return null;
  const h = String(rows[0].password_hash ?? "").trim();
  return h.length > 0 ? h : null;
}

export async function setDashboardPasswordOverride(plainNew: string): Promise<void> {
  if (!hasAdminDirectoryDb()) throw new Error("POSTGRES_URL غير متوفر");
  await ensureDashboardLoginPasswordTable();
  const pass = normalizeLoginPassword(plainNew);
  if (pass.length < 6) throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
  const password_hash = hashAdminPassword(pass);
  await sql`
    INSERT INTO dashboard_login_password (singleton, password_hash, updated_at)
    VALUES (1, ${password_hash}, NOW())
    ON CONFLICT (singleton) DO UPDATE SET password_hash = ${password_hash}, updated_at = NOW()
  `;
}

/** إزالة كلمة المرور المخزّنة في القاعدة؛ يعود الدخول ليعتمد على ADMIN_PASSWORD في الاستضافة فقط */
export async function clearDashboardPasswordOverride(): Promise<void> {
  if (!hasAdminDirectoryDb()) return;
  await ensureDashboardLoginPasswordTable();
  await sql`DELETE FROM dashboard_login_password WHERE singleton = 1`;
}
