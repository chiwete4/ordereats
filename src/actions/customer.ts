"use server";

import { revalidatePath } from "next/cache";

import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function toggleFavoriteRestaurant(formData: FormData) {
  const restaurantId = String(formData.get("restaurantId") || "");
  if (!restaurantId) throw new Error("Restaurant is required.");

  const user = await getOrCreateCurrentUser();
  if (!user) throw new Error("You must be signed in.");

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true },
  });
  if (!restaurant) throw new Error("Restaurant not found.");

  const existing = await prisma.favoriteRestaurant.findUnique({
    where: {
      userId_restaurantId: {
        userId: user.id,
        restaurantId,
      },
    },
  });

  if (existing) {
    await prisma.favoriteRestaurant.delete({
      where: {
        userId_restaurantId: {
          userId: user.id,
          restaurantId,
        },
      },
    });
  } else {
    await prisma.favoriteRestaurant.create({
      data: { userId: user.id, restaurantId },
    });
  }

  revalidatePath("/customer");
  return { favorited: !existing };
}

export async function submitCustomerComplaint(formData: FormData) {
  const restaurantOrderId = String(formData.get("restaurantOrderId") || "");
  const body = String(formData.get("body") || "").trim();

  if (!restaurantOrderId) throw new Error("Order is required.");
  if (body.length < 4) throw new Error("Tell us briefly what went wrong.");

  const user = await getOrCreateCurrentUser();
  if (!user) throw new Error("You must be signed in.");

  const restaurantOrder = await prisma.restaurantOrder.findFirst({
    where: {
      id: restaurantOrderId,
      order: { customerId: user.id },
    },
    select: {
      id: true,
      restaurantId: true,
      order: { select: { orderNumber: true } },
    },
  });

  if (!restaurantOrder) throw new Error("Order not found.");

  await prisma.customerComplaint.create({
    data: {
      restaurantId: restaurantOrder.restaurantId,
      customerId: user.id,
      restaurantOrderId: restaurantOrder.id,
      subject: `Order #${restaurantOrder.order.orderNumber} issue`,
      body,
    },
  });

  revalidatePath("/customer");
  revalidatePath("/restaurant/dashboard");
  return { ok: true };
}
