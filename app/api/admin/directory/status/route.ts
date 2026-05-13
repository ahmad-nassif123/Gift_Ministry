import { NextResponse } from "next/server";
import {
  getSession,
  getDirectoryGateCookieValue,
  verifyDirectoryGateToken,
} from "@/lib/auth-session";
import { hasAdminDirectoryDb } from "@/lib/admin-directory-db";
import { hasDashboardPasswordOverride } from "@/lib/dashboard-password-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "يجب تسجيل الدخول" }, { status: 401 });
  }
  const gate = await getDirectoryGateCookieValue();
  const gateUnlocked = verifyDirectoryGateToken(gate);
  let usesDbPassword = false;
  if (hasAdminDirectoryDb()) {
    try {
      usesDbPassword = await hasDashboardPasswordOverride();
    } catch {
      usesDbPassword = false;
    }
  }
  return NextResponse.json({
    success: true,
    dbAvailable: hasAdminDirectoryDb(),
    gateUnlocked,
    usesDbPassword,
  });
}
