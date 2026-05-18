import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import crypto from "crypto";
import type { StaffOfficeCode } from "@/lib/staff-offices";

export const STAFF_COOKIE_NAME = "staff_session";
const SESSION_MAX_AGE_SHORT = 60 * 60 * 24 * 8; // 8 ساعات (دوام)
const SESSION_MAX_AGE_REMEMBER = 60 * 60 * 24 * 30;

const DEFAULT_SECRET = "gift-catalog-admin-session-secret-2024";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET ?? DEFAULT_SECRET;
  return secret.length >= 16 ? secret : DEFAULT_SECRET;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export interface StaffSessionPayload {
  kind: "staff";
  staffId: number;
  fullName: string;
  officeCode: StaffOfficeCode;
  loginId: string;
  exp: number;
}

export function createStaffSessionToken(
  data: Omit<StaffSessionPayload, "kind" | "exp">,
  remember = false
): string {
  const maxAgeSec = remember ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_SHORT;
  const payload: StaffSessionPayload = {
    kind: "staff",
    ...data,
    exp: Math.floor(Date.now() / 1000) + maxAgeSec,
  };
  const payloadStr = JSON.stringify(payload);
  const sig = sign(payloadStr);
  return Buffer.from(payloadStr, "utf-8").toString("base64url") + "." + sig;
}

export function verifyStaffSessionToken(token: string | undefined | null): StaffSessionPayload | null {
  try {
    if (!token) return null;
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return null;
    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    if (sign(payloadStr) !== sig) return null;
    const payload = JSON.parse(payloadStr) as StaffSessionPayload;
    if (payload.kind !== "staff") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.staffId || !payload.fullName) return null;
    return payload;
  } catch {
    return null;
  }
}

function staffSessionCookieOptions(remember = false) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: remember ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_SHORT,
    /** العزل عبر middleware — الكوكي على `/` ليشمل `/api/staff` */
    path: "/",
  };
}

export function attachStaffSessionToResponse(
  response: NextResponse,
  token: string,
  remember = false
): void {
  response.cookies.set(STAFF_COOKIE_NAME, token, staffSessionCookieOptions(remember));
}

export function clearStaffSessionOnResponse(response: NextResponse): void {
  response.cookies.set(STAFF_COOKIE_NAME, "", {
    ...staffSessionCookieOptions(),
    maxAge: 0,
  });
}

export async function getStaffSession(): Promise<StaffSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_COOKIE_NAME)?.value;
  return verifyStaffSessionToken(token);
}

export function normalizeStaffLoginId(raw: string): string {
  return (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\u200b-\u200d\u2060\ufeff]/g, "")
    .replace(/\s+/g, ".");
}
