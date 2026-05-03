import { NextResponse } from "next/server";
import { deletePricingGateCookie } from "@/lib/admin-pricing-session";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await deletePricingGateCookie();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/admin/pricing/logout:", e);
    return NextResponse.json({ success: false, error: "فشل تسجيل الخروج" }, { status: 500 });
  }
}
