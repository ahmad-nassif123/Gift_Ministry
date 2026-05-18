import { NextResponse } from "next/server";
import { isPricingGateOpen } from "@/lib/admin-pricing-session";
import { hasStaffWorkDb, listStaffWorkSubmissions } from "@/lib/staff-work-db";

export async function GET(request: Request) {
  if (!(await isPricingGateOpen())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (!hasStaffWorkDb()) {
    return NextResponse.json({ error: "POSTGRES_URL غير متوفر" }, { status: 503 });
  }
  const { searchParams } = new URL(request.url);
  const fromDate = searchParams.get("from") ?? undefined;
  const toDate = searchParams.get("to") ?? undefined;
  const staffIdRaw = searchParams.get("staffId");
  const staffMemberId = staffIdRaw ? Number(staffIdRaw) : undefined;
  const submissions = await listStaffWorkSubmissions({
    fromDate,
    toDate,
    staffMemberId: Number.isFinite(staffMemberId) ? staffMemberId : undefined,
  });
  return NextResponse.json({ submissions });
}
