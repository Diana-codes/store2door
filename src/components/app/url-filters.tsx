"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      const next = new URLSearchParams(params);
      // Always reset to page 1 when filters change.
      next.delete("page");
      if (value === undefined || value === "" || value === "all") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      const qs = next.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [params, pathname, router],
  );

  return { params, setParam, pathname, router };
}

export function SearchInput({ placeholder }: { placeholder: string }) {
  const { params, setParam } = useUrlState();
  const [value, setValue] = useState(params.get("q") ?? "");

  // Keep input in sync if URL changes externally (e.g. clear button).
  useEffect(() => {
    setValue(params.get("q") ?? "");
  }, [params]);

  // Debounce updates to URL.
  useEffect(() => {
    const handle = setTimeout(() => {
      if ((params.get("q") ?? "") !== value) setParam("q", value || undefined);
    }, 250);
    return () => clearTimeout(handle);
  }, [value, params, setParam]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        className="pl-8"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}

export function UrlSelect({
  paramKey,
  placeholder,
  options,
  className,
}: {
  paramKey: string;
  placeholder: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const { params, setParam } = useUrlState();
  const current = params.get(paramKey) ?? "all";

  return (
    <Select
      value={current}
      onValueChange={(v) => setParam(paramKey, v ?? undefined)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {(value: string) =>
            value === "all" || !value
              ? placeholder
              : (options.find((o) => o.value === value)?.label ?? placeholder)
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function UrlDateRange() {
  const { params, setParam } = useUrlState();
  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        aria-label="From date"
        className="w-[148px]"
        value={params.get("from") ?? ""}
        onChange={(e) => setParam("from", e.target.value || undefined)}
      />
      <span className="text-muted-foreground text-xs">to</span>
      <Input
        type="date"
        aria-label="To date"
        className="w-[148px]"
        value={params.get("to") ?? ""}
        onChange={(e) => setParam("to", e.target.value || undefined)}
      />
    </div>
  );
}

export function ClearFiltersButton({ keys }: { keys: string[] }) {
  const { params, router, pathname } = useUrlState();
  const hasAny = keys.some((k) => params.get(k));
  if (!hasAny) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.push(pathname)}
    >
      <X className="size-3.5" />
      Clear
    </Button>
  );
}
