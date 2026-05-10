import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  getDirectoryGatePassword,
  createDirectoryGateToken,
  setDirectoryGateCookie,
} from "@/lib/auth-session";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "يجب تسجيل الدخول" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const gatePassword =
      typeof body.gatePassword === "string" ? body.gatePassword.trim() : "";
    if (!gatePassword || gatePassword !== getDirectoryGatePassword()) {
      return NextResponse.json(
        { success: false, error: "كلمة مرور القفل غير صحيحة" },
        { status: 403 }
      );
    }
    await setDirectoryGateCookie(createDirectoryGateToken());
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("directory unlock:", e);
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}
