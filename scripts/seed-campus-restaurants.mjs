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
const DEFAULT_ADDRESS =
  process.env.CAMPUS_SEED_ADDRESS?.trim() || "Baze University, Abuja";

const BAZE_CAMPUS_CENTER = { latitude: 9.00603935, longitude: 7.40519329 };
const PAYSTACK_BASE_URL = "https://api.paystack.co";
const PAPERBAG_PLATFORM_COMMISSION_PERCENT = 5;

// Exact Google Earth pins supplied for the Baze University restaurant locations.
// DMS coordinates were converted to decimal degrees for Mapbox/PostgreSQL.
const CAMPUS_LOCATIONS = {
  "Quick Fix Baze": { latitude: 9.00566111, longitude: 7.40595278 },
  "11:29": { latitude: 9.00547778, longitude: 7.40476389 },
  "Iced Coffee Kiosk": { latitude: 9.00548056, longitude: 7.40445278 },
  "strEatz": { latitude: 9.00555833, longitude: 7.40472778 },
  "Papa Rimz Base": { latitude: 9.007375, longitude: 7.405225 },
  "Sizzles Café": { latitude: 9.00733333, longitude: 7.40516944 },
  "W Sauce": { latitude: 9.00604444, longitude: 7.40578056 },
  "Yerwa Chow": { latitude: 9.00576944, longitude: 7.40592222 },
  "Aji's Bukka LTD": { latitude: 9.00556944, longitude: 7.40611944 },
  "The Brim": { latitude: 9.00550833, longitude: 7.40461111 },
  "AYCE": { latitude: 9.00529722, longitude: 7.40445556 },
  "The Terminal": { latitude: 9.00739722, longitude: 7.40513889 },
};

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

async function findPaymentSourceRestaurant() {
  const sourceName =
    process.env.CAMPUS_SEED_PAYMENT_SOURCE_RESTAURANT?.trim() || "Mama's Kitchen";

  return prisma.restaurant.findFirst({
    where: { name: sourceName },
    orderBy: { createdAt: "asc" },
  });
}

function paystackSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) return null;

  if (
    key.startsWith("sk_live_") &&
    process.env.ALLOW_LIVE_PAYSTACK_CAMPUS_SEED !== "1"
  ) {
    throw new Error(
      "Refusing to create campus demo subaccounts with a live Paystack key. Use your test key or explicitly set ALLOW_LIVE_PAYSTACK_CAMPUS_SEED=1."
    );
  }

  return key;
}

async function createCampusSubaccount(restaurant, paymentSource) {
  const secret = paystackSecretKey();
  if (!secret) return null;

  const response = await fetch(PAYSTACK_BASE_URL + "/subaccount", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + secret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      business_name: restaurant.name,
      settlement_bank: paymentSource.payoutBankCode,
      account_number: paymentSource.payoutAccountNumber,
      percentage_charge: PAPERBAG_PLATFORM_COMMISSION_PERCENT,
      description: "Paperbag Baze University demo restaurant " + restaurant.id,
      metadata: JSON.stringify({
        restaurantId: restaurant.id,
        product: "paperbag",
        campus: "Baze University",
        seededFrom: paymentSource.name,
      }),
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload?.status || !payload?.data?.subaccount_code) {
    throw new Error(
      "Paystack subaccount creation failed for " +
        restaurant.name +
        ": " +
        (payload?.message || response.statusText)
    );
  }

  return payload.data;
}

