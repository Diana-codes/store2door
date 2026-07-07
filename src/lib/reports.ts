import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays } from "date-fns";
import { prisma } from "./prisma";

export type Range = { from: Date; to: Date };

export function todayRange(): Range {
  const now = new Date();
  return { from: startOfDay(now), to: endOfDay(now) };
}

export function monthRange(date = new Date()): Range {
  return { from: startOfMonth(date), to: endOfMonth(date) };
}

export function lastNDays(n: number): Range {
  const now = new Date();
  return { from: startOfDay(subDays(now, n - 1)), to: endOfDay(now) };
}

async function sumSales({ from, to }: Range) {
  const result = await prisma.sale.aggregate({
    where: { date: { gte: from, lte: to }, status: { not: "CANCELLED" } },
    _sum: { amount: true },
    _count: { _all: true },
  });
  return { total: result._sum.amount ?? 0, count: result._count._all };
}

async function sumPurchases({ from, to }: Range) {
  const result = await prisma.purchase.aggregate({
    where: { date: { gte: from, lte: to } },
    _sum: { amount: true },
    _count: { _all: true },
  });
  return { total: result._sum.amount ?? 0, count: result._count._all };
}

async function sumExpenses({ from, to }: Range) {
  const result = await prisma.expense.aggregate({
    where: { date: { gte: from, lte: to } },
    _sum: { amount: true },
    _count: { _all: true },
  });
  return { total: result._sum.amount ?? 0, count: result._count._all };
}

export async function getSummary(range: Range) {
  const [sales, purchases, expenses] = await Promise.all([
    sumSales(range),
    sumPurchases(range),
    sumExpenses(range),
  ]);
  const net = sales.total - purchases.total - expenses.total;
  return { sales, purchases, expenses, net };
}

export async function getDailySeries(days: number) {
  const to = endOfDay(new Date());
  const from = startOfDay(subDays(new Date(), days - 1));

  const [sales, purchases, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: { date: { gte: from, lte: to }, status: { not: "CANCELLED" } },
      select: { date: true, amount: true },
    }),
    prisma.purchase.findMany({
      where: { date: { gte: from, lte: to } },
      select: { date: true, amount: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: from, lte: to } },
      select: { date: true, amount: true },
    }),
  ]);

  const buckets = new Map<
    string,
    { date: string; sales: number; purchases: number; expenses: number; net: number }
  >();
  // format() keys by local calendar day — toISOString would shift days for
  // timezones ahead of UTC (Rwanda is UTC+2), mislabelling the chart.
  const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

  for (let i = 0; i < days; i++) {
    const key = dayKey(subDays(new Date(), days - 1 - i));
    buckets.set(key, { date: key, sales: 0, purchases: 0, expenses: 0, net: 0 });
  }

  for (const s of sales) {
    const bucket = buckets.get(dayKey(s.date));
    if (bucket) bucket.sales += s.amount;
  }
  for (const p of purchases) {
    const bucket = buckets.get(dayKey(p.date));
    if (bucket) bucket.purchases += p.amount;
  }
  for (const e of expenses) {
    const bucket = buckets.get(dayKey(e.date));
    if (bucket) bucket.expenses += e.amount;
  }

  for (const b of buckets.values()) {
    b.net = b.sales - b.purchases - b.expenses;
  }
  return Array.from(buckets.values());
}

export type TopPurchasedItem = {
  description: string;
  count: number;
  totalAmount: number;
  totalQuantity: number | null;
  unit: string | null;
};

/**
 * Top items by spend in the given window. Grouped by description (case-
 * sensitive). When all entries for a description share the same unit, we
 * surface a combined quantity; otherwise quantity is left null.
 */
export async function getTopPurchasedItems(
  range: Range,
  limit = 10,
): Promise<TopPurchasedItem[]> {
  const grouped = await prisma.purchase.groupBy({
    by: ["description", "unit"],
    where: { date: { gte: range.from, lte: range.to } },
    _sum: { amount: true, quantity: true },
    _count: { _all: true },
  });

  const byDescription = new Map<string, TopPurchasedItem>();
  for (const g of grouped) {
    const desc = g.description;
    const existing = byDescription.get(desc);
    if (!existing) {
      byDescription.set(desc, {
        description: desc,
        count: g._count._all,
        totalAmount: g._sum.amount ?? 0,
        totalQuantity: g._sum.quantity,
        unit: g.unit,
      });
    } else {
      existing.count += g._count._all;
      existing.totalAmount += g._sum.amount ?? 0;
      // Mixed units → can't sum a meaningful quantity.
      if (existing.unit && existing.unit !== g.unit) {
        existing.unit = null;
        existing.totalQuantity = null;
      } else if (g._sum.quantity !== null) {
        existing.totalQuantity =
          (existing.totalQuantity ?? 0) + (g._sum.quantity ?? 0);
      }
    }
  }

  return Array.from(byDescription.values())
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit);
}

export type TopSellingItem = {
  productName: string;
  ordersCount: number;
  unitsSold: number;
  totalRevenue: number;
};

/**
 * Top-selling products by revenue, computed from SaleItem rows. Cancelled
 * sales are excluded since their items did not generate revenue.
 */
export async function getTopSellingItems(
  range: Range,
  limit = 5,
): Promise<TopSellingItem[]> {
  const items = await prisma.saleItem.findMany({
    where: {
      sale: {
        date: { gte: range.from, lte: range.to },
        status: { not: "CANCELLED" },
      },
    },
    select: {
      productName: true,
      quantity: true,
      subtotal: true,
      saleId: true,
    },
  });

  const byProduct = new Map<
    string,
    { productName: string; orderIds: Set<string>; units: number; revenue: number }
  >();
  for (const it of items) {
    const key = it.productName.trim();
    if (!key) continue;
    const entry =
      byProduct.get(key) ??
      { productName: key, orderIds: new Set<string>(), units: 0, revenue: 0 };
    entry.orderIds.add(it.saleId);
    entry.units += it.quantity;
    entry.revenue += it.subtotal;
    byProduct.set(key, entry);
  }

  return Array.from(byProduct.values())
    .map((e) => ({
      productName: e.productName,
      ordersCount: e.orderIds.size,
      unitsSold: e.units,
      totalRevenue: e.revenue,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
}

export type TopExpense = {
  categoryName: string;
  count: number;
  total: number;
  color: string | null;
};

/**
 * Top expense categories by spend in the given window. Uncategorized
 * expenses are surfaced as "Uncategorized".
 */
export async function getTopExpenses(
  range: Range,
  limit = 5,
): Promise<TopExpense[]> {
  const [grouped, categories] = await Promise.all([
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { date: { gte: range.from, lte: range.to } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.category.findMany({ where: { kind: "EXPENSE" } }),
  ]);
  const catById = new Map(categories.map((c) => [c.id, c]));

  return grouped
    .map((g) => {
      const cat = g.categoryId ? catById.get(g.categoryId) : null;
      return {
        categoryName: cat ? cat.name : "Uncategorized",
        count: g._count._all,
        total: g._sum.amount ?? 0,
        color: cat?.color ?? null,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
