import Link from "next/link";
import { format, startOfDay, endOfDay } from "date-fns";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { requireUser } from "@/lib/auth";
import {
  parsePagination,
  pickString,
  pickDate,
  totalPages,
} from "@/lib/pagination";
import {
  loadCashbookEntries,
  withRunningBalance,
  type CashbookOptions,
} from "@/lib/cashbook";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CashbookPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireUser();
  const sp = await searchParams;
  const { page, pageSize, skip } = parsePagination(sp);

  const q = pickString(sp, "q");
  const typeRaw = pickString(sp, "type");
  const type =
    typeRaw === "SALE" || typeRaw === "PURCHASE" || typeRaw === "EXPENSE"
      ? typeRaw
      : undefined;
  const from = pickDate(sp, "from");
  const to = pickDate(sp, "to");

  const opts: CashbookOptions = {
    q,
    type,
    from: from ? startOfDay(from) : undefined,
    to: to ? endOfDay(to) : undefined,
  };

  const all = await loadCashbookEntries(opts);
  const withBalance = withRunningBalance(all);

  // Display newest first (we paginate AFTER computing the running balance
  // so the balance is correct relative to the filtered period).
  const newestFirst = [...withBalance].reverse();
  const total = newestFirst.length;
  const pages = totalPages(total, pageSize);
  const pageRows = newestFirst.slice(skip, skip + pageSize);

  const totalIn = all.reduce((s, e) => s + e.cashIn, 0);
  const totalOut = all.reduce((s, e) => s + e.cashOut, 0);
  const net = totalIn - totalOut;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cashbook"
        description={`${total} entr${total === 1 ? "y" : "ies"} · In ${formatFRW(totalIn)} · Out ${formatFRW(totalOut)} · Net ${formatFRW(net)}`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Search description, customer, supplier…" />
        <UrlSelect
          paramKey="type"
          placeholder="Type"
          options={[
            { value: "SALE", label: "Sale (in)" },
            { value: "PURCHASE", label: "Purchase (out)" },
            { value: "EXPENSE", label: "Expense (out)" },
          ]}
        />
        <UrlDateRange />
        <ClearFiltersButton keys={["q", "type", "from", "to"]} />
      </div>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">In</TableHead>
              <TableHead className="text-right">Out</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-muted-foreground"
                >
                  No cashbook entries match your filters.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {format(e.date, "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={e.href}
                      className="inline-flex items-center gap-1 text-xs hover:underline"
                    >
                      <Badge
                        variant={e.type === "SALE" ? "default" : "secondary"}
                        className="gap-1"
                      >
                        {e.type === "SALE" ? (
                          <ArrowDownRight className="size-3" />
                        ) : (
                          <ArrowUpRight className="size-3" />
                        )}
                        {e.type[0] + e.type.slice(1).toLowerCase()}
                      </Badge>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{e.description}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.reference ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-medium text-primary">
                    {e.cashIn ? formatFRW(e.cashIn) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-medium text-destructive">
                    {e.cashOut ? `−${formatFRW(e.cashOut)}` : "—"}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums text-sm font-semibold ${
                      e.balance < 0 ? "text-destructive" : ""
                    }`}
                  >
                    {formatFRW(e.balance)}
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
        basePath="/cashbook"
      />

      <p className="px-1 text-xs text-muted-foreground">
        Balance is computed within the filtered period — change the date range
        to shift the opening balance.
      </p>
    </div>
  );
}
