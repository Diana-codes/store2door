// Units shared across purchase entry. Edit this list to add or remove options.
export const UNITS: { value: string; label: string }[] = [
  { value: "kg", label: "Kilogram (kg)" },
  { value: "g", label: "Gram (g)" },
  { value: "L", label: "Litre (L)" },
  { value: "mL", label: "Millilitre (mL)" },
  { value: "pcs", label: "Piece (pcs)" },
  { value: "dozen", label: "Dozen" },
  { value: "pack", label: "Pack" },
  { value: "bag", label: "Bag" },
  { value: "bunch", label: "Bunch" },
  { value: "bundle", label: "Bundle" },
  { value: "crate", label: "Crate" },
  { value: "box", label: "Box" },
  { value: "carton", label: "Carton" },
  { value: "tray", label: "Tray" },
  { value: "sack", label: "Sack" },
];

export function unitLabel(value: string | null | undefined): string {
  if (!value) return "";
  return UNITS.find((u) => u.value === value)?.value ?? value;
}
