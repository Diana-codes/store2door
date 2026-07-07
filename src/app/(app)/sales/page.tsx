import Link from "next/link";
import { format, endOfDay, startOfDay } from "date-fns";
import { FileUp, Pencil, Plus, Trash2 } from "lucide-react";
import type { Prisma } from "@/generated/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
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
import { ConfirmActionButton } from "@/components/app/confirm-action-button";
import { SaleDialog } from "./new-sale-dialog";
import { deleteSale } from "./actions";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireUser();
  const sp = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(sp);

  const q = pickString(sp, "q");
  const status = pickString(sp, "status");
  const source = pickString(sp, "source");
  const from = pickDate(sp, "from");
  const to = pickDate(sp, "to");

  const where: Prisma.SaleWhereInput = {};
  if (q) {
    where.OR = [
      { customerName: { contains: q } },
      { customerEmail: { contains: q } },
      { invoiceNumber: { contains: q } },
      { orderRef: { contains: q } },
    ];
  }
  if (status) where.status = status;
  if (source) where.source = source;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = startOfDay(from);
    if (to) where.date.lte = endOfDay(to);
  }

  const [sales, total, sumAgg] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take,
    }),
    prisma.sale.count({ where }),
    prisma.sale.aggregate({
      where: { ...where, status: { not: "CANCELLED" } },
      _sum: { amount: true },
    }),
  ]);

  const totalAmount = sumAgg._sum.amount ?? 0;
  const pages = totalPages(total, pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description={`${total} sale${total === 1 ? "" : "s"} matched · ${formatFRW(totalAmount)} total (excludes cancelled)`}
        actions={
          <>
            <Button variant="outline" render={<Link href="/sales/import" />}>
              <FileUp className="size-4" />
              Import CSV
            </Button>
            <SaleDialog
              trigger={
                <Button>
                  <Plus className="size-4" />
                  New sale
                </Button>
              }
            />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Search customer, email, invoice…" />
        <UrlSelect
          paramKey="status"
          placeholder="Status"
          options={[
            { value: "COMPLETED", label: "Completed" },
            { value: "PENDING", label: "Pending" },
            { value: "CANCELLED", label: "Cancelled" },
            { value: "REFUNDED", label: "Refunded" },
          ]}
        />
        <UrlSelect
          paramKey="source"
          placeholder="Source"
          options={[
            { value: "MANUAL", label: "Manual" },
            { value: "IMPORTED", label: "CSV / Imported" },
          ]}
        />
        <UrlDateRange />
        <ClearFiltersButton keys={["q", "status", "source", "from", "to"]} />
      </div>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-20">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-muted-foreground"
                >
                  No sales match your filters.
                </TableCell>
              </TableRow>
            ) : (
              sales.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-muted/40"
                >
                  <TableCell className="whitespace-nowrap text-sm">
                    <Link
                      href={`/sales/${s.id}`}
                      className="block py-0.5"
                    >
                      {format(s.date, "dd MMM yyyy HH:mm")}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/sales/${s.id}`} className="block">
                      <p className="truncate text-sm font-medium">
                        {s.customerName ?? "—"}
                      </p>
                      {s.customerEmail && (
                        <p className="truncate text-xs text-muted-foreground">
                          {s.customerEmail}
                        </p>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    <Link href={`/sales/${s.id}`} className="block">
                      {s.invoiceNumber ? `#${s.invoiceNumber}` : "—"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        s.status === "COMPLETED"
                          ? "default"
                          : s.status === "CANCELLED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {s.source === "IMPORTED" ? "CSV" : "Manual"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    <Link href={`/sales/${s.id}`} className="block">
                      {formatFRW(s.amount)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <SaleDialog
                        sale={s}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-primary hover:bg-primary/10 hover:text-primary"
                            aria-label="Edit sale"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        }
                      />
                      <ConfirmActionButton
                        action={deleteSale.bind(null, s.id)}
                        confirmMessage={`Delete this sale${s.invoiceNumber ? ` (#${s.invoiceNumber})` : ""} of ${formatFRW(s.amount)}? This cannot be undone.`}
                        successMessage="Sale deleted"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete sale"
                      >
                        <Trash2 className="size-3.5" />
                      </ConfirmActionButton>
                    </div>
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
        basePath="/sales"
      />
    </div>
  );
}
