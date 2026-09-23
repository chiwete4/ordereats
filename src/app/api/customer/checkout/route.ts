import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { getOrCreateCurrentUser } from "@/lib/current-user";
import {
  initializePaystackTransaction,
  PAPERBAG_PLATFORM_COMMISSION_PERCENT,
} from "@/lib/paystack";
import { prisma } from "@/lib/prisma";

type CheckoutItemInput = {
  menuItemId?: unknown;
  quantity?: unknown;
};

type CheckoutPayload = {
  items?: CheckoutItemInput[];
  deliveryLatitude?: unknown;
  deliveryLongitude?: unknown;
};

function orderNumber() {
  return `PB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

function reference() {
  return `paperbag-${crypto.randomUUID().replaceAll("-", "")}`;
}

export async function POST(request: NextRequest) {
  const user = await getOrCreateCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  let payload: CheckoutPayload;
  try {
    payload = (await request.json()) as CheckoutPayload;
  } catch {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  const latitude = Number(payload.deliveryLatitude);
  const longitude = Number(payload.deliveryLongitude);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json(
      { error: "A valid delivery location is required." },
      { status: 400 }
    );
  }

  const quantities = new Map<string, number>();
  for (const raw of payload.items ?? []) {
    const menuItemId = typeof raw.menuItemId === "string" ? raw.menuItemId : "";
    const quantity = Number(raw.quantity);
    if (!menuItemId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return NextResponse.json({ error: "Your basket contains an invalid item." }, { status: 400 });
    }
    quantities.set(menuItemId, (quantities.get(menuItemId) ?? 0) + quantity);
  }

  if (quantities.size === 0) {
    return NextResponse.json({ error: "Your basket is empty." }, { status: 400 });
  }

  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: [...quantities.keys()] },
      isArchived: false,
      isAvailable: true,
    },
    select: {
      id: true,
      name: true,
      price: true,
      restaurantId: true,
      restaurant: {
        select: {
          id: true,
          name: true,
          paystackSubaccountCode: true,
        },
      },
    },
  });

  if (menuItems.length !== quantities.size) {
    return NextResponse.json(
      { error: "One or more basket items are no longer available." },
      { status: 409 }
    );
  }

  const groups = new Map<
    string,
    {
      restaurantId: string;
      restaurantName: string;
      subaccountCode: string;
      subtotalKobo: number;
      items: Array<{
        menuItemId: string;
        name: string;
        unitPriceKobo: number;
        quantity: number;
      }>;
    }
  >();

  for (const item of menuItems) {
    const subaccountCode = item.restaurant.paystackSubaccountCode?.trim();
    if (!subaccountCode) {
      return NextResponse.json(
        { error: `${item.restaurant.name} is not ready to accept payments yet.` },
        { status: 409 }
      );
    }

    const quantity = quantities.get(item.id)!;
    const unitPriceKobo = Math.round(Number(item.price) * 100);
    const lineTotalKobo = unitPriceKobo * quantity;
    const existing = groups.get(item.restaurantId);

    if (existing) {
      existing.subtotalKobo += lineTotalKobo;
      existing.items.push({
        menuItemId: item.id,
        name: item.name,
        unitPriceKobo,
        quantity,
      });
    } else {
      groups.set(item.restaurantId, {
        restaurantId: item.restaurantId,
        restaurantName: item.restaurant.name,
        subaccountCode,
        subtotalKobo: lineTotalKobo,
        items: [
          {
            menuItemId: item.id,
            name: item.name,
            unitPriceKobo,
            quantity,
          },
        ],
      });
    }
  }

  const grouped = [...groups.values()];
  const subtotalKobo = grouped.reduce((sum, group) => sum + group.subtotalKobo, 0);
  if (subtotalKobo < 1) {
    return NextResponse.json({ error: "Order total must be greater than zero." }, { status: 400 });
  }

  const paymentReference = reference();
  const newOrderNumber = orderNumber();

  const restaurantRows = grouped.map((group) => {
    const platformCommissionKobo = Math.round(
      (group.subtotalKobo * PAPERBAG_PLATFORM_COMMISSION_PERCENT) / 100
    );
    const restaurantSettlementKobo = group.subtotalKobo - platformCommissionKobo;

    return {
      restaurantId: group.restaurantId,
      status: "PENDING_PAYMENT" as const,
      subtotal: (group.subtotalKobo / 100).toFixed(2),
      platformCommission: (platformCommissionKobo / 100).toFixed(2),
      restaurantSettlement: (restaurantSettlementKobo / 100).toFixed(2),
      items: {
        create: group.items.map((item) => ({
          menuItemId: item.menuItemId,
          name: item.name,
          unitPrice: (item.unitPriceKobo / 100).toFixed(2),
          quantity: item.quantity,
        })),
      },
    };
  });

  const order = await prisma.order.create({
    data: {
      orderNumber: newOrderNumber,
      customerId: user.id,
      subtotal: (subtotalKobo / 100).toFixed(2),
      deliveryFee: "0.00",
      serviceFee: "0.00",
      total: (subtotalKobo / 100).toFixed(2),
      deliveryLatitude: latitude,
      deliveryLongitude: longitude,
      restaurantOrders: {
        create: restaurantRows,
      },
      payment: {
        create: {
          reference: paymentReference,
          amount: (subtotalKobo / 100).toFixed(2),
          status: "PENDING",
          provider: "paystack",
        },
      },
    },
    select: { id: true, orderNumber: true },
  });

  try {
    const transaction = await initializePaystackTransaction({
      email: user.email,
      amountKobo: subtotalKobo,
      reference: paymentReference,
      callbackUrl: `${request.nextUrl.origin}/api/customer/checkout/verify?reference=${encodeURIComponent(paymentReference)}`,
      subaccounts: grouped.map((group) => {
        const commissionKobo = Math.round(
          (group.subtotalKobo * PAPERBAG_PLATFORM_COMMISSION_PERCENT) / 100
        );
        return {
          subaccount: group.subaccountCode,
          share: group.subtotalKobo - commissionKobo,
        };
      }),
      metadata: {
        product: "paperbag",
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: user.id,
        restaurantIds: grouped.map((group) => group.restaurantId),
      },
    });

    return NextResponse.json({
      authorizationUrl: transaction.authorization_url,
      reference: paymentReference,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    await prisma.payment.update({
      where: { reference: paymentReference },
      data: { status: "FAILED" },
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Paystack could not start this payment.",
      },
      { status: 502 }
    );
  }
}
