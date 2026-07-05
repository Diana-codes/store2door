import { format } from "date-fns";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatFRW } from "@/lib/currency";
import {
  getSummary,
  monthRange,
  lastNDays,
  getDailySeries,
  getTopSellingItems,
  getTopExpenses,
} from "@/lib/reports";
import { TrendingUp, TrendingDown, ShoppingBag, Receipt } from "lucide-react";
import { ReportChart } from "./report-chart";

export default async function ReportsPage() {
  const thisMonth = monthRange();
  const last30 = lastNDays(30);

  const [monthSummary, last30Summary, series, topSelling, topExpenses] =
    await Promise.all([
      getSummary(thisMonth),
      getSummary(last30),
      getDailySeries(30),
      getTopSellingItems(last30, 5),
      getTopExpenses(last30, 5),
    ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports"
        description="Profit & loss overview — sales minus purchases and expenses."
      />

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">
          This month ({format(new Date(), "MMMM yyyy")})
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Revenue"
            value={formatFRW(monthSummary.sales.total)}
            sub={`${monthSummary.sales.count} sales`}
            tone="brand"
          />
          <StatCard
            label="Cost of goods"
            value={formatFRW(monthSummary.purchases.total)}
          />
          <StatCard
            label="Expenses"
            value={formatFRW(monthSummary.expenses.total)}
            tone="accent"
          />
          <StatCard
            label="Net profit"
            value={formatFRW(monthSummary.net)}
            icon={monthSummary.net >= 0 ? TrendingUp : TrendingDown}
            tone={monthSummary.net >= 0 ? "positive" : "negative"}
          />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 30 days</CardTitle>
          <p className="text-xs text-muted-foreground">
            Daily revenue, purchases and expenses · Net:{" "}
            <span
              className={
                last30Summary.net >= 0 ? "text-primary" : "text-destructive"
              }
            >
              {formatFRW(last30Summary.net)}
            </span>
          </p>
        </CardHeader>
        <CardContent>
          <ReportChart data={series} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Top selling items (last 30 days)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Best-sellers by revenue, computed from sale line items.
              </p>
            </div>
            <ShoppingBag className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0">
            {topSelling.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                No sale line items recorded in the last 30 days. Open a sale to
                add its products.
              </p>
            ) : (
              <ol className="divide-y">
                {topSelling.map((item, i) => (
                  <li
                    key={item.productName}
                    className="flex items-center justify-between gap-4 px-6 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary tabular-nums">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.unitsSold} sold · {item.ordersCount} order
                          {item.ordersCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <span className="tabular-nums text-sm font-semibold">
                      {formatFRW(item.totalRevenue)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Top expenses (last 30 days)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Where money is going, grouped by category.
              </p>
            </div>
            <Receipt className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0">
            {topExpenses.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                No expenses recorded in the last 30 days.
              </p>
            ) : (
              <ol className="divide-y">
                {topExpenses.map((e, i) => (
                  <li
                    key={e.categoryName}
                    className="flex items-center justify-between gap-4 px-6 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground tabular-nums">
                        {i + 1}
                      </span>
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: e.color ?? "#94A3B8" }}
                          aria-hidden
                        />
                        <p className="truncate text-sm font-medium">
                          {e.categoryName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-normal">
                        {e.count}×
                      </Badge>
                      <span className="tabular-nums text-sm font-semibold">
                        {formatFRW(e.total)}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
