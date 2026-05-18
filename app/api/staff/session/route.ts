import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/staff-session";
import { getStaffOfficeLabel } from "@/lib/staff-offices";

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    staff: {
      id: session.staffId,
      fullName: session.fullName,
      officeCode: session.officeCode,
      officeLabel: getStaffOfficeLabel(session.officeCode),
      loginId: session.loginId,
    },
  });
}
