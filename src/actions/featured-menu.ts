"use server";

import { revalidatePath } from "next/cache";

import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

async function requireManager(restaurantId: string) {
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

  if (!membership || !membership.isActive || !["OWNER", "STAFF"].includes(membership.role)) {
    throw new Error("You are not allowed to manage this restaurant.");
  }
}

function parsePrice(value: FormDataEntryValue | null) {
  const price = Number(value?.toString().replaceAll(",", "").trim());
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Price must be greater than zero.");
  }
  return price;
}

function parseItems(raw: FormDataEntryValue | null) {
  let parsed: Record<string, number>;
  try {
    parsed = JSON.parse(raw?.toString() || "{}");
  } catch {
    throw new Error("Combo items are invalid.");
  }

  return Object.entries(parsed)
    .map(([menuItemId, quantity]) => ({
      menuItemId,
      quantity: Math.floor(Number(quantity)),
    }))
    .filter((item) => item.menuItemId && Number.isInteger(item.quantity) && item.quantity > 0);
}

function parseTiming(formData: FormData) {
  const readyMin = Number(formData.get("readyMin") ?? 1);
  const readyMax = Number(formData.get("readyMax") ?? 5);
  const deliverySeconds = Number(formData.get("deliverySeconds") ?? 45);

  if (
    !Number.isInteger(readyMin) ||
    !Number.isInteger(readyMax) ||
    !Number.isInteger(deliverySeconds) ||
    readyMin < 0 ||
    readyMax < readyMin ||
    deliverySeconds < 1
  ) {
    throw new Error("Enter valid preparation and delivery times.");
  }

  return { readyMin, readyMax, deliverySeconds };
}

