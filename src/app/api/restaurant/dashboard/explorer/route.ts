import { RestaurantOrderStatus, StaffRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

const moneyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function money(value: number | string | { toString(): string }) {
  return moneyFormatter.format(Number(value));
}

function personName(person: { firstName: string; lastName: string; email: string }) {
  const full = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return full || person.email;
}

function cursorWhere(cursor: string | null) {
  if (!cursor) return {};
  const date = new Date(cursor);
  if (Number.isNaN(date.getTime())) return {};
  return { createdAt: { lt: date } };
}

async function requireRestaurantManager(restaurantId: string) {
  const user = await getOrCreateCurrentUser();
  if (!user) return null;

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
    return null;
  }

  return user;
}

function orderTone(status: string) {
  if (status === "DELIVERED") return "green";
  if (status === "CANCELLED") return "red";
  if (status === "READY_FOR_PICKUP") return "amber";
  return "neutral";
}

function orderStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

async function orderPage(
  restaurantId: string,
  statuses: RestaurantOrderStatus[],
  cursor: string | null
) {
  const rows = await prisma.restaurantOrder.findMany({
    where: {
      restaurantId,
      status: { in: statuses },
      ...cursorWhere(cursor),
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    include: {
      order: {
        select: {
          orderNumber: true,
          payment: { select: { status: true } },
        },
      },
      items: {
        include: {
          menuItem: {
            select: {
              imageUrl: true,
            },
          },
        },
      },
    },
  });

  const page = rows.slice(0, PAGE_SIZE);
  return {
    items: page.map((row) => {
      const itemCount = row.items.reduce((sum, item) => sum + item.quantity, 0);
      return {
        id: row.id,
        title: `#${row.order.orderNumber}`,
        subtitle: `${itemCount} ${itemCount === 1 ? "item" : "items"} · ${money(row.subtotal)} total`,
        status: orderStatusLabel(row.status),
        statusTone: orderTone(row.status),
        imageUrl: row.items[0]?.menuItem?.imageUrl ?? null,
        cursor: row.createdAt.toISOString(),
        details: [
          ...row.items.map((item) => ({
            label: `x${item.quantity} ${item.name}`,
            value: money(Number(item.unitPrice) * item.quantity),
          })),
          { label: "Placed", value: row.createdAt.toLocaleString() },
          { label: "Payment", value: row.order.payment?.status ?? "No payment record" },
        ],
      };
    }),
    hasMore: rows.length > PAGE_SIZE,
    nextCursor: page.at(-1)?.createdAt.toISOString() ?? null,
  };
}

async function staffPage(
  restaurantId: string,
  group: "staff" | "riders",
  cursor: string | null
) {
  const rows = await prisma.restaurantStaff.findMany({
    where: {
      restaurantId,
      role:
        group === "riders"
          ? StaffRole.RIDER
          : { in: [StaffRole.OWNER, StaffRole.STAFF] },
      ...cursorWhere(cursor),
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          assignedDeliveries: {
            where: {
              status: {
                notIn: ["DELIVERED", "CANCELLED"],
              },
            },
            select: {
              id: true,
            },
            take: 1,
          },
        },
      },
    },
  });

  const page = rows.slice(0, PAGE_SIZE);
  return {
    items: page.map((member) => {
      const delivering = group === "riders" && member.user.assignedDeliveries.length > 0;
      return {
        id: member.id,
        title: personName(member.user),
        subtitle: member.user.email,
        status:
          group === "riders"
            ? delivering
              ? "Delivering"
              : member.isActive
                ? "Available"
                : "Off duty"
            : member.isActive
              ? "Active"
              : "Inactive",
        statusTone:
          group === "riders"
            ? delivering
              ? "amber"
              : member.isActive
                ? "green"
                : "neutral"
            : member.isActive
              ? "green"
              : "neutral",
        cursor: member.createdAt.toISOString(),
        details:
          group === "riders"
            ? [
                { label: "Role", value: "RIDER" },
                { label: "Access", value: member.isActive ? "Active" : "Inactive" },
                {
                  label: "Delivery",
                  value: delivering
                    ? "Currently delivering an order"
                    : "No active delivery",
                },
              ]
            : [
                { label: "Role", value: member.role },
                { label: "Access", value: member.isActive ? "Active" : "Inactive" },
                { label: "Email", value: member.user.email },
              ],
      };
    }),
    hasMore: rows.length > PAGE_SIZE,
    nextCursor: page.at(-1)?.createdAt.toISOString() ?? null,
  };
}

