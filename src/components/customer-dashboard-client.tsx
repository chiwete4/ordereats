"use client";

import {
  Bike,
  CheckCircle2,
  Heart,
  LoaderCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  submitCustomerComplaint,
  toggleFavoriteRestaurant,
} from "@/actions/customer";
import { CustomerLiveMap, type CustomerLiveDelivery } from "@/components/customer-live-map";
import { CustomerRestaurantBrowserModal } from "@/components/customer-restaurant-browser-modal";
import { useToast } from "@/components/toast-provider";

export type CustomerRestaurant = {
  id: string;
  name: string;
  address: string | null;
  imageUrl: string | null;
  isVerified: boolean;
  isOpen: boolean;
  hoursLabel: string;
  rating: number | null;
  favorited: boolean;
  latitude: number | null;
  longitude: number | null;
  items: Array<{
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    description: string | null;
    restaurantId: string;
    restaurantName: string;
  }>;
};

export type CustomerOrderCard = {
  id: string;
  orderId: string;
  orderNumber: string;
  restaurantId: string;
  restaurantName: string;
  status: string;
  subtotal: number;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    imageUrl: string | null;
    restaurantId: string;
    restaurantName: string;
  }>;
  riderName: string | null;
  riderPhone: string | null;
};

export type CustomerRiderHistory = {
  id: string;
  name: string;
  phone: string | null;
  lastDeliveredAt: string | null;
};

type BasketItem = {
  menuItemId: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
};

const moneyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function money(value: number) {
  return moneyFormatter.format(value);
}

function statusLabel(status: string) {
  if (status === "CONFIRMED") return "Confirmed";
  if (status === "PREPARING") return "Preparing";
  if (status === "READY_FOR_PICKUP") return "Ready";
  if (status === "OUT_FOR_DELIVERY") return "Sent out";
  if (status === "DELIVERED") return "Delivered";
  if (status === "PICKED_UP") return "Picked up";
  if (status === "CANCELLED") return "Cancelled";
  return status.replaceAll("_", " ");
}

function FoodThumb({ src }: { src: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-10 w-10 shrink-0 rounded-[8px] object-cover" />
  ) : (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#EFEFEF]">
      <ShoppingBag className="h-4 w-4" strokeWidth={2.3} />
    </span>
  );
}

