/**
 * تحقق جلسة الموظف في middleware (Edge) — نفس خوارزمية staff-session.ts
 */
const DEFAULT_SECRET = "gift-catalog-admin-session-secret-2024";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET ?? DEFAULT_SECRET;
  return secret.length >= 16 ? secret : DEFAULT_SECRET;
}

function base64UrlToBytes(b64: string): Uint8Array {
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const base64 = b64.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function signPayload(payloadStr: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadStr));
  const bytes = new Uint8Array(sig);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function isValidStaffSessionToken(token: string | undefined | null): Promise<boolean> {
  try {
    if (!token) return false;
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return false;
    const payloadStr = new TextDecoder().decode(base64UrlToBytes(payloadB64));
    const expected = await signPayload(payloadStr);
    if (expected !== sig) return false;
    const payload = JSON.parse(payloadStr) as { kind?: string; exp?: number };
    if (payload.kind !== "staff") return false;
    if ((payload.exp ?? 0) < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}
