"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

async function requireRestaurantStaff(restaurantId: string) {
  const user = await getOrCreateCurrentUser();
  if (!user) throw new Error("You must be signed in.");

  const membership = await prisma.restaurantStaff.findUnique({
    where: { userId_restaurantId: { userId: user.id, restaurantId } },
  });

  if (!membership || !["OWNER", "STAFF"].includes(membership.role) || !membership.isActive) {
    throw new Error("You are not allowed to manage this restaurant.");
  }
}

export async function createRestaurant(formData: FormData) {
  const user = await getOrCreateCurrentUser();
  if (!user) throw new Error("You must be signed in to create a restaurant.");

  const name = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const phoneNumber = formData.get("phoneNumber")?.toString().trim();
  const address = formData.get("address")?.toString().trim();
  if (!name) throw new Error("Restaurant name is required.");

  const restaurant = await prisma.$transaction(async (tx) => {
    const newRestaurant = await tx.restaurant.create({
      data: {
      name,
      description: description || null,
      phoneNumber: phoneNumber || null,
      address: address || null,
      imageUrl: imageUrl || null,
      ...(openingTime && closingTime
        ? {
            openingTime,
            closingTime,
            operatingDays,
            ...(timezone ? { timezone } : {}),
          }
        : {}),
    },
    });
    await tx.restaurantStaff.create({
      data: { userId: user.id, restaurantId: newRestaurant.id, role: "OWNER" },
    });
    return newRestaurant;
  });

  redirect(`/restaurant/dashboard?restaurantId=${restaurant.id}`);
}

export async function updateRestaurant(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const name = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const phoneNumber = formData.get("phoneNumber")?.toString().trim();
  const address = formData.get("address")?.toString().trim();
  const imageUrl = formData.get("imageUrl")?.toString().trim();
  const openingTime = formData.get("openingTime")?.toString().trim();
  const closingTime = formData.get("closingTime")?.toString().trim();
  const timezone = formData.get("timezone")?.toString().trim();
  const operatingDays = formData
    .getAll("operatingDays")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);

  if (!restaurantId || !name) throw new Error("Restaurant and name are required.");
  if ((openingTime || closingTime) && (!openingTime || !closingTime)) {
    throw new Error("Both opening and closing times are required.");
  }
  if (openingTime && !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(openingTime)) {
    throw new Error("Enter a valid opening time.");
  }
  if (closingTime && !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(closingTime)) {
    throw new Error("Enter a valid closing time.");
  }
  if ((openingTime || closingTime) && operatingDays.length === 0) {
    throw new Error("Choose at least one operating day.");
  }
  await requireRestaurantStaff(restaurantId);

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { name, description: description || null, phoneNumber: phoneNumber || null, address: address || null },
  });
  revalidatePath("/restaurant/dashboard");
}

export async function toggleRestaurantOpen(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  if (!restaurantId) throw new Error("Restaurant is required.");
  await requireRestaurantStaff(restaurantId);

  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { isOpen: true } });
  if (!restaurant) throw new Error("Restaurant not found.");

  await prisma.restaurant.update({ where: { id: restaurantId }, data: { isOpen: !restaurant.isOpen } });
  revalidatePath("/restaurant/dashboard");
}