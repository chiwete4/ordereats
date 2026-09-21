import {
  Bike,
  Check,
  CircleSlash2,
  Clock3,
  Heart,
  MapPin,
  MoreHorizontal,
  PackageCheck,
  Search,
  ShoppingBag,
  Star,
  Store,
  Trash2,
  UserRound,
  Utensils,
} from "lucide-react";

import {
  acknowledgeOrder,
  assignRider,
  markOrderPickedUp,
  markOrderReady,
  sendOrderForDelivery,
} from "@/actions/orders";
import { deleteMenuItem } from "@/actions/menu";
import { addRestaurantStaff } from "@/actions/staff";
import { OrderElapsedTime } from "@/components/order-elapsed-time";
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
}: {
  title: string;
  count?: number;
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
      <button
        type="button"
        className="text-[11px] font-semibold leading-none tracking-[-0.02em] text-black underline underline-offset-2"
      >
        Expand
      </button>
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
}: {
  restaurantId: string;
  orders: Array<any>;
}) {
  return (
    <section className="min-h-[422px] w-full bg-white">
      <DashboardHeading title="Pending Orders" count={orders.length} />

      <div className="mt-5 divide-y divide-[#EAEAEA]">
        {orders.length === 0 ? (
          <p className="py-8 text-[12px] font-medium text-[#808080]">
            No pending orders right now.
          </p>
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
}: {
  restaurantId: string;
  orders: Array<any>;
}) {
  return (
    <section className="min-h-[527px] w-full bg-white">
      <DashboardHeading title="Active Orders" count={orders.length} />

      <div className="mt-5 divide-y divide-[#EAEAEA]">
        {orders.length === 0 ? (
          <p className="py-8 text-[12px] font-medium text-[#808080]">
            No active orders right now.
          </p>
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
                  <span className="shrink-0 text-[10px] font-medium text-[#808080]">
                    {row.status === "PREPARING"
                      ? "Preparing"
                      : row.status === "READY_FOR_PICKUP"
                        ? "Not Sent"
                        : "Sent out"}
                  </span>
                </div>

                {index === 0 && row.status === "PREPARING" ? (
                  <div className="mt-4">
                    <div className="ml-5 border-l border-[#CFCFCF] pl-5">
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
                    </div>
                    <p className="mt-4 text-[10px] font-medium text-[#808080]">
                      Preparation has taken <span className="font-semibold text-black"><OrderElapsedTime createdAt={row.updatedAt.toISOString()} /></span> so far
                    </p>
                    <div className="mt-2 flex gap-2">
                      <form action={markOrderReady} className="flex-1">
                        <HiddenOrderFields restaurantId={restaurantId} restaurantOrderId={row.id} />
                        <button className="h-8 w-full rounded-[8px] bg-black text-[10px] font-semibold text-white">
                          ✓ Mark as Ready
                        </button>
                      </form>
                      <button type="button" className="grid h-8 w-8 place-items-center rounded-[8px] bg-[#EAEAEA]">
                        <MoreHorizontal className="h-4 w-4" strokeWidth={2.3} />
                      </button>
                    </div>
                    <p className="mt-2 text-[9px] font-medium text-[#A0A0A0]">
                      Customer will be told their order is ready.
                    </p>
                  </div>
                ) : row.status === "READY_FOR_PICKUP" ? (
                  <div className="mt-3 flex gap-2">
                    <form action={sendOrderForDelivery} className="flex-1">
                      <HiddenOrderFields restaurantId={restaurantId} restaurantOrderId={row.id} />
                      <button className="h-8 w-full rounded-[8px] bg-black text-[10px] font-semibold text-white">
                        Send to Rider
                      </button>
                    </form>
                    <form action={markOrderPickedUp} className="flex-1">
                      <HiddenOrderFields restaurantId={restaurantId} restaurantOrderId={row.id} />
                      <button className="h-8 w-full rounded-[8px] bg-[#EAEAEA] text-[10px] font-semibold text-black">
                        Customer Pick-up
                      </button>
                    </form>
                    <button type="button" className="grid h-8 w-8 place-items-center rounded-[8px] bg-[#EAEAEA]">
                      <MoreHorizontal className="h-4 w-4" strokeWidth={2.3} />
                    </button>
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

function FeaturedMenuPanel({
  restaurantId,
  restaurant,
  items,
}: {
  restaurantId: string;
  restaurant: RestaurantForDashboard;
  items: Array<any>;
}) {
  return (
    <section className="flex min-h-[682px] w-full flex-col rounded-[12px] bg-black px-6 py-6 text-white sm:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="grid h-[56px] w-[56px] place-items-center overflow-hidden rounded-[8px] bg-white/10">
            {items[0]?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={items[0].imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Store className="h-5 w-5" strokeWidth={2.3} />
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <h2 className="text-[22px] font-medium leading-none tracking-[-0.04em]">
              {restaurant.name}
            </h2>
            {restaurant.isVerified ? (
              <span className="text-[10px] font-medium text-[#B0B0B0]">● Verified by Paperbag</span>
            ) : null}
            {restaurant.address ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#B0B0B0]">
                <MapPin className="h-3 w-3" strokeWidth={2.3} />
                {restaurant.address}
              </span>
            ) : null}
          </div>
        </div>
        <a href="#restaurant-verification" className="mt-[62px] shrink-0 text-[11px] font-semibold underline underline-offset-2">
          Edit Restaurant
        </a>
      </div>

      <p className="mt-5 text-[11px] font-medium text-[#8E8E8E]">Featured Combos</p>

      <div className="mt-3 flex-1 divide-y divide-white/10">
        {items.length === 0 ? (
          <p className="py-8 text-[12px] font-medium text-[#8E8E8E]">
            Add menu items to build your featured menu.
          </p>
        ) : (
          items.slice(0, 3).map((item, index) => (
            <article key={item.id} className="py-5 first:pt-0">
              <div className="flex items-start gap-3">
                <span className="pt-2 text-[12px] font-semibold">#{index + 1}</span>
                <MenuThumb src={item.imageUrl} alt={item.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium leading-none">{item.name}</p>
                  <p className="mt-2 text-[10px] font-medium text-[#9A9A9A]">
                    {item.isAvailable ? "Available" : "Unavailable"} · {money(item.price)} total
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-medium">
                    Edit
                  </button>
                  <form action={deleteMenuItem}>
                    <input type="hidden" name="restaurantId" value={restaurantId} />
                    <input type="hidden" name="menuItemId" value={item.id} />
                    <button
                      aria-label={`Delete ${item.name}`}
                      className="grid h-7 w-7 place-items-center rounded-full bg-[#7F0000] text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2.3} />
                    </button>
                  </form>
                </div>
              </div>
              {index === 0 ? (
                <div className="ml-[68px] mt-4 space-y-2 text-[10px] text-[#B0B0B0]">
                  <p>Ready within 1-5 minutes</p>
                  <p>Delivery in &lt;45 seconds</p>
                  <p className="text-[9px] text-[#737373]">Ensure these claims are accurate.</p>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button type="button" className="h-9 rounded-[8px] bg-white text-[11px] font-semibold text-black">
          Edit Full Menu
        </button>
        <button type="button" className="h-9 rounded-[8px] border border-white/20 text-[11px] font-semibold text-white">
          Change Featured Combos
        </button>
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

      <span className="absolute left-6 top-6 rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-black">
        ◆ LIVE
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

function ReviewsPanel() {
  const rows = [
    { icon: Heart, title: "Customer Complaints", detail: "0 unresolved", tone: "bg-red-50 text-red-500" },
    { icon: ShoppingBag, title: "Meal Reviews", detail: "0 unread", tone: "bg-green-50 text-green-500" },
    { icon: Star, title: "Restaurant Ratings", detail: "No ratings yet", tone: "bg-yellow-50 text-yellow-500" },
  ];

  return (
    <section className="min-h-[337px] rounded-[12px] bg-[#F3F3F3] px-6 py-6 sm:px-8">
      <DashboardHeading title="Reviews" />
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
}: {
  restaurantId: string;
  staff: Array<any>;
}) {
  const visible = staff.filter((member) => member.role !== "RIDER");

  return (
    <section className="min-h-[350px] bg-white">
      <DashboardHeading title="Your Staff" count={visible.length} />

      <details className="group mt-4">
        <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-[8px] border-2 border-[#EAEAEA] px-3 text-[10px] font-medium text-[#9A9A9A]">
          <Search className="h-3.5 w-3.5" strokeWidth={2.3} />
          Search or Add New...
        </summary>
        <form action={addRestaurantStaff} className="mt-3 rounded-[10px] border border-[#EAEAEA] p-3">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="role" value="STAFF" />
          <StaffUserSearch restaurantId={restaurantId} />
          <button className="mt-3 h-9 w-full rounded-[8px] bg-black text-[11px] font-semibold text-white">
            Add Staff Member
          </button>
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
              <p className="mt-1 text-[9px] font-medium uppercase text-[#808080]">
                {member.role} · {member.isActive ? "Active" : "Inactive"}
              </p>
            </div>
            <button type="button" aria-label="Staff options">
              <MoreHorizontal className="h-4 w-4" strokeWidth={2.3} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function RidersPanel({
  restaurantId,
  riders,
  assignableOrder,
}: {
  restaurantId: string;
  riders: Array<any>;
  assignableOrder: any | null;
}) {
  return (
    <section className="min-h-[350px] bg-white">
      <DashboardHeading title="Riders on Duty" count={riders.length} />

      <details className="group mt-4">
        <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-[8px] border-2 border-[#EAEAEA] px-3 text-[10px] font-medium text-[#9A9A9A]">
          <Search className="h-3.5 w-3.5" strokeWidth={2.3} />
          Search or Add New...
        </summary>
        <form action={addRestaurantStaff} className="mt-3 rounded-[10px] border border-[#EAEAEA] p-3">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="role" value="RIDER" />
          <StaffUserSearch restaurantId={restaurantId} />
          <button className="mt-3 h-9 w-full rounded-[8px] bg-black text-[11px] font-semibold text-white">
            Add Rider
          </button>
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
              {!delivering && rider.isActive && assignableOrder ? (
                <form action={assignRider}>
                  <HiddenOrderFields restaurantId={restaurantId} restaurantOrderId={assignableOrder.id} />
                  <input type="hidden" name="riderId" value={rider.userId} />
                  <button className="rounded-full bg-black px-3 py-1.5 text-[9px] font-semibold text-white">
                    + Assign
                  </button>
                </form>
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
}: {
  orders: Array<any>;
}) {
  return (
    <section className="min-h-[337px] rounded-[12px] bg-[#F3F3F3] px-6 py-6 sm:px-8">
      <DashboardHeading title="All Past Orders" count={orders.length} />

      <div className="mt-5 grid gap-x-8 sm:grid-cols-2">
        {orders.length === 0 ? (
          <p className="text-[12px] font-medium text-[#808080]">No past orders yet.</p>
        ) : (
          orders.slice(0, 6).map((row) => {
            const image = row.items[0]?.menuItem?.imageUrl;
            const statusTone =
              row.status === "DELIVERED"
                ? "text-green-500"
                : row.status === "CANCELLED"
                  ? "text-red-500"
                  : "text-[#808080]";
            return (
              <div key={row.id} className="flex items-center gap-3 border-b border-[#DEDEDE] py-4 first:pt-0">
                <OrderThumb src={image} alt={row.items[0]?.name ?? "Order"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-semibold text-black">#{row.order.orderNumber}</p>
                  <p className="mt-1 truncate text-[9px] font-medium text-[#808080]">
                    {money(row.subtotal)} total · {row.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} items
                  </p>
                </div>
                <span className={`shrink-0 text-[9px] font-semibold ${statusTone}`}>
                  {row.status === "PICKED_UP"
                    ? "Picked up"
                    : row.status.charAt(0) + row.status.slice(1).toLowerCase()}
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
  weeklyCounts,
  revenueToday,
  totalOrders,
  totalCustomers,
}: {
  weeklyCounts: Array<{ label: string; count: number }>;
  revenueToday: number;
  totalOrders: number;
  totalCustomers: number;
}) {
  const max = Math.max(1, ...weeklyCounts.map((day) => day.count));

  return (
    <section className="min-h-[594px] bg-white">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[14px] font-semibold tracking-[-0.02em] text-black">Performance</h2>
          <span className="text-[12px] font-medium text-[#9A9A9A]">This week</span>
        </div>
        <button type="button" className="text-[11px] font-semibold underline underline-offset-2">
          Expand
        </button>
      </div>

      <div className="mt-8 flex h-[150px] items-end gap-3 border-b border-[#EAEAEA] px-2">
        {weeklyCounts.map((day, index) => {
          const height = Math.max(28, Math.round((day.count / max) * 120));
          const active = index === weeklyCounts.length - 1;
          return (
            <div key={day.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <div
                className={`w-full max-w-[34px] rounded-t-[8px] ${active ? "bg-black" : "bg-[#E5E5E5]"}`}
                style={{ height }}
              />
              <span className={`pb-2 text-[8px] font-semibold ${active ? "text-black" : "text-[#9A9A9A]"}`}>
                {day.label}
              </span>
            </div>
          );
        })}
      </div>

      <button type="button" className="mt-3 h-8 w-full rounded-[8px] border border-[#EAEAEA] text-[10px] font-semibold">
        All-time performance →
      </button>

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
              <span className="text-[#808080]">⌁</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export async function RestaurantDashboardGrid({
  restaurantId,
  currentUserId,
  restaurant,
  verificationSteps,
}: {
  restaurantId: string;
  currentUserId: string;
  restaurant: RestaurantForDashboard;
  verificationSteps: VerificationStep[];
}) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const [orders, staff, menuItems, totalOrders, customerRows, revenueRows, weeklyRows] =
    await Promise.all([
      prisma.restaurantOrder.findMany({
        where: { restaurantId },
        orderBy: { createdAt: "desc" },
        take: 40,
        include: {
          order: {
            select: {
              orderNumber: true,
              customerId: true,
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
        where: { restaurantId },
        orderBy: { createdAt: "asc" },
        take: 6,
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
          createdAt: { gte: todayStart },
          status: { not: "CANCELLED" },
        },
        select: { subtotal: true },
      }),
      prisma.restaurantOrder.findMany({
        where: {
          restaurantId,
          createdAt: { gte: weekStart },
        },
        select: { createdAt: true },
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
  const assignableOrder =
    activeOrders.find((row) => row.status === "OUT_FOR_DELIVERY" && !row.delivery?.riderId) ?? null;
  const latestDelivery =
    orders.find((row) => row.delivery?.lastLocationAt)?.delivery ??
    orders.find((row) => row.delivery)?.delivery ??
    null;

  const revenueToday = revenueRows.reduce((sum, row) => sum + Number(row.subtotal), 0);
  const totalCustomers = new Set(customerRows.map((row) => row.order.customerId)).size;

  const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const weeklyCounts = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const count = weeklyRows.filter(
      (row) => row.createdAt >= date && row.createdAt < next
    ).length;
    return {
      label: dayFormatter.format(date).toUpperCase().slice(0, 3),
      count,
    };
  });

  return (
    <div className="grid items-start gap-x-[36px] lg:grid-cols-[minmax(0,1069fr)_minmax(0,422fr)]">
      <div className="flex min-w-0 flex-col gap-[20px]">
        <div id="restaurant-verification">
          <RestaurantVerificationCard
            restaurantId={restaurantId}
            restaurantName={restaurant.name}
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

        <FeaturedMenuPanel
          restaurantId={restaurantId}
          restaurant={restaurant}
          items={menuItems}
        />

        <LiveMapPanel restaurant={restaurant} latestDelivery={latestDelivery} />

        <ReviewsPanel />

        <PastOrdersPanel orders={pastOrders} />
      </div>

      <div className="mt-[20px] flex min-w-0 flex-col gap-[60px] lg:mt-0">
        <PendingOrdersPanel restaurantId={restaurantId} orders={pendingOrders} />

        <ActiveOrdersPanel restaurantId={restaurantId} orders={activeOrders} />

        <StaffPanel restaurantId={restaurantId} staff={staff} />

        <RidersPanel
          restaurantId={restaurantId}
          riders={riders}
          assignableOrder={assignableOrder}
        />

        <PerformancePanel
          weeklyCounts={weeklyCounts}
          revenueToday={revenueToday}
          totalOrders={totalOrders}
          totalCustomers={totalCustomers}
        />
      </div>
    </div>
  );
}
