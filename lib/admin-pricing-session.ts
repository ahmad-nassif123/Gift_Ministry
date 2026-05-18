import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "admin_pricing_gate";
const MAX_AGE_SEC = 60 * 60 * 24; // 24 ساعة

const DEFAULT_SECRET = "gift-catalog-admin-session-secret-2024";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET ?? DEFAULT_SECRET;
  return secret.length >= 16 ? secret : DEFAULT_SECRET;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function getAdminPricingPassword(): string {
  const fromEnv = (process.env.ADMIN_PRICING_PASSWORD ?? "").trim();
  if (fromEnv) return fromEnv;
  // تطوير محلي فقط — الإنتاج يتطلب ADMIN_PRICING_PASSWORD على Vercel
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    return "";
  }
  return "19982026";
}

export function isAdminPricingPasswordConfigured(): boolean {
  return getAdminPricingPassword().length > 0;
}

interface PricingGatePayload {
  kind: "admin_pricing";
  exp: number;
}

export function createPricingGateToken(): string {
  const payload: PricingGatePayload = {
    kind: "admin_pricing",
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
  };
  const payloadStr = JSON.stringify(payload);
  const sig = sign(payloadStr);
  return Buffer.from(payloadStr, "utf-8").toString("base64url") + "." + sig;
}

export function verifyPricingGateToken(token: string): boolean {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return false;
    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    if (sign(payloadStr) !== sig) return false;
    const payload = JSON.parse(payloadStr) as PricingGatePayload;
    if (payload.kind !== "admin_pricing") return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function setPricingGateCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_SEC,
    path: "/",
  });
}

export async function deletePricingGateCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isPricingGateOpen(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyPricingGateToken(token);
}
