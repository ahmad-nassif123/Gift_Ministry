import { NextRequest, NextResponse } from "next/server";
import {
  createPrivateCatalogGateToken,
  isPrivateCatalogPasswordConfigured,
  setPrivateCatalogGateCookie,
  verifyPrivateCatalogPassword,
} from "@/lib/private-catalog-session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { password?: unknown; rememberMe?: unknown };
    const pass = typeof body.password === "string" ? body.password : "";
    const rememberMe = body.rememberMe === true || body.rememberMe === "true";

    if (!isPrivateCatalogPasswordConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "تسجيل الدخول غير مفعّل: أضف PRIVATE_CATALOG_PASSWORD في Vercel ثم نفّذ Redeploy.",
        },
        { status: 503 }
      );
    }

    if (!verifyPrivateCatalogPassword(pass)) {
      return NextResponse.json({ success: false, error: "كلمة المرور غير صحيحة" }, { status: 401 });
    }

    const token = createPrivateCatalogGateToken(rememberMe);
    await setPrivateCatalogGateCookie(token, rememberMe);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/private-catalog/login:", e);
    return NextResponse.json({ success: false, error: "فشل تسجيل الدخول" }, { status: 500 });
  }
}
