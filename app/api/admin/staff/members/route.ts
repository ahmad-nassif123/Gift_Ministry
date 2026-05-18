import { NextResponse } from "next/server";
import { isPricingGateOpen } from "@/lib/admin-pricing-session";
import {
  createStaffMember,
  hasStaffWorkDb,
  listStaffMembers,
} from "@/lib/staff-work-db";
import type { StaffOfficeCode } from "@/lib/staff-offices";
import { isValidStaffOfficeCode } from "@/lib/staff-offices";
import { normalizeStaffLoginId } from "@/lib/staff-session";

export async function GET() {
  if (!(await isPricingGateOpen())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (!hasStaffWorkDb()) {
    return NextResponse.json({ error: "POSTGRES_URL غير متوفر" }, { status: 503 });
  }
  const members = await listStaffMembers();
  return NextResponse.json({ members });
}

export async function POST(request: Request) {
  if (!(await isPricingGateOpen())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (!hasStaffWorkDb()) {
    return NextResponse.json({ error: "POSTGRES_URL غير متوفر" }, { status: 503 });
  }
  try {
    const body = (await request.json()) as {
      loginId?: string;
      password?: string;
      fullName?: string;
      officeCode?: string;
    };
    const officeCode = String(body.officeCode ?? "");
    if (!isValidStaffOfficeCode(officeCode)) {
      return NextResponse.json({ error: "اختر مكتباً صالحاً" }, { status: 400 });
    }
    const member = await createStaffMember({
      loginId: normalizeStaffLoginId(body.loginId ?? ""),
      password: String(body.password ?? ""),
      fullName: String(body.fullName ?? "").trim(),
      officeCode: officeCode as StaffOfficeCode,
    });
    return NextResponse.json({ member });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطأ";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
