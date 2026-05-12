import { NextRequest, NextResponse } from "next/server";
import {
  authorizeDashboardPassword,
  createSessionToken,
  getDashboardActorEmail,
  isDashboardLoginConfigured,
  setSessionCookie,
} from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = body.password;
    const pass = typeof password === "string" ? password : "";

    if (!isDashboardLoginConfigured()) {
      console.error("[auth/login] ADMIN_PASSWORD غير متاح على الخادم (فارغ أو غير مربوط بهذا النشر)");
      return NextResponse.json(
        {
          success: false,
          error:
            "تسجيل الدخول غير مفعّل على الخادم: أضف المتغير ADMIN_PASSWORD في إعدادات المشروع على Vercel (أو اربط المتغير المشترك بالمشروع) ثم نفّذ Redeploy.",
        },
        { status: 503 }
      );
    }

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
