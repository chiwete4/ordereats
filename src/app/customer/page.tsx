import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { RefreshCw, Store } from "lucide-react";

import { CustomerDashboardClient, type CustomerOrderCard, type CustomerRestaurant, type CustomerRiderHistory } from "@/components/customer-dashboard-client";
import type { CustomerLiveDelivery } from "@/components/customer-live-map";
import { DashboardLiveRefresh } from "@/components/dashboard-live-refresh";
import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

function personName(person: { firstName: string; lastName: string; email: string }) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ").trim() || person.email;
}

function restaurantOpenNow(restaurant: {
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
  operatingDays: number[];
  timezone: string;
}) {
  if (!restaurant.isOpen) return false;

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: restaurant.timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    const weekday = parts.find((part) => part.type === "weekday")?.value;
    const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
    const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    if (!weekday || !restaurant.operatingDays.includes(dayMap[weekday])) return false;
    const nowMinutes = Number(hour) * 60 + Number(minute);
    const [openHour, openMinute] = restaurant.openingTime.split(":").map(Number);
    const [closeHour, closeMinute] = restaurant.closingTime.split(":").map(Number);
    const open = openHour * 60 + openMinute;
    const close = closeHour * 60 + closeMinute;

    if (close >= open) return nowMinutes >= open && nowMinutes < close;
    return nowMinutes >= open || nowMinutes < close;
  } catch {
    return restaurant.isOpen;
  }
}

export default async function CustomerPage() {
  const user = await getOrCreateCurrentUser();
  if (!user) redirect("/");

  const clerkUser = await currentUser();

  const [membership, restaurants, orders] = await Promise.all([
    prisma.restaurantStaff.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        role: { in: ["OWNER", "STAFF"] },
      },
      select: {
        restaurantId: true,
        role: true,
        restaurant: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.restaurant.findMany({
      where: {
        menuItems: {
          some: {
            isAvailable: true,
            isArchived: false,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: {
        id: true,
        name: true,
        address: true,
        imageUrl: true,
        latitude: true,
        longitude: true,
        isOpen: true,
        isVerified: true,
        openingTime: true,
        closingTime: true,
        operatingDays: true,
        timezone: true,
        menuItems: {
          where: {
            isAvailable: true,
            isArchived: false,
          },
          orderBy: { createdAt: "asc" },
          take: 20,
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
          },
        },
        reviews: {
          where: { target: "RESTAURANT" },
          select: { rating: true },
        },
        favoritedBy: {
          where: { userId: user.id },
          select: { userId: true },
        },
      },
    }),
    prisma.order.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        updatedAt: true,
        deliveryLatitude: true,
        deliveryLongitude: true,
        restaurantOrders: {
          select: {
            id: true,
            restaurantId: true,
            status: true,
            subtotal: true,
            createdAt: true,
            updatedAt: true,
            restaurant: {
              select: {
                name: true,
                address: true,
                latitude: true,
                longitude: true,
              },
            },
            items: {
              select: {
                id: true,
                menuItemId: true,
                name: true,
                quantity: true,
                unitPrice: true,
                menuItem: { select: { imageUrl: true } },
              },
            },
            delivery: {
              select: {
                id: true,
                status: true,
                lastLatitude: true,
                lastLongitude: true,
                lastLocationAt: true,
                deliveredAt: true,
                updatedAt: true,
                rider: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phoneNumber: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const restaurantData: CustomerRestaurant[] = restaurants.map((restaurant) => {
    const rating = restaurant.reviews.length
      ? restaurant.reviews.reduce((sum, review) => sum + review.rating, 0) / restaurant.reviews.length
      : null;

    return {
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      imageUrl: restaurant.imageUrl,
      isVerified: restaurant.isVerified,
      isOpen: restaurantOpenNow(restaurant),
      hoursLabel: restaurant.openingTime + "–" + restaurant.closingTime,
      rating,
      favorited: restaurant.favoritedBy.length > 0,
      items: restaurant.menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        imageUrl: item.imageUrl,
        description: item.description,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
      })),
    };
  });

  const flattenedOrders: CustomerOrderCard[] = orders.flatMap((order) =>
    order.restaurantOrders.map((restaurantOrder) => ({
      id: restaurantOrder.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      restaurantId: restaurantOrder.restaurantId,
      restaurantName: restaurantOrder.restaurant.name,
      status: restaurantOrder.status,
      subtotal: Number(restaurantOrder.subtotal),
      createdAt: restaurantOrder.createdAt.toISOString(),
      updatedAt: restaurantOrder.updatedAt.toISOString(),
      items: restaurantOrder.items.map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        imageUrl: item.menuItem.imageUrl,
        restaurantId: restaurantOrder.restaurantId,
        restaurantName: restaurantOrder.restaurant.name,
      })),
      riderName: restaurantOrder.delivery?.rider
        ? personName(restaurantOrder.delivery.rider)
        : null,
      riderPhone: restaurantOrder.delivery?.rider?.phoneNumber ?? null,
    }))
  );

  const activeStatuses = new Set(["CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"]);
  const terminalStatuses = new Set(["DELIVERED", "PICKED_UP", "CANCELLED"]);

  const activeOrders = flattenedOrders
    .filter((order) => activeStatuses.has(order.status))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const completionTime = (restaurantOrderId: string) => {
    for (const order of orders) {
      const row = order.restaurantOrders.find((entry) => entry.id === restaurantOrderId);
      if (!row) continue;
      return row.status === "DELIVERED"
        ? row.delivery?.deliveredAt?.getTime() ?? row.updatedAt.getTime()
        : row.updatedAt.getTime();
    }
    return 0;
  };

  const pastOrders = flattenedOrders
    .filter((order) => terminalStatuses.has(order.status))
    .sort((a, b) => completionTime(b.id) - completionTime(a.id));

  const riderRows = orders
    .flatMap((order) => order.restaurantOrders)
    .filter((row) => terminalStatuses.has(row.status) && row.delivery?.rider)
    .sort((a, b) => {
      const aTime = a.delivery?.deliveredAt?.getTime() ?? a.delivery?.updatedAt.getTime() ?? 0;
      const bTime = b.delivery?.deliveredAt?.getTime() ?? b.delivery?.updatedAt.getTime() ?? 0;
      return bTime - aTime;
    });

  const seenRiders = new Set<string>();
  const riderHistory: CustomerRiderHistory[] = [];
  for (const row of riderRows) {
    const rider = row.delivery?.rider;
    if (!rider || seenRiders.has(rider.id)) continue;
    seenRiders.add(rider.id);
    riderHistory.push({
      id: rider.id,
      name: personName(rider),
      phone: rider.phoneNumber,
      lastDeliveredAt: row.delivery?.deliveredAt?.toISOString() ?? null,
    });
  }

  const liveRow = orders
    .flatMap((order) =>
      order.restaurantOrders.map((row) => ({
        row,
        orderNumber: order.orderNumber,
        deliveryLatitude: order.deliveryLatitude,
        deliveryLongitude: order.deliveryLongitude,
      }))
    )
    .filter(({ row }) => row.status === "OUT_FOR_DELIVERY" && row.delivery)
    .sort((a, b) => {
      const aTime = a.row.delivery?.lastLocationAt?.getTime() ?? a.row.updatedAt.getTime();
      const bTime = b.row.delivery?.lastLocationAt?.getTime() ?? b.row.updatedAt.getTime();
      return bTime - aTime;
    })[0];

  const initialLiveDelivery: CustomerLiveDelivery | null = liveRow?.row.delivery
    ? {
        id: liveRow.row.delivery.id,
        status: liveRow.row.delivery.status,
        latitude: liveRow.row.delivery.lastLatitude,
        longitude: liveRow.row.delivery.lastLongitude,
        lastLocationAt: liveRow.row.delivery.lastLocationAt?.toISOString() ?? null,
        riderName: liveRow.row.delivery.rider
          ? personName(liveRow.row.delivery.rider)
          : "Your rider",
        riderPhone: liveRow.row.delivery.rider?.phoneNumber ?? null,
        orderNumber: liveRow.orderNumber,
      }
    : null;

  const fallbackRestaurant = restaurants[0];
  const fallbackLatitude =
    liveRow?.deliveryLatitude ?? fallbackRestaurant?.latitude ?? null;
  const fallbackLongitude =
    liveRow?.deliveryLongitude ?? fallbackRestaurant?.longitude ?? null;
  const fallbackLabel =
    liveRow?.row.restaurant.address ||
    fallbackRestaurant?.address ||
    "Your delivery area";

  const displayName = user.firstName || "there";

  return (
    <main className="min-h-screen bg-white">
      <DashboardLiveRefresh intervalMs={12000} />
      <div className="w-full px-4 sm:px-6 lg:px-[125px]">
        <div className="h-[32px]" />

        <section className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            {clerkUser?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clerkUser.imageUrl}
                alt=""
                className="h-[56px] w-[56px] rounded-full object-cover"
              />
            ) : (
              <div className="grid h-[56px] w-[56px] place-items-center rounded-full bg-[#EAEAEA] text-lg font-semibold">
                {displayName[0]?.toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[22px] font-semibold tracking-[-0.045em]">Hi, {displayName}.</h1>
                {membership ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EFEFEF] px-2.5 py-1 text-[10px] font-medium text-[#777]">
                    <Store className="h-3 w-3" />
                    {membership.role === "OWNER" ? "Restaurant Owner" : "Restaurant Staff"}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {membership ? (
            <Link
              href={"/restaurant/dashboard?restaurantId=" + membership.restaurantId}
              className="inline-flex w-fit items-center gap-1.5 rounded-full border-2 border-[#EAEAEA] px-3 py-1.5 text-[10px] font-semibold"
            >
              <RefreshCw className="h-3 w-3" />
              Switch to Your Restaurant
            </Link>
          ) : null}
        </section>

        <CustomerDashboardClient
          restaurants={restaurantData}
          activeOrders={activeOrders}
          pastOrders={pastOrders}
          riderHistory={riderHistory}
          liveRestaurantOrderId={liveRow?.row.id ?? null}
          initialLiveDelivery={initialLiveDelivery}
          fallbackLatitude={fallbackLatitude}
          fallbackLongitude={fallbackLongitude}
          fallbackLabel={fallbackLabel}
        />

        <div className="h-[168px]" />
      </div>
    </main>
  );
}
