import { redirect } from "next/navigation";

import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export default async function RestaurantDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ restaurantId?: string }>;
}) {
  const user = await getOrCreateCurrentUser();

  if (!user) {
    redirect("/");
  }

  const { restaurantId } = await searchParams;

  if (!restaurantId) {
    redirect("/restaurant/new");
  }

  const membership = await prisma.restaurantStaff.findUnique({
    where: {
      userId_restaurantId: {
        userId: user.id,
        restaurantId,
      },
    },
    include: {
      restaurant: true,
    },
  });

  if (!membership || membership.role !== "STAFF") {
    redirect("/");
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">
        {membership.restaurant.name}
      </h1>

      <p className="mt-2 text-gray-600">Restaurant dashboard</p>

      <div className="mt-8 rounded-lg border p-6">
        <p>
          Verification:{" "}
          {membership.restaurant.isVerified ? "Verified" : "Pending"}
        </p>

        <p>
          Status: {membership.restaurant.isOpen ? "Open" : "Closed"}
        </p>
      </div>
    </main>
  );
}