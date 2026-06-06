import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import crypto from "crypto";

const COOKIE_NAME = "admin_session";
/** جلسة عادية (بدون تذكرني) */
const SESSION_MAX_AGE_SHORT = 60 * 60 * 24; // يوم واحد
/** مع تذكرني */
const SESSION_MAX_AGE_REMEMBER = 60 * 60 * 24 * 30; // 30 يوماً

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

export function createSessionToken(email: string, remember = false): string {
  const maxAgeSec = remember ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_SHORT;
  const payload: SessionPayload = {
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + maxAgeSec,
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

/** خيارات كوكي الجلسة — مُشارَكة بين Route Handlers والـ Server */
function adminSessionCookieOptions(remember = false) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: remember ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_SHORT,
    path: "/",
  };
}

/**
 * في Route Handlers يجب ضبط الكوكي على `NextResponse` وليس `cookies().set()` فقط،
 * وإلا قد لا يُرفق `Set-Cookie` مع الاستجابة (المتصفح لا يخزّن الجلسة).
 */
export function attachAdminSessionToResponse(response: NextResponse, token: string, remember = false): void {
  response.cookies.set(COOKIE_NAME, token, adminSessionCookieOptions(remember));
}

export function clearAdminSessionOnResponse(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", {
    ...adminSessionCookieOptions(),
    maxAge: 0,
  });
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, adminSessionCookieOptions());
}

export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

function normalizeLoginPassword(raw: string): string {
  return (raw ?? "").trim().replace(/[\u200b-\u200d\u2060\ufeff]/g, "");
}

/** بريد ثابت في الجلسة لتتبّع الإجراءات في API — لا يُطلب من المستخدم عند الدخول */
export function getDashboardActorEmail(): string {
  const v = (process.env.DASHBOARD_SESSION_EMAIL ?? "").trim().toLowerCase();
  if (v.length >= 5 && v.includes("@")) return v;
  return "dashboard@gift-catalog.local";
}

/** هل مضبوط على الخادم أي من `ADMIN_PASSWORD` أو `ADMIN_LOGIN_PASSWORD` (غير فارغ بعد التطبيع) */
export function isDashboardLoginConfigured(): boolean {
  const primary = normalizeLoginPassword(process.env.ADMIN_PASSWORD ?? "");
  const fallback = normalizeLoginPassword(process.env.ADMIN_LOGIN_PASSWORD ?? "");
  return primary.length > 0 || fallback.length > 0;
}

export function authorizeDashboardPassword(password: string): boolean {
  const pass = normalizeLoginPassword(password);
  if (!pass) return false;
  const primary = normalizeLoginPassword(process.env.ADMIN_PASSWORD ?? "");
  if (primary.length > 0 && pass === primary) return true;
  const fallback = normalizeLoginPassword(process.env.ADMIN_LOGIN_PASSWORD ?? "");
  return fallback.length > 0 && pass === fallback;
}

/** @deprecated استخدم isDashboardLoginConfigured */
export async function isDashboardLoginConfiguredAsync(): Promise<boolean> {
  return isDashboardLoginConfigured();
}

/** @deprecated استخدم authorizeDashboardPassword */
export async function verifyDashboardLoginPassword(password: string): Promise<boolean> {
  return authorizeDashboardPassword(password);
}
