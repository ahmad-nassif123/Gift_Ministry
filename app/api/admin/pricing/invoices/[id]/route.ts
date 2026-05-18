import { NextRequest, NextResponse } from "next/server";
import { isPricingGateOpen } from "@/lib/admin-pricing-session";
import { isProductsDbConfigured } from "@/lib/products-db";
import {
  deleteAdminPricingInvoice,
  getAdminPricingInvoiceById,
  updateAdminPricingInvoice,
  type AdminPricingInvoiceLineSnapshot,
  type PaymentTerms,
} from "@/lib/admin-pricing-invoices-db";

export const dynamic = "force-dynamic";

function parseId(param: string): number | null {
  const n = Math.floor(Number(param));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseLines(raw: unknown): AdminPricingInvoiceLineSnapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw
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
    .filter(Boolean) as AdminPricingInvoiceLineSnapshot[];
}

function parsePaymentTerms(raw: unknown): PaymentTerms {
  return String(raw ?? "").toLowerCase() === "deferred" ? "deferred" : "cash";
}

export async function GET(_request: NextRequest, context: { params: { id: string } }) {
  try {
    const ok = await isPricingGateOpen();
    if (!ok) return NextResponse.json({ success: false, error: "غير مصرّح" }, { status: 401 });
    if (!isProductsDbConfigured()) {
      return NextResponse.json({ success: false, error: "قاعدة البيانات غير مُعدّة" }, { status: 503 });
    }
    const param = context.params.id;
    const id = parseId(param);
    if (id == null) return NextResponse.json({ success: false, error: "معرّف غير صالح" }, { status: 400 });
    const row = await getAdminPricingInvoiceById(id);
    if (!row) return NextResponse.json({ success: false, error: "غير موجود" }, { status: 404 });
    return NextResponse.json({ success: true, data: row });
  } catch (e) {
    console.error("GET /api/admin/pricing/invoices/[id]:", e);
    return NextResponse.json({ success: false, error: "فشل التحميل" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const ok = await isPricingGateOpen();
    if (!ok) return NextResponse.json({ success: false, error: "غير مصرّح" }, { status: 401 });
    if (!isProductsDbConfigured()) {
      return NextResponse.json({ success: false, error: "قاعدة البيانات غير مُعدّة" }, { status: 503 });
    }
    const param = context.params.id;
    const id = parseId(param);
    if (id == null) return NextResponse.json({ success: false, error: "معرّف غير صالح" }, { status: 400 });

    const body = (await request.json()) as Record<string, unknown>;
    const invoiceNo = String(body.invoiceNo ?? "").trim().slice(0, 160);
    if (!invoiceNo) return NextResponse.json({ success: false, error: "رقم الفاتورة مطلوب" }, { status: 400 });

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
    const grandNum = Number(body.grandNumeric);
    const grandNumeric = Number.isFinite(grandNum) ? grandNum : 0;
    const lines = parseLines(body.lines);
    const paymentTerms = parsePaymentTerms(body.paymentTerms);

    const updated = await updateAdminPricingInvoice(id, {
      invoiceNo,
      documentDateIso,
      toSir,
      statement,
      currency,
      usdRate,
      grandTotalText,
      grandNumeric,
      lines,
      paymentTerms,
    });

    if (!updated) return NextResponse.json({ success: false, error: "تعذر التحديث" }, { status: 500 });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    console.error("PATCH /api/admin/pricing/invoices/[id]:", e);
    return NextResponse.json({ success: false, error: "فشل التحديث" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: { params: { id: string } }) {
  try {
    const ok = await isPricingGateOpen();
    if (!ok) return NextResponse.json({ success: false, error: "غير مصرّح" }, { status: 401 });
    if (!isProductsDbConfigured()) {
      return NextResponse.json({ success: false, error: "قاعدة البيانات غير مُعدّة" }, { status: 503 });
    }
    const param = context.params.id;
    const id = parseId(param);
    if (id == null) return NextResponse.json({ success: false, error: "معرّف غير صالح" }, { status: 400 });
    const deleted = await deleteAdminPricingInvoice(id);
    if (!deleted) return NextResponse.json({ success: false, error: "غير موجود" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/admin/pricing/invoices/[id]:", e);
    return NextResponse.json({ success: false, error: "فشل الحذف" }, { status: 500 });
  }
}
