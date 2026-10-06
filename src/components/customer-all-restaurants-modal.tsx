"use client";

import { CheckCircle2, Heart, MapPin, Store, X } from "lucide-react";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

import {
  BAZE_CAMPUS_BOUNDS,
  BAZE_CAMPUS_CENTER,
  BAZE_MAP_MAX_ZOOM,
  BAZE_MAP_MIN_ZOOM,
} from "@/lib/baze-campus";

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

function markerElement() {
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", "Open restaurant");
  el.style.width = "28px";
  el.style.height = "28px";
  el.style.borderRadius = "9999px";
  el.style.background = "#000";
  el.style.border = "4px solid #fff";
  el.style.boxShadow = "0 5px 16px rgba(0,0,0,.24)";
  return el;
}

export function CustomerAllRestaurantsModal({
  restaurants,
  onClose,
  onOpenRestaurant,
  onToggleFavorite,
  receded = false,
}: {
  restaurants: Restaurant[];
  onClose: () => void;
  onOpenRestaurant: (restaurant: Restaurant) => void;
  onToggleFavorite: (restaurantId: string) => void;
  receded?: boolean;
}) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() || "";

  useEffect(() => {
    if (!token || !mapEl.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      accessToken: token,
      container: mapEl.current,
      style: "mapbox://styles/mapbox/standard",
      center: [BAZE_CAMPUS_CENTER.longitude, BAZE_CAMPUS_CENTER.latitude],
      zoom: BAZE_MAP_MIN_ZOOM,
      minZoom: BAZE_MAP_MIN_ZOOM,
      maxZoom: BAZE_MAP_MAX_ZOOM,
      maxBounds: BAZE_CAMPUS_BOUNDS,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    const bounds = new mapboxgl.LngLatBounds();
    let markerCount = 0;

    for (const restaurant of restaurants) {
      if (
        typeof restaurant.longitude !== "number" ||
        typeof restaurant.latitude !== "number"
      ) {
        continue;
      }

      markerCount += 1;
      bounds.extend([restaurant.longitude, restaurant.latitude]);

      const el = markerElement();
      el.title = restaurant.name;
      el.addEventListener("click", () => onOpenRestaurant(restaurant));

      new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([restaurant.longitude, restaurant.latitude])
        .addTo(map);
    }

    if (markerCount > 1) {
      map.fitBounds(bounds, {
        padding: 72,
        maxZoom: 18.4,
        duration: 0,
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onOpenRestaurant, restaurants, token]);

  function focusRestaurant(restaurant: Restaurant) {
    if (
      mapRef.current &&
      typeof restaurant.longitude === "number" &&
      typeof restaurant.latitude === "number"
    ) {
      mapRef.current.easeTo({
        center: [restaurant.longitude, restaurant.latitude],
        zoom: 18.4,
        duration: 450,
      });
    }
    onOpenRestaurant(restaurant);
  }

  return (
    <div
      className={
        "fixed inset-0 z-[175] flex items-center justify-center p-3 backdrop-blur-[1px] transition-[background-color] duration-200 sm:p-8 " +
        (receded ? "bg-black/20" : "bg-white/80")
      }
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !receded) onClose();
      }}
    >
      <div
        className={
          "relative grid h-[min(760px,92vh)] w-[min(1220px,96vw)] overflow-hidden rounded-[14px] bg-white shadow-2xl transition-transform duration-200 ease-out lg:grid-cols-[minmax(330px,0.72fr)_minmax(0,1.28fr)] " +
          (receded
            ? "scale-[0.965]"
            : "animate-[modal-pop-in_180ms_ease-out] scale-100")
        }
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close all restaurants"
          className="absolute right-4 top-4 z-30 grid h-8 w-8 place-items-center rounded-full bg-black text-white shadow-sm"
        >
          <X className="h-4 w-4" strokeWidth={2.4} />
        </button>

        <aside className="min-h-0 overflow-y-auto border-r border-[#EAEAEA] bg-white px-5 pb-6 pt-5">
          <div className="pr-12">
            <p className="text-[10px] font-medium text-[#8A8A8A]">Baze University, Abuja</p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-black">
              All restaurants
            </h2>
            <p className="mt-1 text-[10px] leading-[1.5] text-[#777]">
              Campus restaurants only. Tap one to view its menu and location.
            </p>
          </div>

          <div className="mt-5 divide-y divide-[#EAEAEA]">
            {restaurants.map((restaurant) => (
              <div key={restaurant.id} className="flex items-center gap-3 py-3">
                <button
                  type="button"
                  onClick={() => focusRestaurant(restaurant)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[9px] bg-[#F1F1F1]">
                    {restaurant.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={restaurant.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Store className="h-4 w-4 text-[#777]" />
                    )}
                  </span>

                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[12px] font-semibold text-black">
                        {restaurant.name}
                      </span>
                      {restaurant.isVerified ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-black/45" />
                      ) : null}
                    </span>
                    <span
                      className={
                        "mt-1 block text-[9px] " +
                        (restaurant.isOpen ? "text-green-600" : "text-orange-500")
                      }
                    >
                      {restaurant.isOpen ? "Open now" : "Closed"} · {restaurant.hoursLabel}
                    </span>
                    <span className="mt-1 flex items-center gap-1 truncate text-[9px] text-[#999]">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {restaurant.address || "Baze University, Abuja"}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleFavorite(restaurant.id)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-[#F3F3F3]"
                  aria-label={restaurant.favorited ? "Remove from favourites" : "Add to favourites"}
                >
                  <Heart className={"h-3.5 w-3.5 " + (restaurant.favorited ? "fill-black" : "")} />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <div className="relative min-h-[300px] bg-[#ECECEC]">
          {token ? (
            <div ref={mapEl} className="absolute inset-0" />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-[11px] text-[#777]">
              Map unavailable
            </div>
          )}

          <div className="absolute bottom-5 left-5 z-10 rounded-[10px] bg-black px-4 py-3 text-white shadow-xl">
            <p className="text-[11px] font-semibold">Baze University</p>
            <p className="mt-1 text-[9px] text-white/55">
              Restaurant discovery is limited to campus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
