import type { ReactNode } from "react";
import {
  ArrowRight,
  Ban,
  Bike,
  Check,
  Clock3,
  EyeOff,
  Heart,
  Hourglass,
  MapPin,
  PackageCheck,
  Radio,
  Search,
  Send,
  ShoppingBag,
  Star,
  Store,
  UserRound,
  Utensils,
} from "lucide-react";

import {
  acknowledgeOrder,
  markOrderPickedUp,
  markOrderReady,
  sendOrderForDelivery,
} from "@/actions/orders";
import { addRestaurantStaff } from "@/actions/staff";
import { OrderElapsedTime } from "@/components/order-elapsed-time";
import { FeaturedMenuManager } from "@/components/featured-menu-manager";
import { DashboardSectionExplorer, type DashboardExplorerItem } from "@/components/dashboard-section-explorer";
import { PerformanceChart, type PerformanceDay } from "@/components/performance-chart";
import { OrderMoreMenu, RiderAssignButton, StaffMoreMenu } from "@/components/dashboard-action-controls";
import { RestaurantVerificationCard } from "@/components/restaurant-verification-card";
import { StaffUserSearch } from "@/components/staff-user-search";
import { prisma } from "@/lib/prisma";

type VerificationStep = {
  label: string;
  complete: boolean;
};

type RestaurantForDashboard = {
  name: string;
  description: string | null;
  phoneNumber: string | null;
  address: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  isVerified: boolean;
  openingTime: string;
  closingTime: string;
  operatingDays: number[];
  timezone: string;
  payoutBankName: string | null;
  payoutAccountName: string | null;
  payoutAccountNumber: string | null;
};

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

function DashboardHeading({
  title,
  count,
  expand,
}: {
  title: string;
  count?: number;
  expand?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-[14px] font-semibold leading-none tracking-[-0.02em] text-black">
          {title}
        </h2>
        {typeof count === "number" ? (
          <span className="text-[12px] font-medium leading-none tracking-[-0.01em] text-[#9A9A9A]">
            {count.toLocaleString()}
          </span>
        ) : null}
      </div>
      {expand ?? null}
    </div>
  );
}

function MenuThumb({
  src,
  alt,
}: {
  src?: string | null;
  alt: string;
}) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-9 w-9 shrink-0 rounded-[7px] border border-white/20 object-cover"
    />
  ) : (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[7px] bg-[#EAEAEA] text-black">
      <Utensils className="h-4 w-4" strokeWidth={2.3} />
    </span>
  );
}

function OrderThumb({
  src,
  alt,
}: {
  src?: string | null;
  alt: string;
}) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-9 w-9 shrink-0 rounded-[7px] border border-[#EAEAEA] object-cover"
    />
  ) : (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[7px] border border-[#EAEAEA] bg-white">
      <ShoppingBag className="h-4 w-4" strokeWidth={2.3} />
    </span>
  );
}

function HiddenOrderFields({
  restaurantId,
  restaurantOrderId,
}: {
  restaurantId: string;
  restaurantOrderId: string;
}) {
  return (
    <>
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="restaurantOrderId" value={restaurantOrderId} />
    </>
  );
}