async function ensureDashboardCategory(restaurantId: string) {
  const existing = await prisma.menuCategory.findFirst({
    where: { restaurantId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (existing) return existing.id;

  const category = await prisma.menuCategory.create({
    data: {
      restaurantId,
      name: "Menu",
    },
    select: { id: true },
  });

  return category.id;
}

export async function createDashboardMenuItem(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const name = formData.get("name")?.toString().trim();
  const price = parsePrice(formData.get("price"));
  const imageUrl = formData.get("imageUrl")?.toString().trim();
  const requestedCategoryId = formData.get("categoryId")?.toString();
  const timing = parseTiming(formData);

  if (!restaurantId || !name) {
    throw new Error("Restaurant and item name are required.");
  }

  await requireManager(restaurantId);
  const categoryId = requestedCategoryId || await ensureDashboardCategory(restaurantId);
  const category = await prisma.menuCategory.findFirst({
    where: { id: categoryId, restaurantId },
    select: { id: true },
  });
  if (!category) throw new Error("Choose a valid menu category.");

  await prisma.menuItem.create({
    data: {
      restaurantId,
      categoryId,
      name,
      price,
      imageUrl: imageUrl || null,
      ...timing,
    },
  });

  revalidatePath("/restaurant/dashboard");
}

export async function updateDashboardMenuItem(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const menuItemId = formData.get("menuItemId")?.toString();
  const name = formData.get("name")?.toString().trim();
  const price = parsePrice(formData.get("price"));
  const imageUrl = formData.get("imageUrl")?.toString().trim();
  const categoryId = formData.get("categoryId")?.toString();
  const timing = parseTiming(formData);

  if (!restaurantId || !menuItemId || !name || !categoryId) {
    throw new Error("Menu item information is required.");
  }

  await requireManager(restaurantId);

  const item = await prisma.menuItem.findFirst({
    where: {
      id: menuItemId,
      restaurantId,
      isArchived: false,
    },
    select: { id: true },
  });

  if (!item) throw new Error("Menu item not found.");
  const category = await prisma.menuCategory.findFirst({
    where: { id: categoryId, restaurantId },
    select: { id: true },
  });
  if (!category) throw new Error("Choose a valid menu category.");

  await prisma.menuItem.update({
    where: { id: item.id },
    data: {
      name,
      price,
      imageUrl: imageUrl || null,
      categoryId,
      ...timing,
    },
  });

  revalidatePath("/restaurant/dashboard");
}

export async function archiveDashboardMenuItem(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const menuItemId = formData.get("menuItemId")?.toString();

  if (!restaurantId || !menuItemId) {
    throw new Error("Menu item information is required.");
  }

  await requireManager(restaurantId);

  const item = await prisma.menuItem.findFirst({
    where: { id: menuItemId, restaurantId },
    select: { id: true },
  });

  if (!item) throw new Error("Menu item not found.");

  await prisma.$transaction([
    prisma.featuredComboItem.deleteMany({
      where: { menuItemId: item.id },
    }),
    prisma.menuItem.update({
      where: { id: item.id },
      data: {
        isArchived: true,
        isAvailable: false,
      },
    }),
  ]);

  revalidatePath("/restaurant/dashboard");
}

export async function createFeaturedCombo(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const items = parseItems(formData.get("items"));

  if (!restaurantId || items.length === 0) {
    throw new Error("Choose at least one menu item.");
  }

  await requireManager(restaurantId);

  const menuItems = await prisma.menuItem.findMany({
    where: {
      restaurantId,
      isArchived: false,
      id: { in: items.map((item) => item.menuItemId) },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (menuItems.length !== items.length) {
    throw new Error("One or more menu items are unavailable.");
  }

  const name =
    menuItems.length <= 2
      ? menuItems.map((item) => item.name).join(", ")
      : `${menuItems[0].name}, ${menuItems[1].name} & ${menuItems.length - 2} more`;

  const count = await prisma.featuredCombo.count({
    where: { restaurantId },
  });

  await prisma.featuredCombo.create({
    data: {
      restaurantId,
      name,
      sortOrder: count,
      items: {
        create: items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
        })),
      },
    },
  });

  revalidatePath("/restaurant/dashboard");
}

export async function updateFeaturedComboItems(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const comboId = formData.get("comboId")?.toString();
  const items = parseItems(formData.get("items"));

  if (!restaurantId || !comboId || items.length === 0) {
    throw new Error("Choose at least one menu item.");
  }

  await requireManager(restaurantId);

  const combo = await prisma.featuredCombo.findFirst({
    where: { id: comboId, restaurantId },
    select: { id: true },
  });

  if (!combo) throw new Error("Featured combo not found.");

  const menuItems = await prisma.menuItem.findMany({
    where: {
      restaurantId,
      isArchived: false,
      id: { in: items.map((item) => item.menuItemId) },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (menuItems.length !== items.length) {
    throw new Error("One or more menu items are unavailable.");
  }

  const name =
    menuItems.length <= 2
      ? menuItems.map((item) => item.name).join(", ")
      : `${menuItems[0].name}, ${menuItems[1].name} & ${menuItems.length - 2} more`;

  await prisma.$transaction(async (tx) => {
    await tx.featuredComboItem.deleteMany({
      where: { comboId: combo.id },
    });

    await tx.featuredCombo.update({
      where: { id: combo.id },
      data: { name },
    });

    await tx.featuredComboItem.createMany({
      data: items.map((item) => ({
        comboId: combo.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
      })),
    });
  });

  revalidatePath("/restaurant/dashboard");
}

export async function updateFeaturedComboTimes(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const comboId = formData.get("comboId")?.toString();
  const readyMin = Number(formData.get("readyMin"));
  const readyMax = Number(formData.get("readyMax"));
  const deliverySeconds = Number(formData.get("deliverySeconds"));

  if (!restaurantId || !comboId) {
    throw new Error("Featured combo information is required.");
  }

  if (
    !Number.isInteger(readyMin) ||
    !Number.isInteger(readyMax) ||
    !Number.isInteger(deliverySeconds) ||
    readyMin < 0 ||
    readyMax < readyMin ||
    deliverySeconds < 1
  ) {
    throw new Error("Enter valid preparation and delivery times.");
  }

  await requireManager(restaurantId);

  const combo = await prisma.featuredCombo.findFirst({
    where: { id: comboId, restaurantId },
    select: { id: true },
  });

  if (!combo) throw new Error("Featured combo not found.");

  await prisma.featuredCombo.update({
    where: { id: combo.id },
    data: {
      readyMin,
      readyMax,
      deliverySeconds,
    },
  });

  revalidatePath("/restaurant/dashboard");
}

export async function deleteFeaturedCombo(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const comboId = formData.get("comboId")?.toString();

  if (!restaurantId || !comboId) {
    throw new Error("Featured combo information is required.");
  }

  await requireManager(restaurantId);

  const combo = await prisma.featuredCombo.findFirst({
    where: { id: comboId, restaurantId },
    select: { id: true },
  });

  if (!combo) throw new Error("Featured combo not found.");

  await prisma.featuredCombo.delete({
    where: { id: combo.id },
  });

  revalidatePath("/restaurant/dashboard");
}


export async function toggleDashboardMenuItemAvailability(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const menuItemId = formData.get("menuItemId")?.toString();
  if (!restaurantId || !menuItemId) throw new Error("Menu item information is required.");
  await requireManager(restaurantId);

  const item = await prisma.menuItem.findFirst({
    where: { id: menuItemId, restaurantId, isArchived: false },
    select: { id: true, isAvailable: true },
  });
  if (!item) throw new Error("Menu item not found.");

  await prisma.menuItem.update({
    where: { id: item.id },
    data: { isAvailable: !item.isAvailable },
  });
  revalidatePath("/restaurant/dashboard");
}

export async function createDashboardCategory(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const name = formData.get("name")?.toString().trim();
  if (!restaurantId || !name) throw new Error("Category name is required.");
  await requireManager(restaurantId);
  await prisma.menuCategory.create({ data: { restaurantId, name } });
  revalidatePath("/restaurant/dashboard");
}

export async function updateDashboardCategory(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const categoryId = formData.get("categoryId")?.toString();
  const name = formData.get("name")?.toString().trim();
  if (!restaurantId || !categoryId || !name) throw new Error("Category information is required.");
  await requireManager(restaurantId);
  const category = await prisma.menuCategory.findFirst({ where: { id: categoryId, restaurantId }, select: { id: true } });
  if (!category) throw new Error("Category not found.");
  await prisma.menuCategory.update({ where: { id: category.id }, data: { name } });
  revalidatePath("/restaurant/dashboard");
}

export async function deleteDashboardCategory(formData: FormData) {
  const restaurantId = formData.get("restaurantId")?.toString();
  const categoryId = formData.get("categoryId")?.toString();
  if (!restaurantId || !categoryId) throw new Error("Category information is required.");
  await requireManager(restaurantId);

  const category = await prisma.menuCategory.findFirst({
    where: { id: categoryId, restaurantId },
    include: { _count: { select: { menuItems: true } } },
  });
  if (!category) throw new Error("Category not found.");
  if (category._count.menuItems > 0) {
    throw new Error("Move every menu item, including archived items, out of this category before deleting it.");
  }

  await prisma.menuCategory.delete({ where: { id: category.id } });
  revalidatePath("/restaurant/dashboard");
}
