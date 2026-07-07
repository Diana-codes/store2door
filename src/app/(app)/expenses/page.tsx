import { format, endOfDay, startOfDay } from "date-fns";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { ConfirmActionButton } from "@/components/app/confirm-action-button";
import { PAYMENT_METHODS, paymentMethodLabel } from "@/lib/payment-methods";
import { ExpenseDialog } from "./new-expense-dialog";
import { deleteExpense } from "./actions";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireUser();
  const sp = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(sp);

  const q = pickString(sp, "q");
  const categoryId = pickString(sp, "category");
  const paymentMethod = pickString(sp, "method");
  const from = pickDate(sp, "from");
  const to = pickDate(sp, "to");

  const where: Prisma.ExpenseWhereInput = {};
  if (q) {
    where.OR = [
      { description: { contains: q } },
      { reference: { contains: q } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (paymentMethod) where.paymentMethod = paymentMethod;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = startOfDay(from);
    if (to) where.date.lte = endOfDay(to);
  }

  const [expenses, total, categories, sumAgg] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
      include: { category: true },
      skip,
      take,
    }),
    prisma.expense.count({ where }),
    prisma.category.findMany({
      where: { kind: "EXPENSE" },
      orderBy: { name: "asc" },
    }),
    prisma.expense.aggregate({
      where,
      _sum: { amount: true },
    }),
  ]);

  const totalAmount = sumAgg._sum.amount ?? 0;
  const pages = totalPages(total, pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description={`${total} expense${total === 1 ? "" : "s"} matched · ${formatFRW(totalAmount)} total`}
        actions={
          <ExpenseDialog
            categories={categories}
            trigger={
              <Button>
                <Plus className="size-4" />
                New expense
              </Button>
            }
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Search description or reference…" />
        <UrlSelect
          paramKey="category"
          placeholder="Category"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <UrlSelect
          paramKey="method"
          placeholder="Payment"
          options={PAYMENT_METHODS.map((m) => ({
            value: m.value,
            label: m.label,
          }))}
        />
        <UrlDateRange />
        <ClearFiltersButton
          keys={["q", "category", "method", "from", "to"]}
        />
      </div>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-20">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  No expenses match your filters.
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {format(e.date, "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {e.description}
                    {e.reference && (
                      <span className="block text-xs text-muted-foreground">
                        Ref: {e.reference}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.category ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${e.category.color ?? "#94A3B8"}20`,
                          color: e.category.color ?? "#64748B",
                        }}
                      >
                        {e.category.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.paymentMethod ? (
                      <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {paymentMethodLabel(e.paymentMethod)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatFRW(e.amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <ExpenseDialog
                        expense={e}
                        categories={categories}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-primary hover:bg-primary/10 hover:text-primary"
                            aria-label="Edit expense"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        }
                      />
                      <ConfirmActionButton
                        action={deleteExpense.bind(null, e.id)}
                        title="Delete expense?"
                        confirmMessage={`Delete "${e.description}" of ${formatFRW(e.amount)}? This cannot be undone.`}
                        successMessage="Expense deleted"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete expense"
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
        basePath="/expenses"
      />
    </div>
  );
}
