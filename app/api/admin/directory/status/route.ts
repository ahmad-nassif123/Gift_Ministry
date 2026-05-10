import { NextResponse } from "next/server";
import {
  getSession,
  getDirectoryGateCookieValue,
  verifyDirectoryGateToken,
} from "@/lib/auth-session";
import { hasAdminDirectoryDb } from "@/lib/admin-directory-db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "يجب تسجيل الدخول" }, { status: 401 });
  }
  const gate = await getDirectoryGateCookieValue();
  const gateUnlocked = verifyDirectoryGateToken(gate);
  return NextResponse.json({
    success: true,
    dbAvailable: hasAdminDirectoryDb(),
    gateUnlocked,
  });
}
