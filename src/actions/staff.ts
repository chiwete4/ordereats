"use server";

import { revalidatePath } from "next/cache";
import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

async function requireManager(restaurantId: string) {
  const user = await getOrCreateCurrentUser();
  if (!user) throw new Error("You must be signed in.");
  const membership = await prisma.restaurantStaff.findUnique({ where: { userId_restaurantId: { userId: user.id, restaurantId } } });
  if (!membership || membership.role !== "STAFF" || !membership.isActive) throw new Error("You are not allowed to manage this restaurant.");
  return user;
}

export async function addRestaurantStaff(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const userId = formData.get("userId")?.toString();
  const role = formData.get("role")?.toString();
  if (!restaurantId || !userId || (role !== "STAFF" && role !== "RIDER")) throw new Error("Choose an OrderEats user and a valid role.");
  await requireManager(restaurantId);

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) throw new Error("That person needs an OrderEats account first.");

  const existing = await prisma.restaurantStaff.findUnique({ where: { userId_restaurantId: { userId, restaurantId } } });
  if (existing) throw new Error("This person is already attached to the restaurant.");

  await prisma.restaurantStaff.create({ data: { restaurantId, userId, role } });
  revalidatePath("/restaurant/dashboard");
}

export async function toggleRestaurantStaffActive(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const membershipId = formData.get("membershipId")?.toString();
  if (!restaurantId || !membershipId) throw new Error("Staff information is required.");
  const manager = await requireManager(restaurantId);

  const membership = await prisma.restaurantStaff.findFirst({ where: { id: membershipId, restaurantId }, select: { id: true, userId: true, isActive: true } });
  if (!membership) throw new Error("Staff member not found.");
  if (membership.userId === manager.id && membership.isActive) throw new Error("You cannot deactivate your own restaurant access.");

  await prisma.restaurantStaff.update({ where: { id: membership.id }, data: { isActive: !membership.isActive } });
  revalidatePath("/restaurant/dashboard");
}
