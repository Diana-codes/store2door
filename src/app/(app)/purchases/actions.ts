"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const createSchema = z.object({
  supplierName: z.string().min(1),
  description: z.string().min(1),
  categoryId: z.string().optional(),
  quantity: z.coerce.number().positive().optional(),
  unit: z.string().optional(),
  unitPrice: z.coerce.number().int().nonnegative().optional(),
  amount: z.coerce.number().int().nonnegative(),
  date: z.coerce.date(),
  notes: z.string().optional(),
});

export async function createPurchase(formData: FormData) {
  const user = await requireUser();
  const parsed = createSchema.safeParse({
    supplierName: formData.get("supplierName"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId") || undefined,
    quantity: formData.get("quantity") || undefined,
    unit: formData.get("unit") || undefined,
    unitPrice: formData.get("unitPrice") || undefined,
    amount: formData.get("amount"),
    date: formData.get("date"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const d = parsed.data;
  await prisma.purchase.create({
    data: {
      supplierName: d.supplierName,
      description: d.description,
      categoryId: d.categoryId || null,
      quantity: d.quantity ?? null,
      unit: d.unit || null,
      unitPrice: d.unitPrice ?? null,
      amount: d.amount,
      date: d.date,
      notes: d.notes || null,
      createdById: user.id,
    },
  });
  revalidatePath("/purchases");
  revalidatePath("/dashboard");
  return { ok: true };
}
