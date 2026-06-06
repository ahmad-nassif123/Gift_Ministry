import { NextResponse } from "next/server";
import { canAccessPrivateCatalog } from "@/lib/private-catalog-session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ok = await canAccessPrivateCatalog();
    return NextResponse.json({ success: true, ok });
  } catch (e) {
    console.error("GET /api/private-catalog/session:", e);
    return NextResponse.json({ success: false, error: "فشل التحقق" }, { status: 500 });
  }
}
