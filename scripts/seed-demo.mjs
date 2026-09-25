import fs from "node:fs";
import path from "node:path";

import { createClerkClient } from "@clerk/backend";
import { PrismaClient } from "@prisma/client";

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
const DEFAULT_PASSWORD =
  process.env.SEED_TEST_PASSWORD || "PaperbagDemo!2026";

const TEST_PEOPLE = [
  {
    key: "staff",
    email: "paperbag.staff+clerk_test@example.com",
    firstName: "Tolu",
    lastName: "Martins",
    role: "STAFF",
  },
  {
    key: "rider1",
    email: "paperbag.rider1+clerk_test@example.com",
    firstName: "Jide",
    lastName: "Okafor",
    role: "RIDER",
  },
  {
    key: "rider2",
    email: "paperbag.rider2+clerk_test@example.com",
    firstName: "Amina",
    lastName: "Bello",
    role: "RIDER",
  },
  {
    key: "customer1",
    email: "paperbag.customer1+clerk_test@example.com",
    firstName: "Chioma",
    lastName: "Eze",
  },
  {
    key: "customer2",
    email: "paperbag.customer2+clerk_test@example.com",
    firstName: "David",
    lastName: "Adeyemi",
  },
  {
    key: "customer3",
    email: "paperbag.customer3+clerk_test@example.com",
    firstName: "Zainab",
    lastName: "Musa",
  },
  {
    key: "customer4",
    email: "paperbag.customer4+clerk_test@example.com",
    firstName: "Michael",
    lastName: "Okon",
  },
  {
    key: "customer5",
    email: "paperbag.customer5+clerk_test@example.com",
    firstName: "Amara",
    lastName: "Nwosu",
  },
];

const MENU = [
  {
    category: "Burgers",
    name: "Smash Burger",
    description: "Double beef patty, cheddar, pickles and house sauce.",
    price: 6800,
    imageUrl:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    readyMin: 8,
    readyMax: 12,
  },
  {
    category: "Burgers",
    name: "Crispy Chicken Burger",
    description: "Crispy chicken, slaw, pickles and pepper mayo.",
    price: 6200,
    imageUrl:
      "https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=800&q=80",
    readyMin: 8,
    readyMax: 12,
  },
  {
    category: "Nigerian",
    name: "Smoky Jollof Rice",
    description: "Party-style smoky jollof with grilled chicken.",
    price: 7200,
    imageUrl:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80",
    readyMin: 10,
    readyMax: 15,
  },
  {
    category: "Nigerian",
    name: "Peppered Chicken",
    description: "Charred chicken tossed in a spicy pepper glaze.",
    price: 6500,
    imageUrl:
      "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&q=80",
    readyMin: 9,
    readyMax: 14,
  },
  {
    category: "Sides",
    name: "Loaded Fries",
    description: "Crispy fries, cheese sauce, onions and house seasoning.",
    price: 4200,
    imageUrl:
      "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80",
    readyMin: 5,
    readyMax: 8,
  },
  {
    category: "Sides",
    name: "Hot Wings",
    description: "Six wings tossed in spicy house sauce.",
    price: 5200,
    imageUrl:
      "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=800&q=80",
    readyMin: 7,
    readyMax: 10,
  },
  {
    category: "Mains",
    name: "Creamy Chicken Pasta",
    description: "Creamy garlic pasta with grilled chicken.",
    price: 7600,
    imageUrl:
      "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80",
    readyMin: 10,
    readyMax: 15,
  },
  {
    category: "Mains",
    name: "Pepperoni Pizza",
    description: "Thin crust pizza with mozzarella and pepperoni.",
    price: 8900,
    imageUrl:
      "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=800&q=80",
    readyMin: 12,
    readyMax: 18,
  },
  {
    category: "Drinks",
    name: "Chapman",
    description: "Classic Nigerian Chapman served chilled.",
    price: 2600,
    imageUrl:
      "https://images.unsplash.com/photo-1546171753-97d7676e4602?auto=format&fit=crop&w=800&q=80",
    readyMin: 1,
    readyMax: 3,
  },
  {
    category: "Drinks",
    name: "Fresh Lemonade",
    description: "Fresh lemon, mint and a touch of cane sugar.",
    price: 2400,
    imageUrl:
      "https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9d?auto=format&fit=crop&w=800&q=80",
    readyMin: 1,
    readyMax: 3,
  },
  {
    category: "Desserts",
    name: "Chocolate Cake",
    description: "Rich chocolate cake with chocolate ganache.",
    price: 3900,
    imageUrl:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
    readyMin: 2,
    readyMax: 4,
  },
  {
    category: "Desserts",
    name: "Vanilla Cheesecake",
    description: "Baked vanilla cheesecake with berry sauce.",
    price: 4300,
    imageUrl:
      "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80",
    readyMin: 2,
    readyMax: 4,
  },
];

