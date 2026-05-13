import { NextRequest, NextResponse } from "next/server";
import { requireAdminDirectoryGate } from "@/lib/admin-directory-access";
import { hasAdminDirectoryDb } from "@/lib/admin-directory-db";
import {
  clearDashboardPasswordOverride,
  setDashboardPasswordOverride,
} from "@/lib/dashboard-password-db";
import { isDashboardLoginConfigured, verifyDashboardLoginPassword } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

/** تغيير كلمة مرور `/login` الرئيسية (تُخزَّن مشفّرة في Postgres وتستبدل متغيرات البيئة عند وجودها) */
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
    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!(await verifyDashboardLoginPassword(currentPassword))) {
      return NextResponse.json(
        { success: false, error: "كلمة المرور الحالية غير صحيحة" },
        { status: 401 }
      );
    }
    const np = newPassword.trim();
    const cp = confirmPassword.trim();
    if (np !== cp) {
      return NextResponse.json(
        { success: false, error: "كلمة المرور الجديدة وتأكيدها غير متطابقين" },
        { status: 400 }
      );
    }
    await setDashboardPasswordOverride(np);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "فشل الحفظ";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

/** إزالة كلمة المرور من القاعدة؛ يعود الدخول ليعتمد على ADMIN_PASSWORD في الاستضافة فقط */
export async function DELETE() {
  const gate = await requireAdminDirectoryGate();
  if (!gate.ok) {
    return NextResponse.json(gate.body, { status: gate.status });
  }
  if (!hasAdminDirectoryDb()) {
    return NextResponse.json({ success: false, error: "قاعدة البيانات غير متوفرة" }, { status: 503 });
  }
  if (!isDashboardLoginConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "لا يمكن الإلغاء: لم يُضبط ADMIN_PASSWORD (أو ADMIN_LOGIN_PASSWORD) في الاستضافة، فيصبح الدخول بدون كلمة مرور.",
      },
      { status: 400 }
    );
  }
  try {
    await clearDashboardPasswordOverride();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/admin/directory/dashboard-password:", e);
    return NextResponse.json({ success: false, error: "تعذر الإلغاء" }, { status: 500 });
  }
}
