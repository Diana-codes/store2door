import Link from "next/link";
import { startOfDay, endOfDay, format } from "date-fns";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UrlDateRange, ClearFiltersButton } from "@/components/app/url-filters";
import { formatFRW } from "@/lib/currency";
import { requireUser } from "@/lib/auth";
import { pickDate } from "@/lib/pagination";
import { loadLedger, type LedgerAccount } from "@/lib/ledger";

type SearchParams = Record<string, string | string[] | undefined>;

const groupMeta = {
  REVENUE: {
    title: "Revenue",
    description: "Money earned",
    sign: "+" as const,
  },
  PURCHASES: {
    title: "Cost of goods (purchases)",
    description: "What was bought to resell",
    sign: "−" as const,
  },
  EXPENSES: {
    title: "Operating expenses",
    description: "Costs of running the business",
    sign: "−" as const,
  },
};

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireUser();
  const sp = await searchParams;
  const from = pickDate(sp, "from");
  const to = pickDate(sp, "to");

  const accounts = await loadLedger({
    from: from ? startOfDay(from) : undefined,
    to: to ? endOfDay(to) : undefined,
  });

  const grouped: Record<LedgerAccount["group"], LedgerAccount[]> = {
    REVENUE: [],
    PURCHASES: [],
    EXPENSES: [],
  };
  for (const a of accounts) grouped[a.group].push(a);

  const totals = {
    REVENUE: grouped.REVENUE.reduce((s, a) => s + a.total, 0),
    PURCHASES: grouped.PURCHASES.reduce((s, a) => s + a.total, 0),
    EXPENSES: grouped.EXPENSES.reduce((s, a) => s + a.total, 0),
  };
  const net = totals.REVENUE - totals.PURCHASES - totals.EXPENSES;

  const periodLabel =
    from || to
      ? `${from ? format(from, "dd MMM yyyy") : "…"} → ${to ? format(to, "dd MMM yyyy") : "…"}`
      : "All time";

  return (
    <div className="space-y-6">
      <PageHeader
        title="General Ledger"
        description={`Accounts grouped by source · ${periodLabel}`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <UrlDateRange />
        <ClearFiltersButton keys={["from", "to"]} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Revenue" amount={totals.REVENUE} tone="positive" />
        <SummaryTile label="Purchases" amount={totals.PURCHASES} />
        <SummaryTile label="Expenses" amount={totals.EXPENSES} />
        <SummaryTile
          label="Net result"
          amount={net}
          tone={net >= 0 ? "positive" : "negative"}
        />
      </div>

      {(["REVENUE", "PURCHASES", "EXPENSES"] as const).map((g) => {
        const list = grouped[g];
        const meta = groupMeta[g];
        const groupTotal = totals[g];
        if (list.length === 0) return null;
        return (
          <Card key={g}>
            <CardHeader className="flex flex-row items-end justify-between">
              <div>
                <CardTitle className="text-base">{meta.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {meta.description}
                </p>
              </div>
              <p
                className={`text-lg font-semibold tabular-nums ${
                  g === "REVENUE" ? "text-primary" : ""
                }`}
              >
                {meta.sign}
                {formatFRW(groupTotal)}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {list.map((a) => (
                  <li key={a.key}>
                    <Link
                      href={a.href}
                      className="flex items-center justify-between gap-3 px-6 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: a.color ?? "#94A3B8",
                          }}
                          aria-hidden
                        />
                        <span className="truncate text-sm font-medium">
                          {a.name}
                        </span>
                        <Badge variant="outline" className="font-normal">
                          {a.count}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-sm font-semibold">
                          {meta.sign}
                          {formatFRW(a.total)}
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      {accounts.every((a) => a.count === 0) && (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No transactions in the selected period.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  amount,
  tone = "default",
}: {
  label: string;
  amount: number;
  tone?: "default" | "positive" | "negative";
}) {
  const tones = {
    default: "",
    positive: "text-primary",
    negative: "text-destructive",
  };
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={`mt-2 text-2xl font-bold tabular-nums tracking-tight ${tones[tone]}`}
        >
          {formatFRW(amount)}
        </p>
      </CardContent>
    </Card>
  );
}