export function CustomerDashboardClient({
  restaurants,
  activeOrders,
  pastOrders,
  riderHistory,
  liveRestaurantOrderId,
  initialLiveDelivery,
  fallbackLatitude,
  fallbackLongitude,
  fallbackLabel,
}: {
  restaurants: CustomerRestaurant[];
  activeOrders: CustomerOrderCard[];
  pastOrders: CustomerOrderCard[];
  riderHistory: CustomerRiderHistory[];
  liveRestaurantOrderId: string | null;
  initialLiveDelivery: CustomerLiveDelivery | null;
  fallbackLatitude: number | null;
  fallbackLongitude: number | null;
  fallbackLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [basketReady, setBasketReady] = useState(false);
  const [basketOpen, setBasketOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<CustomerRestaurant | null>(null);
  const [showAllActive, setShowAllActive] = useState(false);
  const [showAllFavorites, setShowAllFavorites] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);
  const [showAllRiders, setShowAllRiders] = useState(false);
  const [riderQuery, setRiderQuery] = useState("");
  const [issueOrder, setIssueOrder] = useState<CustomerOrderCard | null>(null);
  const [issueBody, setIssueBody] = useState("");
  const [selectedIssueItemIds, setSelectedIssueItemIds] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("paperbag-cart-v1");
      if (stored) setBasket(JSON.parse(stored));
    } catch {}
    setBasketReady(true);
  }, []);

  useEffect(() => {
    if (!basketReady) return;
    window.localStorage.setItem("paperbag-cart-v1", JSON.stringify(basket));
  }, [basket, basketReady]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredRestaurants = useMemo(
    () =>
      restaurants.filter((restaurant) => {
        if (!normalizedQuery) return true;
        return (
          restaurant.name.toLowerCase().includes(normalizedQuery) ||
          restaurant.items.some((item) =>
            item.name.toLowerCase().includes(normalizedQuery)
          )
        );
      }),
    [restaurants, normalizedQuery]
  );

  const popularItems = useMemo(
    () =>
      restaurants
        .flatMap((restaurant) => restaurant.items)
        .filter((item) =>
          normalizedQuery ? item.name.toLowerCase().includes(normalizedQuery) : true
        )
        .slice(0, 8),
    [restaurants, normalizedQuery]
  );

  const favoriteRestaurants = restaurants.filter((restaurant) => restaurant.favorited);
  const visibleActive = showAllActive ? activeOrders : activeOrders.slice(0, 4);
  const visibleFavorites = showAllFavorites
    ? favoriteRestaurants
    : favoriteRestaurants.slice(0, 4);
  const visiblePast = showAllPast ? pastOrders : pastOrders.slice(0, 4);
  const filteredRiders = riderHistory.filter((rider) => {
    const q = riderQuery.trim().toLowerCase();
    return !q || rider.name.toLowerCase().includes(q) || Boolean(rider.phone?.includes(q));
  });
  const visibleRiders = showAllRiders ? filteredRiders : filteredRiders.slice(0, 4);

  const basketCount = basket.reduce((sum, item) => sum + item.quantity, 0);
  const basketTotal = basket.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function addItem(item: {
    id?: string;
    menuItemId?: string;
    restaurantId: string;
    restaurantName: string;
    name: string;
    price?: number;
    unitPrice?: number;
    imageUrl: string | null;
    quantity?: number;
  }) {
    const menuItemId = item.menuItemId ?? item.id;
    if (!menuItemId) return;
    const quantity = item.quantity ?? 1;
    const price = item.price ?? item.unitPrice ?? 0;

    let nextQuantity = quantity;
    setBasket((current) => {
      const existing = current.find((entry) => entry.menuItemId === menuItemId);
      if (existing) {
        nextQuantity = existing.quantity + quantity;
        return current.map((entry) =>
          entry.menuItemId === menuItemId
            ? { ...entry, quantity: nextQuantity }
            : entry
        );
      }
      return current.concat({
        menuItemId,
        restaurantId: item.restaurantId,
        restaurantName: item.restaurantName,
        name: item.name,
        price,
        imageUrl: item.imageUrl,
        quantity,
      });
    });

    toast({
      key: "basket",
      title: "Basket updated",
      description: `${item.name} · ${nextQuantity} in basket`,
      tone: "success",
    });
  }

  function basketQuantity(menuItemId: string) {
    return basket.find((item) => item.menuItemId === menuItemId)?.quantity ?? 0;
  }

  function changeQuantity(menuItemId: string, delta: number) {
    const item = basket.find((entry) => entry.menuItemId === menuItemId);
    if (!item) return;

    const nextQuantity = Math.max(0, item.quantity + delta);

    setBasket((current) =>
      current
        .map((entry) =>
          entry.menuItemId === menuItemId
            ? { ...entry, quantity: nextQuantity }
            : entry
        )
        .filter((entry) => entry.quantity > 0)
    );

    toast({
      key: "basket",
      title: nextQuantity > 0 ? "Basket updated" : "Removed from basket",
      description:
        nextQuantity > 0
          ? `${item.name} · ${nextQuantity} in basket`
          : item.name,
      tone: "success",
    });
  }

  function toggleFavorite(restaurantId: string) {
    const formData = new FormData();
    formData.set("restaurantId", restaurantId);
    startTransition(async () => {
      try {
        await toggleFavoriteRestaurant(formData);
        router.refresh();
      } catch (error) {
        toast({
          title: "Couldn’t update favourite",
          description: error instanceof Error ? error.message : "Please try again.",
          tone: "error",
        });
      }
    });
  }

  function openIssue(order: CustomerOrderCard) {
    setIssueOrder(order);
    setIssueBody("");
    setSelectedIssueItemIds(new Set());
  }

  function toggleIssueItem(itemId: string) {
    setSelectedIssueItemIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function submitIssue() {
    if (!issueOrder) return;
    const formData = new FormData();
    formData.set("orderId", issueOrder.orderId);
    formData.set("body", issueBody);
    selectedIssueItemIds.forEach((itemId) => formData.append("orderItemId", itemId));
    startTransition(async () => {
      try {
        await submitCustomerComplaint(formData);
        toast({
          title: "Issue sent",
          description: "The restaurant can now see your complaint.",
          tone: "success",
        });
        setIssueOrder(null);
        setIssueBody("");
        setSelectedIssueItemIds(new Set());
      } catch (error) {
        toast({
          title: "Couldn’t send issue",
          description: error instanceof Error ? error.message : "Please try again.",
          tone: "error",
        });
      }
    });
  }

  return (
    <>
      <div className="grid items-start gap-x-[36px] lg:grid-cols-[minmax(0,1069fr)_minmax(0,422fr)]">
        <div className="min-w-0 space-y-5">
          <CustomerLiveMap
            restaurantOrderId={liveRestaurantOrderId}
            initialDelivery={initialLiveDelivery}
            fallbackLatitude={fallbackLatitude}
            fallbackLongitude={fallbackLongitude}
            fallbackLabel={fallbackLabel}
          />

          <section className="relative rounded-[12px] bg-black px-5 py-5 text-white sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-semibold">Place your order</h2>
                <span className="text-[9px] text-white/55">Restaurants can see your delivery location.</span>
              </div>
              <span className="text-[9px] text-white/35">
                {basketCount > 0 ? `${basketCount} in basket` : "Basket empty"}
              </span>
            </div>

            <label className="mt-4 flex h-9 items-center gap-2 rounded-[8px] border border-white/20 px-3 text-white/55">
              <Search className="h-3.5 w-3.5" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search restaurants or items..."
                className="min-w-0 flex-1 bg-transparent text-[10px] text-white outline-none placeholder:text-white/45"
              />
            </label>

            <p className="mt-5 text-[9px] font-medium text-white/45">Restaurants</p>
            <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
              {filteredRestaurants.slice(0, 4).map((restaurant) => (
                <div key={restaurant.id} className="flex items-center gap-3 border-b border-white/10 py-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRestaurant(restaurant)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-white/10">
                      {restaurant.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={restaurant.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Store className="h-4 w-4" strokeWidth={2.2} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 truncate text-[10px] font-semibold">
                        {restaurant.name}
                        {restaurant.isVerified ? <CheckCircle2 className="h-3 w-3" /> : null}
                      </span>
                      <span className={"mt-1 block truncate text-[9px] " + (restaurant.isOpen ? "text-green-400" : "text-orange-400")}>
                        {restaurant.isOpen ? "Open now" : "Closed"} · {restaurant.hoursLabel}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => toggleFavorite(restaurant.id)}
                    className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10 disabled:opacity-40"
                    aria-label={restaurant.favorited ? "Remove from favourites" : "Add to favourites"}
                  >
                    <Heart className={"h-3.5 w-3.5 " + (restaurant.favorited ? "fill-white" : "")} />
                  </button>
                </div>
              ))}
            </div>

            <p className="mt-5 text-[9px] font-medium text-white/45">Popular orders</p>
            <div className="mt-2 divide-y divide-white/10">
              {popularItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  <FoodThumb src={item.imageUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-semibold">{item.name}</p>
                    <p className="mt-1 truncate text-[9px] text-white/50">
                      {item.restaurantName} · {money(item.price)}
                    </p>
                  </div>
                  {basketQuantity(item.id) > 0 ? (
                    <div className="flex shrink-0 items-center gap-2 rounded-full bg-white px-2 py-1.5 text-black">
                      <button type="button" onClick={() => changeQuantity(item.id, -1)} className="px-1 text-[12px]">−</button>
                      <span className="min-w-4 text-center text-[9px] font-semibold">{basketQuantity(item.id)}</span>
                      <button type="button" onClick={() => addItem(item)} className="px-1 text-[12px]">+</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => addItem(item)} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[9px] font-semibold text-black">
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  )}
                </div>
              ))}
            </div>

            {basketCount > 0 ? (
              <div className="sticky bottom-4 z-20 mt-5">
                <button
                  type="button"
                  onClick={() => setBasketOpen(true)}
                  className="flex w-full items-center justify-between rounded-[11px] bg-white px-4 py-3.5 text-black shadow-[0_12px_32px_rgba(0,0,0,0.35)] ring-1 ring-black/10 transition active:scale-[0.99]"
                >
                  <span className="text-left">
                    <span className="block text-[11px] font-semibold">Review basket</span>
                    <span className="mt-0.5 block text-[9px] text-black/50">{basketCount} {basketCount === 1 ? "item" : "items"}</span>
                  </span>
                  <span className="text-[13px] font-semibold">{money(basketTotal)}</span>
                </button>
              </div>
            ) : null}
          </section>

          <section className="rounded-[12px] bg-[#F3F3F3] px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <h2 className="text-[14px] font-semibold">Your Past Orders</h2>
                <span className="text-[12px] text-[#999]">{pastOrders.length}</span>
              </div>
              {pastOrders.length > 4 ? (
                <button type="button" onClick={() => setShowAllPast(!showAllPast)} className="text-[10px] font-semibold underline underline-offset-2">
                  {showAllPast ? "Collapse" : "Expand"}
                </button>
              ) : null}
            </div>

            <div className="mt-4 divide-y divide-[#DEDEDE]">
              {visiblePast.length === 0 ? (
                <p className="py-4 text-[11px] text-[#808080]">No past orders yet.</p>
              ) : visiblePast.map((order) => (
                <div key={order.id} className="flex items-center gap-3 py-3">
                  <FoodThumb src={order.items[0]?.imageUrl ?? null} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-semibold">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)} items from {order.restaurantName}
                    </p>
                    <p className="mt-1 text-[9px] text-[#808080]">{money(order.subtotal)} total · {statusLabel(order.status)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      order.items.forEach((item) => addItem(item));
                      setBasketOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[9px] font-semibold shadow-sm"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Get
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="mt-8 min-w-0 space-y-12 lg:mt-0">
          <section>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <h2 className="text-[14px] font-semibold">On its way!</h2>
                <span className="text-[12px] text-[#999]">{activeOrders.length}</span>
              </div>
              {activeOrders.length > 4 ? (
                <button type="button" onClick={() => setShowAllActive(!showAllActive)} className="text-[10px] font-semibold underline underline-offset-2">
                  {showAllActive ? "Collapse" : "Expand"}
                </button>
              ) : null}
            </div>

            <div className="mt-4 divide-y divide-[#EAEAEA]">
              {visibleActive.length === 0 ? (
                <p className="py-5 text-[11px] text-[#808080]">No active orders right now.</p>
              ) : visibleActive.map((order) => (
                <article key={order.id} className="py-4 first:pt-0">
                  <div className="flex items-start gap-3">
                    <FoodThumb src={order.items[0]?.imageUrl ?? null} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold">#{order.orderNumber}</p>
                      <p className="mt-1 text-[9px] text-[#808080]">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} items · {money(order.subtotal)} total
                      </p>
                    </div>
                    <span className="text-[9px] font-semibold text-[#777]">{statusLabel(order.status)}</span>
                  </div>

                  <div className="ml-[52px] mt-3 space-y-1">
                    {order.items.slice(0, 3).map((item) => (
                      <p key={item.id} className="text-[9px] text-[#777]">x{item.quantity} {item.name}</p>
                    ))}
                  </div>

                  {order.status === "OUT_FOR_DELIVERY" ? (
                    <div className="ml-[52px] mt-3 grid grid-cols-2 gap-2">
                      {order.riderPhone ? (
                        <a href={"tel:" + order.riderPhone} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[7px] bg-black text-[9px] font-semibold text-white">
                          <Phone className="h-3 w-3" />
                          Contact Rider
                        </a>
                      ) : (
                        <span className="inline-flex h-8 items-center justify-center rounded-[7px] bg-[#EAEAEA] text-[9px] font-semibold text-[#888]">
                          Rider contact unavailable
                        </span>
                      )}
                      <button type="button" onClick={() => openIssue(order)} className="h-8 rounded-[7px] bg-red-500 text-[9px] font-semibold text-white">
                        Wrong order?
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <h2 className="text-[14px] font-semibold">Favourite Restaurants</h2>
                <span className="text-[12px] text-[#999]">{favoriteRestaurants.length}</span>
              </div>
              {favoriteRestaurants.length > 4 ? (
                <button type="button" onClick={() => setShowAllFavorites(!showAllFavorites)} className="text-[10px] font-semibold underline underline-offset-2">
                  {showAllFavorites ? "Collapse" : "Expand"}
                </button>
              ) : null}
            </div>
            <div className="mt-4 divide-y divide-[#EAEAEA]">
              {visibleFavorites.length === 0 ? (
                <p className="py-4 text-[11px] text-[#808080]">Tap the heart beside a restaurant to keep it here.</p>
              ) : visibleFavorites.map((restaurant) => (
                <div key={restaurant.id} className="flex items-center gap-3 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-black text-white">
                    <Store className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-semibold">{restaurant.name}</p>
                    <p className={"mt-1 text-[9px] " + (restaurant.isOpen ? "text-green-500" : "text-orange-500")}>
                      {restaurant.isOpen ? "Open now" : "Closed"} · {restaurant.hoursLabel}
                    </p>
                  </div>
                  <button type="button" onClick={() => toggleFavorite(restaurant.id)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#F3F3F3]">
                    <Heart className="h-3.5 w-3.5 fill-black" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <h2 className="text-[14px] font-semibold">Rider History</h2>
                <span className="text-[12px] text-[#999]">{riderHistory.length}</span>
              </div>
              {filteredRiders.length > 4 ? (
                <button type="button" onClick={() => setShowAllRiders(!showAllRiders)} className="text-[10px] font-semibold underline underline-offset-2">
                  {showAllRiders ? "Collapse" : "Expand"}
                </button>
              ) : null}
            </div>

            <label className="mt-3 flex h-9 items-center gap-2 rounded-[8px] border border-[#D8D8D8] px-3">
              <Search className="h-3.5 w-3.5 text-[#888]" />
              <input
                value={riderQuery}
                onChange={(event) => setRiderQuery(event.target.value)}
                placeholder="Search by name or phone number"
                className="min-w-0 flex-1 text-[10px] outline-none placeholder:text-[#999]"
              />
            </label>

            <div className="mt-3 divide-y divide-[#EAEAEA]">
              {visibleRiders.length === 0 ? (
                <p className="py-4 text-[11px] text-[#808080]">No rider history yet.</p>
              ) : visibleRiders.map((rider) => (
                <div key={rider.id} className="flex items-center gap-3 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#EFEFEF]">
                    <Bike className="h-4 w-4 text-[#777]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-semibold">{rider.name}</p>
                    <p className="mt-1 truncate text-[9px] text-[#888]">{rider.phone || "No phone number saved"}</p>
                  </div>
                  {rider.phone ? (
                    <a href={"tel:" + rider.phone} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#F3F3F3]">
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {selectedRestaurant ? (
        <CustomerRestaurantBrowserModal
          restaurant={selectedRestaurant}
          onClose={() => setSelectedRestaurant(null)}
          quantityFor={basketQuantity}
          onAdd={addItem}
          onChangeQuantity={changeQuantity}
          onToggleFavorite={toggleFavorite}
          basketCount={basketCount}
          basketTotal={basketTotal}
          onOpenBasket={() => {
            setBasketOpen(true);
          }}
          receded={basketOpen}
        />
      ) : null}

      {basketOpen ? (
        <div className="fixed inset-0 z-[200] flex animate-[modal-backdrop-in_160ms_ease-out] items-end justify-center bg-black/35 p-4 sm:items-center" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setBasketOpen(false);
        }}>
          <div className="max-h-[82vh] w-full max-w-[520px] animate-[modal-pop-in_180ms_ease-out] overflow-y-auto rounded-[16px] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[18px] font-semibold tracking-[-0.03em]">Review your basket</h3>
                <p className="mt-1 text-[10px] text-[#808080]">{basketCount} items · {money(basketTotal)}</p>
              </div>
              <button
                type="button"
                onClick={() => setBasketOpen(false)}
                aria-label="Close basket"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 divide-y divide-[#EAEAEA]">
              {basket.map((item) => (
                <div key={item.menuItemId} className="flex items-center gap-3 py-3">
                  <FoodThumb src={item.imageUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold">{item.name}</p>
                    <p className="mt-1 text-[9px] text-[#808080]">{item.restaurantName} · {money(item.price)}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold text-[#666]">x{item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-[#EAEAEA] pt-4">
              <span className="text-[10px] text-[#808080]">Food subtotal</span>
              <span className="text-[14px] font-semibold">{money(basketTotal)}</span>
            </div>
            <button
              type="button"
              onClick={() => setBasketOpen(false)}
              className="mt-4 h-10 w-full rounded-[9px] bg-black text-[10px] font-semibold text-white"
            >
              Looks good
            </button>
          </div>
        </div>
      ) : null}

      {issueOrder ? (
        <div className="fixed inset-0 z-[210] flex animate-[modal-backdrop-in_160ms_ease-out] items-center justify-center bg-black/35 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !pending) setIssueOrder(null);
        }}>
          <div className="w-full max-w-[430px] animate-[modal-pop-in_180ms_ease-out] rounded-[14px] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-semibold">Something wrong with #{issueOrder.orderNumber}?</h3>
                <p className="mt-1 text-[10px] text-[#808080]">Choose the item(s) with an issue, then tell us what happened.</p>
              </div>
              <button type="button" disabled={pending} onClick={() => setIssueOrder(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {issueOrder.items.map((item) => {
                const checked = selectedIssueItemIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleIssueItem(item.id)}
                    className={"flex w-full items-center gap-3 rounded-[9px] border px-3 py-3 text-left transition " + (checked ? "border-black bg-black text-white" : "border-[#E2E2E2] bg-white")}
                  >
                    <FoodThumb src={item.imageUrl} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[10px] font-semibold">{item.name}</span>
                      <span className={"mt-1 block text-[9px] " + (checked ? "text-white/60" : "text-[#808080]")}>x{item.quantity} · {money(item.unitPrice * item.quantity)}</span>
                    </span>
                    <span className={"grid h-5 w-5 place-items-center rounded-full border text-[10px] " + (checked ? "border-white bg-white text-black" : "border-[#CFCFCF]")}>
                      {checked ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            <textarea
              value={issueBody}
              onChange={(event) => setIssueBody(event.target.value)}
              placeholder="e.g. I received the wrong meal..."
              className="mt-4 min-h-[120px] w-full resize-none rounded-[9px] border border-[#D8D8D8] p-3 text-[11px] outline-none focus:border-black"
            />
            <button
              type="button"
              disabled={pending || selectedIssueItemIds.size === 0 || issueBody.trim().length < 4}
              onClick={submitIssue}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[9px] bg-black text-[10px] font-semibold text-white disabled:opacity-50"
            >
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {pending ? "Sending…" : "Send issue"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