function PendingOrdersPanel({
  restaurantId,
  orders,
  explorerItems,
}: {
  restaurantId: string;
  orders: Array<any>;
  explorerItems: DashboardExplorerItem[];
}) {
  return (
    <section className="min-h-[422px] w-full bg-white">
      <DashboardHeading
        title="Pending Orders"
        count={orders.length}
        expand={<DashboardSectionExplorer title="Pending Orders" count={orders.length} items={explorerItems} />}
      />

      <div className="mt-5 divide-y divide-[#EAEAEA]">
        {orders.length === 0 ? (
          <p className="py-8 text-[12px] font-medium text-[#808080]">No pending orders right now.</p>
        ) : (
          orders.slice(0, 3).map((row, index) => {
            const image = row.items[0]?.menuItem?.imageUrl;
            return (
              <article key={row.id} className="py-4 first:pt-0">
                <div className="flex items-start gap-3">
                  <OrderThumb src={image} alt={row.items[0]?.name ?? "Order"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold leading-none tracking-[-0.02em] text-black">
                      #{row.order.orderNumber}
                    </p>
                    <p className="mt-1 text-[10px] font-medium leading-none tracking-[-0.01em] text-[#808080]">
                      {row.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} items · {money(row.subtotal)} total
                    </p>
                  </div>
                  <form action={acknowledgeOrder}>
                    <HiddenOrderFields restaurantId={restaurantId} restaurantOrderId={row.id} />
                    <button className="rounded-[8px] bg-black px-3 py-2 text-[10px] font-semibold leading-none tracking-[-0.02em] text-white">
                      Start Making
                    </button>
                  </form>
                </div>

                {index === 0 ? (
                  <div className="ml-5 mt-4 border-l border-[#CFCFCF] pl-5">
                    <div className="space-y-3">
                      {row.items.slice(0, 3).map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 text-[10px]">
                          <span className="min-w-0 truncate font-medium text-black">
                            <span className="mr-2 text-[#808080]">x{item.quantity}</span>
                            {item.name}
                          </span>
                          <span className="shrink-0 font-medium text-[#808080]">
                            {money(Number(item.unitPrice) * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-[10px] font-medium text-[#808080]">
                      Order placed <span className="font-semibold text-black"><OrderElapsedTime createdAt={row.createdAt.toISOString()} /></span> ago
                    </p>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function ActiveOrdersPanel({
  restaurantId,
  orders,
  explorerItems,
}: {
  restaurantId: string;
  orders: Array<any>;
  explorerItems: DashboardExplorerItem[];
}) {
  return (
    <section className="min-h-[527px] w-full bg-white">
      <DashboardHeading
        title="Active Orders"
        count={orders.length}
        expand={<DashboardSectionExplorer title="Active Orders" count={orders.length} items={explorerItems} />}
      />

      <div className="mt-5 divide-y divide-[#EAEAEA]">
        {orders.length === 0 ? (
          <p className="py-8 text-[12px] font-medium text-[#808080]">No active orders right now.</p>
        ) : (
          orders.slice(0, 4).map((row, index) => {
            const image = row.items[0]?.menuItem?.imageUrl;
            return (
              <article key={row.id} className="py-4 first:pt-0">
                <div className="flex items-start gap-3">
                  <OrderThumb src={image} alt={row.items[0]?.name ?? "Order"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold leading-none tracking-[-0.02em] text-black">
                      #{row.order.orderNumber}
                    </p>
                    <p className="mt-1 text-[10px] font-medium leading-none tracking-[-0.01em] text-[#808080]">
                      {row.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} items · {money(row.subtotal)} total
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-[#808080]">
                    {row.status === "PREPARING" ? (
                      <>Preparing <Clock3 className="h-3 w-3" strokeWidth={2.3} /></>
                    ) : row.status === "READY_FOR_PICKUP" ? (
                      <>Not Sent <Hourglass className="h-3 w-3" strokeWidth={2.3} /></>
                    ) : (
                      <>Sent out <Send className="h-3 w-3" strokeWidth={2.3} /></>
                    )}
                  </span>
                </div>

                {index === 0 && row.status === "PREPARING" ? (
                  <div className="mt-4">
                    <div className="ml-5 border-l border-[#CFCFCF] pl-5">
                      <div className="space-y-3">
                        {row.items.slice(0, 3).map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between gap-3 text-[10px]">
                            <span className="min-w-0 truncate font-medium text-black">
                              <span className="mr-2 text-[#808080]">x{item.quantity}</span>{item.name}
                            </span>
                            <span className="shrink-0 font-medium text-[#808080]">{money(Number(item.unitPrice) * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="mt-4 text-[10px] font-medium text-[#808080]">
                      Preparation has taken <span className="font-semibold text-black"><OrderElapsedTime createdAt={row.updatedAt.toISOString()} /></span> so far
                    </p>
                    <div className="mt-2 flex gap-2">
                      <form action={markOrderReady} className="flex-1">
                        <HiddenOrderFields restaurantId={restaurantId} restaurantOrderId={row.id} />
                        <button className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[8px] bg-black text-[10px] font-semibold text-white">
                          <Check className="h-3.5 w-3.5" strokeWidth={2.3} /> Mark as Ready
                        </button>
                      </form>
                      <OrderMoreMenu restaurantId={restaurantId} restaurantOrderId={row.id} />
                    </div>
                    <p className="mt-2 text-[9px] font-medium text-[#A0A0A0]">Customer will be told their order is ready.</p>
                  </div>
                ) : row.status === "READY_FOR_PICKUP" ? (
                  <div className="mt-3 flex gap-2">
                    <form action={sendOrderForDelivery} className="flex-1">
                      <HiddenOrderFields restaurantId={restaurantId} restaurantOrderId={row.id} />
                      <button className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[8px] bg-black text-[10px] font-semibold text-white">
                        <Bike className="h-3.5 w-3.5" strokeWidth={2.3} /> Send to Rider
                      </button>
                    </form>
                    <form action={markOrderPickedUp} className="flex-1">
                      <HiddenOrderFields restaurantId={restaurantId} restaurantOrderId={row.id} />
                      <button className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[8px] bg-[#EAEAEA] text-[10px] font-semibold text-black">
                        <PackageCheck className="h-3.5 w-3.5" strokeWidth={2.3} /> Customer Pick-up
                      </button>
                    </form>
                    <OrderMoreMenu restaurantId={restaurantId} restaurantOrderId={row.id} />
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function LiveMapPanel({
  restaurant,
  latestDelivery,
}: {
  restaurant: RestaurantForDashboard;
  latestDelivery: any | null;
}) {
  const lat = latestDelivery?.lastLatitude ?? restaurant.latitude;
  const lng = latestDelivery?.lastLongitude ?? restaurant.longitude;
  const hasCoordinates = typeof lat === "number" && typeof lng === "number";
  const delta = 0.025;
  const mapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`
    : null;

  return (
    <section className="relative min-h-[535px] overflow-hidden rounded-[12px] bg-[#102D3A]">
      {mapUrl ? (
        <iframe
          title="Live restaurant delivery map"
          src={mapUrl}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0">
          <div className="absolute left-[12%] top-[22%] h-px w-[72%] rotate-[14deg] bg-white/10" />
          <div className="absolute left-[18%] top-[50%] h-px w-[70%] -rotate-[17deg] bg-white/10" />
          <div className="absolute left-[44%] top-[8%] h-[80%] w-px rotate-[7deg] bg-white/10" />
          <div className="absolute left-[67%] top-[8%] h-[80%] w-px -rotate-[11deg] bg-white/10" />
        </div>
      )}

      <span className="absolute left-6 top-6 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-black">
        <Radio className="h-3.5 w-3.5" strokeWidth={2.3} />
        LIVE
      </span>

      <div className="absolute bottom-6 left-6 flex max-w-[360px] items-center gap-3 rounded-[8px] bg-black px-4 py-3 text-white">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] border border-white/15">
          <MapPin className="h-4 w-4" strokeWidth={2.3} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold">
            {restaurant.address || "Restaurant location"}
          </p>
          <p className="mt-1 truncate text-[9px] font-medium text-[#B0B0B0]">
            {latestDelivery?.rider
              ? `${personName(latestDelivery.rider)} · live delivery`
              : hasCoordinates
                ? "Live restaurant location"
                : "Add coordinates to enable the live map"}
          </p>
        </div>
      </div>
    </section>
  );
}

function ReviewsPanel({
  complaintsOpen,
  mealUnread,
  restaurantRating,
  explorerItems,
}: {
  complaintsOpen: number;
  mealUnread: number;
  restaurantRating: number | null;
  explorerItems: DashboardExplorerItem[];
}) {
  const rows = [
    { icon: Heart, title: "Customer Complaints", detail: `${complaintsOpen.toLocaleString()} unresolved`, tone: "bg-red-50 text-red-500" },
    { icon: ShoppingBag, title: "Meal Reviews", detail: `${mealUnread.toLocaleString()} unread`, tone: "bg-green-50 text-green-500" },
    { icon: Star, title: "Restaurant Ratings", detail: restaurantRating === null ? "No ratings yet" : `${restaurantRating.toFixed(1)}/5 stars`, tone: "bg-yellow-50 text-yellow-500" },
  ];

  return (
    <section className="min-h-[337px] rounded-[12px] bg-[#F3F3F3] px-6 py-6 sm:px-8">
      <DashboardHeading
        title="Reviews"
        expand={<DashboardSectionExplorer title="Reviews" items={explorerItems} />}
      />
      <div className="mt-5 divide-y divide-[#DEDEDE]">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.title} className="flex items-center gap-4 py-4 first:pt-0">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[8px] ${row.tone}`}>
                <Icon className="h-5 w-5" strokeWidth={2.3} />
              </span>
              <div>
                <p className="text-[12px] font-semibold tracking-[-0.02em] text-black">{row.title}</p>
                <p className="mt-1 text-[10px] font-medium text-[#808080]">{row.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StaffPanel({
  restaurantId,
  staff,
  explorerItems,
}: {
  restaurantId: string;
  staff: Array<any>;
  explorerItems: DashboardExplorerItem[];
}) {
  const visible = staff.filter((member) => member.role !== "RIDER");

  return (
    <section className="min-h-[350px] bg-white">
      <DashboardHeading
        title="Your Staff"
        count={visible.length}
        expand={<DashboardSectionExplorer title="Your Staff" count={visible.length} items={explorerItems} />}
      />

      <details className="group mt-4">
        <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-[8px] border-2 border-[#EAEAEA] px-3 text-[10px] font-medium text-[#9A9A9A]">
          <Search className="h-3.5 w-3.5" strokeWidth={2.3} /> Search or Add New...
        </summary>
        <form action={addRestaurantStaff} className="mt-3 rounded-[10px] border border-[#EAEAEA] p-3">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="role" value="STAFF" />
          <StaffUserSearch restaurantId={restaurantId} />
          <button className="mt-3 h-9 w-full rounded-[8px] bg-black text-[11px] font-semibold text-white">Add Staff Member</button>
        </form>
      </details>

      <div className="mt-4 divide-y divide-[#EAEAEA]">
        {visible.slice(0, 4).map((member) => (
          <div key={member.id} className="flex items-center gap-3 py-4 first:pt-0">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#EFEFEF]">
              <UserRound className="h-4 w-4 text-[#808080]" strokeWidth={2.3} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-black">{personName(member.user)}</p>
              <p className="mt-1 text-[9px] font-medium uppercase text-[#808080]">{member.role} · {member.isActive ? "Active" : "Inactive"}</p>
            </div>
            <StaffMoreMenu
              restaurantId={restaurantId}
              membershipId={member.id}
              name={personName(member.user)}
              isActive={member.isActive}
              disabled={member.role === "OWNER"}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function RidersPanel({
  restaurantId,
  riders,
  assignableOrders,
  explorerItems,
}: {
  restaurantId: string;
  riders: Array<any>;
  assignableOrders: Array<{ id: string; orderNumber: string; total: string }>;
  explorerItems: DashboardExplorerItem[];
}) {
  return (
    <section className="min-h-[350px] bg-white">
      <DashboardHeading
        title="Riders on Duty"
        count={riders.length}
        expand={<DashboardSectionExplorer title="Riders on Duty" count={riders.length} items={explorerItems} />}
      />

      <details className="group mt-4">
        <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-[8px] border-2 border-[#EAEAEA] px-3 text-[10px] font-medium text-[#9A9A9A]">
          <Search className="h-3.5 w-3.5" strokeWidth={2.3} /> Search or Add New...
        </summary>
        <form action={addRestaurantStaff} className="mt-3 rounded-[10px] border border-[#EAEAEA] p-3">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="role" value="RIDER" />
          <StaffUserSearch restaurantId={restaurantId} />
          <button className="mt-3 h-9 w-full rounded-[8px] bg-black text-[11px] font-semibold text-white">Add Rider</button>
        </form>
      </details>

      <div className="mt-4 divide-y divide-[#EAEAEA]">
        {riders.slice(0, 4).map((rider) => {
          const delivering = rider.user.assignedDeliveries?.find(
            (delivery: any) => !["DELIVERED", "CANCELLED"].includes(delivery.status)
          );
          return (
            <div key={rider.id} className="flex items-center gap-3 py-4 first:pt-0">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#EFEFEF]">
                <Bike className="h-4 w-4 text-[#808080]" strokeWidth={2.3} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-black">{personName(rider.user)}</p>
                <p className={`mt-1 text-[9px] font-medium ${delivering ? "text-[#808080]" : "text-green-500"}`}>
                  {delivering ? "Delivering an order" : rider.isActive ? "Available to deliver" : "Off duty"}
                </p>
              </div>
              {!delivering && rider.isActive ? (
                <RiderAssignButton
                  restaurantId={restaurantId}
                  riderId={rider.userId}
                  riderName={personName(rider.user)}
                  orders={assignableOrders}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PastOrdersPanel({
  orders,
  explorerItems,
}: {
  orders: Array<any>;
  explorerItems: DashboardExplorerItem[];
}) {
  return (
    <section className="min-h-[337px] rounded-[12px] bg-[#F3F3F3] px-6 py-6 sm:px-8">
      <DashboardHeading
        title="All Past Orders"
        count={orders.length}
        expand={<DashboardSectionExplorer title="All Past Orders" count={orders.length} items={explorerItems} />}
      />

      <div className="mt-5 grid gap-x-8 sm:grid-cols-2">
        {orders.length === 0 ? (
          <p className="text-[12px] font-medium text-[#808080]">No past orders yet.</p>
        ) : (
          orders.slice(0, 6).map((row) => {
            const image = row.items[0]?.menuItem?.imageUrl;
            const statusTone = row.status === "DELIVERED" ? "text-green-500" : row.status === "CANCELLED" ? "text-red-500" : "text-[#808080]";
            return (
              <div key={row.id} className="flex items-center gap-3 border-b border-[#DEDEDE] py-4 first:pt-0">
                <OrderThumb src={image} alt={row.items[0]?.name ?? "Order"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-semibold text-black">#{row.order.orderNumber}</p>
                  <p className="mt-1 truncate text-[9px] font-medium text-[#808080]">{money(row.subtotal)} total · {row.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} items</p>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 text-[9px] font-semibold ${statusTone}`}>
                  {row.status === "DELIVERED" ? <>Delivered <PackageCheck className="h-3 w-3" strokeWidth={2.3} /></> : row.status === "CANCELLED" ? <>Cancelled <Ban className="h-3 w-3" strokeWidth={2.3} /></> : <>Picked up <Store className="h-3 w-3" strokeWidth={2.3} /></>}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function PerformancePanel({
  weeklyDays,
  revenueToday,
  totalOrders,
  totalCustomers,
  explorerItems,
}: {
  weeklyDays: PerformanceDay[];
  revenueToday: number;
  totalOrders: number;
  totalCustomers: number;
  explorerItems: DashboardExplorerItem[];
}) {
  return (
    <section className="min-h-[594px] bg-white">
      <DashboardHeading
        title="Performance"
        expand={<DashboardSectionExplorer title="Performance" items={explorerItems} />}
      />
      <span className="-mt-3 ml-[88px] block text-[12px] font-medium text-[#9A9A9A]">Past 7 days</span>

      <PerformanceChart days={weeklyDays} />

      <div className="mt-3">
        <DashboardSectionExplorer
          title="Performance"
          items={explorerItems}
          triggerLabel={
            <span className="inline-flex items-center justify-center gap-1.5">
              All-time performance
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.3} />
            </span>
          }
          triggerClassName="h-8 w-full rounded-[8px] border border-[#EAEAEA] text-[10px] font-semibold text-black"
        />
      </div>

      <div className="mt-5 divide-y divide-[#EAEAEA]">
        {[
          { icon: Store, value: money(revenueToday), label: "Revenue today" },
          { icon: ShoppingBag, value: totalOrders.toLocaleString(), label: "Orders made" },
          { icon: UserRound, value: totalCustomers.toLocaleString(), label: "Customers" },
        ].map((row, index) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex items-center gap-3 py-4 first:pt-0">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[8px] ${index === 0 ? "bg-black text-white" : "bg-[#EFEFEF] text-black"}`}>
                <Icon className="h-4 w-4" strokeWidth={2.3} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold tracking-[-0.02em] text-black">{row.value}</p>
                <p className="mt-1 text-[10px] font-medium text-[#808080]">{row.label}</p>
              </div>
              <EyeOff className="h-3.5 w-3.5 text-[#808080]" strokeWidth={2.3} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export async function RestaurantDashboardGrid({
  restaurantId,
  restaurant,
  verificationSteps,
}: {
  restaurantId: string;
  restaurant: RestaurantForDashboard;
  verificationSteps: VerificationStep[];
}) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const [
    orders,
    staff,
    menuItems,
    featuredCombos,
    categories,
    totalOrders,
    customerRows,
    weeklyRows,
    allRevenueRows,
    reviews,
    complaints,
  ] = await Promise.all([
    prisma.restaurantOrder.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        order: {
          select: {
            orderNumber: true,
            customerId: true,
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
        delivery: {
          include: {
            rider: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    }),
    prisma.restaurantStaff.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "asc" },
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
                status: true,
              },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.menuItem.findMany({
      where: { restaurantId, isArchived: false },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.featuredCombo.findMany({
      where: { restaurantId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          include: {
            menuItem: true,
          },
        },
        reviews: {
          select: { rating: true },
        },
      },
    }),
    prisma.menuCategory.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.restaurantOrder.count({ where: { restaurantId } }),
    prisma.restaurantOrder.findMany({
      where: { restaurantId },
      select: {
        order: {
          select: {
            customerId: true,
          },
        },
      },
    }),
    prisma.restaurantOrder.findMany({
      where: {
        restaurantId,
        createdAt: { gte: weekStart },
        status: { not: "CANCELLED" },
      },
      select: {
        createdAt: true,
        subtotal: true,
        order: {
          select: {
            customerId: true,
            payment: { select: { status: true } },
          },
        },
      },
    }),
    prisma.restaurantOrder.findMany({
      where: {
        restaurantId,
        status: { not: "CANCELLED" },
      },
      select: {
        subtotal: true,
        order: {
          select: {
            payment: { select: { status: true } },
          },
        },
      },
    }),
    prisma.review.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: 100,
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
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: 100,
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

  const pendingOrders = orders.filter((row) => row.status === "CONFIRMED");
  const activeOrders = orders.filter((row) =>
    ["PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"].includes(row.status)
  );
  const pastOrders = orders.filter((row) =>
    ["DELIVERED", "PICKED_UP", "CANCELLED"].includes(row.status)
  );
  const riders = staff.filter((member) => member.role === "RIDER");
  const latestDelivery =
    orders.find((row) => row.delivery?.lastLocationAt)?.delivery ??
    orders.find((row) => row.delivery)?.delivery ??
    null;

  const assignableOrders = activeOrders
    .filter((row) => row.status === "OUT_FOR_DELIVERY" && !row.delivery?.riderId)
    .map((row) => ({
      id: row.id,
      orderNumber: row.order.orderNumber,
      total: money(row.subtotal),
    }));

  const totalCustomers = new Set(customerRows.map((row) => row.order.customerId)).size;
  const successfulAllRevenue = allRevenueRows.filter((row) => row.order.payment?.status === "SUCCESS");
  const allTimeRevenue = successfulAllRevenue.reduce((sum, row) => sum + Number(row.subtotal), 0);

  const revenueToday = weeklyRows
    .filter((row) => row.createdAt >= todayStart && row.order.payment?.status === "SUCCESS")
    .reduce((sum, row) => sum + Number(row.subtotal), 0);

  const menuItemData = menuItems.map((item) => ({
    id: item.id,
    name: item.name,
    price: Number(item.price),
    imageUrl: item.imageUrl,
    isAvailable: item.isAvailable,
    readyMin: item.readyMin,
    readyMax: item.readyMax,
    deliverySeconds: item.deliverySeconds,
    categoryId: item.categoryId,
    categoryName: item.category.name,
  }));

  const comboData = featuredCombos.map((combo) => {
    const ratingAverage = combo.reviews.length
      ? combo.reviews.reduce((sum, review) => sum + review.rating, 0) / combo.reviews.length
      : null;

    return {
      id: combo.id,
      name: combo.name,
      readyMin: combo.readyMin,
      readyMax: combo.readyMax,
      deliverySeconds: combo.deliverySeconds,
      ratingAverage,
      ratingCount: combo.reviews.length,
      items: combo.items.map((entry) => ({
        id: entry.id,
        quantity: entry.quantity,
        menuItem: {
          id: entry.menuItem.id,
          name: entry.menuItem.name,
          price: Number(entry.menuItem.price),
          imageUrl: entry.menuItem.imageUrl,
          isAvailable: entry.menuItem.isAvailable,
          readyMin: entry.menuItem.readyMin,
          readyMax: entry.menuItem.readyMax,
          deliverySeconds: entry.menuItem.deliverySeconds,
          categoryId: entry.menuItem.categoryId,
          categoryName: categories.find((category) => category.id === entry.menuItem.categoryId)?.name ?? "Menu",
        },
      })),
    };
  });

  const categoryData = categories.map((category) => ({
    id: category.id,
    name: category.name,
    itemCount: menuItems.filter((item) => item.categoryId === category.id).length,
  }));

  const pastOrderData = pastOrders.slice(0, 12).map((row) => ({
    id: row.id,
    orderNumber: row.order.orderNumber,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));

  function orderExplorerItems(rows: Array<any>): DashboardExplorerItem[] {
    return rows.map((row) => {
      const itemCount = row.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
      const imageUrl = row.items[0]?.menuItem?.imageUrl ?? null;
      const tone =
        row.status === "DELIVERED"
          ? "green"
          : row.status === "CANCELLED"
            ? "red"
            : row.status === "READY_FOR_PICKUP"
              ? "amber"
              : "neutral";

      return {
        id: row.id,
        title: `#${row.order.orderNumber}`,
        subtitle: `${itemCount} items · ${money(row.subtotal)} total`,
        status: row.status.replaceAll("_", " "),
        statusTone: tone,
        imageUrl,
        details: [
          ...row.items.map((item: any) => ({
            label: `x${item.quantity} ${item.name}`,
            value: money(Number(item.unitPrice) * item.quantity),
          })),
          { label: "Placed", value: row.createdAt.toLocaleString() },
          { label: "Payment", value: row.order.payment?.status ?? "No payment record" },
        ],
      } satisfies DashboardExplorerItem;
    });
  }

  const pendingExplorerItems = orderExplorerItems(pendingOrders);
  const activeExplorerItems = orderExplorerItems(activeOrders);
  const pastExplorerItems = orderExplorerItems(pastOrders);

  const staffExplorerItems: DashboardExplorerItem[] = staff
    .filter((member) => member.role !== "RIDER")
    .map((member) => ({
      id: member.id,
      title: personName(member.user),
      subtitle: member.user.email,
      status: member.isActive ? "Active" : "Inactive",
      statusTone: (member.isActive ? "green" : "neutral") as DashboardExplorerItem["statusTone"],
      details: [
        { label: "Role", value: member.role },
        { label: "Access", value: member.isActive ? "Active" : "Inactive" },
        { label: "Email", value: member.user.email },
      ],
    }));

  const riderExplorerItems: DashboardExplorerItem[] = riders.map((rider) => {
    const delivering = rider.user.assignedDeliveries?.[0];
    return {
      id: rider.id,
      title: personName(rider.user),
      subtitle: rider.user.email,
      status: delivering ? "Delivering" : rider.isActive ? "Available" : "Off duty",
      statusTone: (delivering ? "amber" : rider.isActive ? "green" : "neutral") as DashboardExplorerItem["statusTone"],
      details: [
        { label: "Role", value: "RIDER" },
        { label: "Access", value: rider.isActive ? "Active" : "Inactive" },
        { label: "Delivery", value: delivering ? "Currently delivering an order" : "No active delivery" },
      ],
    };
  });

  const mealReviews = reviews.filter((review) =>
    ["MENU_ITEM", "FEATURED_COMBO"].includes(review.target)
  );
  const restaurantRatings = reviews.filter((review) => review.target === "RESTAURANT");
  const restaurantRating = restaurantRatings.length
    ? restaurantRatings.reduce((sum, review) => sum + review.rating, 0) / restaurantRatings.length
    : null;
  const complaintsOpen = complaints.filter((complaint) => complaint.status === "OPEN").length;
  const mealUnread = mealReviews.filter((review) => !review.isRead).length;

  const reviewExplorerItems: DashboardExplorerItem[] = [
    ...complaints.map((complaint) => ({
      id: `complaint-${complaint.id}`,
      title: complaint.subject,
      subtitle: `${personName(complaint.customer)}${complaint.restaurantOrder ? ` · #${complaint.restaurantOrder.order.orderNumber}` : ""}`,
      status: complaint.status,
      statusTone: (complaint.status === "OPEN" ? "red" : "green") as DashboardExplorerItem["statusTone"],
      body: complaint.body,
      details: [
        { label: "Type", value: "Customer complaint" },
        { label: "Submitted", value: complaint.createdAt.toLocaleString() },
      ],
    })),
    ...reviews.map((review) => ({
      id: `review-${review.id}`,
      title:
        review.target === "RESTAURANT"
          ? "Restaurant rating"
          : review.target === "FEATURED_COMBO"
            ? review.featuredCombo?.name ?? "Featured combo review"
            : review.menuItem?.name ?? "Meal review",
      subtitle: `${personName(review.customer)}${review.restaurantOrder ? ` · #${review.restaurantOrder.order.orderNumber}` : ""}`,
      status: `${review.rating}/5`,
      statusTone: "green" as DashboardExplorerItem["statusTone"],
      body: review.body,
      details: [
        { label: "Rating", value: `${review.rating}/5` },
        { label: "Type", value: review.target.replaceAll("_", " ") },
        { label: "Submitted", value: review.createdAt.toLocaleString() },
      ],
    })),
  ];

  const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const weeklyDays: PerformanceDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const rows = weeklyRows.filter((row) => row.createdAt >= date && row.createdAt < next);
    const paidRows = rows.filter((row) => row.order.payment?.status === "SUCCESS");
    return {
      label: dayFormatter.format(date).toUpperCase().slice(0, 3),
      dateLabel: dateFormatter.format(date),
      count: rows.length,
      revenue: paidRows.reduce((sum, row) => sum + Number(row.subtotal), 0),
      customers: new Set(rows.map((row) => row.order.customerId)).size,
    };
  });

  const performanceExplorerItems: DashboardExplorerItem[] = [
    {
      id: "all-time",
      title: "All-time performance",
      subtitle: "Since this restaurant joined Paperbag",
      status: "Live totals",
      statusTone: "neutral",
      details: [
        { label: "Revenue", value: money(allTimeRevenue) },
        { label: "Orders", value: totalOrders.toLocaleString() },
        { label: "Customers", value: totalCustomers.toLocaleString() },
      ],
    },
    ...weeklyDays.map((day) => ({
      id: day.dateLabel,
      title: day.dateLabel,
      subtitle: `${day.count} orders`,
      details: [
        { label: "Orders", value: day.count.toLocaleString() },
        { label: "Paid revenue", value: money(day.revenue) },
        { label: "Customers", value: day.customers.toLocaleString() },
      ],
    })),
  ];

  return (
    <div className="grid items-start gap-x-[36px] lg:grid-cols-[minmax(0,1069fr)_minmax(0,422fr)]">
      <div className="flex min-w-0 flex-col gap-[20px]">
        <div id="restaurant-verification">
          <RestaurantVerificationCard
            restaurantId={restaurantId}
            restaurantName={restaurant.name}
            imageUrl={restaurant.imageUrl}
            description={restaurant.description}
            phoneNumber={restaurant.phoneNumber}
            address={restaurant.address}
            bankName={restaurant.payoutBankName}
            accountName={restaurant.payoutAccountName}
            accountNumber={restaurant.payoutAccountNumber}
            openingTime={restaurant.openingTime}
            closingTime={restaurant.closingTime}
            operatingDays={restaurant.operatingDays}
            timezone={restaurant.timezone}
            steps={verificationSteps}
          />
        </div>

        <FeaturedMenuManager
          restaurantId={restaurantId}
          restaurant={{
            name: restaurant.name,
            address: restaurant.address,
            imageUrl: restaurant.imageUrl,
            isVerified: restaurant.isVerified,
          }}
          menuItems={menuItemData}
          combos={comboData}
          pastOrders={pastOrderData}
          categories={categoryData}
        />

        <LiveMapPanel restaurant={restaurant} latestDelivery={latestDelivery} />

        <ReviewsPanel
          complaintsOpen={complaintsOpen}
          mealUnread={mealUnread}
          restaurantRating={restaurantRating}
          explorerItems={reviewExplorerItems}
        />

        <PastOrdersPanel orders={pastOrders} explorerItems={pastExplorerItems} />
      </div>

      <div className="mt-[20px] flex min-w-0 flex-col gap-[60px] lg:mt-0">
        <PendingOrdersPanel restaurantId={restaurantId} orders={pendingOrders} explorerItems={pendingExplorerItems} />

        <ActiveOrdersPanel restaurantId={restaurantId} orders={activeOrders} explorerItems={activeExplorerItems} />

        <StaffPanel restaurantId={restaurantId} staff={staff} explorerItems={staffExplorerItems} />

        <RidersPanel
          restaurantId={restaurantId}
          riders={riders}
          assignableOrders={assignableOrders}
          explorerItems={riderExplorerItems}
        />

        <PerformancePanel
          weeklyDays={weeklyDays}
          revenueToday={revenueToday}
          totalOrders={totalOrders}
          totalCustomers={totalCustomers}
          explorerItems={performanceExplorerItems}
        />
      </div>
    </div>
  );
}
