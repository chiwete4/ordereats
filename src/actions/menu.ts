"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

async function requireRestaurantStaff(restaurantId: string) {
  const user = await getOrCreateCurrentUser();
  if (!user) throw new Error("You must be signed in.");
  const membership = await prisma.restaurantStaff.findUnique({ where: { userId_restaurantId: { userId: user.id, restaurantId } } });
  if (!membership || membership.role !== "STAFF" || !membership.isActive) throw new Error("You are not allowed to manage this restaurant.");
}

export async function createMenuCategory(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const name = formData.get("name")?.toString().trim();
  if (!restaurantId || !name) throw new Error("Restaurant and category name are required.");
  await requireRestaurantStaff(restaurantId);
  await prisma.menuCategory.create({ data: { restaurantId, name } });
  revalidatePath("/restaurant/dashboard");
  redirect(`/restaurant/dashboard?restaurantId=${restaurantId}`);
}

export async function updateMenuCategory(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const categoryId = formData.get("categoryId")?.toString();
  const name = formData.get("name")?.toString().trim();
  if (!restaurantId || !categoryId || !name) throw new Error("Category information is required.");
  await requireRestaurantStaff(restaurantId);
  const category = await prisma.menuCategory.findFirst({ where: { id: categoryId, restaurantId }, select: { id: true } });
  if (!category) throw new Error("Category not found.");
  await prisma.menuCategory.update({ where: { id: category.id }, data: { name } });
  revalidatePath("/restaurant/dashboard");
}

export async function deleteMenuCategory(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const categoryId = formData.get("categoryId")?.toString();
  if (!restaurantId || !categoryId) throw new Error("Category information is required.");
  await requireRestaurantStaff(restaurantId);
  const category = await prisma.menuCategory.findFirst({ where: { id: categoryId, restaurantId }, include: { _count: { select: { menuItems: true } } } });
  if (!category) throw new Error("Category not found.");
  if (category._count.menuItems > 0) throw new Error("Move or delete this category's menu items before deleting the category.");
  await prisma.menuCategory.delete({ where: { id: category.id } });
  revalidatePath("/restaurant/dashboard");
}

export async function createMenuItem(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const categoryId = formData.get("categoryId")?.toString();
  const name = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const priceValue = formData.get("price")?.toString().trim();
  const imageUrl = formData.get("imageUrl")?.toString().trim();
  if (!restaurantId || !categoryId || !name || !priceValue) throw new Error("Restaurant, category, item name, and price are required.");
  const price = Number(priceValue);
  if (!Number.isFinite(price) || price <= 0) throw new Error("Price must be greater than zero.");
  await requireRestaurantStaff(restaurantId);
  const category = await prisma.menuCategory.findFirst({ where: { id: categoryId, restaurantId }, select: { id: true } });
  if (!category) throw new Error("That category does not belong to this restaurant.");
  await prisma.menuItem.create({ data: { restaurantId, categoryId, name, description: description || null, price: priceValue, imageUrl: imageUrl || null } });
  revalidatePath("/restaurant/dashboard");
  redirect(`/restaurant/dashboard?restaurantId=${restaurantId}`);
}

export async function updateMenuItem(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const menuItemId = formData.get("menuItemId")?.toString();
  const categoryId = formData.get("categoryId")?.toString();
  const name = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const priceValue = formData.get("price")?.toString().trim();
  const imageUrl = formData.get("imageUrl")?.toString().trim();
  if (!restaurantId || !menuItemId || !categoryId || !name || !priceValue) throw new Error("Menu item information is required.");
  const price = Number(priceValue);
  if (!Number.isFinite(price) || price <= 0) throw new Error("Price must be greater than zero.");
  await requireRestaurantStaff(restaurantId);
  const [item, category] = await Promise.all([
    prisma.menuItem.findFirst({ where: { id: menuItemId, restaurantId }, select: { id: true } }),
    prisma.menuCategory.findFirst({ where: { id: categoryId, restaurantId }, select: { id: true } }),
  ]);
  if (!item || !category) throw new Error("Menu item or category not found.");
  await prisma.menuItem.update({ where: { id: item.id }, data: { categoryId, name, description: description || null, price: priceValue, imageUrl: imageUrl || null } });
  revalidatePath("/restaurant/dashboard");
}

export async function deleteMenuItem(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const menuItemId = formData.get("menuItemId")?.toString();
  if (!restaurantId || !menuItemId) throw new Error("Menu item information is required.");
  await requireRestaurantStaff(restaurantId);
  const item = await prisma.menuItem.findFirst({ where: { id: menuItemId, restaurantId }, select: { id: true } });
  if (!item) throw new Error("Menu item not found.");
  await prisma.menuItem.delete({ where: { id: item.id } });
  revalidatePath("/restaurant/dashboard");
}

export async function toggleMenuItemAvailability(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const menuItemId = formData.get("menuItemId")?.toString();
  if (!restaurantId || !menuItemId) throw new Error("Restaurant and menu item are required.");
  await requireRestaurantStaff(restaurantId);
  const item = await prisma.menuItem.findFirst({ where: { id: menuItemId, restaurantId }, select: { id: true, isAvailable: true } });
  if (!item) throw new Error("Menu item not found.");
  await prisma.menuItem.update({ where: { id: item.id }, data: { isAvailable: !item.isAvailable } });
  revalidatePath("/restaurant/dashboard");
}