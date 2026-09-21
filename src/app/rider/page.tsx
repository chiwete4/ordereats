import { redirect } from "next/navigation";
import { Bike, MapPin, ShoppingBag } from "lucide-react";

import { DashboardLiveRefresh } from "@/components/dashboard-live-refresh";
import { markRiderDeliveryDelivered } from "@/actions/rider";
import { RiderLocationTracker } from "@/components/rider-location-tracker";
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

  return (
    <main className="min-h-screen bg-white px-4 py-12 sm:px-8">
      <DashboardLiveRefresh intervalMs={12000} />
      <div className="mx-auto max-w-[620px]">
        <div className="flex items-center gap-2">
          <Bike className="h-5 w-5" strokeWidth={2.3} />
          <h1 className="text-[24px] font-semibold tracking-[-0.04em]">Rider</h1>
        </div>

        {!delivery ? (
          <div className="mt-8 rounded-[14px] border border-black/10 p-6">
            <p className="text-[14px] font-semibold">No active delivery</p>
            <p className="mt-2 text-[11px] leading-[1.5] text-black/55">
              When a restaurant assigns you a delivery, it will appear here and Paperbag can share your live location with that restaurant.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <section className="rounded-[14px] border border-black/10 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-black/40">
                Active delivery
              </p>
              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[18px] font-semibold tracking-[-0.03em]">
                    #{delivery.restaurantOrder.order.orderNumber}
                  </h2>
                  <p className="mt-1 text-[12px] font-medium text-black/55">
                    {delivery.restaurantOrder.restaurant.name}
                  </p>
                </div>
                <span className="rounded-full bg-black px-3 py-1.5 text-[9px] font-semibold text-white">
                  {delivery.status.replaceAll("_", " ")}
                </span>
              </div>

              <div className="mt-5 space-y-3 border-t border-black/10 pt-4">
                <p className="flex items-center gap-2 text-[11px]">
                  <MapPin className="h-4 w-4 shrink-0" strokeWidth={2.3} />
                  {delivery.restaurantOrder.restaurant.address || "Restaurant address not set"}
                </p>
                <p className="flex items-center gap-2 text-[11px]">
                  <ShoppingBag className="h-4 w-4 shrink-0" strokeWidth={2.3} />
                  {delivery.restaurantOrder.items.reduce((sum, item) => sum + item.quantity, 0)} items · {moneyFormatter.format(Number(delivery.restaurantOrder.order.total))}
                </p>
              </div>
            </section>

            <RiderLocationTracker deliveryId={delivery.id} />

            <form action={markRiderDeliveryDelivered}>
              <input type="hidden" name="deliveryId" value={delivery.id} />
              <button className="h-11 w-full rounded-[10px] bg-black text-[12px] font-semibold text-white">
                Mark Delivery Complete
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
