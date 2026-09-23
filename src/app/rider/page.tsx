import { clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Bike, MapPin } from "lucide-react";

import { DashboardLiveRefresh } from "@/components/dashboard-live-refresh";
import { markRiderDeliveryDelivered } from "@/actions/rider";
import { RiderLocationTracker } from "@/components/rider-location-tracker";
import { RiderDeliveryCompleteButton } from "@/components/rider-delivery-complete-button";
import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export default async function RiderPage() {
  const user = await getOrCreateCurrentUser();
  if (!user) redirect("/");

  const delivery = await prisma.delivery.findFirst({
    where: {
      riderId: user.id,
      status: { notIn: ["DELIVERED", "CANCELLED"] },
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
              deliveryLatitude: true,
              deliveryLongitude: true,
              customer: {
                select: {
                  clerkId: true,
                  firstName: true,
                  lastName: true,
                  phoneNumber: true,
                },
              },
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

  const customer = delivery?.restaurantOrder.order.customer ?? null;
  const customerName = customer
    ? [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || "Customer"
    : null;

  let customerImageUrl: string | null = null;
  if (customer?.clerkId) {
    try {
      const client = await clerkClient();
      const clerkCustomer = await client.users.getUser(customer.clerkId);
      customerImageUrl = clerkCustomer.imageUrl || null;
    } catch {
      customerImageUrl = null;
    }
  }

  return (
    <main data-rider-page="true" className="h-[calc(100dvh-56px)] overflow-hidden bg-black text-white">
      <DashboardLiveRefresh intervalMs={12000} />

      <div className="mx-auto grid h-full w-full max-w-[560px] grid-rows-[auto_minmax(0,1fr)_auto] gap-3 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-3 sm:gap-4 sm:px-4 sm:pb-4 sm:pt-4">
        <RiderLocationTracker
          deliveryId={delivery?.id ?? null}
          destinationLatitude={delivery?.restaurantOrder.order.deliveryLatitude ?? null}
          destinationLongitude={delivery?.restaurantOrder.order.deliveryLongitude ?? null}
          customerName={customerName}
          customerPhone={customer?.phoneNumber ?? null}
          customerImageUrl={customerImageUrl}
        />

        {delivery ? (
          <section className="flex min-h-0 flex-col justify-center px-1">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-[family-name:var(--font-geist-mono)] text-[23px] font-medium leading-none tracking-[-0.045em] sm:text-[27px]">
                  #{delivery.restaurantOrder.order.orderNumber}
                </p>
                <p className="mt-2 truncate text-[14px] font-medium text-white/55">
                  {delivery.restaurantOrder.restaurant.name}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-white/55">
                <Bike className="h-4 w-4" strokeWidth={2.2} />
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </div>

            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/45" strokeWidth={2.2} />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold">Customer drop-off</p>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-[1.4] text-white/45">
                    {delivery.restaurantOrder.order.deliveryNote || "No delivery note."}
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="flex min-h-0 items-center px-1">
            <div>
              <h1 className="text-[30px] font-medium tracking-[-0.05em]">Ready.</h1>
              <p className="mt-2 max-w-[360px] text-[13px] leading-[1.45] text-white/45">
                No delivery assigned. Your location stays ready for the next job.
              </p>
            </div>
          </section>
        )}

        <div>
          {delivery ? (
            <form action={markRiderDeliveryDelivered}>
              <input type="hidden" name="deliveryId" value={delivery.id} />
              <RiderDeliveryCompleteButton />
            </form>
          ) : (
            <div className="flex h-[66px] items-center justify-center rounded-[10px] bg-[#202020] text-[13px] font-semibold text-white/35">
              Waiting for an assignment
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
