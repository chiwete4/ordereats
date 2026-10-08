import { redirect } from "next/navigation";

import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

// Customers keep their existing destination. Rider-only accounts go straight
// to their actual rider workspace after Clerk authentication.
export default async function PostLoginPage() {
  const user = await getOrCreateCurrentUser();
  if (!user) redirect("/");

  const memberships = await prisma.restaurantStaff.findMany({
    where: { userId: user.id, isActive: true },
    select: { role: true },
  });

  const managesRestaurant = memberships.some((membership) =>
    membership.role === "OWNER" || membership.role === "STAFF"
  );
  const isRider = memberships.some((membership) => membership.role === "RIDER");

  if (isRider && !managesRestaurant) redirect("/rider");
  redirect("/customer");
}
