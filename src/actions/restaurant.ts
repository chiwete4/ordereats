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
      data: { name, description: description || null, phoneNumber: phoneNumber || null, address: address || null },
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

  if (!restaurantId || !name) throw new Error("Restaurant and name are required.");
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