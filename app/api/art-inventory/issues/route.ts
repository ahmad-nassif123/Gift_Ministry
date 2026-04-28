import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { isTodayGiftsDbConfigured } from "@/lib/today-gifts-db";
import { listArtInventoryIssues } from "@/lib/art-inventory-db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "يجب تسجيل الدخول" }, { status: 401 });
    }
    if (!isTodayGiftsDbConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة. أضف Postgres من لوحة Vercel." },
        { status: 503 }
      );
    }
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(200, Math.floor(Number(searchParams.get("limit") ?? 50))));
    const issues = await listArtInventoryIssues({ limit });
    return NextResponse.json({ success: true, issues });
  } catch (e) {
    console.error("GET /api/art-inventory/issues:", e);
    return NextResponse.json({ success: false, error: "فشل في جلب سجل التخريج" }, { status: 500 });
  }
}

