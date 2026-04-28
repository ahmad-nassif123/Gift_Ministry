import { sql } from "@vercel/postgres";

export type ArtInventoryItem = {
  id: number;
  name: string;
  description: string | null;
  initialQty: number;
  currentQty: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ArtInventoryIssue = {
  id: number;
  itemId: number;
  day: string; // YYYY-MM-DD
  entity: string | null;
  qty: number;
  notes: string | null;
  createdBy: string | null;
  createdAt?: string;
};

let initDone = false;

export async function ensureArtInventoryTables(): Promise<void> {
  if (initDone) return;
  await sql`
    CREATE TABLE IF NOT EXISTS art_inventory_items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      description_norm TEXT GENERATED ALWAYS AS (COALESCE(description, '')) STORED,
      initial_qty INTEGER NOT NULL DEFAULT 0,
      current_qty INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (name, description_norm)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS art_inventory_issues (
      id SERIAL PRIMARY KEY,
      item_id INTEGER NOT NULL REFERENCES art_inventory_items(id) ON DELETE CASCADE,
      day DATE NOT NULL DEFAULT CURRENT_DATE,
      entity TEXT,
      qty INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_by VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS art_inventory_items_name_idx ON art_inventory_items (name)`;
  await sql`CREATE INDEX IF NOT EXISTS art_inventory_issues_day_idx ON art_inventory_issues (day)`;
  await sql`CREATE INDEX IF NOT EXISTS art_inventory_issues_item_idx ON art_inventory_issues (item_id)`;
  initDone = true;
}

function clampQty(n: unknown): number {
  const v = typeof n === "number" ? n : parseInt(String(n ?? "0"), 10);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(999999, Math.floor(v)));
}

function rowToItem(r: Record<string, unknown>): ArtInventoryItem {
  return {
    id: Number((r as any).id),
    name: String((r as any).name ?? ""),
    description: (r as any).description != null ? String((r as any).description) : null,
    initialQty: Number((r as any).initial_qty ?? 0) || 0,
    currentQty: Number((r as any).current_qty ?? 0) || 0,
    createdAt: (r as any).created_at != null ? String((r as any).created_at) : undefined,
    updatedAt: (r as any).updated_at != null ? String((r as any).updated_at) : undefined,
  };
}

function rowToIssue(r: Record<string, unknown>): ArtInventoryIssue {
  const day = (r as any).day;
  const dayIso =
    typeof day === "string"
      ? day.slice(0, 10)
      : day instanceof Date
        ? day.toISOString().slice(0, 10)
        : String(day ?? "").slice(0, 10);
  return {
    id: Number((r as any).id),
    itemId: Number((r as any).item_id),
    day: dayIso,
    entity: (r as any).entity != null ? String((r as any).entity) : null,
    qty: Number((r as any).qty ?? 0) || 0,
    notes: (r as any).notes != null ? String((r as any).notes) : null,
    createdBy: (r as any).created_by != null ? String((r as any).created_by) : null,
    createdAt: (r as any).created_at != null ? String((r as any).created_at) : undefined,
  };
}

export async function listArtInventoryItems(): Promise<ArtInventoryItem[]> {
  await ensureArtInventoryTables();
  const { rows } = await sql`
    SELECT *
    FROM art_inventory_items
    ORDER BY name ASC, id ASC
  `;
  return rows.map((r) => rowToItem(r as any));
}

export async function createArtInventoryItem(input: {
  name: string;
  description?: string | null;
  initialQty?: number;
  currentQty?: number;
}): Promise<ArtInventoryItem> {
  await ensureArtInventoryTables();
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("name مطلوب");
  const description = input.description != null ? String(input.description).trim() : null;
  const initialQty = clampQty(input.initialQty);
  const currentQty = clampQty(input.currentQty ?? initialQty);

  const { rows } = await sql`
    INSERT INTO art_inventory_items (name, description, initial_qty, current_qty, updated_at)
    VALUES (${name}, ${description}, ${initialQty}, ${currentQty}, NOW())
    ON CONFLICT (name, description_norm) DO UPDATE
      SET current_qty = EXCLUDED.current_qty,
          initial_qty = GREATEST(art_inventory_items.initial_qty, EXCLUDED.initial_qty),
          updated_at = NOW()
    RETURNING *
  `;
  return rowToItem(rows[0] as any);
}