async function reviewPage(restaurantId: string, cursor: string | null) {
  const createdAt = cursorWhere(cursor);

  const [reviews, complaints] = await Promise.all([
    prisma.review.findMany({
      where: {
        restaurantId,
        ...createdAt,
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        menuItem: { select: { name: true } },
        featuredCombo: { select: { name: true } },
        restaurantOrder: {
          select: {
            order: { select: { orderNumber: true } },
          },
        },
      },
    }),
    prisma.customerComplaint.findMany({
      where: {
        restaurantId,
        ...createdAt,
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        restaurantOrder: {
          select: {
            order: { select: { orderNumber: true } },
          },
        },
      },
    }),
  ]);

  const merged = [
    ...complaints.map((complaint) => ({
      createdAt: complaint.createdAt,
      item: {
        id: `complaint-${complaint.id}`,
        title: complaint.subject,
        subtitle: `${personName(complaint.customer)}${complaint.restaurantOrder ? ` · #${complaint.restaurantOrder.order.orderNumber}` : ""}`,
        status: complaint.status,
        statusTone: complaint.status === "OPEN" ? "red" : "green",
        body: complaint.body,
        cursor: complaint.createdAt.toISOString(),
        details: [
          { label: "Type", value: "Customer complaint" },
          { label: "Submitted", value: complaint.createdAt.toLocaleString() },
        ],
      },
    })),
    ...reviews.map((review) => ({
      createdAt: review.createdAt,
      item: {
        id: `review-${review.id}`,
        title:
          review.target === "RESTAURANT"
            ? "Restaurant rating"
            : review.target === "FEATURED_COMBO"
              ? review.featuredCombo?.name ?? "Featured combo review"
              : review.menuItem?.name ?? "Meal review",
        subtitle: `${personName(review.customer)}${review.restaurantOrder ? ` · #${review.restaurantOrder.order.orderNumber}` : ""}`,
        status: `${review.rating}/5`,
        statusTone: "green",
        body: review.body,
        cursor: review.createdAt.toISOString(),
        details: [
          { label: "Rating", value: `${review.rating}/5` },
          { label: "Type", value: review.target.replaceAll("_", " ") },
          { label: "Submitted", value: review.createdAt.toLocaleString() },
        ],
      },
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const page = merged.slice(0, PAGE_SIZE);

  return {
    items: page.map((entry) => entry.item),
    hasMore:
      merged.length > PAGE_SIZE ||
      reviews.length > PAGE_SIZE ||
      complaints.length > PAGE_SIZE,
    nextCursor: page.at(-1)?.createdAt.toISOString() ?? null,
  };
}

export async function GET(request: NextRequest) {
  const restaurantId = request.nextUrl.searchParams.get("restaurantId");
  const kind = request.nextUrl.searchParams.get("kind");
  const cursor = request.nextUrl.searchParams.get("cursor");

  if (!restaurantId || !kind) {
    return NextResponse.json({ error: "Missing restaurant or list type." }, { status: 400 });
  }

  const user = await requireRestaurantManager(restaurantId);
  if (!user) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  try {
    const result =
      kind === "pending"
        ? await orderPage(restaurantId, [RestaurantOrderStatus.CONFIRMED], cursor)
        : kind === "active"
          ? await orderPage(
              restaurantId,
              [
                RestaurantOrderStatus.PREPARING,
                RestaurantOrderStatus.READY_FOR_PICKUP,
                RestaurantOrderStatus.OUT_FOR_DELIVERY,
              ],
              cursor
            )
          : kind === "past"
            ? await orderPage(
                restaurantId,
                [
                  RestaurantOrderStatus.DELIVERED,
                  RestaurantOrderStatus.PICKED_UP,
                  RestaurantOrderStatus.CANCELLED,
                ],
                cursor
              )
            : kind === "staff"
              ? await staffPage(restaurantId, "staff", cursor)
              : kind === "riders"
                ? await staffPage(restaurantId, "riders", cursor)
                : kind === "reviews"
                  ? await reviewPage(restaurantId, cursor)
                  : null;

    if (!result) {
      return NextResponse.json({ error: "Unknown list type." }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Dashboard explorer pagination failed", error);
    return NextResponse.json(
      { error: "Could not load more dashboard items." },
      { status: 500 }
    );
  }
}
