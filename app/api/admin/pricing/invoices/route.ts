import { NextResponse } from "next/server";
import { isPricingGateOpen } from "@/lib/admin-pricing-session";
import { isProductsDbConfigured } from "@/lib/products-db";
import { listAdminPricingInvoices } from "@/lib/admin-pricing-invoices-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ok = await isPricingGateOpen();
    if (!ok) {
      return NextResponse.json({ success: false, error: "غير مصرّح" }, { status: 401 });
    }
    if (!isProductsDbConfigured()) {
      return NextResponse.json({ success: true, data: [], db: false });
    }
    const data = await listAdminPricingInvoices(100);
    return NextResponse.json({ success: true, data, db: true });
  } catch (e) {
    console.error("GET /api/admin/pricing/invoices:", e);
    return NextResponse.json({ success: false, error: "فشل تحميل السجل" }, { status: 500 });
  }
}
