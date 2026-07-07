"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function loginAction(formData: FormData) {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Please enter a valid email and password." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  // Compare against a dummy hash when the user doesn't exist so response
  // timing doesn't reveal which emails are registered.
  const DUMMY_HASH =
    "$2b$10$C6UzMDM.H6dfI/f/IKcEeO7ZVQzXKgU4PDVBBUdBmyGSlWEQwceW6";
  const ok = await bcrypt.compare(
    parsed.data.password,
    user?.passwordHash ?? DUMMY_HASH,
  );
  if (!user || !ok) return { error: "Invalid email or password." };

  await createSession(user.id);
  return { ok: true };
}
