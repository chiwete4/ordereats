"use server";

import { revalidatePath } from "next/cache";
import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

async function requireManager(restaurantId: string) {
  const user = await getOrCreateCurrentUser();
  if (!user) throw new Error("You must be signed in.");
  const membership = await prisma.restaurantStaff.findUnique({ where: { userId_restaurantId: { userId: user.id, restaurantId } } });
  if (!membership || !["OWNER", "STAFF"].includes(membership.role) || !membership.isActive) throw new Error("You are not allowed to manage this restaurant.");
  return user;
}

export async function addRestaurantStaff(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const userId = formData.get("userId")?.toString();
  const role = formData.get("role")?.toString();
  if (!restaurantId || !userId || (role !== "STAFF" && role !== "RIDER")) throw new Error("Choose an Paperbag user and a valid role.");
  await requireManager(restaurantId);

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) throw new Error("That person needs an Paperbag account first.");

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

  const membership = await prisma.restaurantStaff.findFirst({ where: { id: membershipId, restaurantId }, select: { id: true, userId: true, isActive: true, role: true } });
  if (!membership) throw new Error("Staff member not found.");
  if (membership.role === "OWNER") throw new Error("The restaurant owner cannot be deactivated here.");
  if (membership.userId === manager.id && membership.isActive) throw new Error("You cannot deactivate your own restaurant access.");

  await prisma.restaurantStaff.update({ where: { id: membership.id }, data: { isActive: !membership.isActive } });
  revalidatePath("/restaurant/dashboard");
}


export async function changeRestaurantStaffRole(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const membershipId = formData.get("membershipId")?.toString();
  const nextRole = formData.get("nextRole")?.toString();

  if (
    !restaurantId ||
    !membershipId ||
    (nextRole !== "STAFF" && nextRole !== "RIDER")
  ) {
    throw new Error("Staff information and a valid role are required.");
  }

  const manager = await requireManager(restaurantId);

  const membership = await prisma.restaurantStaff.findFirst({
    where: {
      id: membershipId,
      restaurantId,
    },
    select: {
      id: true,
      userId: true,
      role: true,
    },
  });

  if (!membership) throw new Error("Staff member not found.");
  if (membership.role === "OWNER") {
    throw new Error("The restaurant owner role cannot be changed here.");
  }
  if (membership.userId === manager.id) {
    throw new Error("You cannot change your own restaurant role.");
  }

  await prisma.restaurantStaff.update({
    where: { id: membership.id },
    data: { role: nextRole },
  });

  revalidatePath("/restaurant/dashboard");
}
