import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatFRW } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ConfirmActionButton } from "@/components/app/confirm-action-button";
import { SaleDialog } from "../new-sale-dialog";
import { deleteSale } from "../actions";
import { ItemsPanel } from "./items-panel";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  if (!sale) notFound();

  const itemsTotal = sale.items.reduce((s, it) => s + it.subtotal, 0);
  const totalsMatch = itemsTotal === sale.amount;

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/sales" />}
        className="-ml-2"
      >
        <ArrowLeft className="size-3.5" />
        Back to sales
      </Button>

      <PageHeader
        title={sale.invoiceNumber ? `Sale #${sale.invoiceNumber}` : "Sale"}
        description={`${sale.customerName ?? "Manual sale"} · ${format(sale.date, "EEEE d MMMM yyyy, HH:mm")}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge
              variant={
                sale.status === "COMPLETED"
                  ? "default"
                  : sale.status === "CANCELLED"
                    ? "destructive"
                    : "secondary"
              }
            >
              {sale.status}
            </Badge>
            <SaleDialog
              sale={sale}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="text-primary hover:bg-primary/10 hover:text-primary"
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              }
            />
            <ConfirmActionButton
              action={deleteSale.bind(null, sale.id)}
              title="Delete sale?"
              confirmMessage={`Delete this sale of ${formatFRW(sale.amount)} and its ${sale.items.length} line item${sale.items.length === 1 ? "" : "s"}? This cannot be undone.`}
              successMessage="Sale deleted"
              redirectTo="/sales"
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="Delete sale"
            >
              <Trash2 className="size-3.5" />
              Delete
            </ConfirmActionButton>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{sale.customerName ?? "—"}</p>
            {sale.customerEmail && (
              <p className="text-muted-foreground">{sale.customerEmail}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">References</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Order: </span>
              {sale.orderRef ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Invoice: </span>
              {sale.invoiceNumber ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Source: </span>
              {sale.source === "IMPORTED" ? "CSV import" : "Manual entry"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {formatFRW(sale.amount)}
            </p>
            {sale.notes && (
              <p className="mt-2 text-xs text-muted-foreground">
                {sale.notes}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {sale.items.length > 0 && !totalsMatch && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <p>
            Line items total {formatFRW(itemsTotal)}, sale total{" "}
            {formatFRW(sale.amount)}. The difference may come from shipping,
            discount, or items not yet entered.
          </p>
        </div>
      )}

      <ItemsPanel
        saleId={sale.id}
        items={sale.items}
        itemsTotal={itemsTotal}
      />
    </div>
  );
}