function minutesAgo(value) {
  return new Date(Date.now() - value * 60_000);
}

function daysAgo(days, hours = 0) {
  return new Date(Date.now() - (days * 24 + hours) * 60 * 60_000);
}

function demoReference(index) {
  return `demo_pay_${String(index).padStart(3, "0")}`;
}

async function getOrCreateClerkUser(person) {
  const secret = process.env.CLERK_SECRET_KEY?.trim();

  if (!secret) {
    return {
      id: `seed_clerk_${person.key}`,
      createdInClerk: false,
      authMode: "database-only",
    };
  }

  if (
    secret.startsWith("sk_live_") &&
    process.env.ALLOW_LIVE_CLERK_SEED !== "1"
  ) {
    throw new Error(
      "Refusing to create demo Clerk users with a live Clerk secret. Use the Development instance keys or explicitly set ALLOW_LIVE_CLERK_SEED=1."
    );
  }

  const client = createClerkClient({ secretKey: secret });
  const existing = await client.users.getUserList({
    emailAddress: [person.email],
    limit: 1,
  });

  if (existing.data[0]) {
    return {
      id: existing.data[0].id,
      createdInClerk: false,
      authMode: "existing",
    };
  }

  try {
    const created = await client.users.createUser({
      emailAddress: [person.email],
      firstName: person.firstName,
      lastName: person.lastName,
      password: DEFAULT_PASSWORD,
      publicMetadata: {
        seededBy: "paperbag-demo",
        demoRole: person.role || "CUSTOMER",
      },
    });

    return {
      id: created.id,
      createdInClerk: true,
      authMode: "password",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    const created = await client.users.createUser({
      emailAddress: [person.email],
      firstName: person.firstName,
      lastName: person.lastName,
      skipPasswordRequirement: true,
      publicMetadata: {
        seededBy: "paperbag-demo",
        demoRole: person.role || "CUSTOMER",
        passwordCreateError: message.slice(0, 200),
      },
    });

    return {
      id: created.id,
      createdInClerk: true,
      authMode: "email-code",
    };
  }
}

async function seedPeople() {
  const people = {};

  for (const person of TEST_PEOPLE) {
    const clerk = await getOrCreateClerkUser(person);

    const user = await prisma.user.upsert({
      where: { email: person.email },
      update: {
        clerkId: clerk.id,
        firstName: person.firstName,
        lastName: person.lastName,
      },
      create: {
        clerkId: clerk.id,
        email: person.email,
        firstName: person.firstName,
        lastName: person.lastName,
      },
    });

    people[person.key] = {
      ...person,
      user,
      clerk,
    };
  }

  return people;
}

async function chooseRestaurant() {
  if (process.env.SEED_RESTAURANT_ID) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: process.env.SEED_RESTAURANT_ID },
      include: {
        staff: {
          where: { role: "OWNER" },
          take: 1,
        },
      },
    });

    if (!restaurant) {
      throw new Error(
        `SEED_RESTAURANT_ID=${process.env.SEED_RESTAURANT_ID} does not exist.`
      );
    }

    return restaurant;
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: {
      staff: {
        some: {
          role: "OWNER",
          isActive: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
    include: {
      staff: {
        where: { role: "OWNER" },
        take: 1,
      },
    },
  });

  if (!restaurant) {
    throw new Error(
      "No restaurant with an active owner exists yet. Create your restaurant once, then run the demo seed again."
    );
  }

  return restaurant;
}

