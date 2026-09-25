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
  const orderId = String(formData.get("orderId") || "");
  const body = String(formData.get("body") || "").trim();
  const selectedItemIds = formData
    .getAll("orderItemId")
    .map((value) => String(value))
    .filter(Boolean);

  if (!orderId) throw new Error("Order is required.");
  if (selectedItemIds.length === 0) throw new Error("Choose at least one item.");
  if (body.length < 4) throw new Error("Tell us briefly what went wrong.");

  const user = await getOrCreateCurrentUser();
  if (!user) throw new Error("You must be signed in.");

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      customerId: user.id,
    },
    select: {
      orderNumber: true,
      restaurantOrders: {
        select: {
          id: true,
          restaurantId: true,
          items: {
            where: { id: { in: selectedItemIds } },
            select: {
              id: true,
              name: true,
              quantity: true,
            },
          },
        },
      },
    },
  });

  if (!order) throw new Error("Order not found.");

  const selectedRows = order.restaurantOrders.filter((row) => row.items.length > 0);
  const foundCount = selectedRows.reduce((sum, row) => sum + row.items.length, 0);
  if (foundCount !== selectedItemIds.length) {
    throw new Error("One or more selected items are not part of this order.");
  }

  await prisma.$transaction(
    selectedRows.map((row) => {
      const itemSummary = row.items
        .map((item) => `${item.quantity}× ${item.name}`)
        .join(", ");

      return prisma.customerComplaint.create({
        data: {
          restaurantId: row.restaurantId,
          customerId: user.id,
          restaurantOrderId: row.id,
          subject: `Order #${order.orderNumber} · ${itemSummary}`,
          body: `Items with an issue: ${itemSummary}\n\n${body}`,
        },
      });
    })
  );

  revalidatePath("/customer");
  revalidatePath("/restaurant/dashboard");
  return { ok: true, complaintCount: selectedRows.length };
}
