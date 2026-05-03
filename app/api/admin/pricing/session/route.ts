import { NextResponse } from "next/server";
import { isPricingGateOpen } from "@/lib/admin-pricing-session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ok = await isPricingGateOpen();
    return NextResponse.json({ success: true, ok });
  } catch (e) {
    console.error("GET /api/admin/pricing/session:", e);
    return NextResponse.json({ success: false, error: "فشل التحقق" }, { status: 500 });
  }
}
