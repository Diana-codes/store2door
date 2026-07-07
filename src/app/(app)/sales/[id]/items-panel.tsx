"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { formatFRW } from "@/lib/currency";
import { ConfirmActionButton } from "@/components/app/confirm-action-button";
import { addSaleItem, deleteSaleItem } from "./actions";

type Item = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export function ItemsPanel({
  saleId,
  items,
  itemsTotal,
}: {
  saleId: string;
  items: Item[];
  itemsTotal: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const previewSubtotal =
    Number(quantity) > 0 && Number(unitPrice) >= 0
      ? Math.round(Number(quantity) * Number(unitPrice))
      : null;

  function reset() {
    setProductName("");
    setQuantity("");
    setUnitPrice("");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Line items ({items.length})
          </CardTitle>
          {items.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Items total{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatFRW(itemsTotal)}
              </span>
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-0">
        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-20 text-center text-sm text-muted-foreground"
                  >
                    No line items yet. Add one below.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm font-medium">
                      {item.productName}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatFRW(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      {formatFRW(item.subtotal)}
                    </TableCell>
                    <TableCell>
                      <ConfirmActionButton
                        action={() => deleteSaleItem(item.id, saleId)}
                        title="Remove line item?"
                        confirmMessage={`Remove "${item.productName}" (${formatFRW(item.subtotal)}) from this sale?`}
                        successMessage="Item removed"
                        confirmLabel="Remove"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remove ${item.productName}`}
                      >
                        <Trash2 className="size-3.5" />
                      </ConfirmActionButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <form
          className="border-t bg-muted/30 px-6 py-5"
          action={(formData) => {
            startTransition(async () => {
              formData.set("saleId", saleId);
              const res = await addSaleItem(formData);
              if (res?.error) {
                toast.error(res.error);
                return;
              }
              toast.success("Item added");
              reset();
              router.refresh();
            });
          }}
        >
          <p className="mb-3 text-sm font-medium">Add a line item</p>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor="productName">Product</Label>
              <Input
                id="productName"
                name="productName"
                placeholder="e.g. Tomatoes 1kg"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="quantity">Qty</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="0.01"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="unitPrice">Unit price (FRW)</Label>
              <Input
                id="unitPrice"
                name="unitPrice"
                type="number"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={pending}>
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
          {previewSubtotal !== null && (
            <p className="mt-2 text-xs text-muted-foreground">
              Subtotal: <span className="tabular-nums font-medium text-foreground">{formatFRW(previewSubtotal)}</span>
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
