import { PrismaClient, StaffRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "mathew.com.com@gmail.com";

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      restaurantStaff: {
        include: {
          restaurant: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error(`No OrderEats user found with email: ${email}`);
  }

  if (user.restaurantStaff.length === 0) {
    throw new Error(`${email} is not attached to any restaurant.`);
  }

  if (user.restaurantStaff.length > 1) {
    console.log("User belongs to multiple restaurants:");

    for (const membership of user.restaurantStaff) {
      console.log(
        `- ${membership.restaurant.name} (${membership.restaurantId}) — ${membership.role}`
      );
    }

    throw new Error(
      "More than one restaurant found. Stopping so we don't promote the wrong membership."
    );
  }

  const membership = user.restaurantStaff[0];

  const updated = await prisma.restaurantStaff.update({
    where: {
      id: membership.id,
    },
    data: {
      role: StaffRole.OWNER,
      isActive: true,
    },
    include: {
      restaurant: true,
      user: true,
    },
  });

  console.log("\n✅ Owner updated");
  console.log(`User: ${updated.user.email}`);
  console.log(`Restaurant: ${updated.restaurant.name}`);
  console.log(`Role: ${updated.role}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });