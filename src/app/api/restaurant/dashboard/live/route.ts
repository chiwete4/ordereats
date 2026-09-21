import { NextRequest, NextResponse } from "next/server";

import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const restaurantId = request.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return NextResponse.json({ error: "Restaurant is required." }, { status: 400 });
  }

  const user = await getOrCreateCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const membership = await prisma.restaurantStaff.findUnique({
    where: {
      userId_restaurantId: {
        userId: user.id,
        restaurantId,
      },
    },
    select: {
      role: true,
      isActive: true,
    },
  });

  if (
    !membership ||
    !membership.isActive ||
    !["OWNER", "STAFF"].includes(membership.role)
  ) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const delivery = await prisma.delivery.findFirst({
    where: {
      restaurantOrder: {
        restaurantId,
      },
      status: {
        notIn: ["DELIVERED", "CANCELLED"],
      },
      riderId: {
        not: null,
      },
    },
    orderBy: [
      { lastLocationAt: "desc" },
      { updatedAt: "desc" },
    ],
    select: {
      id: true,
      status: true,
      lastLatitude: true,
      lastLongitude: true,
      lastLocationAt: true,
      rider: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      restaurantOrder: {
        select: {
          id: true,
          order: {
            select: {
              orderNumber: true,
            },
          },
        },
      },
    },
  });

  if (!delivery) {
    return NextResponse.json({ delivery: null });
  }

  const riderName =
    [delivery.rider?.firstName, delivery.rider?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    delivery.rider?.email ||
    "Assigned rider";

  return NextResponse.json({
    delivery: {
      id: delivery.id,
      status: delivery.status,
      latitude: delivery.lastLatitude,
      longitude: delivery.lastLongitude,
      lastLocationAt: delivery.lastLocationAt?.toISOString() ?? null,
      riderName,
      orderNumber: delivery.restaurantOrder.order.orderNumber,
    },
  });
}
