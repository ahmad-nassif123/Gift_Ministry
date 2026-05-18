import { NextRequest, NextResponse } from "next/server";
import { isPricingGateOpen } from "@/lib/admin-pricing-session";
import { isProductsDbConfigured } from "@/lib/products-db";
import {
  insertAdminPricingInvoice,
  type AdminPricingInvoiceLineSnapshot,
  type PaymentTerms,
} from "@/lib/admin-pricing-invoices-db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ok = await isPricingGateOpen();
    if (!ok) {
      return NextResponse.json({ success: false, error: "غير مصرّح" }, { status: 401 });
    }

    const body = (await request.json()) as {
      invoiceNo?: unknown;
      documentDateIso?: unknown;
      toSir?: unknown;
      statement?: unknown;
      currency?: unknown;
      usdRate?: unknown;
      grandTotalText?: unknown;
      grandNumeric?: unknown;
      lines?: unknown;
    };

    const invoiceNo = String(body.invoiceNo ?? "").trim().slice(0, 160);
    if (!invoiceNo) {
      return NextResponse.json({ success: false, error: "رقم الفاتورة مطلوب" }, { status: 400 });
    }

    const documentDateIso =
      body.documentDateIso === null || body.documentDateIso === undefined
        ? null
        : String(body.documentDateIso).trim().slice(0, 32) || null;
    const toSir = String(body.toSir ?? "").trim().slice(0, 4000);
    const statement = String(body.statement ?? "").trim().slice(0, 8000);
    const currency = String(body.currency ?? "USD").toUpperCase() === "SYP" ? "SYP" : "USD";
    const usdRate =
      body.usdRate != null && String(body.usdRate).trim() !== ""
        ? String(body.usdRate).trim().slice(0, 64)
        : null;
    const grandTotalText = String(body.grandTotalText ?? "").trim().slice(0, 512);
    const grandNumeric = Number(body.grandNumeric);
    const grandNum = Number.isFinite(grandNumeric) ? grandNumeric : 0;

    const paymentTerms: PaymentTerms =
      String((body as { paymentTerms?: unknown }).paymentTerms ?? "")
        .toLowerCase() === "deferred"
        ? "deferred"
        : "cash";

    const rawLines = body.lines;
    const lines: AdminPricingInvoiceLineSnapshot[] = Array.isArray(rawLines)
      ? rawLines
          .map((x) => {
            if (!x || typeof x !== "object") return null;
            const o = x as Record<string, unknown>;
            const unitSyp =
              o.unitSyp != null && Number.isFinite(Number(o.unitSyp)) ? Number(o.unitSyp) : undefined;
            const unitUsd =
              o.unitUsd != null && Number.isFinite(Number(o.unitUsd)) ? Number(o.unitUsd) : undefined;
            return {
              sku: String(o.sku ?? "—").slice(0, 128),
              name: String(o.name ?? "").slice(0, 512),
              qty: Math.max(0, Math.min(999999, Math.floor(Number(o.qty) || 0))),
              unitPriceText: String(o.unitPriceText ?? "").slice(0, 128),
              lineValueText: String(o.lineValueText ?? "").slice(0, 128),
              custom: Boolean(o.custom),
              ...(unitUsd !== undefined ? { unitUsd } : {}),
              ...(unitSyp !== undefined ? { unitSyp } : {}),
            };
          })
          .filter(Boolean) as AdminPricingInvoiceLineSnapshot[]
      : [];

    if (!isProductsDbConfigured()) {
      return NextResponse.json({ success: true, stored: false, db: false });
    }

    const row = await insertAdminPricingInvoice({
      invoiceNo,
      documentDateIso,
      toSir,
      statement,
      currency,
      usdRate,
      grandTotalText,
      grandNumeric: grandNum,
      lines,
      paymentTerms,
    });

    if (!row) {
      return NextResponse.json({ success: false, error: "تعذر حفظ السجل" }, { status: 500 });
    }

    return NextResponse.json({ success: true, stored: true, db: true, data: row });
  } catch (e) {
    console.error("POST /api/admin/pricing/invoices/log:", e);
    return NextResponse.json({ success: false, error: "فشل تسجيل الفاتورة" }, { status: 500 });
  }
}
