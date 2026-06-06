import { NextRequest, NextResponse } from "next/server";
import {
  attachAdminSessionToResponse,
  createSessionToken,
  getDashboardActorEmail,
  isDashboardLoginConfiguredAsync,
  verifyDashboardLoginPassword,
} from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = body.password;
    const pass = typeof password === "string" ? password : "";
    const rememberMe = body.rememberMe === true || body.rememberMe === "true";

    if (!(await isDashboardLoginConfiguredAsync())) {
      console.error("[auth/login] لا توجد كلمة مرور في البيئة ولا في القاعدة لهذا النشر");
      return NextResponse.json(
        {
          success: false,
          error:
            "تسجيل الدخول غير مفعّل على الخادم: أضف ADMIN_PASSWORD في Vercel ثم نفّذ Redeploy.",
        },
        { status: 503 }
      );
    }

    if (!(await verifyDashboardLoginPassword(pass))) {
      return NextResponse.json(
        { success: false, error: "كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const token = createSessionToken(getDashboardActorEmail(), rememberMe);
    const nextUrl = typeof body.next === "string" && body.next.startsWith("/") ? body.next : "/dashboard";
    const response = NextResponse.json({ success: true, redirect: nextUrl });
    attachAdminSessionToResponse(response, token, rememberMe);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء تسجيل الدخول" },
      { status: 500 }
    );
  }
}
