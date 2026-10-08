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

  if (!membership || !membership.isActive || membership.role !== "OWNER") {
    return NextResponse.json({ error: "Only the restaurant owner can view payouts." }, { status: 403 });
  }

  const [eligible, latestPayout] = await Promise.all([
    prisma.restaurantOrder.aggregate({
      where: {
        restaurantId,
        status: {
          in: ["DELIVERED", "PICKED_UP"],
        },
        payoutOrder: null,
        order: {
          payment: {
            status: "SUCCESS",
          },
        },
      },
      _sum: {
        subtotal: true,
      },
      _count: true,
    }),
    prisma.restaurantPayout.findFirst({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        status: true,
        reference: true,
        createdAt: true,
        failureReason: true,
      },
    }),
  ]);

  return NextResponse.json({
    availableAmount: Number(eligible._sum.subtotal ?? 0),
    eligibleOrderCount: eligible._count,
    latestPayout: latestPayout
      ? {
          id: latestPayout.id,
          amount: Number(latestPayout.amount),
          status: latestPayout.status,
          reference: latestPayout.reference,
          createdAt: latestPayout.createdAt.toISOString(),
          failureReason: latestPayout.failureReason,
        }
      : null,
  });
}
