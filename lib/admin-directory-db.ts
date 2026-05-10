import { sql } from "@vercel/postgres";
import { hashAdminPassword, verifyAdminPasswordHash } from "@/lib/admin-password";

function normalizeLoginPassword(raw: string): string {
  return (raw ?? "").trim().replace(/[\u200b-\u200d\u2060\ufeff]/g, "");
}

let initDone = false;

export function hasAdminDirectoryDb(): boolean {
  const u = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  return !!u?.trim();
}

export async function ensureAdminAccountsTable(): Promise<void> {
  if (!hasAdminDirectoryDb()) return;
  if (initDone) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS admin_accounts (
        email VARCHAR(320) PRIMARY KEY,
        password_hash TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    initDone = true;
  } catch (e) {
    console.error("admin-directory-db ensureAdminAccountsTable:", e);
    throw e;
  }
}

/** عدد الصفوف في admin_accounts (للمقارنة مع الصفر عند أول إعداد) */
export async function countAdminAccounts(): Promise<number> {
  if (!hasAdminDirectoryDb()) return 0;
  await ensureAdminAccountsTable();
  const { rows } = await sql`SELECT COUNT(*)::int AS c FROM admin_accounts`;
  return Number(rows[0]?.c ?? 0);
}

export async function listAdminAccountEmails(): Promise<string[]> {
  if (!hasAdminDirectoryDb()) return [];
  await ensureAdminAccountsTable();
  const { rows } = await sql`SELECT email FROM admin_accounts ORDER BY email ASC`;
  return rows.map((r) => String(r.email).trim().toLowerCase());
}

export async function adminEmailExistsInDb(email: string): Promise<boolean> {
  if (!hasAdminDirectoryDb()) return false;
  await ensureAdminAccountsTable();
  const e = email.trim().toLowerCase();
  const { rows } = await sql`SELECT 1 FROM admin_accounts WHERE email = ${e} LIMIT 1`;
  return rows.length > 0;
}

export async function verifyAdminPasswordInDb(email: string, plainPassword: string): Promise<boolean> {
  if (!hasAdminDirectoryDb()) return false;
  await ensureAdminAccountsTable();
  const e = email.trim().toLowerCase();
  const { rows } = await sql`SELECT password_hash FROM admin_accounts WHERE email = ${e} LIMIT 1`;
  if (rows.length === 0) return false;
  const stored = String(rows[0].password_hash ?? "");
  return verifyAdminPasswordHash(normalizeLoginPassword(plainPassword), stored);
}

export async function upsertAdminAccount(email: string, plainPassword: string): Promise<void> {
  if (!hasAdminDirectoryDb()) throw new Error("POSTGRES_URL غير متوفر");
  await ensureAdminAccountsTable();
  const e = email.trim().toLowerCase();
  if (!e.includes("@") || e.length < 5) throw new Error("بريد غير صالح");
  const pass = normalizeLoginPassword(plainPassword);
  if (pass.length < 4) throw new Error("كلمة المرور قصيرة جداً");
  const password_hash = hashAdminPassword(pass);
  await sql`
    INSERT INTO admin_accounts (email, password_hash, updated_at)
    VALUES (${e}, ${password_hash}, NOW())
    ON CONFLICT (email) DO UPDATE SET password_hash = ${password_hash}, updated_at = NOW()
  `;
}

export async function deleteAdminAccount(email: string): Promise<boolean> {
  if (!hasAdminDirectoryDb()) return false;
  await ensureAdminAccountsTable();
  const e = email.trim().toLowerCase();
  const { rowCount } = await sql`DELETE FROM admin_accounts WHERE email = ${e}`;
  return (rowCount ?? 0) > 0;
}
