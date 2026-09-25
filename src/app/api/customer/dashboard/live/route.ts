import { NextRequest, NextResponse } from "next/server";

import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const restaurantOrderId = request.nextUrl.searchParams.get("restaurantOrderId");
  if (!restaurantOrderId) {
    return NextResponse.json({ error: "Order is required." }, { status: 400 });
  }

  const user = await getOrCreateCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const order = await prisma.restaurantOrder.findFirst({
    where: {
      id: restaurantOrderId,
      order: { customerId: user.id },
    },
    select: {
      id: true,
      status: true,
      order: {
        select: {
          orderNumber: true,
          deliveryLatitude: true,
          deliveryLongitude: true,
        },
      },
      delivery: {
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
              phoneNumber: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const rider = order.delivery?.rider;
  const riderName =
    [rider?.firstName, rider?.lastName].filter(Boolean).join(" ").trim() ||
    rider?.email ||
    "Your rider";

  return NextResponse.json({
    delivery: order.delivery
      ? {
          id: order.delivery.id,
          status: order.delivery.status,
          latitude: order.delivery.lastLatitude,
          longitude: order.delivery.lastLongitude,
          lastLocationAt: order.delivery.lastLocationAt?.toISOString() ?? null,
          riderName,
          riderPhone: rider?.phoneNumber ?? null,
          orderNumber: order.order.orderNumber,
          deliveryLatitude: order.order.deliveryLatitude,
          deliveryLongitude: order.order.deliveryLongitude,
        }
      : null,
    destination: {
      latitude: order.order.deliveryLatitude,
      longitude: order.order.deliveryLongitude,
    },
    orderStatus: order.status,
  });
}
