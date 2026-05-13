import { NextRequest, NextResponse } from "next/server";
import { requireAdminDirectoryGate } from "@/lib/admin-directory-access";
import {
  deleteAdminAccount,
  hasAdminDirectoryDb,
  listAdminAccountEmails,
  upsertAdminAccount,
} from "@/lib/admin-directory-db";

export async function GET() {
  const gate = await requireAdminDirectoryGate();
  if (!gate.ok) {
    return NextResponse.json(gate.body, { status: gate.status });
  }
  if (!hasAdminDirectoryDb()) {
    return NextResponse.json({
      success: true,
      emails: [] as string[],
      dbAvailable: false,
      hint: "أضف POSTGRES_URL في البيئة لتخزين الحسابات على الخادم.",
    });
  }
  try {
    const emails = await listAdminAccountEmails();
    return NextResponse.json({ success: true, emails, dbAvailable: true });
  } catch (e) {
    console.error("GET /api/admin/directory:", e);
    return NextResponse.json(
      { success: false, error: "تعذر قراءة الحسابات من قاعدة البيانات" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireAdminDirectoryGate();
  if (!gate.ok) {
    return NextResponse.json(gate.body, { status: gate.status });
  }
  if (!hasAdminDirectoryDb()) {
    return NextResponse.json(
      { success: false, error: "قاعدة البيانات غير متوفرة. اضبط POSTGRES_URL." },
      { status: 503 }
    );
  }
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    await upsertAdminAccount(email, password);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "فشل الحفظ";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const gate = await requireAdminDirectoryGate();
  if (!gate.ok) {
    return NextResponse.json(gate.body, { status: gate.status });
  }
  if (!hasAdminDirectoryDb()) {
    return NextResponse.json({ success: false, error: "قاعدة البيانات غير متوفرة" }, { status: 503 });
  }
  const email = request.nextUrl.searchParams.get("email")?.trim() ?? "";
  if (!email) {
    return NextResponse.json({ success: false, error: "البريد مطلوب" }, { status: 400 });
  }
  try {
    const deleted = await deleteAdminAccount(email);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "البريد غير موجود في القاعدة" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/admin/directory:", e);
    return NextResponse.json({ success: false, error: "تعذر الحذف" }, { status: 500 });
  }
}
