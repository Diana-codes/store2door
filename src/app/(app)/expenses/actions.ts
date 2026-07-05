"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const createSchema = z.object({
  description: z.string().min(1),
  categoryId: z.string().optional(),
  amount: z.coerce.number().int().nonnegative(),
  date: z.coerce.date(),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function createExpense(formData: FormData) {
  const user = await requireUser();
  const parsed = createSchema.safeParse({
    description: formData.get("description"),
    categoryId: formData.get("categoryId") || undefined,
    amount: formData.get("amount"),
    date: formData.get("date"),
    paymentMethod: formData.get("paymentMethod") || undefined,
    reference: formData.get("reference") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const d = parsed.data;
  await prisma.expense.create({
    data: {
      description: d.description,
      categoryId: d.categoryId || null,
      amount: d.amount,
      date: d.date,
      paymentMethod: d.paymentMethod || null,
      reference: d.reference || null,
      notes: d.notes || null,
      createdById: user.id,
    },
  });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { ok: true };
}
