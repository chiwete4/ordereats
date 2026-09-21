"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";

import { getOrCreateCurrentUser } from "@/lib/current-user";
import {
  initiatePaystackTransfer,
  isPaystackConfigured,
  verifyPaystackTransfer,
} from "@/lib/paystack";
import { prisma } from "@/lib/prisma";

async function requireOwner(restaurantId: string) {
  const user = await getOrCreateCurrentUser();
  if (!user) throw new Error("You must be signed in.");

  const membership = await prisma.restaurantStaff.findUnique({
    where: {
      userId_restaurantId: {
        userId: user.id,
        restaurantId,
      },
    },
    select: {
      role: true,
      isActive: true,
    },
  });

  if (!membership || !membership.isActive || membership.role !== "OWNER") {
    throw new Error("Only the restaurant owner can send payouts.");
  }
}

export async function requestRestaurantPayout(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  if (!restaurantId) throw new Error("Restaurant is required.");

  await requireOwner(restaurantId);

  if (!isPaystackConfigured()) {
    throw new Error("Paystack is not configured. Add PAYSTACK_SECRET_KEY first.");
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      name: true,
      payoutRecipientCode: true,
      payoutVerifiedAt: true,
    },
  });

  if (
    !restaurant?.payoutRecipientCode ||
    !restaurant.payoutVerifiedAt
  ) {
    throw new Error("Verify a Paystack payout account before requesting a payout.");
  }

  const eligibleOrders = await prisma.restaurantOrder.findMany({
    where: {
      restaurantId,
      status: {
        in: ["DELIVERED", "PICKED_UP"],
      },
      payoutOrder: null,
      order: {
        payment: {
          status: "SUCCESS",
        },
      },
    },
    select: {
      id: true,
      subtotal: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (eligibleOrders.length === 0) {
    throw new Error("There is no settled restaurant balance available for payout yet.");
  }

  const amount = eligibleOrders.reduce(
    (sum, order) => sum + Number(order.subtotal),
    0
  );

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("The available payout amount is invalid.");
  }

  const reference = `pb_${Date.now().toString(36)}_${crypto
    .randomUUID()
    .replaceAll("-", "")
    .slice(0, 18)}`.toLowerCase();

  const payout = await prisma.restaurantPayout.create({
    data: {
      restaurantId,
      amount,
      reference,
      orders: {
        create: eligibleOrders.map((order) => ({
          restaurantOrder: {
            connect: {
              id: order.id,
            },
          },
        })),
      },
    },
    select: {
      id: true,
      reference: true,
    },
  });

  try {
    const transfer = await initiatePaystackTransfer({
      amountKobo: Math.round(amount * 100),
      recipientCode: restaurant.payoutRecipientCode,
      reference,
      reason: `Paperbag payout for ${restaurant.name}`,
    });

    const status =
      transfer.status === "success"
        ? "SUCCESS"
        : transfer.status === "failed"
          ? "FAILED"
          : "PROCESSING";

    await prisma.restaurantPayout.update({
      where: { id: payout.id },
      data: {
        status,
        paystackTransferCode: transfer.transfer_code || null,
        paystackTransferId: String(transfer.id),
        completedAt: status === "SUCCESS" ? new Date() : null,
        failureReason:
          transfer.status === "otp"
            ? "Paystack requires transfer OTP. Disable transfer confirmation in Paystack for automated payouts."
            : null,
      },
    });

    revalidatePath("/restaurant/dashboard");

    return {
      amount,
      status,
      reference,
      requiresOtp: transfer.status === "otp",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Paystack could not start the payout.";

    await prisma.restaurantPayout.update({
      where: { id: payout.id },
      data: {
        status: "FAILED",
        failureReason: message,
      },
    });

    revalidatePath("/restaurant/dashboard");
    throw new Error(message);
  }
}


function payoutStatusFromPaystack(status: string) {
  return status === "success"
    ? "SUCCESS"
    : status === "failed"
      ? "FAILED"
      : status === "reversed"
        ? "REVERSED"
        : "PROCESSING";
}

export async function retryRestaurantPayout(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const payoutId = formData.get("payoutId")?.toString();

  if (!restaurantId || !payoutId) {
    throw new Error("Restaurant and payout are required.");
  }

  await requireOwner(restaurantId);

  if (!isPaystackConfigured()) {
    throw new Error("Paystack is not configured. Add PAYSTACK_SECRET_KEY first.");
  }

  const payout = await prisma.restaurantPayout.findFirst({
    where: {
      id: payoutId,
      restaurantId,
    },
    include: {
      restaurant: {
        select: {
          name: true,
          payoutRecipientCode: true,
          payoutVerifiedAt: true,
        },
      },
    },
  });

  if (!payout) throw new Error("Payout not found.");
  if (payout.status === "SUCCESS") {
    return {
      status: "SUCCESS",
      amount: Number(payout.amount),
      reference: payout.reference,
      requiresOtp: false,
    };
  }
  if (
    !payout.restaurant.payoutRecipientCode ||
    !payout.restaurant.payoutVerifiedAt
  ) {
    throw new Error("Verify a Paystack payout account before retrying this payout.");
  }

  let transfer;
  try {
    transfer = await verifyPaystackTransfer(payout.reference);
  } catch {
    transfer = await initiatePaystackTransfer({
      amountKobo: Math.round(Number(payout.amount) * 100),
      recipientCode: payout.restaurant.payoutRecipientCode,
      reference: payout.reference,
      reason: `Paperbag payout for ${payout.restaurant.name}`,
    });
  }

  const status = payoutStatusFromPaystack(transfer.status);

  await prisma.restaurantPayout.update({
    where: { id: payout.id },
    data: {
      status,
      paystackTransferCode: transfer.transfer_code || null,
      paystackTransferId: String(transfer.id),
      completedAt: status === "SUCCESS" ? new Date() : null,
      failureReason:
        transfer.status === "otp"
          ? "Paystack requires transfer OTP. Disable transfer confirmation in Paystack for automated payouts."
          : status === "FAILED"
            ? "Paystack reported that the payout failed."
            : null,
    },
  });

  revalidatePath("/restaurant/dashboard");

  return {
    status,
    amount: Number(payout.amount),
    reference: payout.reference,
    requiresOtp: transfer.status === "otp",
  };
}
