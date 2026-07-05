import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  baseSearchParams: Record<string, string | string[] | undefined>;
  basePath: string;
};

function buildHref(
  basePath: string,
  base: Record<string, string | string[] | undefined>,
  page: number,
) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) {
    if (v === undefined || k === "page") continue;
    if (Array.isArray(v)) {
      v.forEach((vv) => params.append(k, vv));
    } else {
      params.set(k, v);
    }
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function PaginationBar({
  page,
  totalPages,
  total,
  pageSize,
  baseSearchParams,
  basePath,
}: Props) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="flex items-center justify-between gap-3 px-1 py-3 text-sm">
      <p className="text-muted-foreground tabular-nums">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrev}
          render={
            hasPrev ? (
              <Link
                href={buildHref(basePath, baseSearchParams, page - 1)}
                aria-label="Previous page"
              />
            ) : undefined
          }
        >
          <ChevronLeft className="size-3.5" />
          Prev
        </Button>
        <span className="px-1 text-xs text-muted-foreground tabular-nums">
          Page {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          render={
            hasNext ? (
              <Link
                href={buildHref(basePath, baseSearchParams, page + 1)}
                aria-label="Next page"
              />
            ) : undefined
          }
        >
          Next
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
