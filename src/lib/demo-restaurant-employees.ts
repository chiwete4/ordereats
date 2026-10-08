import { prisma } from "@/lib/prisma";

// Real, persisted database rows for a classroom demonstration, not Clerk
// sign-in accounts or actual restaurant employees. Use example.com so these
// profiles never impersonate someone's real mailbox.
const NAMES = [
  ["Amina", "Bello"], ["Tolu", "Martins"], ["Jide", "Okafor"],
  ["Zara", "Musa"], ["Chidi", "Eze"], ["Hauwa", "Ibrahim"],
  ["Femi", "Adeyemi"], ["Amara", "Nwosu"], ["Seyi", "Ojo"],
  ["Fatima", "Yusuf"], ["Kelechi", "Obi"], ["Bola", "Adebayo"],
  ["Ife", "Okon"], ["Timi", "Lawal"], ["Zainab", "Ahmed"],
  ["Uche", "Nnamdi"], ["Mariam", "Ali"], ["David", "Usman"],
  ["Chioma", "Eke"], ["Tobi", "Salami"], ["Nkechi", "Ifeanyi"],
  ["Sani", "Umar"], ["Temi", "Aina"], ["Adaeze", "Nwankwo"],
] as const;

type DemoRestaurant = { id: string };

export async function ensureDemoRestaurantEmployees(restaurants: DemoRestaurant[]) {
  if (restaurants.length === 0) return;

  const ids = restaurants.map((restaurant) => restaurant.id);
  const expected = restaurants.length * 4;
  const existing = await prisma.restaurantStaff.count({
    where: {
      restaurantId: { in: ids },
      user: { clerkId: { startsWith: "paperbag_demo_clerk_" } },
    },
  });
  if (existing >= expected) return;

  const team = restaurants.flatMap((restaurant, restaurantIndex) =>
    Array.from({ length: 4 }, (_, slot) => {
      const [firstName, lastName] = NAMES[(restaurantIndex * 4 + slot) % NAMES.length];
      const key = restaurant.id + "_" + String(slot + 1);
      return {
        id: "paperbag_demo_user_" + key,
        clerkId: "paperbag_demo_clerk_" + key,
        email: "paperbag-demo-" + restaurant.id + "-" + String(slot + 1) + "@example.com",
        firstName: firstName + " (Demo)",
        lastName,
        restaurantId: restaurant.id,
        role: slot < 2 ? ("STAFF" as const) : ("RIDER" as const),
      };
    })
  );

  await prisma.user.createMany({
    data: team.map(({ id, clerkId, email, firstName, lastName }) => ({
      id, clerkId, email, firstName, lastName,
    })),
    skipDuplicates: true,
  });

  await prisma.restaurantStaff.createMany({
    data: team.map(({ id, restaurantId, role }) => ({
      userId: id,
      restaurantId,
      role,
      isActive: true,
    })),
    skipDuplicates: true,
  });
}
