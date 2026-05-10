import { cookies } from "next/headers";
import crypto from "crypto";
import {
  adminEmailExistsInDb,
  hasAdminDirectoryDb,
  verifyAdminPasswordInDb,
} from "@/lib/admin-directory-db";

const COOKIE_NAME = "admin_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 أيام

const DEFAULT_SECRET = "gift-catalog-admin-session-secret-2024";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET ?? DEFAULT_SECRET;
  return secret.length >= 16 ? secret : DEFAULT_SECRET;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export interface SessionPayload {
  email: string;
  exp: number;
}

export function createSessionToken(email: string): string {
  const payload: SessionPayload = {
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  };
  const payloadStr = JSON.stringify(payload);
  const sig = sign(payloadStr);
  return Buffer.from(payloadStr, "utf-8").toString("base64url") + "." + sig;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return null;
    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    if (sign(payloadStr) !== sig) return null;
    const payload = JSON.parse(payloadStr) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}


export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** يُدمَج مع `ALLOWED_ADMIN_EMAILS` حتى يبقى الدخول ممكناً إذا كان المتغير غير مضبوط أو ناقصاً على الاستضافة */
const DEFAULT_ALLOWED_ADMIN_EMAILS = [
  "media.team.damascus.2@gmail.com",
  "k42746859@gmail.com",
  "abdulkarimsaad165@gmail.com",
];

export function getAllowedEmails(): string[] {
  const env = process.env.ALLOWED_ADMIN_EMAILS ?? "";
  const fromEnv = env
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const fromDefaults = DEFAULT_ALLOWED_ADMIN_EMAILS.map((e) => e.trim().toLowerCase());
  return [...new Set([...fromDefaults, ...fromEnv])];
}

export function isAllowedEmail(email: string): boolean {
  const list = getAllowedEmails();
  return list.includes(email.trim().toLowerCase());
}

function parseAdminCredentials(): Record<string, string> {
  const raw = (process.env.ADMIN_CREDENTIALS ?? "").trim();
  const out: Record<string, string> = {};
  if (!raw) return out;
  // Support comma/newline/semicolon separated pairs (Vercel UI sometimes uses new lines)
  const pairs = raw
    .split(/[,;\n\r]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const p of pairs) {
    const idx = p.indexOf(":");
    if (idx <= 0) continue;
    const email = p.slice(0, idx).trim().toLowerCase();
    const pass = p.slice(idx + 1).trim();
    if (email && pass) out[email] = pass;
  }
  return out;
}

export function checkAdminPassword(email: string, password: string): boolean {
  const e = email.trim().toLowerCase();
  const pass = (password ?? "").trim();
  const map = parseAdminCredentials();
  if (!pass) return false;
  if (map[e] !== undefined) return pass === map[e];
  const expected = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (!expected) return false;
  return pass === expected;
}

const DIRECTORY_GATE_COOKIE = "admin_directory_gate";
const DIRECTORY_GATE_MAX_AGE = 60 * 30; // 30 دقيقة

interface DirectoryGatePayload {
  exp: number;
  typ: "admin_directory_gate";
}

export function createDirectoryGateToken(): string {
  const payload: DirectoryGatePayload = {
    exp: Math.floor(Date.now() / 1000) + DIRECTORY_GATE_MAX_AGE,
    typ: "admin_directory_gate",
  };
  const payloadStr = JSON.stringify(payload);
  const sig = sign(payloadStr);
  return Buffer.from(payloadStr, "utf-8").toString("base64url") + "." + sig;
}

export function verifyDirectoryGateToken(token: string | undefined | null): boolean {
  try {
    if (!token) return false;
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return false;
    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    if (sign(payloadStr) !== sig) return false;
    const payload = JSON.parse(payloadStr) as DirectoryGatePayload;
    if (payload.typ !== "admin_directory_gate") return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function setDirectoryGateCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DIRECTORY_GATE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: DIRECTORY_GATE_MAX_AGE,
    path: "/",
  });
}

export async function clearDirectoryGateCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DIRECTORY_GATE_COOKIE);
}

export function getDirectoryGatePassword(): string {
  const v = process.env.ADMIN_DIRECTORY_GATE_PASSWORD?.trim();
  return v && v.length > 0 ? v : "20022026";
}

export async function getDirectoryGateCookieValue(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(DIRECTORY_GATE_COOKIE)?.value;
}

export async function authorizeAdminLogin(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; reason: "email" | "password" }> {
  const e = email.trim().toLowerCase();
  const pass = (password ?? "").trim();
  if (!pass) return { ok: false, reason: "password" };

  let allowed = getAllowedEmails().includes(e);
  if (!allowed && hasAdminDirectoryDb()) {
    try {
      allowed = await adminEmailExistsInDb(e);
    } catch {
      //
    }
  }
  if (!allowed) return { ok: false, reason: "email" };

  const map = parseAdminCredentials();
  if (map[e] !== undefined) {
    return pass === map[e] ? { ok: true } : { ok: false, reason: "password" };
  }

  if (hasAdminDirectoryDb()) {
    try {
      if (await verifyAdminPasswordInDb(e, pass)) return { ok: true };
    } catch {
      //
    }
  }

  const expected = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (expected && pass === expected) return { ok: true };
  return { ok: false, reason: "password" };
}
