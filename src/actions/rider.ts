"use server";

import { revalidatePath } from "next/cache";

import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

async function requireAssignedDelivery(deliveryId: string) {
  const user = await getOrCreateCurrentUser();
  if (!user) throw new Error("You must be signed in.");

  const delivery = await prisma.delivery.findFirst({
    where: {
      id: deliveryId,
      riderId: user.id,
      status: {
        notIn: ["DELIVERED", "CANCELLED"],
      },
    },
    include: {
      restaurantOrder: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!delivery) {
    throw new Error("This delivery is not assigned to you or is already complete.");
  }

  return delivery;
}

export async function markRiderDeliveryDelivered(formData: FormData) {
  const deliveryId = formData.get("deliveryId")?.toString();
  if (!deliveryId) throw new Error("Delivery is required.");

  const delivery = await requireAssignedDelivery(deliveryId);
  const now = new Date();

  await prisma.$transaction([
    prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        status: "DELIVERED",
        deliveredAt: now,
      },
    }),
    prisma.restaurantOrder.update({
      where: { id: delivery.restaurantOrder.id },
      data: {
        status: "DELIVERED",
      },
    }),
  ]);

  revalidatePath("/rider");
  revalidatePath("/restaurant/dashboard");
  revalidatePath("/customer");
}
