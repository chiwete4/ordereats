"use server";

import { redirect } from "next/navigation";

import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function createRestaurant(formData: FormData) {
  const user = await getOrCreateCurrentUser();

  if (!user) {
    throw new Error("You must be signed in to create a restaurant.");
  }

  const name = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const phoneNumber = formData.get("phoneNumber")?.toString().trim();
  const address = formData.get("address")?.toString().trim();

  if (!name) {
    throw new Error("Restaurant name is required.");
  }

  const restaurant = await prisma.$transaction(async (tx) => {
    const newRestaurant = await tx.restaurant.create({
      data: {
        name,
        description: description || null,
        phoneNumber: phoneNumber || null,
        address: address || null,
      },
    });

    await tx.restaurantStaff.create({
      data: {
        userId: user.id,
        restaurantId: newRestaurant.id,
        role: "STAFF",
      },
    });

    return newRestaurant;
  });

  redirect(`/restaurant/dashboard?restaurantId=${restaurant.id}`);
}