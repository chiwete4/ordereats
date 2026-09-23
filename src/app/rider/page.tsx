import { redirect } from "next/navigation";
import { Bike, MapPin, ShoppingBag } from "lucide-react";

import { DashboardLiveRefresh } from "@/components/dashboard-live-refresh";
import { markRiderDeliveryDelivered } from "@/actions/rider";
import { RiderLocationTracker } from "@/components/rider-location-tracker";
import { RiderDeliveryCompleteButton } from "@/components/rider-delivery-complete-button";
import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const moneyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export default async function RiderPage() {
  const user = await getOrCreateCurrentUser();
  if (!user) redirect("/");

  const delivery = await prisma.delivery.findFirst({
    where: {
      riderId: user.id,
      status: {
        notIn: ["DELIVERED", "CANCELLED"],
      },
      restaurantOrder: {
        restaurant: {
          staff: {
            some: {
              userId: user.id,
              role: "RIDER",
              isActive: true,
            },
          },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
    include: {
      restaurantOrder: {
        include: {
          restaurant: {
            select: {
              name: true,
              address: true,
            },
          },
          order: {
            select: {
              orderNumber: true,
              deliveryNote: true,
              total: true,
              deliveryLatitude: true,
              deliveryLongitude: true,
            },
          },
          items: {
            select: {
              name: true,
              quantity: true,
            },
          },
        },
      },
    },
  });

  const itemCount =
    delivery?.restaurantOrder.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <main className="min-h-[calc(100dvh-56px)] bg-black text-white">
      <DashboardLiveRefresh intervalMs={12000} />

      <div className="mx-auto flex min-h-[calc(100dvh-56px)] w-full max-w-[860px] flex-col px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6">
        <RiderLocationTracker
          deliveryId={delivery?.id ?? null}
          destinationLatitude={delivery?.restaurantOrder.order.deliveryLatitude ?? null}
          destinationLongitude={delivery?.restaurantOrder.order.deliveryLongitude ?? null}
          destinationLabel={delivery ? "Customer drop-off" : null}
        />

        <section className="flex min-h-0 flex-1 flex-col pt-7">
          {delivery ? (
            <>
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/38">
                    Active delivery
                  </p>
                  <h1 className="mt-2 truncate text-[34px] font-medium leading-none tracking-[-0.055em] sm:text-[42px]">
                    #{delivery.restaurantOrder.order.orderNumber}
                  </h1>
                </div>
                <span className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-[12px] font-semibold text-white/75">
                  <Bike className="h-4 w-4" strokeWidth={2.2} />
                  {delivery.status.replaceAll("_", " ")}
                </span>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3">
                <div>
                  <p className="text-[30px] font-light leading-none tracking-[-0.05em] sm:text-[34px]">
                    {itemCount}
                  </p>
                  <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/38">
                    {itemCount === 1 ? "Item" : "Items"}
                  </p>
                </div>
                <div>
                  <p className="text-[30px] font-light leading-none tracking-[-0.05em] sm:text-[34px]">
                    {moneyFormatter.format(Number(delivery.restaurantOrder.order.total))}
                  </p>
                  <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/38">
                    Order total
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="truncate text-[20px] font-medium leading-tight tracking-[-0.035em]">
                    {delivery.restaurantOrder.restaurant.name}
                  </p>
                  <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/38">
                    Pickup
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-3 border-t border-white/10 pt-5">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-white/55" strokeWidth={2.2} />
                  <div>
                    <p className="text-[14px] font-semibold">Customer drop-off</p>
                    <p className="mt-1 text-[12px] leading-[1.45] text-white/45">
                      Follow the map to the customer’s live delivery point.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ShoppingBag className="mt-0.5 h-5 w-5 shrink-0 text-white/55" strokeWidth={2.2} />
                  <div>
                    <p className="text-[14px] font-semibold">
                      {delivery.restaurantOrder.items
                        .map((item) => `${item.quantity}× ${item.name}`)
                        .join(" · ")}
                    </p>
                    <p className="mt-1 text-[12px] leading-[1.45] text-white/45">
                      {delivery.restaurantOrder.order.deliveryNote || "No delivery note from the customer."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-8">
                <form action={markRiderDeliveryDelivered}>
                  <input type="hidden" name="deliveryId" value={delivery.id} />
                  <RiderDeliveryCompleteButton />
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col">
              <div className="pt-8">
                <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/38">
                  Rider
                </p>
                <h1 className="mt-2 text-[40px] font-medium leading-[0.95] tracking-[-0.06em] sm:text-[52px]">
                  You’re ready.
                </h1>
                <p className="mt-4 max-w-[520px] text-[15px] leading-[1.55] text-white/48">
                  No active delivery right now. Your map stays centered on you, and the next restaurant assignment will appear here automatically.
                </p>
              </div>

              <div className="mt-auto flex items-center gap-3 border-t border-white/10 pt-5 text-white/45">
                <Bike className="h-5 w-5" strokeWidth={2.2} />
                <p className="text-[13px] font-medium">
                  Waiting for the next assignment
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
