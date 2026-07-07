// Payment methods shared by the expense form, filters, and display.
export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "BANK", label: "Bank transfer" },
  { value: "CARD", label: "Card" },
] as const;

export const PAYMENT_METHOD_VALUES = PAYMENT_METHODS.map((m) => m.value) as [
  string,
  ...string[],
];

export function paymentMethodLabel(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}
