import { format } from "date-fns";
import { Undo2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmActionButton } from "@/components/app/confirm-action-button";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { undoImport } from "../actions";
import { ImportForm } from "./import-form";

export default async function ImportSalesPage() {
  await requireUser();
  const recentImports = await prisma.csvImport.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { _count: { select: { sales: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import sales from CSV"
        description="Upload a CSV exported from the Store2door admin. Rows with an invoice number are de-duplicated on re-import."
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardContent className="p-6">
            <ImportForm />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-sm space-y-3">
            <h3 className="font-semibold">Expected columns</h3>
            <p className="text-muted-foreground">
              Column headers are matched case-insensitively. Any of the
              following names work:
            </p>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                  order
                </code>{" "}
                / <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">order_id</code>
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                  customer_name
                </code>{" "}
                ·{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                  email
                </code>
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                  invoice_number
                </code>
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">date</code>{" "}
                — ISO, <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">dd-MM-yyyy</code>, or similar
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">status</code>{" "}
                — Completed / Pending / Cancelled / Refunded
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">total</code>{" "}
                / <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">amount</code>{" "}
                (required) — integer FRW, &ldquo;FRW 17,000&rdquo; is fine
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden py-0">
        <CardHeader className="px-6 pt-6">
          <CardTitle className="text-base">Recent imports</CardTitle>
          <p className="text-xs text-muted-foreground">
            Undo removes every sale that import created or overwrote — use it
            when a wrong file was uploaded.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {recentImports.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No imports yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="text-right">Imported</TableHead>
                  <TableHead className="text-right">Skipped</TableHead>
                  <TableHead className="text-right">Linked sales</TableHead>
                  <TableHead className="w-24">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentImports.map((imp) => (
                  <TableRow key={imp.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(imp.createdAt, "dd MMM yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {imp.filename}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {imp.successful}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {imp.failed || "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {imp._count.sales}
                    </TableCell>
                    <TableCell className="text-right">
                      <ConfirmActionButton
                        action={undoImport.bind(null, imp.id)}
                        confirmMessage={`Undo the import of "${imp.filename}"? This deletes the ${imp._count.sales} sale${imp._count.sales === 1 ? "" : "s"} linked to it. This cannot be undone.`}
                        successMessage="Import undone"
                        variant="outline"
                        size="sm"
                        aria-label={`Undo import of ${imp.filename}`}
                      >
                        <Undo2 className="size-3.5" />
                        Undo
                      </ConfirmActionButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
