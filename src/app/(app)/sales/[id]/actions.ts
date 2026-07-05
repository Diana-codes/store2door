"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const addItemSchema = z.object({
  saleId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().int().nonnegative(),
});

export async function addSaleItem(formData: FormData) {
  await requireUser();
  const parsed = addItemSchema.safeParse({
    saleId: formData.get("saleId"),
    productName: formData.get("productName"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { saleId, productName, quantity, unitPrice } = parsed.data;
  const subtotal = Math.round(quantity * unitPrice);

  await prisma.saleItem.create({
    data: { saleId, productName, quantity, unitPrice, subtotal },
  });

  revalidatePath(`/sales/${saleId}`);
  revalidatePath("/reports");
  return { ok: true };
}

export async function deleteSaleItem(id: string, saleId: string) {
  await requireUser();
  await prisma.saleItem.delete({ where: { id } });
  revalidatePath(`/sales/${saleId}`);
  revalidatePath("/reports");
  return { ok: true };
}
