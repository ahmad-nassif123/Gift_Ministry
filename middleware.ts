import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isValidStaffSessionToken } from "@/lib/staff-session-edge";

const STAFF_COOKIE_NAME = "staff_session";

const STAFF_PUBLIC_PATHS = ["/staff/login", "/staff/manifest.webmanifest", "/work"];
const STAFF_PUBLIC_API = ["/api/staff/login"];

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/fonts") ||
    pathname.startsWith("/images") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.[a-z0-9]+$/i.test(pathname)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const staffToken = request.cookies.get(STAFF_COOKIE_NAME)?.value;
  const staffSession = await isValidStaffSessionToken(staffToken);

  const isStaffPage = pathname.startsWith("/staff");
  const isStaffApi = pathname.startsWith("/api/staff");

  /** جلسة موظف: لا يصل لأي صفحة خارج /staff */
  if (staffSession && !isStaffPage && !isStaffApi) {
    return NextResponse.redirect(new URL("/staff/report", request.url));
  }

  if (!isStaffPage && !isStaffApi) {
    return NextResponse.next();
  }

  if (isStaffApi) {
    const isPublicApi = STAFF_PUBLIC_API.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    if (isPublicApi || request.method === "OPTIONS") {
      return NextResponse.next();
    }
    if (!staffSession) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isPublicPage = STAFF_PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (pathname === "/staff" || pathname === "/staff/") {
    const dest = staffSession ? "/staff/report" : "/staff/login";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (isPublicPage) {
    if (staffSession) {
      return NextResponse.redirect(new URL("/staff/report", request.url));
    }
    return NextResponse.next();
  }

  if (!staffSession) {
    const login = new URL("/staff/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