export async function upsertArtInventoryFromExcelRows(
  rows: { name: string; description?: string | null; qty: number }[],
  updatedByEmail?: string
): Promise<{ upserted: number }> {
  await ensureArtInventoryTables();
  const clean = (rows ?? [])
    .map((r) => ({
      name: String(r?.name ?? "").trim(),
      description: r?.description != null ? String(r.description).trim() : null,
      qty: clampQty(r?.qty),
    }))
    .filter((r) => r.name && Number.isFinite(r.qty));

  if (clean.length === 0) return { upserted: 0 };

  await sql`BEGIN`;
  try {
    let upserted = 0;
    for (const r of clean) {
      const { rowCount } = await sql`
        INSERT INTO art_inventory_items (name, description, initial_qty, current_qty, updated_at)
        VALUES (${r.name}, ${r.description}, ${r.qty}, ${r.qty}, NOW())
        ON CONFLICT (name, description_norm) DO UPDATE
          SET current_qty = EXCLUDED.current_qty,
              initial_qty = GREATEST(art_inventory_items.initial_qty, EXCLUDED.initial_qty),
              updated_at = NOW()
      `;
      if ((rowCount ?? 0) > 0) upserted++;
    }

    await sql`COMMIT`;
    return { upserted };
  } catch (e) {
    await sql`ROLLBACK`;
    throw e;
  }
}

export async function issueArtInventoryItem(input: {
  itemId: number;
  qty: number;
  entity?: string | null;
  notes?: string | null;
  dayIso?: string | null;
  createdByEmail?: string | null;
}): Promise<{ item: ArtInventoryItem; issue: ArtInventoryIssue }> {
  await ensureArtInventoryTables();
  const itemId = Math.max(1, Math.floor(Number(input.itemId || 0)));
  const qty = clampQty(input.qty);
  if (!itemId) throw new Error("itemId مطلوب");
  if (qty <= 0) throw new Error("qty يجب أن يكون أكبر من 0");

  const dayRaw = String(input.dayIso ?? "").trim();
  const dayIso = /^\d{4}-\d{2}-\d{2}$/.test(dayRaw) ? dayRaw : new Date().toISOString().slice(0, 10);
  const entity = input.entity != null ? String(input.entity).trim() : null;
  const notes = input.notes != null ? String(input.notes).trim() : null;
  const createdByEmail = input.createdByEmail != null ? String(input.createdByEmail).trim() : null;

  await sql`BEGIN`;
  try {
    const { rows: itemRows } = await sql`
      SELECT * FROM art_inventory_items WHERE id = ${itemId} LIMIT 1
    `;
    if (itemRows.length === 0) throw new Error("الصنف غير موجود");
    const item = rowToItem(itemRows[0] as any);
    if ((item.currentQty ?? 0) < qty) throw new Error("الكمية غير كافية");

    const { rows: updatedRows } = await sql`
      UPDATE art_inventory_items
      SET current_qty = GREATEST(0, current_qty - ${qty}),
          updated_at = NOW()
      WHERE id = ${itemId}
      RETURNING *
    `;
    const updated = rowToItem(updatedRows[0] as any);

    const { rows: issueRows } = await sql`
      INSERT INTO art_inventory_issues (item_id, day, entity, qty, notes, created_by, created_at)
      VALUES (${itemId}, ${dayIso}::date, ${entity}, ${qty}, ${notes}, ${createdByEmail}, NOW())
      RETURNING *
    `;
    const issue = rowToIssue(issueRows[0] as any);

    await sql`COMMIT`;
    return { item: updated, issue };
  } catch (e) {
    await sql`ROLLBACK`;
    throw e;
  }
}

export async function listArtInventoryIssues(params?: {
  limit?: number;
}): Promise<ArtInventoryIssue[]> {
  await ensureArtInventoryTables();
  const limit = Math.max(1, Math.min(200, Math.floor(Number(params?.limit ?? 50))));
  const { rows } = await sql`
    SELECT *
    FROM art_inventory_issues
    ORDER BY created_at DESC, id DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => rowToIssue(r as any));
}

