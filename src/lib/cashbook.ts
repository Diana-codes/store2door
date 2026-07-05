import { prisma } from "./prisma";

export type CashbookEntry = {
  id: string;
  date: Date;
  type: "SALE" | "PURCHASE" | "EXPENSE";
  reference: string | null;
  description: string;
  cashIn: number;
  cashOut: number;
  href: string;
};

export type CashbookOptions = {
  from?: Date;
  to?: Date;
  type?: "SALE" | "PURCHASE" | "EXPENSE";
  q?: string;
};

/**
 * Pull all cash movements within a window. Cancelled sales are excluded —
 * no money moved. Returns entries sorted oldest → newest so a running balance
 * can be computed; the page reverses for display.
 */
export async function loadCashbookEntries(
  opts: CashbookOptions,
): Promise<CashbookEntry[]> {
  const dateFilter = opts.from || opts.to ? { date: rangeFilter(opts) } : {};
  const wantSales = !opts.type || opts.type === "SALE";
  const wantPurchases = !opts.type || opts.type === "PURCHASE";
  const wantExpenses = !opts.type || opts.type === "EXPENSE";

  const [sales, purchases, expenses] = await Promise.all([
    wantSales
      ? prisma.sale.findMany({
          where: {
            ...dateFilter,
            status: { not: "CANCELLED" },
            ...(opts.q
              ? {
                  OR: [
                    { customerName: { contains: opts.q } },
                    { customerEmail: { contains: opts.q } },
                    { invoiceNumber: { contains: opts.q } },
                    { orderRef: { contains: opts.q } },
                  ],
                }
              : {}),
          },
          select: {
            id: true,
            date: true,
            amount: true,
            customerName: true,
            invoiceNumber: true,
            orderRef: true,
          },
        })
      : Promise.resolve([]),
    wantPurchases
      ? prisma.purchase.findMany({
          where: {
            ...dateFilter,
            ...(opts.q
              ? {
                  OR: [
                    { supplierName: { contains: opts.q } },
                    { description: { contains: opts.q } },
                  ],
                }
              : {}),
          },
          select: {
            id: true,
            date: true,
            amount: true,
            supplierName: true,
            description: true,
          },
        })
      : Promise.resolve([]),
    wantExpenses
      ? prisma.expense.findMany({
          where: {
            ...dateFilter,
            ...(opts.q
              ? {
                  OR: [
                    { description: { contains: opts.q } },
                    { reference: { contains: opts.q } },
                  ],
                }
              : {}),
          },
          select: {
            id: true,
            date: true,
            amount: true,
            description: true,
            reference: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const entries: CashbookEntry[] = [
    ...sales.map<CashbookEntry>((s) => ({
      id: `sale-${s.id}`,
      date: s.date,
      type: "SALE",
      reference: s.invoiceNumber
        ? `#${s.invoiceNumber}`
        : (s.orderRef ?? null),
      description: s.customerName ?? "Sale",
      cashIn: s.amount,
      cashOut: 0,
      href: "/sales",
    })),
    ...purchases.map<CashbookEntry>((p) => ({
      id: `purchase-${p.id}`,
      date: p.date,
      type: "PURCHASE",
      reference: p.supplierName,
      description: p.description,
      cashIn: 0,
      cashOut: p.amount,
      href: "/purchases",
    })),
    ...expenses.map<CashbookEntry>((e) => ({
      id: `expense-${e.id}`,
      date: e.date,
      type: "EXPENSE",
      reference: e.reference,
      description: e.description,
      cashIn: 0,
      cashOut: e.amount,
      href: "/expenses",
    })),
  ];

  // Oldest first, so running balance accumulates correctly.
  entries.sort((a, b) => a.date.getTime() - b.date.getTime());
  return entries;
}

function rangeFilter(opts: CashbookOptions) {
  const filter: { gte?: Date; lte?: Date } = {};
  if (opts.from) filter.gte = opts.from;
  if (opts.to) filter.lte = opts.to;
  return filter;
}

export function withRunningBalance(entries: CashbookEntry[], opening = 0) {
  let balance = opening;
  return entries.map((e) => {
    balance += e.cashIn - e.cashOut;
    return { ...e, balance };
  });
}
