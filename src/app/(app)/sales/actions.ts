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

export async function deleteSale(id: string) {
  await requireUser();
  await prisma.sale.delete({ where: { id } });
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { ok: true };
}

// CSV import. Accepts flexible column headers — matches common exports.
// Recognised headers (case-insensitive, trimmed):
//   order / order_id / order_ref  → orderRef
//   customer / customer_name / name → customerName
//   email / customer_email         → customerEmail
//   invoice / invoice_number       → invoiceNumber
//   date                           → date
//   status                         → status
//   total / amount                 → amount
const importSchema = z.object({
  csv: z.string().min(1),
  filename: z.string().default("import.csv"),
});

const headerMap: Record<string, keyof ParsedRow> = {
  order: "orderRef",
  order_id: "orderRef",
  order_ref: "orderRef",
  customer: "customerName",
  customer_name: "customerName",
  name: "customerName",
  email: "customerEmail",
  customer_email: "customerEmail",
  invoice: "invoiceNumber",
  invoice_number: "invoiceNumber",
  invoice_no: "invoiceNumber",
  date: "date",
  status: "status",
  total: "amount",
  amount: "amount",
};

type ParsedRow = {
  orderRef?: string;
  customerName?: string;
  customerEmail?: string;
  invoiceNumber?: string;
  date?: string;
  status?: string;
  amount?: string;
};

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

export async function importSalesCsv(input: z.infer<typeof importSchema>) {
  const user = await requireUser();
  const { csv, filename } = importSchema.parse(input);

  const rows = parseCsv(csv);
  if (rows.length < 2) {
    return { error: "CSV is empty or missing a header row." };
  }
  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((h) =>
    h.trim().toLowerCase().replace(/\s+/g, "_"),
  );

  const columnIndex: Partial<Record<keyof ParsedRow, number>> = {};
  headers.forEach((h, i) => {
    const key = headerMap[h];
    if (key && columnIndex[key] === undefined) columnIndex[key] = i;
  });

  if (columnIndex.amount === undefined) {
    return {
      error:
        "Couldn't find an amount/total column. Expected a 'Total' or 'Amount' header.",
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
