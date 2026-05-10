import { NextResponse } from "next/server";
import {
  getSession,
  clearDirectoryGateCookie,
} from "@/lib/auth-session";

/** إغلاق قفل صفحة إدارة الحسابات (يبقى تسجيل الدخول للوحة) */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "يجب تسجيل الدخول" }, { status: 401 });
  }
  await clearDirectoryGateCookie();
  return NextResponse.json({ success: true });
}