async function clearPreviousDemoOrders(restaurantId, demoCustomerIds) {
  const orders = await prisma.order.findMany({
    where: {
      orderNumber: {
        startsWith: "DEMO-",
      },
      restaurantOrders: {
        some: {
          restaurantId,
        },
      },
    },
    select: {
      id: true,
      restaurantOrders: {
        where: { restaurantId },
        select: {
          id: true,
          payoutOrder: {
            select: {
              payoutId: true,
            },
          },
        },
      },
    },
  });

  const restaurantOrderIds = orders.flatMap((order) =>
    order.restaurantOrders.map((row) => row.id)
  );

  if (
    orders.some((order) =>
      order.restaurantOrders.some((row) => row.payoutOrder)
    )
  ) {
    throw new Error(
      "Some previous DEMO orders were included in a payout. Use a fresh test database or remove those demo payout records before reseeding."
    );
  }

  if (restaurantOrderIds.length) {
    await prisma.$transaction([
      prisma.review.deleteMany({
        where: {
          restaurantId,
          OR: [
            { restaurantOrderId: { in: restaurantOrderIds } },
            { customerId: { in: demoCustomerIds } },
          ],
        },
      }),
      prisma.customerComplaint.deleteMany({
        where: {
          restaurantId,
          OR: [
            { restaurantOrderId: { in: restaurantOrderIds } },
            { customerId: { in: demoCustomerIds } },
          ],
        },
      }),
      prisma.delivery.deleteMany({
        where: {
          restaurantOrderId: { in: restaurantOrderIds },
        },
      }),
      prisma.orderItem.deleteMany({
        where: {
          restaurantOrderId: { in: restaurantOrderIds },
        },
      }),
      prisma.restaurantOrder.deleteMany({
        where: {
          id: { in: restaurantOrderIds },
        },
      }),
      prisma.payment.deleteMany({
        where: {
          orderId: { in: orders.map((order) => order.id) },
        },
      }),
      prisma.order.deleteMany({
        where: {
          id: { in: orders.map((order) => order.id) },
        },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.review.deleteMany({
        where: {
          restaurantId,
          customerId: { in: demoCustomerIds },
        },
      }),
      prisma.customerComplaint.deleteMany({
        where: {
          restaurantId,
          customerId: { in: demoCustomerIds },
        },
      }),
    ]);
  }
}

async function seedMenu(restaurantId) {
  const categoryNames = [...new Set(MENU.map((item) => item.category))];
  const categories = {};

  for (const name of categoryNames) {
    categories[name] = await prisma.menuCategory.upsert({
      where: {
        restaurantId_name: {
          restaurantId,
          name,
        },
      },
      update: {},
      create: {
        restaurantId,
        name,
      },
    });
  }

  const items = {};

  for (const item of MENU) {
    const existing = await prisma.menuItem.findFirst({
      where: {
        restaurantId,
        name: item.name,
      },
    });

    const data = {
      categoryId: categories[item.category].id,
      name: item.name,
      description: item.description,
      price: item.price,
      imageUrl: item.imageUrl,
      isAvailable: true,
      isArchived: false,
      readyMin: item.readyMin,
      readyMax: item.readyMax,
      deliverySeconds: 45,
    };

    items[item.name] = existing
      ? await prisma.menuItem.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.menuItem.create({
          data: {
            restaurantId,
            ...data,
          },
        });
  }

  return { categories, items };
}

async function seedCombos(restaurantId, items) {
  const definitions = [
    {
      name: "Burger Night",
      readyMin: 10,
      readyMax: 15,
      items: [
        ["Smash Burger", 2],
        ["Loaded Fries", 1],
        ["Chapman", 2],
      ],
    },
    {
      name: "Jollof & Wings",
      readyMin: 12,
      readyMax: 18,
      items: [
        ["Smoky Jollof Rice", 2],
        ["Hot Wings", 1],
        ["Fresh Lemonade", 2],
      ],
    },
    {
      name: "Pizza Date",
      readyMin: 14,
      readyMax: 20,
      items: [
        ["Pepperoni Pizza", 1],
        ["Hot Wings", 1],
        ["Chocolate Cake", 2],
      ],
    },
  ];

  const combos = {};

  for (const [index, definition] of definitions.entries()) {
    let combo = await prisma.featuredCombo.findFirst({
      where: {
        restaurantId,
        name: definition.name,
      },
    });

    if (!combo) {
      combo = await prisma.featuredCombo.create({
        data: {
          restaurantId,
          name: definition.name,
          readyMin: definition.readyMin,
          readyMax: definition.readyMax,
          deliverySeconds: 45,
          sortOrder: index,
        },
      });
    } else {
      combo = await prisma.featuredCombo.update({
        where: { id: combo.id },
        data: {
          readyMin: definition.readyMin,
          readyMax: definition.readyMax,
          sortOrder: index,
        },
      });
    }

    await prisma.featuredComboItem.deleteMany({
      where: { comboId: combo.id },
    });

    await prisma.featuredComboItem.createMany({
      data: definition.items.map(([name, quantity]) => ({
        comboId: combo.id,
        menuItemId: items[name].id,
        quantity,
      })),
    });

    combos[definition.name] = combo;
  }

  return combos;
}

async function seedMemberships(restaurantId, people) {
  for (const key of ["staff", "rider1", "rider2"]) {
    const person = people[key];

    await prisma.restaurantStaff.upsert({
      where: {
        userId_restaurantId: {
          userId: person.user.id,
          restaurantId,
        },
      },
      update: {
        role: person.role,
        isActive: true,
      },
      create: {
        userId: person.user.id,
        restaurantId,
        role: person.role,
        isActive: true,
      },
    });
  }
}

function buildOrderSpecs(people) {
  const customers = [
    people.customer1.user,
    people.customer2.user,
    people.customer3.user,
    people.customer4.user,
    people.customer5.user,
  ];

  const fresh = [
    { status: "CONFIRMED", createdAt: minutesAgo(1), customer: 0 },
    { status: "CONFIRMED", createdAt: minutesAgo(3), customer: 1 },
    { status: "CONFIRMED", createdAt: minutesAgo(6), customer: 2 },
    { status: "CONFIRMED", createdAt: minutesAgo(10), customer: 3 },
    { status: "PREPARING", createdAt: minutesAgo(14), customer: 4 },
    { status: "PREPARING", createdAt: minutesAgo(22), customer: 0 },
    { status: "PREPARING", createdAt: minutesAgo(34), customer: 1 },
    { status: "READY_FOR_PICKUP", createdAt: minutesAgo(28), customer: 2 },
    { status: "READY_FOR_PICKUP", createdAt: minutesAgo(41), customer: 3 },
    {
      status: "OUT_FOR_DELIVERY",
      createdAt: minutesAgo(48),
      customer: 4,
      riderKey: "rider1",
    },
    {
      status: "OUT_FOR_DELIVERY",
      createdAt: minutesAgo(56),
      customer: 0,
      riderKey: "rider2",
    },
  ];

  const history = [];
  const statuses = ["DELIVERED", "DELIVERED", "PICKED_UP", "DELIVERED", "CANCELLED"];

  for (let index = 0; index < 30; index += 1) {
    const day = 1 + (index % 14);
    const hourOffset = (index * 3) % 18;

    history.push({
      status: statuses[index % statuses.length],
      createdAt: daysAgo(day, hourOffset),
      customer: index % customers.length,
      riderKey: index % 3 === 0 ? "rider1" : "rider2",
    });
  }

  return [...fresh, ...history].map((spec) => ({
    ...spec,
    customer: customers[spec.customer],
  }));
}

function pickItems(menuItems, index) {
  const names = Object.keys(menuItems);
  const first = menuItems[names[index % names.length]];
  const second = menuItems[names[(index * 3 + 2) % names.length]];
  const third = menuItems[names[(index * 5 + 4) % names.length]];

  return [
    { item: first, quantity: 1 + (index % 2) },
    { item: second, quantity: 1 },
    ...(index % 3 === 0 ? [{ item: third, quantity: 1 }] : []),
  ];
}

async function createDemoOrder({
  restaurant,
  people,
  menuItems,
  spec,
  index,
}) {
  const chosen = pickItems(menuItems, index);
  const subtotal = chosen.reduce(
    (sum, entry) => sum + Number(entry.item.price) * entry.quantity,
    0
  );
  const deliveryFee =
    ["PICKED_UP"].includes(spec.status) ? 0 : 1500;
  const serviceFee = 500;
  const total = subtotal + deliveryFee + serviceFee;
  const orderNumber = `DEMO-${String(index + 1).padStart(4, "0")}`;
  const baseLat = restaurant.latitude ?? 6.5244;
  const baseLng = restaurant.longitude ?? 3.3792;
  const latitude = baseLat + ((index % 5) - 2) * 0.006;
  const longitude = baseLng + ((index % 7) - 3) * 0.006;
  const isPaid = !["CONFIRMED"].includes(spec.status);
  const rider = spec.riderKey ? people[spec.riderKey].user : null;

  const delivery =
    spec.status === "OUT_FOR_DELIVERY"
      ? {
          create: {
            riderId: rider?.id,
            status: "OUT_FOR_DELIVERY",
            assignedAt: new Date(spec.createdAt.getTime() + 20 * 60_000),
            pickedUpAt: new Date(spec.createdAt.getTime() + 35 * 60_000),
            lastLatitude: latitude + 0.003,
            lastLongitude: longitude - 0.002,
            lastLocationAt:
              index === 9 ? new Date() : minutesAgo(3 + index),
          },
        }
      : spec.status === "DELIVERED"
        ? {
            create: {
              riderId: rider?.id,
              status: "DELIVERED",
              assignedAt: new Date(spec.createdAt.getTime() + 20 * 60_000),
              pickedUpAt: new Date(spec.createdAt.getTime() + 35 * 60_000),
              deliveredAt: new Date(spec.createdAt.getTime() + 70 * 60_000),
              lastLatitude: latitude,
              lastLongitude: longitude,
              lastLocationAt: new Date(spec.createdAt.getTime() + 70 * 60_000),
            },
          }
        : spec.status === "CANCELLED"
          ? {
              create: {
                status: "CANCELLED",
              },
            }
          : undefined;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerId: spec.customer.id,
      subtotal,
      deliveryFee,
      serviceFee,
      total,
      deliveryLatitude: latitude,
      deliveryLongitude: longitude,
      deliveryNote:
        index % 4 === 0
          ? "Please call when you arrive at the gate."
          : null,
      createdAt: spec.createdAt,
      payment: {
        create: {
          reference: demoReference(index + 1),
          amount: total,
          status: isPaid ? "SUCCESS" : "PENDING",
          paidAt: isPaid ? spec.createdAt : null,
          createdAt: spec.createdAt,
        },
      },
      restaurantOrders: {
        create: {
          restaurantId: restaurant.id,
          status: spec.status,
          subtotal,
          createdAt: spec.createdAt,
          items: {
            create: chosen.map((entry) => ({
              menuItemId: entry.item.id,
              name: entry.item.name,
              unitPrice: entry.item.price,
              quantity: entry.quantity,
            })),
          },
          ...(delivery ? { delivery } : {}),
        },
      },
    },
    include: {
      restaurantOrders: {
        include: {
          items: true,
        },
      },
    },
  });

  return order;
}

