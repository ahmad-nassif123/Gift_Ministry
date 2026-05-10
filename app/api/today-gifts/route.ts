import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import {
  getTodayGiftItems,
  isTodayGiftsDbConfigured,
  setTodayGiftItems,
  type TodayGiftItem,
} from "@/lib/today-gifts-db";

export const dynamic = "force-dynamic";

function isoDayOrToday(v: string | null): string {
  const day = (v ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    if (!isTodayGiftsDbConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة. أضف Postgres من لوحة Vercel." },
        { status: 503 }
      );
    }
    const { searchParams } = new URL(request.url);
    const day = isoDayOrToday(searchParams.get("day"));
    const items = await getTodayGiftItems(day);
    const slugs = items.map((i) => i.slug);
    return NextResponse.json({ success: true, day, slugs, items });
  } catch (e) {
    console.error("GET /api/today-gifts:", e);
    return NextResponse.json({ success: false, error: "فشل في جلب هدايا اليوم" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
    const body = (await request.json()) as { day?: string; slugs?: unknown; items?: unknown };
    const day = isoDayOrToday(typeof body.day === "string" ? body.day : null);
    const items: TodayGiftItem[] = Array.isArray(body.items)
      ? (body.items as unknown[]).map((x) => x as TodayGiftItem)
      : Array.isArray(body.slugs)
        ? (body.slugs as unknown[]).map((s) => ({ slug: String(s), outQty: 0, inQty: 0 }))
        : [];
    await setTodayGiftItems(day, items);
    const slugs = items.map((i) => String(i.slug));
    return NextResponse.json({ success: true, day, slugs, items });
  } catch (e) {
    console.error("PUT /api/today-gifts:", e);
    return NextResponse.json({ success: false, error: "فشل في حفظ هدايا اليوم" }, { status: 500 });
  }
}

