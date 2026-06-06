import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { getBlobAuthOptions, usesPrivateBlobStore } from "@/lib/blob-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!usesPrivateBlobStore()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const auth = getBlobAuthOptions();
    if (!auth) {
      return NextResponse.json({ error: "Blob auth not configured" }, { status: 503 });
    }

    const pathname = request.nextUrl.searchParams.get("pathname")?.trim();
    if (!pathname || pathname.includes("..")) {
      return NextResponse.json({ error: "Invalid pathname" }, { status: 400 });
    }

    const result = await get(pathname, {
      access: "private",
      ...auth,
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType ?? "application/octet-stream",
        "Cache-Control": result.blob.cacheControl ?? "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    console.error("GET /api/media:", error);
    return NextResponse.json({ error: "Failed to load media" }, { status: 500 });
  }
}
