import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({ authenticated: true, email: session.email });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
