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
import { createSale, updateSale } from "./actions";

export type SaleFormData = {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  orderRef: string | null;
  invoiceNumber: string | null;
  amount: number;
  status: string;
  date: Date;
  notes: string | null;
};

// Without `sale` the dialog creates a new sale; with it, it edits in place.
export function SaleDialog({
  trigger,
  sale,
}: {
  trigger: React.ReactElement;
  sale?: SaleFormData;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const editing = Boolean(sale);
  const defaultDate = format(sale?.date ?? new Date(), "yyyy-MM-dd");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-2xl">
        <form
          action={(formData) => {
            startTransition(async () => {
              const result = sale
                ? await updateSale(sale.id, formData)
                : await createSale(formData);
              if (result?.error) {
                toast.error(result.error);
                return;
              }
              toast.success(editing ? "Sale updated" : "Sale added");
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{editing ? "Edit sale" : "New sale"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="customerName">Customer name</Label>
              <Input
                id="customerName"
                name="customerName"
                placeholder="Optional"
                defaultValue={sale?.customerName ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customerEmail">Customer email</Label>
              <Input
                id="customerEmail"
                name="customerEmail"
                type="email"
                placeholder="Optional"
                defaultValue={sale?.customerEmail ?? ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="orderRef">Order ref</Label>
                <Input
                  id="orderRef"
                  name="orderRef"
                  placeholder="e.g. #563"
                  defaultValue={sale?.orderRef ?? ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoiceNumber">Invoice #</Label>
                <Input
                  id="invoiceNumber"
                  name="invoiceNumber"
                  placeholder="e.g. 9256"
                  defaultValue={sale?.invoiceNumber ?? ""}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount (FRW)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  required
                  defaultValue={sale?.amount ?? ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={sale?.status ?? "COMPLETED"}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                name="notes"
                placeholder="Optional"
                defaultValue={sale?.notes ?? ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save changes" : "Save sale"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
