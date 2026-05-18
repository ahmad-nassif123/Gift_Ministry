import { NextRequest, NextResponse } from "next/server";
import {
  createPricingGateToken,
  getAdminPricingPassword,
  isAdminPricingPasswordConfigured,
  setPricingGateCookie,
} from "@/lib/admin-pricing-session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { password?: unknown; rememberMe?: unknown };
    const pass = typeof body.password === "string" ? body.password.trim() : "";
    const rememberMe = body.rememberMe === true || body.rememberMe === "true";
    if (!isAdminPricingPasswordConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "تسجيل الدخول غير مفعّل على الخادم.",
        },
        { status: 503 }
      );
    }
    const expected = getAdminPricingPassword();
    if (pass !== expected) {
      return NextResponse.json({ success: false, error: "كلمة المرور غير صحيحة" }, { status: 401 });
    }
    const token = createPricingGateToken(rememberMe);
    await setPricingGateCookie(token, rememberMe);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/admin/pricing/login:", e);
    return NextResponse.json({ success: false, error: "فشل تسجيل الدخول" }, { status: 500 });
  }
}
