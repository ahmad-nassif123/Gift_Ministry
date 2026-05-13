import { getSession, getDirectoryGateCookieValue, verifyDirectoryGateToken } from "@/lib/auth-session";

export type DirectoryGateFailure = { success: false; error: string };

export type AdminDirectoryGateResult =
  | { ok: true }
  | { ok: false; status: number; body: DirectoryGateFailure };

/** جلسة لوحة التحكم + كوكي قفل صفحة إدارة كلمة المرور */
export async function requireAdminDirectoryGate(): Promise<AdminDirectoryGateResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, status: 401, body: { success: false, error: "يجب تسجيل الدخول" } };
  }
  const gate = await getDirectoryGateCookieValue();
  if (!verifyDirectoryGateToken(gate)) {
    return {
      ok: false,
      status: 403,
      body: { success: false, error: "يجب فتح القفل بكلمة المرور أولاً" },
    };
  }
  return { ok: true };
}
