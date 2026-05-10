import crypto from "crypto";

const KEY_LEN = 64;

/** تخزين آمن لكلمة المرور (scrypt) — الصيغة v1$base64(salt)$base64(hash) */
export function hashAdminPassword(plain: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(plain, salt, KEY_LEN);
  return `v1$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyAdminPasswordHash(plain: string, stored: string): boolean {
  try {
    const parts = stored.split("$");
    if (parts.length !== 3 || parts[0] !== "v1") return false;
    const salt = Buffer.from(parts[1], "base64");
    const expected = Buffer.from(parts[2], "base64");
    const hash = crypto.scryptSync(plain, salt, KEY_LEN);
    if (hash.length !== expected.length) return false;
    return crypto.timingSafeEqual(hash, expected);
  } catch {
    return false;
  }
}
