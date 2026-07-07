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
import { createExpense, updateExpense } from "./actions";

type Category = { id: string; name: string };

export type ExpenseFormData = {
  id: string;
  description: string;
  categoryId: string | null;
  amount: number;
  date: Date;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
};

// Without `expense` the dialog creates a new entry; with it, it edits in place.
export function ExpenseDialog({
  trigger,
  categories,
  expense,
}: {
  trigger: React.ReactElement;
  categories: Category[];
  expense?: ExpenseFormData;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const editing = Boolean(expense);
  const defaultDate = format(expense?.date ?? new Date(), "yyyy-MM-dd");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-2xl">
        <form
          action={(formData) => {
            startTransition(async () => {
              const res = expense
                ? await updateExpense(expense.id, formData)
                : await createExpense(formData);
              if (res?.error) {
                toast.error(res.error);
                return;
              }
              toast.success(editing ? "Expense updated" : "Expense recorded");
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit expense" : "New expense"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="e.g. Delivery fuel for Kigali route"
                required
                defaultValue={expense?.description ?? ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select
                  name="categoryId"
                  defaultValue={expense?.categoryId ?? undefined}
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
              <div className="grid gap-2">
                <Label htmlFor="paymentMethod">Payment method</Label>
                <Select
                  name="paymentMethod"
                  defaultValue={expense?.paymentMethod ?? undefined}
                >
                  <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                    <SelectItem value="BANK">Bank transfer</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                  </SelectContent>
                </Select>
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
                  defaultValue={expense?.amount ?? ""}
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
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                name="reference"
                placeholder="Optional (e.g. MoMo transaction id)"
                defaultValue={expense?.reference ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                name="notes"
                placeholder="Optional"
                defaultValue={expense?.notes ?? ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save changes" : "Save expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
