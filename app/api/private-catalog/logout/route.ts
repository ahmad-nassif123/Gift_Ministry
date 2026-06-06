import { NextResponse } from "next/server";
import { deletePrivateCatalogGateCookie } from "@/lib/private-catalog-session";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await deletePrivateCatalogGateCookie();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/private-catalog/logout:", e);
    return NextResponse.json({ success: false, error: "فشل تسجيل الخروج" }, { status: 500 });
  }
}
