import { prisma } from "@/lib/prisma";

// Deterministic, distinct demo identities. These become real Clerk accounts
// only after an authorized manager activates their logins.
const FIRST_NAMES = [
  "Amina", "Tolu", "Jide", "Zara", "Chidi", "Hauwa", "Femi", "Amara",
  "Seyi", "Fatima", "Kelechi", "Bola", "Ife", "Timi", "Zainab", "Uche",
] as const;

const LAST_NAMES = [
  "Bello", "Martins", "Okafor", "Musa", "Eze", "Ibrahim",
  "Adeyemi", "Nwosu", "Lawal", "Okon",
] as const;

export function demoPersona(restaurantIndex: number, slot: number) {
  const n = restaurantIndex * 4 + slot - 1;
  return {
    firstName: FIRST_NAMES[n % FIRST_NAMES.length],
    lastName: LAST_NAMES[Math.floor(n / FIRST_NAMES.length) % LAST_NAMES.length],
    role: (slot <= 2 ? "STAFF" : "RIDER") as "STAFF" | "RIDER",
  };
}

export function demoUserId(restaurantId: string, slot: number) {
  return `paperbag_demo_user_${restaurantId}_${slot}`;
}

export function demoEmail(restaurantName: string, restaurantIndex: number, slot: number) {
  const { firstName, lastName } = demoPersona(restaurantIndex, slot);
  const campusSlug = restaurantName
    .normalize("NFKD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12) || "baze";
  // Human-readable but non-deliverable demo mailboxes. Clerk's +clerk_test
  // addresses additionally support the fixed test code on dev instances.
  const suffix = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_")
    ? "+clerk_test"
    : "";
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${campusSlug}${suffix}@example.com`;
}

type DemoRestaurant = { id: string };

export async function ensureDemoRestaurantEmployees(restaurants: DemoRestaurant[]) {
  if (restaurants.length === 0) return;

  const ids = restaurants.map(({ id }) => id);
  const expected = restaurants.length * 4;
  // Count by stable local user ID, not the fake Clerk ID: activated users
  // remain the same database employees and should not get duplicated.
  const existing = await prisma.restaurantStaff.count({
    where: {
      restaurantId: { in: ids },
      user: { id: { startsWith: "paperbag_demo_user_" } },
    },
  });
  if (existing >= expected) return;

  const team = restaurants.flatMap((restaurant, restaurantIndex) =>
    Array.from({ length: 4 }, (_, index) => {
      const slot = index + 1;
      const person = demoPersona(restaurantIndex, slot);
      return {
        id: demoUserId(restaurant.id, slot),
        clerkId: `paperbag_demo_clerk_${restaurant.id}_${slot}`,
        email: `paperbag-demo-${restaurant.id}-${slot}@example.com`,
        firstName: `${person.firstName} (Demo)`,
        lastName: person.lastName,
        restaurantId: restaurant.id,
        role: person.role,
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
