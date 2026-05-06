import { NextRequest, NextResponse } from "next/server";
import { signPdfBufferWithP12 } from "@/lib/pdf/sign-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toBufferFromBase64(b64: string): Buffer | null {
  try {
    const s = String(b64 ?? "").trim();
    if (!s) return null;
    return Buffer.from(s, "base64");
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { pdfBase64?: string; meta?: Record<string, string> };
    const pdfBuffer = toBufferFromBase64(body.pdfBase64 ?? "");
    if (!pdfBuffer) {
      return NextResponse.json({ success: false, error: "pdfBase64 مطلوب" }, { status: 400 });
    }

    const p12Path = process.env.PDF_SIGN_P12_PATH?.trim();
    if (!p12Path) {
      return NextResponse.json(
        { success: false, error: "لم يتم إعداد PDF_SIGN_P12_PATH على الخادم" },
        { status: 503 }
      );
    }
    const passphrase = process.env.PDF_SIGN_P12_PASSPHRASE?.trim() || undefined;

    const signed = await signPdfBufferWithP12({
      pdfBuffer,
      p12Path,
      passphrase,
      meta: {
        reason: body.meta?.reason,
        contactInfo: body.meta?.contactInfo,
        name: body.meta?.name,
        location: body.meta?.location,
      },
    });

    return NextResponse.json({
      success: true,
      signedPdfBase64: signed.toString("base64"),
    });
  } catch (e) {
    console.error("POST /api/admin/pdf/sign:", e);
    return NextResponse.json({ success: false, error: "فشل توقيع PDF" }, { status: 500 });
  }
}

