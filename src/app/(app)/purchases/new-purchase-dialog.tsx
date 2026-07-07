"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createPurchase, updatePurchase } from "./actions";
import { UNITS } from "@/lib/units";

type Category = { id: string; name: string };

export type PurchaseFormData = {
  id: string;
  supplierName: string;
  description: string;
  categoryId: string | null;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  amount: number;
  date: Date;
  notes: string | null;
};

// Without `purchase` the dialog creates a new entry; with it, it edits in place.
export function PurchaseDialog({
  trigger,
  categories,
  purchase,
}: {
  trigger: React.ReactElement;
  categories: Category[];
  purchase?: PurchaseFormData;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const editing = Boolean(purchase);
  const defaultDate = format(purchase?.date ?? new Date(), "yyyy-MM-dd");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-2xl">
        <form
          action={(formData) => {
            startTransition(async () => {
              const res = purchase
                ? await updatePurchase(purchase.id, formData)
                : await createPurchase(formData);
              if (res?.error) {
                toast.error(res.error);
                return;
              }
              toast.success(editing ? "Purchase updated" : "Purchase added");
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit purchase" : "New purchase"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="supplierName">Supplier</Label>
                <Input
                  id="supplierName"
                  name="supplierName"
                  required
                  defaultValue={purchase?.supplierName ?? ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select
                  name="categoryId"
                  defaultValue={purchase?.categoryId ?? undefined}
                >
                  <SelectTrigger id="categoryId">
                    <SelectValue placeholder="—">
                      {(value: string) =>
                        categories.find((c) => c.id === value)?.name ?? "—"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Item / description</Label>
              <Input
                id="description"
                name="description"
                placeholder="e.g. Fresh tomatoes"
                required
                defaultValue={purchase?.description ?? ""}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Qty</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={purchase?.quantity ?? ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit</Label>
                <Select name="unit" defaultValue={purchase?.unit ?? undefined}>
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="—">
                      {(value: string) =>
                        UNITS.find((u) => u.value === value)?.value ?? "—"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unitPrice">Unit price</Label>
                <Input
                  id="unitPrice"
                  name="unitPrice"
                  type="number"
                  min="0"
                  defaultValue={purchase?.unitPrice ?? ""}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="amount">Total (FRW)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  required
                  defaultValue={purchase?.amount ?? ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={defaultDate}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                name="notes"
                placeholder="Optional"
                defaultValue={purchase?.notes ?? ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save changes" : "Save purchase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
