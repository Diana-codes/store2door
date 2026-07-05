const rwfFormatter = new Intl.NumberFormat("en-RW", {
  style: "decimal",
  maximumFractionDigits: 0,
});

export function formatFRW(amount: number | bigint | null | undefined): string {
  if (amount === null || amount === undefined) return "FRW 0";
  return `FRW ${rwfFormatter.format(amount)}`;
}

export function formatFRWCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `FRW ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `FRW ${(amount / 1_000).toFixed(1)}K`;
  }
  return formatFRW(amount);
}

export function parseFRW(input: string): number {
  const cleaned = input.replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : 0;
}
