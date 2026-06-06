import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/auth-session";

export const runtime = "nodejs";

function buildSafeFileName(original: string): string {
  const timestamp = Date.now();
  const originalName = original.replace(/[^a-zA-Z0-9.\u0600-\u06FF]/g, "-");
  return `${timestamp}-${originalName || "image"}`;
}

function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim() || process.env.BLOB_STORE_ID?.trim());
}

function blobPutOptions() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return {
    access: "public" as const,
    addRandomSuffix: false,
    ...(token ? { token } : {}),
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول" },
        { status: 401 }
      );
    }
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "لم يتم اختيار ملف" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "نوع الملف غير مدعوم. يرجى رفع صورة (JPG, PNG, WEBP, GIF)" },
        { status: 400 }
      );
    }

    // صور الكتالوج للطباعة قد تكون كبيرة (HD)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "حجم الملف كبير جداً. الحد الأقصى 25MB" },
        { status: 400 }
      );
    }

    const fileName = buildSafeFileName(file.name);

    /** على Vercel: Blob عبر BLOB_STORE_ID (OIDC) أو BLOB_READ_WRITE_TOKEN */
    if (isBlobConfigured()) {
      const blob = await put(`product-uploads/${fileName}`, file, blobPutOptions());
      return NextResponse.json({
        success: true,
        message: "تم رفع الصورة بنجاح",
        url: blob.url,
      });
    }

    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          success: false,
          error:
            "رفع الصور يحتاج Vercel Blob: من لوحة Vercel → Storage → Blob → أنشئ مخزناً واربطه بمشروع gift-ministry ثم Redeploy.",
        },
        { status: 503 }
      );
    }

    const imagesDir = path.join(process.cwd(), "public", "images");
    if (!existsSync(imagesDir)) {
      await mkdir(imagesDir, { recursive: true });
    }

    const filePath = path.join(imagesDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const imageUrl = `/images/${fileName}`;

    return NextResponse.json({
      success: true,
      message: "تم رفع الصورة بنجاح",
      url: imageUrl,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { success: false, error: "فشل في رفع الصورة" },
      { status: 500 }
    );
  }
}
