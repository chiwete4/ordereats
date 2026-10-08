"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Bike,
  Check,
  Clock3,
  Hourglass,
  PackageCheck,
  Send,
  ShoppingBag,
  LoaderCircle,
} from "lucide-react";

import {
  acknowledgeOrder,
  markOrderPickedUp,
  markOrderReady,
} from "@/actions/orders";
import { DashboardSectionExplorer, type DashboardExplorerItem } from "@/components/dashboard-section-explorer";
import { OrderMoreMenu, SendToRiderButton, type OrderRider } from "@/components/dashboard-action-controls";
import { OrderElapsedTime } from "@/components/order-elapsed-time";
import { useToast } from "@/components/toast-provider";
import { useRouter } from "next/navigation";

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

function ServerActionButton({
  action,
  restaurantId,
  restaurantOrderId,
  label,
  pendingLabel,
  icon,
  className,
  successTitle,
}: {
  action: (formData: FormData) => Promise<void>;
  restaurantId: string;
  restaurantOrderId: string;
  label: string;
  pendingLabel: string;
  icon: React.ReactNode;
  className: string;
  successTitle: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function run() {
    const formData = new FormData();
    formData.set("restaurantId", restaurantId);
    formData.set("restaurantOrderId", restaurantOrderId);
    startTransition(async () => {
      try {
        await action(formData);
        toast({ title: successTitle, tone: "success" });
        router.refresh();
      } catch (error) {
        toast({ title: "That didn’t work", description: error instanceof Error ? error.message : "Please try again.", tone: "error" });
      }
    });
  }

  return (
    <button type="button" disabled={pending} onClick={run} className={`${className} disabled:opacity-50`}>
      {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={2.3} /> : icon}
      {pending ? pendingLabel : label}
    </button>
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

                  <ServerActionButton
                    action={acknowledgeOrder}
                    restaurantId={restaurantId}
                    restaurantOrderId={order.id}
                    label="Start Making"
                    pendingLabel="Starting…"
                    icon={null}
                    successTitle="Order moved to preparation"
                    className="inline-flex items-center justify-center gap-1.5 rounded-[8px] bg-black px-3 py-2 text-[10px] font-semibold leading-none tracking-[-0.02em] text-white"
                  />
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
  riders,
}: {
  restaurantId: string;
  orders: DashboardOrder[];
  count: number;
  explorerItems: DashboardExplorerItem[];
  riders: OrderRider[];
}) {
  const initialExpanded = orders.find((order) => order.status === "PREPARING")?.id ?? orders[0]?.id ?? null;
  const [expandedId, setExpandedId] = useState<string | null>(initialExpanded);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [visibleOrders, setVisibleOrders] = useState(orders);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const incomingById = new Map(orders.map((order) => [order.id, order]));
    const removedIds = visibleOrders
      .filter((order) => !incomingById.has(order.id))
      .map((order) => order.id);

    setVisibleOrders((current) => {
      const currentIds = new Set(current.map((order) => order.id));
      return [
        ...current.map((order) => incomingById.get(order.id) ?? order),
        ...orders.filter((order) => !currentIds.has(order.id)),
      ];
    });

    if (removedIds.length === 0) {
      setVisibleOrders(orders);
      return;
    }

    setExitingIds(new Set(removedIds));
    const timer = window.setTimeout(() => {
      setVisibleOrders(orders);
      setExitingIds(new Set());
      if (expandedId && removedIds.includes(expandedId)) {
        setExpandedId(orders[0]?.id ?? null);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [orders]);

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
        {visibleOrders.length === 0 ? (
          <p className="py-5 text-[12px] font-medium text-[#808080]">
            No active orders right now.
          </p>
        ) : (
          visibleOrders.slice(0, 6).map((order) => {
            const expanded = expandedId === order.id;
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <article
                key={order.id}
                className={`relative origin-center border-b transition-[max-height,opacity,transform,padding,border-color] duration-300 ease-out first:pt-0 ${
                  exitingIds.has(order.id)
                    ? "max-h-0 scale-[0.975] overflow-hidden border-transparent py-0 opacity-0"
                    : "max-h-[700px] overflow-visible border-[#EAEAEA] py-4 opacity-100"
                }`}
              >
                {menuOpenId === order.id ? (
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-[40] bg-white/80" />
                ) : null}
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
                      <div className="flex-1">
                        <ServerActionButton
                          action={markOrderReady}
                          restaurantId={restaurantId}
                          restaurantOrderId={order.id}
                          label="Mark as Ready"
                          pendingLabel="Saving…"
                          icon={<Check className="h-3.5 w-3.5" strokeWidth={2.3} />}
                          successTitle="Order marked ready"
                          className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[8px] bg-black text-[10px] font-semibold text-white"
                        />
                      </div>
                      <OrderMoreMenu restaurantId={restaurantId} restaurantOrderId={order.id} onOpenChange={(open) => setMenuOpenId(open ? order.id : null)} />
                    </div>
                    <p className="ml-[52px] mt-2 text-[9px] font-medium text-[#A0A0A0]">
                      Customer will be told their order is ready.
                    </p>
                  </>
                ) : null}

                {order.status === "READY_FOR_PICKUP" ? (
                  <div className="ml-[52px] mt-3 flex gap-2">
                    <div className="flex-1"><SendToRiderButton restaurantId={restaurantId} restaurantOrderId={order.id} riders={riders} /></div>
                    <div className="flex-1">
                      <ServerActionButton
                        action={markOrderPickedUp}
                        restaurantId={restaurantId}
                        restaurantOrderId={order.id}
                        label="Customer Pick-up"
                        pendingLabel="Saving…"
                        icon={<PackageCheck className="h-3.5 w-3.5" strokeWidth={2.3} />}
                        successTitle="Order marked picked up"
                        className="inline-flex h-8 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] bg-[#EAEAEA] px-2 text-[10px] font-semibold text-black"
                      />
                    </div>
                    <OrderMoreMenu restaurantId={restaurantId} restaurantOrderId={order.id} onOpenChange={(open) => setMenuOpenId(open ? order.id : null)} />
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
  riders,
}: {
  restaurantId: string;
  pendingOrders: DashboardOrder[];
  activeOrders: DashboardOrder[];
  pendingCount: number;
  activeCount: number;
  pendingExplorerItems: DashboardExplorerItem[];
  activeExplorerItems: DashboardExplorerItem[];
  riders: OrderRider[];
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
        riders={riders}
      />
    </>
  );
}
