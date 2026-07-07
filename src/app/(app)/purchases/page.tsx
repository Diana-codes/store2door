import { format, endOfDay, startOfDay } from "date-fns";
import { Plus } from "lucide-react";
import type { Prisma } from "@/generated/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationBar } from "@/components/app/pagination-bar";
import {
  SearchInput,
  UrlSelect,
  UrlDateRange,
  ClearFiltersButton,
} from "@/components/app/url-filters";
import { formatFRW } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  parsePagination,
  pickString,
  pickDate,
  totalPages,
} from "@/lib/pagination";
import { NewPurchaseDialog } from "./new-purchase-dialog";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireUser();
  const sp = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(sp);

  const q = pickString(sp, "q");
  const categoryId = pickString(sp, "category");
  const from = pickDate(sp, "from");
  const to = pickDate(sp, "to");

  const where: Prisma.PurchaseWhereInput = {};
  if (q) {
    where.OR = [
      { supplierName: { contains: q } },
      { description: { contains: q } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = startOfDay(from);
    if (to) where.date.lte = endOfDay(to);
  }

  const [purchases, total, categories, sumAgg] = await Promise.all([
    prisma.purchase.findMany({
      where,
      orderBy: { date: "desc" },
      include: { category: true },
      skip,
      take,
    }),
    prisma.purchase.count({ where }),
    prisma.category.findMany({
      where: { kind: "PURCHASE" },
      orderBy: { name: "asc" },
    }),
    prisma.purchase.aggregate({
      where,
      _sum: { amount: true },
    }),
  ]);

  const totalAmount = sumAgg._sum.amount ?? 0;
  const pages = totalPages(total, pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases"
        description={`${total} purchase${total === 1 ? "" : "s"} matched · ${formatFRW(totalAmount)} total`}
        actions={
          <NewPurchaseDialog
            categories={categories}
            trigger={
              <Button>
                <Plus className="size-4" />
                New purchase
              </Button>
            }
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Search supplier or item…" />
        <UrlSelect
          paramKey="category"
          placeholder="Category"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <UrlDateRange />
        <ClearFiltersButton keys={["q", "category", "from", "to"]} />
      </div>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  No purchases match your filters.
                </TableCell>
              </TableRow>
            ) : (
              purchases.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {format(p.date, "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {p.supplierName}
                  </TableCell>
                  <TableCell className="text-sm">{p.description}</TableCell>
                  <TableCell className="text-sm">
                    {p.category ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${p.category.color ?? "#94A3B8"}20`,
                          color: p.category.color ?? "#64748B",
                        }}
                      >
                        {p.category.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {p.quantity
                      ? `${p.quantity}${p.unit ? " " + p.unit : ""}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatFRW(p.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <PaginationBar
        page={page}
        totalPages={pages}
        total={total}
        pageSize={pageSize}
        baseSearchParams={sp}
        basePath="/purchases"
      />
    </div>
  );
}
