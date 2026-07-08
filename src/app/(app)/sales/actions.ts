"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const createSchema = z.object({
  customerName: z.string().optional(),
  customerEmail: z.email().optional().or(z.literal("")),
  orderRef: z.string().optional(),
  invoiceNumber: z.string().optional(),
  amount: z.coerce.number().int().nonnegative(),
  status: z.enum(["COMPLETED", "PENDING", "CANCELLED", "REFUNDED"]),
  date: z.coerce.date(),
  notes: z.string().optional(),
});

export async function createSale(formData: FormData) {
  const user = await requireUser();
  const parsed = createSchema.safeParse({
    customerName: formData.get("customerName") || undefined,
    customerEmail: formData.get("customerEmail") || undefined,
    orderRef: formData.get("orderRef") || undefined,
    invoiceNumber: formData.get("invoiceNumber") || undefined,
    amount: formData.get("amount"),
    status: formData.get("status"),
    date: formData.get("date"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const d = parsed.data;
  try {
    await prisma.sale.create({
      data: {
        customerName: d.customerName || null,
        customerEmail: d.customerEmail ? d.customerEmail : null,
        orderRef: d.orderRef || null,
        invoiceNumber: d.invoiceNumber || null,
        amount: d.amount,
        status: d.status,
        date: d.date,
        notes: d.notes || null,
        source: "MANUAL",
        createdById: user.id,
      },
    });
  } catch (e) {
    if (
      e instanceof Error &&
      "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      return {
        error: `Invoice number ${d.invoiceNumber} already exists. Use a different one or leave it blank.`,
      };
    }
    throw e;
  }
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateSale(id: string, formData: FormData) {
  await requireUser();
  const parsed = createSchema.safeParse({
    customerName: formData.get("customerName") || undefined,
    customerEmail: formData.get("customerEmail") || undefined,
    orderRef: formData.get("orderRef") || undefined,
    invoiceNumber: formData.get("invoiceNumber") || undefined,
    amount: formData.get("amount"),
    status: formData.get("status"),
    date: formData.get("date"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const d = parsed.data;
  try {
    await prisma.sale.update({
      where: { id },
      data: {
        customerName: d.customerName || null,
        customerEmail: d.customerEmail ? d.customerEmail : null,
        orderRef: d.orderRef || null,
        invoiceNumber: d.invoiceNumber || null,
        amount: d.amount,
        status: d.status,
        date: d.date,
        notes: d.notes || null,
      },
    });
  } catch (e) {
    const code =
      e instanceof Error && "code" in e
        ? (e as { code?: string }).code
        : undefined;
    if (code === "P2002") {
      return {
        error: `Invoice number ${d.invoiceNumber} already exists on another sale.`,
      };
    }
    if (code === "P2025") {
      return { error: "This sale no longer exists." };
    }
    throw e;
  }
  revalidatePath("/sales");
  revalidatePath(`/sales/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { ok: true };
}

export async function deleteSale(id: string) {
  await requireUser();
  try {
    await prisma.sale.delete({ where: { id } });
  } catch (e) {
    if (
      e instanceof Error &&
      "code" in e &&
      (e as { code?: string }).code === "P2025"
    ) {
      return { error: "This sale no longer exists." };
    }
    throw e;
  }
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { ok: true };
}

// Removes every sale created or overwritten by a CSV import, plus the import
// record itself. Sale items on those sales cascade-delete.
export async function undoImport(importId: string) {
  await requireUser();
  const existing = await prisma.csvImport.findUnique({
    where: { id: importId },
  });
  if (!existing) return { error: "This import no longer exists." };

  const [deleted] = await prisma.$transaction([
    prisma.sale.deleteMany({ where: { importId } }),
    prisma.csvImport.delete({ where: { id: importId } }),
  ]);

  revalidatePath("/sales");
  revalidatePath("/sales/import");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { ok: true, deleted: deleted.count };
}

// CSV import. Accepts flexible column headers — matches common exports,
// including the Store2door storefront's own naming (Order Number, Invoice
// Date, Payment Method, Total price, Customer Notes...).
// Recognised headers (case-insensitive, punctuation-stripped):
//   order / order_id / order_ref / order_number     → orderRef
//   customer / customer_name / name                 → customerName
//   email / customer_email                          → customerEmail
//   invoice / invoice_number / invoice_no            → invoiceNumber
//   date / order_date / invoice_date                 → date (order_date preferred)
//   status / order_status                            → status
//   total / amount / total_price / grand_total /
//     total_amount                                   → amount (required)
//   notes / customer_notes                            → notes
//   payment_method / payment                          → paymentMethod (stored in notes)
const importSchema = z.object({
  csv: z.string().min(1),
  filename: z.string().default("import.csv"),
});

type ParsedRow = {
  orderRef?: string;
  customerName?: string;
  customerEmail?: string;
  invoiceNumber?: string;
  date?: string;
  status?: string;
  amount?: string;
  notes?: string;
  paymentMethod?: string;
};

// Lower priority number wins when two aliases for the same field are both
// present (e.g. prefer the order date over the invoice/billing date).
const headerMap: Record<string, { field: keyof ParsedRow; priority: number }> = {
  order: { field: "orderRef", priority: 1 },
  order_id: { field: "orderRef", priority: 1 },
  order_ref: { field: "orderRef", priority: 1 },
  order_number: { field: "orderRef", priority: 1 },
  customer: { field: "customerName", priority: 1 },
  customer_name: { field: "customerName", priority: 1 },
  name: { field: "customerName", priority: 2 },
  email: { field: "customerEmail", priority: 1 },
  customer_email: { field: "customerEmail", priority: 1 },
  invoice: { field: "invoiceNumber", priority: 1 },
  invoice_number: { field: "invoiceNumber", priority: 1 },
  invoice_no: { field: "invoiceNumber", priority: 1 },
  date: { field: "date", priority: 1 },
  order_date: { field: "date", priority: 1 },
  invoice_date: { field: "date", priority: 2 },
  status: { field: "status", priority: 1 },
  order_status: { field: "status", priority: 2 },
  total: { field: "amount", priority: 1 },
  amount: { field: "amount", priority: 1 },
  total_price: { field: "amount", priority: 1 },
  grand_total: { field: "amount", priority: 1 },
  total_amount: { field: "amount", priority: 1 },
  notes: { field: "notes", priority: 1 },
  customer_notes: { field: "notes", priority: 1 },
  payment_method: { field: "paymentMethod", priority: 1 },
  payment: { field: "paymentMethod", priority: 2 },
};

// Strips punctuation like "#" or "()" so headers such as "Invoice #" or
// "Total Price (RWF)" still match, and collapses whitespace to underscores.
function normalizeHeader(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

function parseCsv(text: string): string[][] {
  // Minimal CSV parser that handles quoted fields and escaped quotes.
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function parseAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  // Try dd-MM-yyyy / dd/MM/yyyy first: JS Date would otherwise parse
  // "03/04/2025" as US-style April 3rd. ISO and other formats fall through.
  const dmY = raw.match(
    /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (dmY) {
    const [, d, m, y, hh = "0", mm = "0", ss = "0"] = dmY;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    return new Date(
      year,
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      Number(ss),
    );
  }
  const fallback = new Date(raw);
  if (!Number.isNaN(fallback.getTime())) return fallback;
  return null;
}

// Detects a non-CSV file chosen by mistake. Browsers happily read PDFs,
// spreadsheets, and other binary files as "text" (mangling every non-ASCII
// byte into replacement characters), so without this check the user would
// just see a confusing "couldn't find an amount column" error.
function detectNonCsv(text: string): string | null {
  const head = text.slice(0, 2000);
  if (head.startsWith("%PDF-")) {
    return "This looks like a PDF file, not a CSV. Please upload the .csv export from your orders page \u2014 a PDF invoice can't be read as spreadsheet rows.";
  }
  if (head.startsWith("PK")) {
    return "This looks like an Excel (.xlsx) or Word file, not a CSV. In Excel, use File \u2192 Save As \u2192 CSV (Comma delimited), then upload that file.";
  }
  const controlCharCount = (head.match(/[\x00-\x08\x0e-\x1f\uFFFD]/g) ?? [])
    .length;
  if (controlCharCount > 5) {
    return "This doesn't look like a text CSV file. Please upload a .csv export from your orders page.";
  }
  return null;
}

export async function importSalesCsv(input: z.infer<typeof importSchema>) {
  const user = await requireUser();
  const { csv, filename } = importSchema.parse(input);

  const nonCsvError = detectNonCsv(csv);
  if (nonCsvError) return { error: nonCsvError };

  // Strip a leading UTF-8 BOM — Excel's "CSV UTF-8" export adds one, and it
  // would otherwise survive trim() and break matching on the first header.
  const rows = parseCsv(csv.replace(/^\uFEFF/, ""));
  if (rows.length < 2) {
    return { error: "CSV is empty or missing a header row." };
  }
  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map(normalizeHeader);

  const columnIndex: Partial<Record<keyof ParsedRow, number>> = {};
  const columnPriority: Partial<Record<keyof ParsedRow, number>> = {};
  headers.forEach((h, i) => {
    const match = headerMap[h];
    if (!match) return;
    const { field, priority } = match;
    const currentPriority = columnPriority[field];
    if (currentPriority === undefined || priority < currentPriority) {
      columnIndex[field] = i;
      columnPriority[field] = priority;
    }
  });

  if (columnIndex.amount === undefined) {
    return {
      error:
        "Couldn't find an amount column. Expected a header like 'Total', 'Amount', or 'Total price'.",
    };
  }

  const importRecord = await prisma.csvImport.create({
    data: {
      filename,
      rowCount: dataRows.length,
      successful: 0,
      failed: 0,
      createdById: user.id,
    },
  });

  let successful = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const get = (key: keyof ParsedRow) => {
      const idx = columnIndex[key];
      return idx === undefined ? undefined : row[idx]?.trim();
    };

    const amount = parseAmount(get("amount"));
    const date = parseDate(get("date")) ?? new Date();
    const statusRaw = get("status")?.toUpperCase();
    const status =
      statusRaw && ["COMPLETED", "PENDING", "CANCELLED", "REFUNDED"].includes(statusRaw)
        ? statusRaw
        : "COMPLETED";

    if (amount === null || amount < 0) {
      failed++;
      if (errors.length < 5) errors.push(`Row ${i + 2}: invalid amount`);
      continue;
    }

    const invoiceNumber = get("invoiceNumber") || null;

    // Sale has no dedicated payment-method column, so fold it into notes
    // rather than lose it.
    const paymentMethod = get("paymentMethod");
    const notes =
      [get("notes"), paymentMethod && `Payment: ${paymentMethod}`]
        .filter(Boolean)
        .join(" · ") || null;

    try {
      if (invoiceNumber) {
        await prisma.sale.upsert({
          where: { invoiceNumber },
          update: {
            customerName: get("customerName") || null,
            customerEmail: get("customerEmail") || null,
            orderRef: get("orderRef") || null,
            amount,
            status,
            date,
            notes,
            source: "IMPORTED",
            importId: importRecord.id,
          },
          create: {
            invoiceNumber,
            customerName: get("customerName") || null,
            customerEmail: get("customerEmail") || null,
            orderRef: get("orderRef") || null,
            amount,
            status,
            date,
            notes,
            source: "IMPORTED",
            createdById: user.id,
            importId: importRecord.id,
          },
        });
      } else {
        await prisma.sale.create({
          data: {
            customerName: get("customerName") || null,
            customerEmail: get("customerEmail") || null,
            orderRef: get("orderRef") || null,
            amount,
            status,
            date,
            notes,
            source: "IMPORTED",
            createdById: user.id,
            importId: importRecord.id,
          },
        });
      }
      successful++;
    } catch (e) {
      failed++;
      if (errors.length < 5)
        errors.push(`Row ${i + 2}: ${(e as Error).message}`);
    }
  }

  await prisma.csvImport.update({
    where: { id: importRecord.id },
    data: { successful, failed },
  });

  revalidatePath("/sales");
  revalidatePath("/dashboard");

  return { ok: true, successful, failed, errors };
}
