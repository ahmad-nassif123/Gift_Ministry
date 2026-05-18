import { NextRequest, NextResponse } from "next/server";
import { products as staticProducts, type Product, type GiftTier } from "@/data/products";
import {
  isProductsDbConfigured,
  ensureProductsTable,
  seedProductsIfEmpty,
  syncInitialProducts,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getNextAvailableSku,
} from "@/lib/products-db";
import { isPricingGateOpen } from "@/lib/admin-pricing-session";
import { getSession } from "@/lib/auth-session";
import { stripProductsPricesForPublic } from "@/lib/product-public";
import { generateProductSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const;

async function mayExposeProductPrices(): Promise<boolean> {
  const [session, pricingGate] = await Promise.all([getSession(), isPricingGateOpen()]);
  return !!(session || pricingGate);
}

// GET - جلب المنتجات. include_archived=1 يتضمن المؤرشفة (archived) — الداشبورد الافتراضي بدونها
export async function GET(request: NextRequest) {
  try {
    const showPrices = await mayExposeProductPrices();

    if (!isProductsDbConfigured()) {
      const data = showPrices ? staticProducts : stripProductsPricesForPublic(staticProducts);
      return NextResponse.json({ success: true, data }, { headers: NO_STORE_HEADERS });
    }
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("include_archived") === "1" || searchParams.get("include_archived") === "true";
    const includeHidden = searchParams.get("include_hidden") === "1" || searchParams.get("include_hidden") === "true";
    /** quick=1: جلب سريع للداشبورد — يتخطى syncInitialProducts (حلقة إدراج لكل منتج أولي) */
    const quick = searchParams.get("quick") === "1" || searchParams.get("quick") === "true";
    await ensureProductsTable();
    await seedProductsIfEmpty();
    if (!quick) {
      await syncInitialProducts();
    }
    let data = await getAllProducts(includeArchived, includeHidden);
    if (!showPrices) {
      data = stripProductsPricesForPublic(data);
    }
    return NextResponse.json({ success: true, data }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("GET /api/products:", error);
    return NextResponse.json(
      { success: false, error: "فشل في جلب الهدايا" },
      { status: 500 }
    );
  }
}

// POST - إضافة منتج جديد (في قاعدة البيانات) — يتطلب تسجيل دخول
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول" },
        { status: 401 }
      );
    }
    if (!isProductsDbConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة. أضف Postgres من لوحة Vercel." },
        { status: 503 }
      );
    }
    const body = await request.json();
    const requestedSku = typeof body.sku === "string" ? body.sku.trim() : "";
    let newProduct: Product = {
      slug: (body.slug && String(body.slug).trim()) || generateProductSlug(body.name ?? ""),
      sku: requestedSku || (await getNextAvailableSku()),
      name: body.name,
      shortDescription: body.shortDescription ?? "",
      contents: Array.isArray(body.contents) ? body.contents : [],
      giftTier: (body.giftTier as GiftTier) || "standard",
      images: Array.isArray(body.images) ? body.images : [],
      catalogImage: typeof body.catalogImage === "string" ? body.catalogImage : undefined,
      availableQuantity: body.availableQuantity ?? 0,
      price: body.price,
      salePrice: typeof body.salePrice === "string" ? body.salePrice : undefined,
      pricingDetail: typeof body.pricingDetail === "string" ? body.pricingDetail : undefined,
    };
    await ensureProductsTable();
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await createProduct(newProduct);
        return NextResponse.json({
          success: true,
          message: "تم إضافة الهدية بنجاح",
          data: newProduct,
        });
      } catch (error) {
        const dbError = error as { code?: string; constraint?: string };
        const isSkuConflict =
          dbError?.code === "23505" && dbError?.constraint === "products_sku_key";
        if (isSkuConflict && attempt < 2) {
          newProduct = {
            ...newProduct,
            sku: await getNextAvailableSku(),
          };
          continue;
        }
        throw error;
      }
    }
  } catch (error) {
    console.error("POST /api/products:", error);
    return NextResponse.json(
      { success: false, error: "فشل في إضافة الهدية" },
      { status: 500 }
    );
  }
}

// PUT - تحديث منتج (في قاعدة البيانات) — يتطلب تسجيل دخول
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول" },
        { status: 401 }
      );
    }
    if (!isProductsDbConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة. أضف Postgres من لوحة Vercel." },
        { status: 503 }
      );
    }
    const body = await request.json();
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!slug) {
      return NextResponse.json(
        { success: false, error: "معرّف الهدية (slug) مطلوب" },
        { status: 400 }
      );
    }
    const updatedData: Partial<Product> = {
      sku: body.sku,
      name: body.name,
      shortDescription: body.shortDescription,
      contents: body.contents,
      giftTier: body.giftTier,
      images: body.images,
      catalogImage: body.catalogImage,
      availableQuantity: body.availableQuantity,
      price: body.price,
      salePrice: body.salePrice,
      pricingDetail: body.pricingDetail,
      archived: body.archived,
      hidden: body.hidden,
    };
    await ensureProductsTable();
    const updated = await updateProduct(slug, updatedData);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "الهدية غير موجودة" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "تم تحديث الهدية بنجاح",
      data: updated,
    });
  } catch (error) {
    console.error("PUT /api/products:", error);
    return NextResponse.json(
      { success: false, error: "فشل في تحديث الهدية" },
      { status: 500 }
    );
  }
}

// DELETE - حذف منتج (من قاعدة البيانات) — يتطلب تسجيل دخول
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول" },
        { status: 401 }
      );
    }
    if (!isProductsDbConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة. أضف Postgres من لوحة Vercel." },
        { status: 503 }
      );
    }
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    if (!slug) {
      return NextResponse.json(
        { success: false, error: "معرّف الهدية مطلوب" },
        { status: 400 }
      );
    }
    await ensureProductsTable();
    const deleted = await deleteProduct(slug);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "الهدية غير موجودة" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "تم حذف الهدية بنجاح",
    });
  } catch (error) {
    console.error("DELETE /api/products:", error);
    return NextResponse.json(
      { success: false, error: "فشل في حذف الهدية" },
      { status: 500 }
    );
  }
}
