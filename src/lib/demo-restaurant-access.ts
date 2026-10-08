import { BAZE_CAMPUS_ADDRESS, BAZE_RESTAURANT_NAMES } from "@/lib/baze-campus";
import { prisma } from "@/lib/prisma";

// Only the verified, pre-seeded campus restaurants qualify. New restaurants
// retain their ordinary verification and permission rules.
export function isSeededBazeRestaurant(restaurant: {
  name: string;
  address: string | null;
  isVerified: boolean;
}) {
  return (
    restaurant.isVerified &&
    restaurant.address === BAZE_CAMPUS_ADDRESS &&
    BAZE_RESTAURANT_NAMES.some((name) => name === restaurant.name)
  );
}

// A manager of the existing Mama's Kitchen demonstration workspace can keep
// managing a Baze demo restaurant even if their membership there is RIDER.
// This does not change the rider membership or confer owner/payout privileges.
export async function hasBazeDemoManagerAccess(
  userId: string,
  restaurantId: string
): Promise<boolean> {
  const [restaurant, demoManager] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true, address: true, isVerified: true },
    }),
    prisma.restaurantStaff.findFirst({
      where: {
        userId,
        isActive: true,
        role: { in: ["OWNER", "STAFF"] },
        restaurant: { name: "Mama's Kitchen" },
      },
      select: { id: true },
    }),
  ]);
  return Boolean(restaurant && demoManager && isSeededBazeRestaurant(restaurant));
}
