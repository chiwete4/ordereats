import { NextRequest, NextResponse } from "next/server";

import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const user = await getOrCreateCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const body = (await request.json()) as {
    deliveryId?: string;
    latitude?: number;
    longitude?: number;
  };

  const deliveryId = body.deliveryId?.trim();
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);

  if (
    !deliveryId ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json({ error: "A valid rider location is required." }, { status: 400 });
  }

  const delivery = await prisma.delivery.findFirst({
    where: {
      id: deliveryId,
      riderId: user.id,
      status: {
        notIn: ["DELIVERED", "CANCELLED"],
      },
    },
    select: {
      id: true,
    },
  });

  if (!delivery) {
    return NextResponse.json(
      { error: "This delivery is not assigned to you or is already complete." },
      { status: 403 }
    );
  }

  const now = new Date();

  await prisma.delivery.update({
    where: { id: delivery.id },
    data: {
      lastLatitude: latitude,
      lastLongitude: longitude,
      lastLocationAt: now,
    },
  });

  return NextResponse.json({
    ok: true,
    updatedAt: now.toISOString(),
  });
}
