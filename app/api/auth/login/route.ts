import { NextRequest, NextResponse } from "next/server";
import {
  authorizeDashboardPassword,
  createSessionToken,
  getDashboardActorEmail,
  setSessionCookie,
} from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = body.password;
    const pass = typeof password === "string" ? password : "";

    if (!authorizeDashboardPassword(pass)) {
      return NextResponse.json(
        { success: false, error: "كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const token = createSessionToken(getDashboardActorEmail());
    await setSessionCookie(token);

    const nextUrl = typeof body.next === "string" && body.next.startsWith("/") ? body.next : "/dashboard";
    return NextResponse.json({ success: true, redirect: nextUrl });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء تسجيل الدخول" },
      { status: 500 }
    );
  }
}
