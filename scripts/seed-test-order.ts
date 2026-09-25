import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const restaurantId = process.argv[2];

  if (!restaurantId) {
    throw new Error(
      "Missing restaurant ID. Run: npx.cmd tsx scripts/seed-test-order.ts YOUR_RESTAURANT_ID",
    );
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: {
      menuItems: {
        where: { isAvailable: true },
        orderBy: { createdAt: "asc" },
        take: 2,
      },
      staff: {
        where: { role: "STAFF", isActive: true },
        include: { user: true },
        take: 1,
      },
    },
  });

  if (!restaurant) throw new Error("Restaurant not found.");
  if (restaurant.menuItems.length === 0) {
    throw new Error("This restaurant needs at least one available menu item first.");
  }

  // Prefer a real OrderEats user who is not attached to this restaurant.
  // If none exists yet, fall back to the active staff account purely for local testing.
  let customer = await prisma.user.findFirst({
    where: {
      restaurantStaff: { none: { restaurantId } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!customer) customer = restaurant.staff[0]?.user ?? null;
  if (!customer) throw new Error("No OrderEats user exists to use as the test customer.");

  const selectedItems = restaurant.menuItems.map((item, index) => ({
    item,
    quantity: index === 0 ? 2 : 1,
  }));

  const subtotal = selectedItems.reduce(
    (sum, { item, quantity }) => sum + Number(item.price) * quantity,
    0,
  );
  const deliveryFee = 500;
  const serviceFee = 150;
  const total = subtotal + deliveryFee + serviceFee;
  const suffix = `${Date.now()}`.slice(-8);
  const orderNumber = `OE-${suffix}`;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerId: customer.id,
      subtotal,
      deliveryFee,
      serviceFee,
      total,
      // Placeholder campus coordinates for development data only.
      deliveryLatitude: 9.0765,
      deliveryLongitude: 7.3986,
      deliveryNote: "Development test order — safe to delete later.",
      payment: {
        create: {
          reference: `TEST-${suffix}`,
          amount: total,
          status: "SUCCESS",
          provider: "test",
          paidAt: new Date(),
        },
      },
      restaurantOrders: {
        create: {
          restaurantId,
          status: "CONFIRMED",
          subtotal,
          items: {
            create: selectedItems.map(({ item, quantity }) => ({
              menuItemId: item.id,
              name: item.name,
              unitPrice: item.price,
              quantity,
            })),
          },
        },
      },
    },
    include: { restaurantOrders: true },
  });

  console.log("\nCreated one confirmed development order.");
  console.log(`Order number: ${order.orderNumber}`);
  console.log(`Customer: ${customer.firstName} ${customer.lastName} <${customer.email}>`);
  console.log(`Restaurant: ${restaurant.name}`);
  console.log(`Status: ${order.restaurantOrders[0].status}`);
  console.log(`Total: ₦${total.toLocaleString()}`);
  console.log("\nReload the restaurant dashboard to test the workflow.\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
