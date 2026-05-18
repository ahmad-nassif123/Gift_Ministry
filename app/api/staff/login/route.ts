import { NextResponse } from "next/server";
import {
  attachStaffSessionToResponse,
  createStaffSessionToken,
  normalizeStaffLoginId,
} from "@/lib/staff-session";
import { hasStaffWorkDb, verifyStaffMemberLogin } from "@/lib/staff-work-db";

export async function POST(request: Request) {
  try {
    if (!hasStaffWorkDb()) {
      return NextResponse.json(
        { error: "قاعدة البيانات غير مفعّلة على الخادم (POSTGRES_URL)." },
        { status: 503 }
      );
    }
    const body = (await request.json()) as {
      loginId?: string;
      password?: string;
      rememberMe?: boolean;
    };
    const loginId = normalizeStaffLoginId(body.loginId ?? "");
    const password = String(body.password ?? "");
    const member = await verifyStaffMemberLogin(loginId, password);
    if (!member) {
      return NextResponse.json({ error: "معرّف الدخول أو كلمة المرور غير صحيحة" }, { status: 401 });
    }
    const token = createStaffSessionToken(
      {
        staffId: member.id,
        fullName: member.fullName,
        officeCode: member.officeCode,
        loginId: member.loginId,
      },
      !!body.rememberMe
    );
    const res = NextResponse.json({
      success: true,
      redirect: "/staff/report",
      staff: {
        fullName: member.fullName,
        officeCode: member.officeCode,
      },
    });
    attachStaffSessionToResponse(res, token, !!body.rememberMe);
    return res;
  } catch (e) {
    console.error("POST /api/staff/login:", e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
