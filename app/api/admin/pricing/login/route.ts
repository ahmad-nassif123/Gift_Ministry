import { NextRequest, NextResponse } from "next/server";
import {
  createPricingGateToken,
  getAdminPricingPassword,
  isAdminPricingPasswordConfigured,
  setPricingGateCookie,
} from "@/lib/admin-pricing-session";
import { PRICING_PASSWORD_ENV } from "@/lib/admin-auth-help";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { password?: unknown };
    const pass = typeof body.password === "string" ? body.password.trim() : "";
    if (!isAdminPricingPasswordConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: `تسجيل الدخول غير مفعّل: أضف ${PRICING_PASSWORD_ENV} في Vercel ثم Redeploy.`,
        },
        { status: 503 }
      );
    }
    const expected = getAdminPricingPassword();
    if (pass !== expected) {
      return NextResponse.json({ success: false, error: "كلمة المرور غير صحيحة" }, { status: 401 });
    }
    const token = createPricingGateToken();
    await setPricingGateCookie(token);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/admin/pricing/login:", e);
    return NextResponse.json({ success: false, error: "فشل تسجيل الدخول" }, { status: 500 });
  }
}
