import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { isTodayGiftsDbConfigured } from "@/lib/today-gifts-db";
import { issueArtInventoryItem } from "@/lib/art-inventory-db";

export const dynamic = "force-dynamic";

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
      itemId?: unknown;
      qty?: unknown;
      entity?: unknown;
      notes?: unknown;
      day?: unknown;
    };

    const itemId = Math.max(1, Math.floor(Number(body.itemId ?? 0)));
    const qty = Math.max(0, Math.floor(Number(body.qty ?? 0)));
    const entity = body.entity != null ? String(body.entity).trim() : null;
    const notes = body.notes != null ? String(body.notes).trim() : null;
    const day = body.day != null ? String(body.day).trim() : null;

    if (!itemId) {
      return NextResponse.json({ success: false, error: "الصنف مطلوب" }, { status: 400 });
    }
    if (!qty || qty <= 0) {
      return NextResponse.json({ success: false, error: "الكمية يجب أن تكون أكبر من 0" }, { status: 400 });
    }

    const res = await issueArtInventoryItem({
      itemId,
      qty,
      entity,
      notes,
      dayIso: day,
      createdByEmail: session.email,
    });
    return NextResponse.json({ success: true, item: res.item, issue: res.issue });
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    if (msg.includes("الكمية غير كافية") || msg.includes("الصنف غير موجود")) {
      return NextResponse.json({ success: false, error: msg || "تعذر التخريج" }, { status: 400 });
    }
    console.error("POST /api/art-inventory/issue:", e);
    return NextResponse.json({ success: false, error: "فشل في تخريج القطع" }, { status: 500 });
  }
}

