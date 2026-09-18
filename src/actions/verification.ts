"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

async function requireRestaurantManager(restaurantId: string) {
  const user = await getOrCreateCurrentUser();
  if (!user) throw new Error("You must be signed in.");

  const membership = await prisma.restaurantStaff.findUnique({
    where: { userId_restaurantId: { userId: user.id, restaurantId } },
    select: { role: true, isActive: true },
  });

  if (!membership || !membership.isActive || !["OWNER", "STAFF"].includes(membership.role)) {
    throw new Error("You are not allowed to manage this restaurant.");
  }
}

export async function saveRestaurantBankInfo(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const bankName = formData.get("bankName")?.toString().trim();
  const accountName = formData.get("accountName")?.toString().trim();
  const accountNumber = formData.get("accountNumber")?.toString().trim();

  if (!restaurantId || !bankName || !accountName || !accountNumber) {
    throw new Error("Bank name, account name, and account number are required.");
  }

  if (!/^\d{10}$/.test(accountNumber)) {
    throw new Error("Enter a valid 10-digit account number.");
  }

  await requireRestaurantManager(restaurantId);

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      payoutBankName: bankName,
      payoutAccountName: accountName,
      payoutAccountNumber: accountNumber,
    },
  });

  revalidatePath("/restaurant/dashboard");
  redirect(`/restaurant/dashboard?restaurantId=${restaurantId}`);
}
