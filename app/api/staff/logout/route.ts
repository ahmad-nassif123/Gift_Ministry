import { NextResponse } from "next/server";
import { clearStaffSessionOnResponse } from "@/lib/staff-session";

export async function POST() {
  const res = NextResponse.json({ success: true });
  clearStaffSessionOnResponse(res);
  return res;
}