async function syncDemoPaymentSetup(restaurant, paymentSource) {
  if (
    !paymentSource?.payoutBankCode ||
    !paymentSource?.payoutAccountNumber ||
    !paymentSource?.payoutAccountName
  ) {
    return { mode: "missing-source" };
  }

  let subaccountCode = restaurant.paystackSubaccountCode;
  let subaccountId = restaurant.paystackSubaccountId;
  let mode = "existing";

  if (!subaccountCode) {
    const created = await createCampusSubaccount(restaurant, paymentSource);

    if (created) {
      subaccountCode = created.subaccount_code;
      subaccountId = String(created.id);
      mode = "created";
    } else if (paymentSource.paystackSubaccountCode) {
      // Useful for a local single-restaurant demo if the Paystack secret is not
      // present. With a test secret available, each campus restaurant gets its
      // own subaccount code while still settling to the same demo bank account.
      subaccountCode = paymentSource.paystackSubaccountCode;
      subaccountId = paymentSource.paystackSubaccountId;
      mode = "shared-fallback";
    }
  }

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: {
      payoutBankName: paymentSource.payoutBankName,
      payoutBankCode: paymentSource.payoutBankCode,
      payoutAccountName: paymentSource.payoutAccountName,
      payoutAccountNumber: paymentSource.payoutAccountNumber,
      payoutRecipientCode: paymentSource.payoutRecipientCode,
      payoutRecipientId: paymentSource.payoutRecipientId,
      paystackSubaccountCode: subaccountCode,
      paystackSubaccountId: subaccountId,
      payoutVerifiedAt:
        subaccountCode
          ? paymentSource.payoutVerifiedAt || new Date()
          : null,
    },
  });

  return { mode };
}

async function upsertRestaurant(definition, ownerUserId) {
  const existing = await prisma.restaurant.findFirst({
    where: { name: definition.name },
    orderBy: { createdAt: "asc" },
  });

  const heroImage =
    FOOD_IMAGES[definition.hero] ||
    FOOD_IMAGES.general;

  const location = CAMPUS_LOCATIONS[definition.name] || BAZE_CAMPUS_CENTER;
  let restaurant;

  if (existing) {
    const updateData = {
      address: DEFAULT_ADDRESS,
      latitude: location.latitude,
      longitude: location.longitude,
    };

    if (!existing.imageUrl) updateData.imageUrl = heroImage;
    if (!existing.isVerified) updateData.isVerified = true;
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
        latitude: location.latitude,
        longitude: location.longitude,
        imageUrl: heroImage,
        isOpen: true,
        isVerified: true,
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

  if (definition.name === "W Sauce") {
    await prisma.menuItem.updateMany({
      where: {
        restaurantId: restaurant.id,
        name: "Regular - Strawberry, Watermelon & Pineapple",
      },
      data: {
        isAvailable: false,
        isArchived: true,
      },
    });
  }

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
  const paymentSource = await findPaymentSourceRestaurant();

  if (paymentSource) {
    console.log(
      "Payment source: " +
        paymentSource.name +
        " — campus restaurants will use the same demo settlement bank account."
    );
  } else {
    console.warn(
      "Payment source restaurant was not found. Campus restaurants will seed normally, but checkout will remain unavailable until payout details are added."
    );
  }

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
  let paymentCreated = 0;
  let paymentSharedFallback = 0;

  for (const definition of CAMPUS_RESTAURANTS) {
    const result = await upsertRestaurant(definition, ownerUserId);
    createdItems += result.createdItems;
    updatedItems += result.updatedItems;

    const paymentResult = paymentSource
      ? await syncDemoPaymentSetup(result.restaurant, paymentSource)
      : { mode: "missing-source" };

    if (paymentResult.mode === "created") paymentCreated += 1;
    if (paymentResult.mode === "shared-fallback") paymentSharedFallback += 1;

    console.log(
      "✓ " +
        definition.name +
        " — " +
        definition.items.length +
        " items across " +
        result.categories +
        " categories" +
        (paymentResult.mode === "created"
          ? " · Paystack subaccount created"
          : paymentResult.mode === "existing"
            ? " · Paystack ready"
            : paymentResult.mode === "shared-fallback"
              ? " · using demo payment fallback"
              : "")
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
        " seeded restaurants still need Paystack setup before customer checkout can charge orders from them."
    );
  }

  if (paymentCreated > 0) {
    console.log(
      "Created " +
        paymentCreated +
        " Paystack subaccounts using the same demo settlement account as " +
        paymentSource.name +
        "."
    );
  }

  if (paymentSharedFallback > 0) {
    console.warn(
      paymentSharedFallback +
        " restaurants are sharing the source Paystack subaccount because PAYSTACK_SECRET_KEY was not available locally. Single-restaurant demo checkout works, but rerun with the test secret before testing a multi-restaurant split."
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
