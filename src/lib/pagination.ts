export const DEFAULT_PAGE_SIZE = 20;

export function parsePagination(
  searchParams: Record<string, string | string[] | undefined>,
  pageSize = DEFAULT_PAGE_SIZE,
) {
  const raw = searchParams.page;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const page = Math.max(1, Number(value) || 1);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function pickString(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const raw = searchParams[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  return value;
}

export function pickDate(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): Date | undefined {
  const v = pickString(searchParams, key);
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function totalPages(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}
