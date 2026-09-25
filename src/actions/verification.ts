"use server";

import { revalidatePath } from "next/cache";

import { getOrCreateCurrentUser } from "@/lib/current-user";
import {
  createPaystackSubaccount,
  resolveNigerianAccount,
  updatePaystackSubaccount,
} from "@/lib/paystack";
import { prisma } from "@/lib/prisma";

async function requireRestaurantManager(restaurantId: string) {
  const user = await getOrCreateCurrentUser();
  if (!user) throw new Error("You must be signed in.");

  const membership = await prisma.restaurantStaff.findUnique({
    where: { userId_restaurantId: { userId: user.id, restaurantId } },
    select: { role: true, isActive: true },
  });

  if (
    !membership ||
    !membership.isActive ||
    !["OWNER", "STAFF"].includes(membership.role)
  ) {
    throw new Error("You are not allowed to manage this restaurant.");
  }
}

export async function saveRestaurantBankInfo(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const bankCode = formData.get("bankCode")?.toString().trim();
  const bankName = formData.get("bankName")?.toString().trim();
  const accountNumber = formData.get("accountNumber")?.toString().trim();

  if (!restaurantId || !bankCode || !bankName || !accountNumber) {
    throw new Error("Choose a bank and enter an account number.");
  }

  if (!/^\d{10}$/.test(accountNumber)) {
    throw new Error("Enter a valid 10-digit account number.");
  }

  await requireRestaurantManager(restaurantId);

  const resolved = await resolveNigerianAccount(accountNumber, bankCode);
  if (!resolved.account_name) {
    throw new Error("Paystack could not verify the account name.");
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      name: true,
      paystackSubaccountCode: true,
      paystackSubaccountId: true,
    },
  });

  if (!restaurant) {
    throw new Error("Restaurant not found.");
  }

  const subaccount = restaurant.paystackSubaccountCode
    ? await updatePaystackSubaccount({
        idOrCode: restaurant.paystackSubaccountCode,
        businessName: restaurant.name,
        accountNumber,
        bankCode,
      })
    : await createPaystackSubaccount({
        businessName: restaurant.name,
        accountNumber,
        bankCode,
        restaurantId,
      });

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      payoutBankName: subaccount.settlement_bank || bankName,
      payoutBankCode: bankCode,
      payoutAccountName: resolved.account_name,
      payoutAccountNumber: accountNumber,
      paystackSubaccountCode: subaccount.subaccount_code,
      paystackSubaccountId: String(subaccount.id),
      payoutVerifiedAt: new Date(),
    },
  });

  revalidatePath("/restaurant/dashboard");

  return {
    accountName: resolved.account_name,
    bankName: subaccount.settlement_bank || bankName,
  };
}
