import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { isTodayGiftsDbConfigured } from "@/lib/today-gifts-db";
import { upsertArtInventoryFromExcelRows } from "@/lib/art-inventory-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeKey(k: string): string {
  return String(k ?? "").replace(/[\u200e\u200f]/g, "").trim();
}

function cell(row: Record<string, unknown>, want: string): unknown {
  const nk = normalizeKey(want);
  for (const [k, v] of Object.entries(row)) {
    if (normalizeKey(k) === nk) return v;
  }
  return undefined;
}

function parseQty(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim().replace(/\s/g, "").replace(/,/g, "");
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
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

    const form = await request.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: "لم يتم اختيار ملف" }, { status: 400 });
    }

    const lower = (file.name ?? "").toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      return NextResponse.json({ success: false, error: "يرجى اختيار ملف Excel (.xlsx أو .xls)." }, { status: 400 });
    }

    const { read, utils } = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ success: false, error: "الملف لا يحتوي على أي ورقة عمل." }, { status: 400 });
    }

    const rows = utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: "" });
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "لا توجد صفوف بيانات في الملف." }, { status: 400 });
    }

    const keys = Object.keys(rows[0] ?? {}).map(normalizeKey);
    const hasName = keys.includes("الصنف");
    const hasDesc = keys.includes("الوصف");
    const hasCurrent = keys.includes("العدد الحالي");
    const hasQty = keys.includes("العدد");
    const hasOut = keys.includes("التخريج");

    if (!hasName || !(hasCurrent || hasQty)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "صيغة الملف غير متطابقة.\nالمطلوب وجود العمود: الصنف.\nويُفضّل: الوصف، العدد الحالي.\nويقبل أيضاً: العدد + التخريج.",
        },
        { status: 400 }
      );
    }

    const mapped: { name: string; description?: string | null; qty: number }[] = [];
    for (const r of rows) {
      const name = String(cell(r, "الصنف") ?? "").trim();
      if (!name) continue;
      const description = hasDesc ? String(cell(r, "الوصف") ?? "").trim() : "";

      let qty: number | null = null;
      if (hasCurrent) qty = parseQty(cell(r, "العدد الحالي"));
      if (qty == null && hasQty) {
        const base = parseQty(cell(r, "العدد")) ?? 0;
        const out = hasOut ? parseQty(cell(r, "التخريج")) ?? 0 : 0;
        qty = Math.max(0, base - out);
      }
      if (qty == null) continue;

      mapped.push({
        name,
        description: description ? description : null,
        qty,
      });
    }

    if (mapped.length === 0) {
      return NextResponse.json({ success: false, error: "لم يتم العثور على صفوف صالحة في الملف." }, { status: 400 });
    }

    const result = await upsertArtInventoryFromExcelRows(mapped, session.email);
    return NextResponse.json({ success: true, importedRows: mapped.length, upserted: result.upserted });
  } catch (e) {
    console.error("POST /api/art-inventory/import-excel:", e);
    return NextResponse.json({ success: false, error: "فشل في استيراد ملف Excel" }, { status: 500 });
  }
}

