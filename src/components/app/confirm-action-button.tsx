"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ActionResult = { ok?: boolean; error?: string } | undefined;

/**
 * Button that opens a styled confirmation dialog, then runs a (bound) server
 * action. Pass e.g. `action={deleteSale.bind(null, sale.id)}` from a server
 * component.
 */
export function ConfirmActionButton({
  action,
  confirmMessage,
  successMessage,
  title = "Are you sure?",
  confirmLabel = "Delete",
  redirectTo,
  children,
  variant = "ghost",
  size = "icon-sm",
  className,
  "aria-label": ariaLabel,
}: {
  action: () => Promise<ActionResult>;
  confirmMessage: string;
  successMessage: string;
  title?: string;
  confirmLabel?: string;
  redirectTo?: string;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  "aria-label"?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={variant}
            size={size}
            className={className}
            aria-label={ariaLabel}
          />
        }
      >
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlert className="size-4.5" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>
        <p className="py-2 text-sm text-muted-foreground">{confirmMessage}</p>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const res = await action();
                if (res?.error) {
                  toast.error(res.error);
                  setOpen(false);
                  return;
                }
                toast.success(successMessage);
                setOpen(false);
                if (redirectTo) {
                  router.push(redirectTo);
                } else {
                  router.refresh();
                }
              });
            }}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
