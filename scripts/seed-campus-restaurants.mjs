import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import {
  CAMPUS_RESTAURANTS,
  FOOD_IMAGES,
  imageForItem,
} from "./campus-restaurants-data.mjs";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    if (process.env[key] !== undefined) continue;

    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

const envFile =
  process.env.SEED_ENV_FILE ||
  [".env.local", ".env.development.local", ".env"].find((candidate) =>
    fs.existsSync(path.resolve(process.cwd(), candidate))
  );

if (envFile) {
  loadEnvFile(path.resolve(process.cwd(), envFile));
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is missing. Put it in .env.local or set SEED_ENV_FILE to the environment file you want to seed."
  );
}

const prisma = new PrismaClient();
const DEFAULT_ADDRESS = process.env.CAMPUS_SEED_ADDRESS?.trim() || "Campus";

async function findSeedOwnerUserId() {
  const explicitRestaurantId = process.env.CAMPUS_SEED_OWNER_RESTAURANT_ID?.trim();
  if (explicitRestaurantId) {
    const membership = await prisma.restaurantStaff.findFirst({
      where: {
        restaurantId: explicitRestaurantId,
        role: "OWNER",
        isActive: true,
      },
      select: { userId: true },
      orderBy: { createdAt: "asc" },
    });

    if (!membership) {
      throw new Error(
        "CAMPUS_SEED_OWNER_RESTAURANT_ID does not have an active OWNER membership."
      );
    }

    return membership.userId;
  }

  const sourceName =
    process.env.CAMPUS_SEED_OWNER_RESTAURANT_NAME?.trim() || "Mama's Kitchen";

  const sourceRestaurant = await prisma.restaurant.findFirst({
    where: { name: sourceName },
    select: {
      staff: {
        where: {
          role: "OWNER",
          isActive: true,
        },
        select: { userId: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (sourceRestaurant?.staff[0]?.userId) {
    return sourceRestaurant.staff[0].userId;
  }

  const fallback = await prisma.restaurantStaff.findFirst({
    where: {
      role: "OWNER",
      isActive: true,
    },
    select: { userId: true },
    orderBy: { createdAt: "asc" },
  });

  return fallback?.userId ?? null;
}

async function upsertRestaurant(definition, ownerUserId) {
  const existing = await prisma.restaurant.findFirst({
    where: { name: definition.name },
    orderBy: { createdAt: "asc" },
  });

  const heroImage =
    FOOD_IMAGES[definition.hero] ||
    FOOD_IMAGES.general;

  let restaurant;

  if (existing) {
    const updateData = {};

    if (!existing.imageUrl) updateData.imageUrl = heroImage;
    if (!existing.address) updateData.address = DEFAULT_ADDRESS;
    if (!existing.phoneNumber && definition.phoneNumber) {
      updateData.phoneNumber = definition.phoneNumber;
    }

    restaurant = Object.keys(updateData).length
      ? await prisma.restaurant.update({
          where: { id: existing.id },
          data: updateData,
        })
      : existing;
  } else {
    restaurant = await prisma.restaurant.create({
      data: {
        name: definition.name,
        phoneNumber: definition.phoneNumber,
        address: DEFAULT_ADDRESS,
        imageUrl: heroImage,
        isOpen: true,
        isVerified: false,
      },
    });
  }

  if (ownerUserId) {
    await prisma.restaurantStaff.upsert({
      where: {
        userId_restaurantId: {
          userId: ownerUserId,
          restaurantId: restaurant.id,
        },
      },
      update: {
        role: "OWNER",
        isActive: true,
      },
      create: {
        userId: ownerUserId,
        restaurantId: restaurant.id,
        role: "OWNER",
        isActive: true,
      },
    });
  }

  const categories = new Map();

  for (const categoryName of [
    ...new Set(definition.items.map((item) => item.category)),
  ]) {
    const category = await prisma.menuCategory.upsert({
      where: {
        restaurantId_name: {
          restaurantId: restaurant.id,
          name: categoryName,
        },
      },
      update: {},
      create: {
        restaurantId: restaurant.id,
        name: categoryName,
      },
    });

    categories.set(categoryName, category);
  }

  let createdItems = 0;
  let updatedItems = 0;

  for (const item of definition.items) {
    const existingItem = await prisma.menuItem.findFirst({
      where: {
        restaurantId: restaurant.id,
        name: item.name,
      },
      orderBy: { createdAt: "asc" },
    });

    const category = categories.get(item.category);
    if (!category) {
      throw new Error(
        "Missing category " + item.category + " for " + definition.name
      );
    }

    const fallbackImage = imageForItem(item);

    if (existingItem) {
      await prisma.menuItem.update({
        where: { id: existingItem.id },
        data: {
          categoryId: category.id,
          price: item.price,
          imageUrl: existingItem.imageUrl || fallbackImage,
          isAvailable: true,
          isArchived: false,
        },
      });
      updatedItems += 1;
    } else {
      await prisma.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: category.id,
          name: item.name,
          price: item.price,
          imageUrl: fallbackImage,
          isAvailable: true,
          isArchived: false,
        },
      });
      createdItems += 1;
    }
  }

  return {
    restaurant,
    categories: categories.size,
    createdItems,
    updatedItems,
  };
}

async function main() {
  console.log("\nPaperbag campus restaurant seed");
  console.log("-------------------------------");
  console.log("Environment:", envFile || "process environment only");
  console.log("Restaurants:", CAMPUS_RESTAURANTS.length);
  console.log("Fallback address:", DEFAULT_ADDRESS);

  const ownerUserId = await findSeedOwnerUserId();

  if (ownerUserId) {
    console.log(
      "Dashboard access: the active owner account from the seed source restaurant will also own these seeded restaurants for testing."
    );
  } else {
    console.warn(
      "No active OWNER membership was found. Restaurants and menus will still be seeded, but no dashboard owner will be attached."
    );
  }

  let createdItems = 0;
  let updatedItems = 0;

  for (const definition of CAMPUS_RESTAURANTS) {
    const result = await upsertRestaurant(definition, ownerUserId);
    createdItems += result.createdItems;
    updatedItems += result.updatedItems;

    console.log(
      "✓ " +
        definition.name +
        " — " +
        definition.items.length +
        " items across " +
        result.categories +
        " categories"
    );
  }

  const seededNames = CAMPUS_RESTAURANTS.map((restaurant) => restaurant.name);
  const paymentPending = await prisma.restaurant.count({
    where: {
      name: { in: seededNames },
      paystackSubaccountCode: null,
    },
  });

  console.log("\nSeed complete.");
  console.log(
    "Menu items created: " +
      createdItems +
      "; updated: " +
      updatedItems +
      "."
  );

  if (paymentPending > 0) {
    console.log(
      paymentPending +
        " seeded restaurants still need their own Paystack subaccount before customer checkout can charge orders from them."
    );
  }

  console.log(
    "\nRun this script again any time: it updates matching restaurant/menu names instead of duplicating them."
  );
}

main()
  .catch((error) => {
    console.error("\nCampus seed failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
