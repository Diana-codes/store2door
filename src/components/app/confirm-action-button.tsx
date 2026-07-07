"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ActionResult = { ok?: boolean; error?: string } | undefined;

/**
 * Button that asks for confirmation, then runs a (bound) server action.
 * Pass e.g. `action={deleteSale.bind(null, sale.id)}` from a server component.
 */
export function ConfirmActionButton({
  action,
  confirmMessage,
  successMessage,
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
  redirectTo?: string;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  "aria-label"?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      aria-label={ariaLabel}
      onClick={() => {
        if (!confirm(confirmMessage)) return;
        startTransition(async () => {
          const res = await action();
          if (res?.error) {
            toast.error(res.error);
            return;
          }
          toast.success(successMessage);
          if (redirectTo) {
            router.push(redirectTo);
          } else {
            router.refresh();
          }
        });
      }}
    >
      {children}
    </Button>
  );
}
