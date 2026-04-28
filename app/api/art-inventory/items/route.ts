import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { isTodayGiftsDbConfigured } from "@/lib/today-gifts-db";
import { createArtInventoryItem, listArtInventoryItems } from "@/lib/art-inventory-db";

export const dynamic = "force-dynamic";

export async function GET() {
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
    const items = await listArtInventoryItems();
    return NextResponse.json({ success: true, items });
  } catch (e) {
    console.error("GET /api/art-inventory/items:", e);
    return NextResponse.json({ success: false, error: "فشل في جلب الأصناف" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const body = (await request.json()) as {
      name?: unknown;
      description?: unknown;
      qty?: unknown;
    };
    const name = String(body.name ?? "").trim();
    const description = body.description != null ? String(body.description).trim() : null;
    const qtyNum = Math.max(0, Math.floor(Number(body.qty ?? 0) || 0));
    if (!name) {
      return NextResponse.json({ success: false, error: "اسم الصنف مطلوب" }, { status: 400 });
    }

    const item = await createArtInventoryItem({
      name,
      description,
      initialQty: qtyNum,
      currentQty: qtyNum,
    });
    return NextResponse.json({ success: true, item });
  } catch (e) {
    console.error("POST /api/art-inventory/items:", e);
    return NextResponse.json({ success: false, error: "فشل في إضافة الصنف" }, { status: 500 });
  }
}

