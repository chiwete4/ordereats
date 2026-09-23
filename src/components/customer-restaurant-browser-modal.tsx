"use client";

import { CheckCircle2, Heart, MapPin, Minus, Plus, Search, ShoppingBag, X } from "lucide-react";
import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef, useState } from "react";

type Restaurant = {
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

const moneyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function money(value: number) {
  return moneyFormatter.format(value);
}

export function CustomerRestaurantBrowserModal({
  restaurant,
  onClose,
  quantityFor,
  onAdd,
  onChangeQuantity,
  onToggleFavorite,
}: {
  restaurant: Restaurant;
  onClose: () => void;
  quantityFor: (menuItemId: string) => number;
  onAdd: (item: Restaurant["items"][number]) => void;
  onChangeQuantity: (menuItemId: string, delta: number) => void;
  onToggleFavorite: (restaurantId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() || "";

  const items = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return restaurant.items;
    return restaurant.items.filter((item) =>
      item.name.toLowerCase().includes(normalized)
    );
  }, [query, restaurant.items]);

  useEffect(() => {
    if (!token || !mapEl.current || mapRef.current) return;

    const center: [number, number] =
      typeof restaurant.longitude === "number" &&
      typeof restaurant.latitude === "number"
        ? [restaurant.longitude, restaurant.latitude]
        : [7.3986, 9.0765];

    const map = new mapboxgl.Map({
      accessToken: token,
      container: mapEl.current,
      style: "mapbox://styles/mapbox/standard",
      center,
      zoom: 15.25,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    if (
      typeof restaurant.longitude === "number" &&
      typeof restaurant.latitude === "number"
    ) {
      const markerEl = document.createElement("div");
      markerEl.style.width = "32px";
      markerEl.style.height = "32px";
      markerEl.style.borderRadius = "9999px";
      markerEl.style.background = "#000";
      markerEl.style.border = "4px solid #fff";
      markerEl.style.boxShadow = "0 6px 18px rgba(0,0,0,.22)";
      new mapboxgl.Marker({ element: markerEl, anchor: "center" })
        .setLngLat([restaurant.longitude, restaurant.latitude])
        .addTo(map);
    }

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [restaurant.id, restaurant.latitude, restaurant.longitude, token]);

  return (
    <div
      className="fixed inset-0 z-[185] flex items-center justify-center bg-white/80 p-3 backdrop-blur-[1px] sm:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative grid h-[min(760px,92vh)] w-[min(1220px,96vw)] overflow-hidden rounded-[14px] bg-black shadow-2xl lg:grid-cols-[minmax(360px,0.65fr)_minmax(0,1.35fr)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close restaurant"
          className="absolute right-4 top-4 z-30 grid h-8 w-8 place-items-center rounded-full bg-white text-black shadow-sm"
        >
          <X className="h-4 w-4" strokeWidth={2.4} />
        </button>

        <aside className="flex min-h-0 flex-col bg-black text-white">
          <div className="border-b border-white/10 px-5 pb-4 pt-5 pr-14">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[9px] bg-white/10">
                {restaurant.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={restaurant.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ShoppingBag className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h2 className="truncate text-[18px] font-semibold tracking-[-0.035em]">
                    {restaurant.name}
                  </h2>
                  {restaurant.isVerified ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-white/65" />
                  ) : null}
                </div>
                <p className={`mt-1 text-[10px] ${restaurant.isOpen ? "text-green-400" : "text-white/45"}`}>
                  {restaurant.isOpen ? "Open now" : "Closed"} · {restaurant.hoursLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggleFavorite(restaurant.id)}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10"
              >
                <Heart className={`h-4 w-4 ${restaurant.favorited ? "fill-white" : ""}`} />
              </button>
            </div>

            <label className="mt-4 flex h-9 items-center gap-2 rounded-[8px] border border-white/15 px-3">
              <Search className="h-3.5 w-3.5 text-white/45" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search this menu..."
                className="min-w-0 flex-1 bg-transparent text-[10px] text-white outline-none placeholder:text-white/35"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
            {items.length === 0 ? (
              <p className="py-8 text-center text-[10px] text-white/45">No matching menu items.</p>
            ) : (
              <div className="divide-y divide-white/10">
                {items.map((item) => {
                  const quantity = quantityFor(item.id);
                  return (
                    <div key={item.id} className="flex items-center gap-3 py-4">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-[8px] object-cover" />
                      ) : (
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[8px] bg-white/10">
                          <ShoppingBag className="h-4 w-4" />
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold">{item.name}</p>
                        {item.description ? (
                          <p className="mt-1 line-clamp-2 text-[9px] leading-[1.4] text-white/45">
                            {item.description}
                          </p>
                        ) : null}
                        <p className="mt-1.5 text-[9px] font-medium text-white/70">
                          {money(item.price)}
                        </p>
                      </div>

                      {quantity > 0 ? (
                        <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/20 px-2 py-1.5">
                          <button
                            type="button"
                            onClick={() => onChangeQuantity(item.id, -1)}
                            className="grid h-5 w-5 place-items-center"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-4 text-center text-[10px] font-semibold">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => onAdd(item)}
                            className="grid h-5 w-5 place-items-center"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!restaurant.isOpen}
                          onClick={() => onAdd(item)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[9px] font-semibold text-black disabled:opacity-35"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <div className="relative min-h-[280px] bg-[#EEE]">
          {token ? (
            <div ref={mapEl} className="absolute inset-0" />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-[#ECECEC] text-[11px] text-[#777]">
              Map unavailable
            </div>
          )}

          <div className="absolute bottom-5 left-5 z-10 max-w-[420px] rounded-[10px] bg-black px-4 py-3 text-white shadow-xl">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-white/15">
                <MapPin className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold">{restaurant.name}</p>
                <p className="mt-1 truncate text-[9px] text-white/55">
                  {restaurant.address || "Restaurant location"}
                </p>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
