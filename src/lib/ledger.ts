import { prisma } from "./prisma";

export type LedgerAccount = {
  key: string;
  name: string;
  group: "REVENUE" | "PURCHASES" | "EXPENSES";
  count: number;
  total: number;
  href: string;
  color?: string | null;
};

export type LedgerOptions = { from?: Date; to?: Date };

function dateFilter(opts: LedgerOptions) {
  if (!opts.from && !opts.to) return undefined;
  const f: { gte?: Date; lte?: Date } = {};
  if (opts.from) f.gte = opts.from;
  if (opts.to) f.lte = opts.to;
  return f;
}

function qsRange(opts: LedgerOptions) {
  const params = new URLSearchParams();
  if (opts.from) params.set("from", opts.from.toISOString().slice(0, 10));
  if (opts.to) params.set("to", opts.to.toISOString().slice(0, 10));
  return params.toString();
}

export async function loadLedger(
  opts: LedgerOptions,
): Promise<LedgerAccount[]> {
  const range = dateFilter(opts);
  const rangeQs = qsRange(opts);
  const linkRange = rangeQs ? `&${rangeQs}` : "";

  const [salesAgg, purchaseGroups, expenseGroups, purchaseCats, expenseCats] =
    await Promise.all([
      prisma.sale.aggregate({
        where: { status: { not: "CANCELLED" }, ...(range && { date: range }) },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.purchase.groupBy({
        by: ["categoryId"],
        where: range ? { date: range } : {},
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.expense.groupBy({
        by: ["categoryId"],
        where: range ? { date: range } : {},
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.category.findMany({ where: { kind: "PURCHASE" } }),
      prisma.category.findMany({ where: { kind: "EXPENSE" } }),
    ]);

  const purchaseCatById = new Map(purchaseCats.map((c) => [c.id, c]));
  const expenseCatById = new Map(expenseCats.map((c) => [c.id, c]));

  const accounts: LedgerAccount[] = [];

  accounts.push({
    key: "sales",
    name: "Sales Revenue",
    group: "REVENUE",
    count: salesAgg._count._all,
    total: salesAgg._sum.amount ?? 0,
    href: `/sales?${rangeQs}`,
    color: "#2E8B2E",
  });

  for (const g of purchaseGroups) {
    const cat = g.categoryId ? purchaseCatById.get(g.categoryId) : null;
    accounts.push({
      key: `purchase-${g.categoryId ?? "none"}`,
      name: cat ? cat.name : "Uncategorized purchases",
      group: "PURCHASES",
      count: g._count._all,
      total: g._sum.amount ?? 0,
      href: g.categoryId
        ? `/purchases?category=${g.categoryId}${linkRange}`
        : `/purchases?${rangeQs}`,
      color: cat?.color ?? null,
    });
  }

  for (const g of expenseGroups) {
    const cat = g.categoryId ? expenseCatById.get(g.categoryId) : null;
    accounts.push({
      key: `expense-${g.categoryId ?? "none"}`,
      name: cat ? cat.name : "Uncategorized expenses",
      group: "EXPENSES",
      count: g._count._all,
      total: g._sum.amount ?? 0,
      href: g.categoryId
        ? `/expenses?category=${g.categoryId}${linkRange}`
        : `/expenses?${rangeQs}`,
      color: cat?.color ?? null,
    });
  }

  // Sort within each group by total desc.
  accounts.sort((a, b) => {
    if (a.group !== b.group) {
      const order = { REVENUE: 0, PURCHASES: 1, EXPENSES: 2 } as const;
      return order[a.group] - order[b.group];
    }
    return b.total - a.total;
  });

  return accounts;
}
