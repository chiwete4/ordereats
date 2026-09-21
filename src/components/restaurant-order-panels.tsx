"use client";

import { useState } from "react";
import {
  Bike,
  Check,
  Clock3,
  Hourglass,
  PackageCheck,
  Send,
  ShoppingBag,
  Utensils,
} from "lucide-react";

import {
  acknowledgeOrder,
  markOrderPickedUp,
  markOrderReady,
  sendOrderForDelivery,
} from "@/actions/orders";
import { DashboardSectionExplorer, type DashboardExplorerItem } from "@/components/dashboard-section-explorer";
import { OrderMoreMenu } from "@/components/dashboard-action-controls";
import { OrderElapsedTime } from "@/components/order-elapsed-time";

export type DashboardOrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string | null;
};

export type DashboardOrder = {
  id: string;
  orderNumber: string;
  subtotal: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: DashboardOrderItem[];
};

const moneyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function money(value: number) {
  return moneyFormatter.format(value);
}

function Thumb({ order }: { order: DashboardOrder }) {
  const src = order.items[0]?.imageUrl;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={order.items[0]?.name ?? "Order"}
      className="h-10 w-10 shrink-0 rounded-[8px] border border-[#D7D7D7] object-cover"
    />
  ) : (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-[#D7D7D7] bg-white">
      <ShoppingBag className="h-4 w-4" strokeWidth={2.3} />
    </span>
  );
}

function OrderItems({ order }: { order: DashboardOrder }) {
  return (
    <div className="ml-[52px] mt-4 space-y-3">
      {order.items.map((item) => (
        <div
          key={item.id}
          className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 text-[10px]"
        >
          <span className="text-[#8A8A8A]">x{item.quantity}</span>
          <span className="truncate font-medium text-black">{item.name}</span>
          <span className="shrink-0 font-medium text-[#808080]">
            {money(item.unitPrice * item.quantity)}
          </span>
        </div>
      ))}
    </div>
  );
}

function Heading({
  title,
  count,
  explorerItems,
  restaurantId,
  kind,
}: {
  title: string;
  count: number;
  explorerItems: DashboardExplorerItem[];
  restaurantId: string;
  kind: "pending" | "active";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-[14px] font-semibold leading-none tracking-[-0.02em] text-black">
          {title}
        </h2>
        <span className="text-[12px] font-medium leading-none tracking-[-0.01em] text-[#9A9A9A]">
          {count.toLocaleString()}
        </span>
      </div>
      <DashboardSectionExplorer
        title={title}
        count={count}
        items={explorerItems}
        pagination={{ restaurantId, kind }}
      />
    </div>
  );
}

