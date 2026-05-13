import { NextResponse } from "next/server";
import { clearAdminSessionOnResponse } from "@/lib/auth-session";

export async function POST() {
  const response = NextResponse.json({ success: true, redirect: "/login" });
  clearAdminSessionOnResponse(response);
  return response;
}
