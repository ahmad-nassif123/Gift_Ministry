import { sql } from "@vercel/postgres";
import { isProductsDbConfigured } from "@/lib/products-db";

let ensured = false;

export type AdminPricingInvoiceLineSnapshot = {
  sku: string;
  name: string;
  qty: number;
  unitPriceText: string;
  lineValueText: string;
  custom?: boolean;
};

export type AdminPricingInvoiceRow = {
  id: number;
  createdAt: string;
  invoiceNo: string;
  documentDateIso: string | null;
  toSir: string;
  statement: string;
  currency: string;
  usdRate: string | null;
  grandTotalText: string;
  grandNumeric: number;
  lines: AdminPricingInvoiceLineSnapshot[];
};

export async function ensureAdminPricingInvoicesTable(): Promise<void> {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS admin_pricing_invoices (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      invoice_no VARCHAR(160) NOT NULL,
      document_date_iso VARCHAR(32),
      to_sir TEXT NOT NULL DEFAULT '',
      statement TEXT NOT NULL DEFAULT '',
      currency VARCHAR(8) NOT NULL,
      usd_rate TEXT,
      grand_total_text VARCHAR(512) NOT NULL DEFAULT '',
      grand_numeric NUMERIC(18, 4),
      lines_json JSONB NOT NULL DEFAULT '[]'
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS admin_pricing_invoices_created_idx ON admin_pricing_invoices (created_at DESC)`;
  ensured = true;
}

function rowToInvoice(r: Record<string, unknown>): AdminPricingInvoiceRow {
  const linesRaw = r.lines_json;
  let lines: AdminPricingInvoiceLineSnapshot[] = [];
  if (Array.isArray(linesRaw)) {
    lines = linesRaw as AdminPricingInvoiceLineSnapshot[];
  } else if (typeof linesRaw === "string") {
    try {
      const p = JSON.parse(linesRaw);
      lines = Array.isArray(p) ? p : [];
    } catch {
      lines = [];
    }
  }
  return {
    id: Number(r.id),
    createdAt: r.created_at != null ? String(r.created_at) : "",
    invoiceNo: String(r.invoice_no ?? ""),
    documentDateIso: r.document_date_iso != null ? String(r.document_date_iso) : null,
    toSir: String(r.to_sir ?? ""),
    statement: String(r.statement ?? ""),
    currency: String(r.currency ?? ""),
    usdRate: r.usd_rate != null ? String(r.usd_rate) : null,
    grandTotalText: String(r.grand_total_text ?? ""),
    grandNumeric: Number(r.grand_numeric ?? 0),
    lines,
  };
}

export async function insertAdminPricingInvoice(input: {
  invoiceNo: string;
  documentDateIso: string | null;
  toSir: string;
  statement: string;
  currency: string;
  usdRate: string | null;
  grandTotalText: string;
  grandNumeric: number;
  lines: AdminPricingInvoiceLineSnapshot[];
}): Promise<AdminPricingInvoiceRow | null> {
  if (!isProductsDbConfigured()) return null;
  await ensureAdminPricingInvoicesTable();
  const linesJson = JSON.stringify(input.lines);
  const { rows } = await sql`
    INSERT INTO admin_pricing_invoices (
      invoice_no, document_date_iso, to_sir, statement, currency, usd_rate, grand_total_text, grand_numeric, lines_json
    )
    VALUES (
      ${input.invoiceNo},
      ${input.documentDateIso},
      ${input.toSir},
      ${input.statement},
      ${input.currency},
      ${input.usdRate},
      ${input.grandTotalText},
      ${input.grandNumeric},
      ${linesJson}::jsonb
    )
    RETURNING *
  `;
  const r = rows[0] as Record<string, unknown> | undefined;
  return r ? rowToInvoice(r) : null;
}

export async function listAdminPricingInvoices(limit = 80): Promise<AdminPricingInvoiceRow[]> {
  if (!isProductsDbConfigured()) return [];
  await ensureAdminPricingInvoicesTable();
  const lim = Math.min(200, Math.max(1, Math.floor(limit)));
  const { rows } = await sql`
    SELECT * FROM admin_pricing_invoices
    ORDER BY created_at DESC
    LIMIT ${lim}
  `;
  return rows.map((r) => rowToInvoice(r as Record<string, unknown>));
}