function PendingPanel({
  restaurantId,
  orders,
  count,
  explorerItems,
}: {
  restaurantId: string;
  orders: DashboardOrder[];
  count: number;
  explorerItems: DashboardExplorerItem[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(orders[0]?.id ?? null);

  return (
    <section className="w-full bg-white">
      <Heading
        title="Pending Orders"
        count={count}
        explorerItems={explorerItems}
        restaurantId={restaurantId}
        kind="pending"
      />

      <div className="mt-5">
        {orders.length === 0 ? (
          <p className="py-5 text-[12px] font-medium text-[#808080]">
            No pending orders right now.
          </p>
        ) : (
          orders.slice(0, 6).map((order) => {
            const expanded = expandedId === order.id;
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <article key={order.id} className="border-b border-[#EAEAEA] py-4 first:pt-0">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId((current) => (current === order.id ? null : order.id))}
                    aria-expanded={expanded}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <Thumb order={order} />
                    <div className="min-w-0 pt-1">
                      <p className="truncate text-[12px] font-semibold leading-none tracking-[-0.02em] text-black">
                        #{order.orderNumber}
                      </p>
                      <p className="mt-1.5 text-[10px] font-medium leading-none tracking-[-0.01em] text-[#808080]">
                        {itemCount} {itemCount === 1 ? "item" : "items"} · {money(order.subtotal)} total
                      </p>
                    </div>
                  </button>

                  <form action={acknowledgeOrder}>
                    <input type="hidden" name="restaurantId" value={restaurantId} />
                    <input type="hidden" name="restaurantOrderId" value={order.id} />
                    <button className="rounded-[8px] bg-black px-3 py-2 text-[10px] font-semibold leading-none tracking-[-0.02em] text-white">
                      Start Making
                    </button>
                  </form>
                </div>

                {expanded ? (
                  <>
                    <OrderItems order={order} />
                    <p className="ml-[52px] mt-4 text-[10px] font-medium text-[#808080]">
                      Order placed{" "}
                      <span className="font-semibold text-black">
                        <OrderElapsedTime createdAt={order.createdAt} />
                      </span>{" "}
                      ago
                    </p>
                  </>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function ActiveStatus({ status }: { status: string }) {
  if (status === "PREPARING") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-[#808080]">
        Preparing <Clock3 className="h-3 w-3" strokeWidth={2.3} />
      </span>
    );
  }

  if (status === "READY_FOR_PICKUP") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-orange-500">
        Not Sent <Hourglass className="h-3 w-3" strokeWidth={2.3} />
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-black">
      Sent out <Bike className="h-3 w-3" strokeWidth={2.3} />
    </span>
  );
}

function ActivePanel({
  restaurantId,
  orders,
  count,
  explorerItems,
}: {
  restaurantId: string;
  orders: DashboardOrder[];
  count: number;
  explorerItems: DashboardExplorerItem[];
}) {
  const initialExpanded = orders.find((order) => order.status === "PREPARING")?.id ?? orders[0]?.id ?? null;
  const [expandedId, setExpandedId] = useState<string | null>(initialExpanded);

  return (
    <section className="w-full bg-white">
      <Heading
        title="Active Orders"
        count={count}
        explorerItems={explorerItems}
        restaurantId={restaurantId}
        kind="active"
      />

      <div className="mt-5">
        {orders.length === 0 ? (
          <p className="py-5 text-[12px] font-medium text-[#808080]">
            No active orders right now.
          </p>
        ) : (
          orders.slice(0, 6).map((order) => {
            const expanded = expandedId === order.id;
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <article key={order.id} className="border-b border-[#EAEAEA] py-4 first:pt-0">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId((current) => (current === order.id ? null : order.id))}
                    aria-expanded={expanded}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <Thumb order={order} />
                    <div className="min-w-0 pt-1">
                      <p className="truncate text-[12px] font-semibold leading-none tracking-[-0.02em] text-black">
                        #{order.orderNumber}
                      </p>
                      <p className="mt-1.5 text-[10px] font-medium leading-none tracking-[-0.01em] text-[#808080]">
                        {itemCount} {itemCount === 1 ? "item" : "items"} · {money(order.subtotal)} total
                      </p>
                    </div>
                  </button>
                  <ActiveStatus status={order.status} />
                </div>

                {expanded ? <OrderItems order={order} /> : null}

                {order.status === "PREPARING" && expanded ? (
                  <>
                    <p className="ml-[52px] mt-4 text-[10px] font-medium text-[#808080]">
                      Preparation has taken{" "}
                      <span className="font-semibold text-black">
                        <OrderElapsedTime createdAt={order.updatedAt} />
                      </span>{" "}
                      so far
                    </p>
                    <div className="ml-[52px] mt-2 flex gap-2">
                      <form action={markOrderReady} className="flex-1">
                        <input type="hidden" name="restaurantId" value={restaurantId} />
                        <input type="hidden" name="restaurantOrderId" value={order.id} />
                        <button className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[8px] bg-black text-[10px] font-semibold text-white">
                          <Check className="h-3.5 w-3.5" strokeWidth={2.3} />
                          Mark as Ready
                        </button>
                      </form>
                      <OrderMoreMenu restaurantId={restaurantId} restaurantOrderId={order.id} />
                    </div>
                    <p className="ml-[52px] mt-2 text-[9px] font-medium text-[#A0A0A0]">
                      Customer will be told their order is ready.
                    </p>
                  </>
                ) : null}

                {order.status === "READY_FOR_PICKUP" ? (
                  <div className="ml-[52px] mt-3 flex gap-2">
                    <form action={sendOrderForDelivery} className="flex-1">
                      <input type="hidden" name="restaurantId" value={restaurantId} />
                      <input type="hidden" name="restaurantOrderId" value={order.id} />
                      <button className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[8px] bg-black text-[10px] font-semibold text-white">
                        <Bike className="h-3.5 w-3.5" strokeWidth={2.3} />
                        Send to Rider
                      </button>
                    </form>
                    <form action={markOrderPickedUp} className="flex-1">
                      <input type="hidden" name="restaurantId" value={restaurantId} />
                      <input type="hidden" name="restaurantOrderId" value={order.id} />
                      <button className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[8px] bg-[#EAEAEA] text-[10px] font-semibold text-black">
                        <PackageCheck className="h-3.5 w-3.5" strokeWidth={2.3} />
                        Customer Pick-up
                      </button>
                    </form>
                    <OrderMoreMenu restaurantId={restaurantId} restaurantOrderId={order.id} />
                  </div>
                ) : null}

                {order.status === "OUT_FOR_DELIVERY" && expanded ? (
                  <p className="ml-[52px] mt-4 inline-flex items-center gap-1.5 text-[10px] font-medium text-[#808080]">
                    <Send className="h-3.5 w-3.5" strokeWidth={2.3} />
                    This order has been sent out for delivery.
                  </p>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

export function RestaurantOrderPanels({
  restaurantId,
  pendingOrders,
  activeOrders,
  pendingCount,
  activeCount,
  pendingExplorerItems,
  activeExplorerItems,
}: {
  restaurantId: string;
  pendingOrders: DashboardOrder[];
  activeOrders: DashboardOrder[];
  pendingCount: number;
  activeCount: number;
  pendingExplorerItems: DashboardExplorerItem[];
  activeExplorerItems: DashboardExplorerItem[];
}) {
  return (
    <>
      <PendingPanel
        restaurantId={restaurantId}
        orders={pendingOrders}
        count={pendingCount}
        explorerItems={pendingExplorerItems}
      />
      <ActivePanel
        restaurantId={restaurantId}
        orders={activeOrders}
        count={activeCount}
        explorerItems={activeExplorerItems}
      />
    </>
  );
}
