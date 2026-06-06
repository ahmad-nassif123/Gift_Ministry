import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "private_catalog_gate";
const GATE_MAX_AGE_SHORT = 60 * 60 * 24;
const GATE_MAX_AGE_REMEMBER = 60 * 60 * 24 * 30;

const DEFAULT_SECRET = "gift-catalog-admin-session-secret-2024";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET ?? DEFAULT_SECRET;
  return secret.length >= 16 ? secret : DEFAULT_SECRET;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function normalizePassword(raw: string): string {
  return (raw ?? "").trim().replace(/[\u200b-\u200d\u2060\ufeff]/g, "");
}

export function getPrivateCatalogPassword(): string {
  return normalizePassword(process.env.PRIVATE_CATALOG_PASSWORD ?? "");
}

export function isPrivateCatalogPasswordConfigured(): boolean {
  return getPrivateCatalogPassword().length > 0;
}

interface PrivateCatalogGatePayload {
  kind: "private_catalog";
  exp: number;
}

export function createPrivateCatalogGateToken(remember = false): string {
  const maxAgeSec = remember ? GATE_MAX_AGE_REMEMBER : GATE_MAX_AGE_SHORT;
  const payload: PrivateCatalogGatePayload = {
    kind: "private_catalog",
    exp: Math.floor(Date.now() / 1000) + maxAgeSec,
  };
  const payloadStr = JSON.stringify(payload);
  const sig = sign(payloadStr);
  return Buffer.from(payloadStr, "utf-8").toString("base64url") + "." + sig;
}

export function verifyPrivateCatalogGateToken(token: string): boolean {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return false;
    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    if (sign(payloadStr) !== sig) return false;
    const payload = JSON.parse(payloadStr) as PrivateCatalogGatePayload;
    if (payload.kind !== "private_catalog") return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

function privateCatalogGateCookieOptions(remember = false) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: remember ? GATE_MAX_AGE_REMEMBER : GATE_MAX_AGE_SHORT,
    path: "/",
  };
}

export async function setPrivateCatalogGateCookie(token: string, remember = false): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, privateCatalogGateCookieOptions(remember));
}

export async function deletePrivateCatalogGateCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isPrivateCatalogGateOpen(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyPrivateCatalogGateToken(token);
}

export function verifyPrivateCatalogPassword(password: string): boolean {
  const pass = normalizePassword(password);
  if (!pass) return false;
  const expected = getPrivateCatalogPassword();
  return expected.length > 0 && pass === expected;
}

/** يمكن الوصول للكتالوج الخاص فقط بعد إدخال PRIVATE_CATALOG_PASSWORD (كوكي البوابة) */
export async function canAccessPrivateCatalog(): Promise<boolean> {
  if (!isPrivateCatalogPasswordConfigured()) return false;
  return isPrivateCatalogGateOpen();
}
