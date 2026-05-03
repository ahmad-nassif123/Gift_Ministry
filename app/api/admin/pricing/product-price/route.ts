import { NextRequest, NextResponse } from "next/server";
import { isPricingGateOpen } from "@/lib/admin-pricing-session";
import { ensureProductsTable, getProductBySlug, isProductsDbConfigured, updateProduct } from "@/lib/products-db";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  try {
    const ok = await isPricingGateOpen();
    if (!ok) {
      return NextResponse.json({ success: false, error: "غير مصرّح" }, { status: 401 });
    }
    if (!isProductsDbConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة. أضف Postgres من لوحة Vercel." },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { slug?: unknown; price?: unknown };
    const slug = String(body.slug ?? "").trim();
    if (!slug) {
      return NextResponse.json({ success: false, error: "slug مطلوب" }, { status: 400 });
    }

    const raw = body.price;
    const price: string | null | undefined =
      raw === undefined || raw === null
        ? undefined
        : String(raw).trim() === ""
          ? null
          : String(raw).trim();

    await ensureProductsTable();
    const existing = await getProductBySlug(slug);
    if (!existing) {
      return NextResponse.json({ success: false, error: "الهدية غير موجودة" }, { status: 404 });
    }

    const updated = await updateProduct(slug, { price: price === undefined ? undefined : price });
    if (!updated) {
      return NextResponse.json({ success: false, error: "تعذر تحديث السعر" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    console.error("PUT /api/admin/pricing/product-price:", e);
    return NextResponse.json({ success: false, error: "فشل في حفظ السعر" }, { status: 500 });
  }
}
