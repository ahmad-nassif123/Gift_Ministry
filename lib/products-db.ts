import { sql } from "@vercel/postgres";
import { products as initialProducts, type Product, type GiftTier } from "@/data/products";

const PRODUCTS_TABLE = "products";

let initDone = false;

export async function ensureProductsTable(): Promise<void> {
  if (initDone) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        slug VARCHAR(255) PRIMARY KEY,
        sku VARCHAR(64) UNIQUE NOT NULL,
        name VARCHAR(512) NOT NULL,
        short_description TEXT NOT NULL DEFAULT '',
        contents JSONB NOT NULL DEFAULT '[]',
        gift_tier VARCHAR(32) NOT NULL DEFAULT 'standard',
        images JSONB NOT NULL DEFAULT '[]',
        available_quantity INTEGER NOT NULL DEFAULT 0,
        price VARCHAR(64),
        archived BOOLEAN NOT NULL DEFAULT false,
        hidden BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    try {
      await sql`ALTER TABLE products ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false`;
    } catch {
      /* العمود موجود مسبقاً */
    }
    try {
      await sql`ALTER TABLE products ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT false`;
    } catch {
      /* العمود موجود مسبقاً */
    }
    await sql`
      CREATE TABLE IF NOT EXISTS catalog_slug_suppressions (
        slug VARCHAR(255) PRIMARY KEY,
        suppressed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    initDone = true;
  } catch (e) {
    console.error("products-db init:", e);
    throw e;
  }
}

function rowToProduct(r: Record<string, unknown>): Product {
  return {
    slug: String(r.slug),
    sku: String(r.sku),
    name: String(r.name),
    shortDescription: String(r.short_description ?? ""),
    contents: Array.isArray(r.contents) ? r.contents.map(String) : [],
    giftTier: (r.gift_tier as GiftTier) || "standard",
    images: Array.isArray(r.images) ? r.images.map(String) : [],
    availableQuantity: typeof r.available_quantity === "number" ? r.available_quantity : 0,
    price: r.price != null ? String(r.price) : undefined,
    archived: Boolean(r.archived),
    hidden: Boolean((r as any).hidden),
    createdAt: r.created_at != null ? String((r as any).created_at) : undefined,
    updatedAt: r.updated_at != null ? String((r as any).updated_at) : undefined,
  };
}

async function getSuppressedSlugSet(): Promise<Set<string>> {
  await ensureProductsTable();
  const { rows } = await sql`SELECT slug FROM catalog_slug_suppressions`;
  return new Set(rows.map((r) => String((r as { slug: string }).slug)));
}

export async function seedProductsIfEmpty(): Promise<number> {
  await ensureProductsTable();
  const { rows } = await sql`SELECT COUNT(*)::int as c FROM products`;
  const count = Number(rows[0]?.c ?? 0);
  if (count > 0) return count;
  const suppressed = await getSuppressedSlugSet();
  for (const p of initialProducts) {
    if (suppressed.has(p.slug)) continue;
    await sql`
      INSERT INTO products (slug, sku, name, short_description, contents, gift_tier, images, available_quantity, price, updated_at)
      VALUES (
        ${p.slug},
        ${p.sku},
        ${p.name},
        ${p.shortDescription ?? ""},
        ${JSON.stringify(p.contents ?? [])}::jsonb,
        ${p.giftTier},
        ${JSON.stringify(p.images ?? [])}::jsonb,
        ${p.availableQuantity ?? 0},
        ${p.price ?? null},
        NOW()
      )
      ON CONFLICT (slug) DO NOTHING
    `;
  }
  return initialProducts.length;
}

/**
 * مزامنة المنتجات الأولية (من data/products) مع القاعدة:
 * - تُدرج أي منتج غير موجود
 * - لا تُعدّل المنتجات الموجودة (حتى لا نكسر تعديلات الداشبورد)
 */
export async function syncInitialProducts(): Promise<void> {
  await ensureProductsTable();
  const suppressed = await getSuppressedSlugSet();
  for (const p of initialProducts) {
    if (suppressed.has(p.slug)) continue;
    await sql`
      INSERT INTO products (slug, sku, name, short_description, contents, gift_tier, images, available_quantity, price, updated_at)
      VALUES (
        ${p.slug},
        ${p.sku},
        ${p.name},
        ${p.shortDescription ?? ""},
        ${JSON.stringify(p.contents ?? [])}::jsonb,
        ${p.giftTier},
        ${JSON.stringify(p.images ?? [])}::jsonb,
        ${p.availableQuantity ?? 0},
        ${p.price ?? null},
        NOW()
      )
      ON CONFLICT (slug) DO NOTHING
    `;
  }
}

export async function getAllProducts(includeArchived = false, includeHidden = false): Promise<Product[]> {
  await ensureProductsTable();
  const { rows } = includeArchived
    ? includeHidden
      ? await sql`SELECT * FROM products ORDER BY hidden ASC, archived ASC, sku`
      : await sql`SELECT * FROM products WHERE (hidden IS NULL OR hidden = false) ORDER BY archived ASC, sku`
    : includeHidden
      ? await sql`SELECT * FROM products WHERE (archived IS NULL OR archived = false) ORDER BY hidden ASC, sku`
      : await sql`SELECT * FROM products WHERE (archived IS NULL OR archived = false) AND (hidden IS NULL OR hidden = false) ORDER BY sku`;
  return rows.map(rowToProduct);
}

export async function getProductBySku(sku: string): Promise<Product | null> {
  await ensureProductsTable();
  const normalized = sku.trim();
  const { rows } = await sql`SELECT * FROM products WHERE sku = ${normalized} OR UPPER(sku) = UPPER(${normalized}) LIMIT 1`;
  return rows.length > 0 ? rowToProduct(rows[0]) : null;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  await ensureProductsTable();
  const { rows } = await sql`SELECT * FROM products WHERE slug = ${slug.trim()} LIMIT 1`;
  return rows.length > 0 ? rowToProduct(rows[0]) : null;
}

function parseSkuNumber(sku: string): number {
  const match = sku.trim().toUpperCase().match(/^G(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

function formatSku(num: number): string {
  return `G${String(Math.max(1, num)).padStart(2, "0")}`;
}

export async function getNextAvailableSku(): Promise<string> {
  await ensureProductsTable();
  const { rows } = await sql`SELECT sku FROM products`;
  const maxNumber = rows.reduce((max, row) => {
    const current = parseSkuNumber(String((row as { sku?: string }).sku ?? ""));
    return current > max ? current : max;
  }, 0);
  return formatSku(maxNumber + 1);
}

export async function createProduct(p: Product): Promise<Product> {
  await ensureProductsTable();
  await sql`DELETE FROM catalog_slug_suppressions WHERE slug = ${p.slug}`;
  await sql`
    INSERT INTO products (slug, sku, name, short_description, contents, gift_tier, images, available_quantity, price, archived, hidden, updated_at)
    VALUES (
      ${p.slug},
      ${p.sku},
      ${p.name},
      ${p.shortDescription ?? ""},
      ${JSON.stringify(p.contents ?? [])}::jsonb,
      ${p.giftTier},
      ${JSON.stringify(p.images ?? [])}::jsonb,
      ${p.availableQuantity ?? 0},
      ${p.price ?? null},
      ${p.archived ?? false},
      ${p.hidden ?? false},
      NOW()
    )
  `;
  return p;
}

/**
 * تحديث منتج في جولة شبكة واحدة (بدون SELECT ثم UPDATE) لتقليل زمن الحفظ على Neon/Vercel.
 * الحقول غير المرسلة (undefined) تُمرَّر كـ NULL إلى COALESCE فتُحفَظ القيمة القديمة.
 */
export async function updateProduct(slug: string, updates: Partial<Product>): Promise<Product | null> {
  await ensureProductsTable();
  const sku = updates.sku !== undefined ? updates.sku : null;
  const name = updates.name !== undefined ? updates.name : null;
  const shortDescription = updates.shortDescription !== undefined ? updates.shortDescription : null;
  const contentsJson =
    updates.contents !== undefined ? JSON.stringify(updates.contents ?? []) : null;
  const giftTier = updates.giftTier !== undefined ? updates.giftTier : null;
  const imagesJson = updates.images !== undefined ? JSON.stringify(updates.images ?? []) : null;
  const qty = updates.availableQuantity !== undefined ? updates.availableQuantity : null;
  const price = updates.price !== undefined ? updates.price : null;
  const archived = updates.archived !== undefined ? updates.archived : null;
  const hidden = updates.hidden !== undefined ? updates.hidden : null;

  const { rows } = await sql`
    UPDATE products AS p SET
      sku = COALESCE(${sku}, p.sku),
      name = COALESCE(${name}, p.name),
      short_description = COALESCE(${shortDescription}, p.short_description),
      contents = COALESCE(${contentsJson}::jsonb, p.contents),
      gift_tier = COALESCE(${giftTier}, p.gift_tier),
      images = COALESCE(${imagesJson}::jsonb, p.images),
      available_quantity = COALESCE(${qty}, p.available_quantity),
      price = COALESCE(${price}, p.price),
      archived = COALESCE(${archived}, p.archived),
      hidden = COALESCE(${hidden}, p.hidden),
      updated_at = NOW()
    WHERE p.slug = ${slug}
    RETURNING *
  `;
  if (rows.length === 0) return null;
  return rowToProduct(rows[0]);
}

/**
 * حذف فعلي من القاعدة. يُسجَّل الـ slug في catalog_slug_suppressions حتى لا يُعاد إدراجه
 * من data/products.ts عند syncInitialProducts.
 */
export async function deleteProduct(slug: string): Promise<boolean> {
  await ensureProductsTable();
  const s = slug.trim();
  const { rowCount } = await sql`DELETE FROM products WHERE slug = ${s}`;
  if ((rowCount ?? 0) === 0) return false;
  await sql`
    INSERT INTO catalog_slug_suppressions (slug) VALUES (${s})
    ON CONFLICT (slug) DO NOTHING
  `;
  return true;
}

export function isProductsDbConfigured(): boolean {
  try {
    const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
    return Boolean(url && url.length > 0);
  } catch {
    return false;
  }
}
