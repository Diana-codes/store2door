import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ImportForm } from "./import-form";

export default function ImportSalesPage() {
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
                (required) — integer FRW, "FRW 17,000" is fine
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
