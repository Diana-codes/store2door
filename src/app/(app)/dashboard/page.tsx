import Link from "next/link";
import {
  ShoppingBag,
  Package,
  Receipt,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatFRW } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { getSummary, todayRange, monthRange } from "@/lib/reports";

export default async function DashboardPage() {
  const [today, month, recentSales, recentExpenses] = await Promise.all([
    getSummary(todayRange()),
    getSummary(monthRange()),
    prisma.sale.findMany({
      orderBy: { date: "desc" },
      take: 5,
    }),
    prisma.expense.findMany({
      orderBy: { date: "desc" },
      take: 5,
      include: { category: true },
    }),
  ]);

  const netTone = today.net >= 0 ? "positive" : "negative";
  const NetIcon = today.net >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Overview for ${format(new Date(), "EEEE, d MMMM yyyy")}`}
        actions={
          <Button render={<Link href="/reports" />}>
            View reports <ArrowRight className="ml-1 size-4" />
          </Button>
        }
      />

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">
          Today
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Sales"
            value={formatFRW(today.sales.total)}
            sub={`${today.sales.count} orders`}
            icon={ShoppingBag}
            tone="brand"
          />
          <StatCard
            label="Purchases"
            value={formatFRW(today.purchases.total)}
            sub={`${today.purchases.count} entries`}
            icon={Package}
          />
          <StatCard
            label="Expenses"
            value={formatFRW(today.expenses.total)}
            sub={`${today.expenses.count} entries`}
            icon={Receipt}
            tone="accent"
          />
          <StatCard
            label="Net"
            value={formatFRW(today.net)}
            sub="Sales − purchases − expenses"
            icon={NetIcon}
            tone={netTone}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">
          This month ({format(new Date(), "MMMM")})
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Sales"
            value={formatFRW(month.sales.total)}
            sub={`${month.sales.count} orders`}
          />
          <StatCard
            label="Purchases"
            value={formatFRW(month.purchases.total)}
          />
          <StatCard
            label="Expenses"
            value={formatFRW(month.expenses.total)}
          />
          <StatCard
            label="Net"
            value={formatFRW(month.net)}
            tone={month.net >= 0 ? "positive" : "negative"}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent sales</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/sales" />}
            >
              All <ArrowRight className="ml-1 size-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <EmptyState
                title="No sales yet"
                cta={{ href: "/sales/import", label: "Import from CSV" }}
              />
            ) : (
              <ul className="divide-y">
                {recentSales.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {s.customerName ?? s.orderRef ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(s.date, "dd MMM yyyy")}
                        {s.invoiceNumber && ` · #${s.invoiceNumber}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatFRW(s.amount)}
                      </p>
                      <Badge
                        variant={
                          s.status === "COMPLETED" ? "default" : "secondary"
                        }
                        className="mt-1 text-[10px]"
                      >
                        {s.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent expenses</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/expenses" />}
            >
              All <ArrowRight className="ml-1 size-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentExpenses.length === 0 ? (
              <EmptyState
                title="No expenses yet"
                cta={{ href: "/expenses", label: "Record one" }}
              />
            ) : (
              <ul className="divide-y">
                {recentExpenses.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {e.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(e.date, "dd MMM yyyy")}
                        {e.category && ` · ${e.category.name}`}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatFRW(e.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function EmptyState({
  title,
  cta,
}: {
  title: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-muted-foreground">{title}</p>
      <Button
        size="sm"
        variant="outline"
        className="mt-3"
        render={<Link href={cta.href} />}
      >
        {cta.label}
      </Button>
    </div>
  );
}
