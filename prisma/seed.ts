import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const defaultCategories = [
  // Purchase categories (what Store2door buys to resell)
  { name: "Fruits", kind: "PURCHASE", color: "#F5A623" },
  { name: "Vegetables", kind: "PURCHASE", color: "#2E8B2E" },
  { name: "Meat", kind: "PURCHASE", color: "#B91C1C" },
  { name: "Dry Goods", kind: "PURCHASE", color: "#92400E" },
  { name: "Dairy", kind: "PURCHASE", color: "#CBD5E1" },
  { name: "Bakery", kind: "PURCHASE", color: "#D97706" },
  { name: "Beverages", kind: "PURCHASE", color: "#0EA5E9" },
  { name: "Packaging", kind: "PURCHASE", color: "#94A3B8" },
  // Expense categories
  { name: "Transport & Fuel", kind: "EXPENSE", color: "#EF4444" },
  { name: "Salaries", kind: "EXPENSE", color: "#6366F1" },
  { name: "Rent", kind: "EXPENSE", color: "#A855F7" },
  { name: "Utilities", kind: "EXPENSE", color: "#14B8A6" },
  { name: "Marketing", kind: "EXPENSE", color: "#EC4899" },
  { name: "Bank & Fees", kind: "EXPENSE", color: "#64748B" },
  { name: "Other", kind: "EXPENSE", color: "#71717A" },
];

async function main() {
  console.log("Seeding database…");

  for (const c of defaultCategories) {
    await prisma.category.upsert({
      where: { name_kind: { name: c.name, kind: c.kind } },
      update: {},
      create: c,
    });
  }
  console.log(`  • ${defaultCategories.length} categories ready`);

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@store2door.rw";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Store2door Admin",
      passwordHash,
    },
  });
  console.log(`  • admin user → ${adminEmail} / ${adminPassword}`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