async function seedReviewsAndComplaints({
  restaurantId,
  people,
  combos,
  menuItems,
}) {
  const demoOrders = await prisma.restaurantOrder.findMany({
    where: {
      restaurantId,
      order: {
        orderNumber: {
          startsWith: "DEMO-",
        },
      },
      status: {
        in: ["DELIVERED", "PICKED_UP"],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: {
      order: true,
    },
  });

  const customers = [
    people.customer1.user,
    people.customer2.user,
    people.customer3.user,
    people.customer4.user,
    people.customer5.user,
  ];

  const restaurantRatings = [
    [5, "Fast delivery and everything arrived hot."],
    [4, "Really good food. The fries were the standout."],
    [5, "The jollof was excellent. Ordering again."],
    [3, "Good overall, but the order took longer than expected."],
    [4, "Solid meal and the packaging was neat."],
  ];

  for (const [index, [rating, body]] of restaurantRatings.entries()) {
    await prisma.review.create({
      data: {
        restaurantId,
        customerId: customers[index].id,
        restaurantOrderId: demoOrders[index]?.id ?? null,
        target: "RESTAURANT",
        rating,
        body,
        isRead: index < 2,
        createdAt: daysAgo(index + 1, 2),
      },
    });
  }

  const comboEntries = Object.values(combos);
  for (let index = 0; index < 8; index += 1) {
    const combo = comboEntries[index % comboEntries.length];
    const customer = customers[index % customers.length];

    await prisma.review.create({
      data: {
        restaurantId,
        customerId: customer.id,
        restaurantOrderId: demoOrders[index]?.id ?? null,
        target: "FEATURED_COMBO",
        featuredComboId: combo.id,
        rating: [5, 4, 5, 4, 3, 5, 4, 5][index],
        body:
          index % 2 === 0
            ? "Great combo for sharing."
            : "Good value and the portions were generous.",
        isRead: index < 3,
        createdAt: daysAgo((index % 6) + 1, 1),
      },
    });
  }

  const itemEntries = Object.values(menuItems);
  for (let index = 0; index < 10; index += 1) {
    const item = itemEntries[index % itemEntries.length];
    const customer = customers[(index + 2) % customers.length];

    await prisma.review.create({
      data: {
        restaurantId,
        customerId: customer.id,
        restaurantOrderId: demoOrders[index]?.id ?? null,
        target: "MENU_ITEM",
        menuItemId: item.id,
        rating: [5, 4, 4, 5, 3, 5, 4, 5, 4, 5][index],
        body:
          index % 3 === 0
            ? "Would order this again."
            : "Tasted good and arrived in good condition.",
        isRead: index < 4,
        createdAt: daysAgo((index % 8) + 1, 3),
      },
    });
  }

  if (demoOrders[0]) {
    await prisma.customerComplaint.create({
      data: {
        restaurantId,
        customerId: people.customer3.user.id,
        restaurantOrderId: demoOrders[0].id,
        subject: "Missing drink",
        body: "The food arrived, but the Chapman from the order was missing.",
        status: "OPEN",
        createdAt: daysAgo(1, 1),
      },
    });
  }

  if (demoOrders[2]) {
    await prisma.customerComplaint.create({
      data: {
        restaurantId,
        customerId: people.customer1.user.id,
        restaurantOrderId: demoOrders[2].id,
        subject: "Late delivery",
        body: "Delivery arrived much later than the estimate shown at checkout.",
        status: "RESOLVED",
        createdAt: daysAgo(4, 2),
      },
    });
  }
}

async function main() {
  console.log("\nPaperbag demo seed");
  console.log("------------------");
  console.log(
    `Environment file: ${envFile || "process environment only"}`
  );

  const restaurant = await chooseRestaurant();
  console.log(
    `Restaurant: ${restaurant.name} (${restaurant.id})`
  );

  const people = await seedPeople();
  const demoCustomerIds = [
    people.customer1.user.id,
    people.customer2.user.id,
    people.customer3.user.id,
    people.customer4.user.id,
    people.customer5.user.id,
  ];

  await clearPreviousDemoOrders(restaurant.id, demoCustomerIds);
  await seedMemberships(restaurant.id, people);

  const { items } = await seedMenu(restaurant.id);
  const combos = await seedCombos(restaurant.id, items);

  const specs = buildOrderSpecs(people);
  for (const [index, spec] of specs.entries()) {
    await createDemoOrder({
      restaurant,
      people,
      menuItems: items,
      spec,
      index,
    });
  }

  await seedReviewsAndComplaints({
    restaurantId: restaurant.id,
    people,
    combos,
    menuItems: items,
  });

  console.log("\nSeed complete.");
  console.log(
    `Added ${MENU.length} menu items, ${Object.keys(combos).length} featured combos, ${specs.length} demo orders, reviews, complaints, staff and riders.`
  );

  console.log("\nClerk test accounts:");
  for (const key of ["staff", "rider1", "rider2", "customer1", "customer2"]) {
    const person = people[key];
    console.log(
      `  ${person.key.padEnd(10)} ${person.email}  [${person.clerk.authMode}]`
    );
  }

  if (process.env.CLERK_SECRET_KEY) {
    console.log(
      `\nPassword if your Clerk instance supports password sign-in: ${DEFAULT_PASSWORD}`
    );
    console.log(
      "For Clerk Development email-code sign-in, use the test code 424242 with these +clerk_test addresses."
    );
  } else {
    console.log(
      "\nCLERK_SECRET_KEY was not available, so the test users exist only in PostgreSQL. Add your Clerk Development secret and rerun the seed before rider sign-in testing."
    );
  }

  console.log(
    "\nTip: set SEED_RESTAURANT_ID if you ever want to target a different restaurant."
  );
}

main()
  .catch((error) => {
    console.error("\nSeed failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
