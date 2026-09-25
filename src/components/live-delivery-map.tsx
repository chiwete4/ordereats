"use client";

import {
  ChevronLeft,
  ChevronRight,
  Crosshair,
  MapPin,
  Navigation,
  Radio,
  SignalLow,
  WifiOff,
} from "lucide-react";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";

export type LiveDeliveryState = {
  id: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  lastLocationAt: string | null;
  riderName: string;
  orderNumber: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
};

const ROUTE_SOURCE_ID = "paperbag-rider-route";
const ROUTE_CASING_LAYER_ID = "paperbag-rider-route-casing";
const ROUTE_LAYER_ID = "paperbag-rider-route-line";

function relativeAge(iso: string | null, now: number) {
  if (!iso) return "No location yet";
  const delta = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (delta < 60) return `Updated ${delta}s ago`;
  const minutes = Math.floor(delta / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `Updated ${hours}h ago`;
}

function createRiderMarkerElement() {
  const element = document.createElement("div");
  element.setAttribute("aria-label", "Live rider location");
  element.style.width = "34px";
  element.style.height = "34px";
  element.style.borderRadius = "9999px";
  element.style.background = "#000";
  element.style.border = "4px solid #fff";
  element.style.boxShadow = "0 5px 18px rgba(0,0,0,.24)";
  element.style.position = "relative";

  const dot = document.createElement("span");
  dot.style.position = "absolute";
  dot.style.inset = "8px";
  dot.style.borderRadius = "9999px";
  dot.style.background = "#fff";
  element.appendChild(dot);

  return element;
}

function createDestinationMarkerElement() {
  const element = document.createElement("div");
  element.setAttribute("aria-label", "Customer destination");
  element.style.width = "30px";
  element.style.height = "30px";
  element.style.borderRadius = "8px";
  element.style.background = "#fff";
  element.style.border = "4px solid #000";
  element.style.boxShadow = "0 5px 18px rgba(0,0,0,.24)";
  return element;
}

export function LiveDeliveryMap({
  restaurantId,
  restaurantAddress,
  restaurantLatitude,
  restaurantLongitude,
  initialDeliveries,
}: {
  restaurantId: string;
  restaurantAddress: string | null;
  restaurantLatitude: number | null;
  restaurantLongitude: number | null;
  initialDeliveries: LiveDeliveryState[];
}) {
  const [deliveries, setDeliveries] = useState<LiveDeliveryState[]>(initialDeliveries);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [isFollowing, setIsFollowing] = useState(true);
  const [routeMeta, setRouteMeta] = useState<{ duration: number; distance: number } | null>(null);

  const delivery = deliveries[selectedIndex] ?? null;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const riderMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const followingRef = useRef(true);
  const lastRouteRequestAt = useRef(0);
  const initialDelivery = initialDeliveries[0] ?? null;
  const initialCenterRef = useRef<[number, number]>([
    typeof initialDelivery?.longitude === "number"
      ? initialDelivery.longitude
      : typeof restaurantLongitude === "number"
        ? restaurantLongitude
        : 7.3986,
    typeof initialDelivery?.latitude === "number"
      ? initialDelivery.latitude
      : typeof restaurantLatitude === "number"
        ? restaurantLatitude
        : 9.0765,
  ]);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() || "";

  useEffect(() => {
    let stopped = false;

    async function refresh() {
      try {
        const response = await fetch(
          `/api/restaurant/dashboard/live?restaurantId=${encodeURIComponent(restaurantId)}`,
          { cache: "no-store" }
        );
        if (!response.ok) return;
        const payload = await response.json();
        if (stopped) return;

        const next = Array.isArray(payload.deliveries) ? payload.deliveries : [];
        setDeliveries(next);
        setSelectedIndex((current) => Math.min(current, Math.max(0, next.length - 1)));
      } catch {
        // Keep last known locations visible if a poll fails.
      }
    }

    void refresh();
    const poll = window.setInterval(refresh, 5000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      stopped = true;
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [restaurantId]);

  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      accessToken: mapboxToken,
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center: initialCenterRef.current,
      zoom: 14.5,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    const stopFollowing = () => {
      followingRef.current = false;
      setIsFollowing(false);
    };

    const canvas = map.getCanvas();
    canvas.addEventListener("pointerdown", stopFollowing);
    canvas.addEventListener("wheel", stopFollowing, { passive: true });

    map.on("load", () => {
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        },
      });

      map.addLayer({
        id: ROUTE_CASING_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 8,
          "line-opacity": 0.95,
        },
      });

      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#111111",
          "line-width": 4,
          "line-opacity": 0.9,
        },
      });
    });

    mapRef.current = map;

    return () => {
      canvas.removeEventListener("pointerdown", stopFollowing);
      canvas.removeEventListener("wheel", stopFollowing);
      riderMarkerRef.current?.remove();
      destinationMarkerRef.current?.remove();
      riderMarkerRef.current = null;
      destinationMarkerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, [mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;

    if (
      !map ||
      !delivery ||
      typeof delivery.latitude !== "number" ||
      typeof delivery.longitude !== "number"
    ) {
      riderMarkerRef.current?.remove();
      riderMarkerRef.current = null;
      return;
    }

    const coordinate: [number, number] = [delivery.longitude, delivery.latitude];

    if (!riderMarkerRef.current) {
      riderMarkerRef.current = new mapboxgl.Marker({
        element: createRiderMarkerElement(),
        anchor: "center",
      })
        .setLngLat(coordinate)
        .addTo(map);
    } else {
      riderMarkerRef.current.setLngLat(coordinate);
    }

    if (followingRef.current) {
      map.easeTo({
        center: coordinate,
        zoom: Math.max(map.getZoom(), 15.5),
        duration: 700,
      });
    }
  }, [
    delivery?.id,
    delivery?.lastLocationAt,
    delivery?.latitude,
    delivery?.longitude,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const hasDestination =
      typeof delivery?.deliveryLatitude === "number" &&
      typeof delivery?.deliveryLongitude === "number";

    if (!map || !delivery || !hasDestination) {
      destinationMarkerRef.current?.remove();
      destinationMarkerRef.current = null;
      return;
    }

    const destination: [number, number] = [
      delivery.deliveryLongitude as number,
      delivery.deliveryLatitude as number,
    ];

    if (!destinationMarkerRef.current) {
      destinationMarkerRef.current = new mapboxgl.Marker({
        element: createDestinationMarkerElement(),
        anchor: "center",
      })
        .setLngLat(destination)
        .addTo(map);
    } else {
      destinationMarkerRef.current.setLngLat(destination);
    }
  }, [
    delivery?.id,
    delivery?.deliveryLatitude,
    delivery?.deliveryLongitude,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      !mapboxToken ||
      !delivery ||
      typeof delivery.latitude !== "number" ||
      typeof delivery.longitude !== "number" ||
      typeof delivery.deliveryLatitude !== "number" ||
      typeof delivery.deliveryLongitude !== "number"
    ) {
      setRouteMeta(null);
      const source = map?.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      source?.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      });
      return;
    }

    const nowMs = Date.now();
    if (nowMs - lastRouteRequestAt.current < 7000) return;
    lastRouteRequestAt.current = nowMs;

    let stopped = false;
    const coordinates =
      `${delivery.longitude},${delivery.latitude};${delivery.deliveryLongitude},${delivery.deliveryLatitude}`;

    fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?alternatives=false&geometries=geojson&overview=full&steps=false&access_token=${encodeURIComponent(mapboxToken)}`,
      { cache: "no-store" }
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const route = payload?.routes?.[0];
        if (!route || stopped) return;

        setRouteMeta({
          duration: Number(route.duration) || 0,
          distance: Number(route.distance) || 0,
        });

        const applyRoute = () => {
          const source = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
          source?.setData({
            type: "Feature",
            properties: {},
            geometry: route.geometry,
          });
        };

        if (map.isStyleLoaded()) applyRoute();
        else map.once("load", applyRoute);
      })
      .catch(() => {
        if (!stopped) setRouteMeta(null);
      });

    return () => {
      stopped = true;
    };
  }, [
    delivery?.id,
    delivery?.lastLocationAt,
    delivery?.latitude,
    delivery?.longitude,
    delivery?.deliveryLatitude,
    delivery?.deliveryLongitude,
    mapboxToken,
  ]);

  useEffect(() => {
    followingRef.current = true;
    setIsFollowing(true);
    setRouteMeta(null);
    lastRouteRequestAt.current = 0;

    const map = mapRef.current;
    if (
      map &&
      delivery &&
      typeof delivery.latitude === "number" &&
      typeof delivery.longitude === "number"
    ) {
      if (
        typeof delivery.deliveryLatitude === "number" &&
        typeof delivery.deliveryLongitude === "number"
      ) {
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([delivery.longitude, delivery.latitude]);
        bounds.extend([delivery.deliveryLongitude, delivery.deliveryLatitude]);
        map.fitBounds(bounds, {
          padding: 70,
          maxZoom: 15.5,
          duration: 700,
        });
      } else {
        map.easeTo({
          center: [delivery.longitude, delivery.latitude],
          zoom: Math.max(map.getZoom(), 15.5),
          duration: 650,
        });
      }
    }
  }, [delivery?.id]);

  const locationAgeSeconds = delivery?.lastLocationAt
    ? Math.max(0, (now - new Date(delivery.lastLocationAt).getTime()) / 1000)
    : null;

  const liveState =
    !delivery || !delivery.lastLocationAt
      ? "offline"
      : locationAgeSeconds !== null && locationAgeSeconds <= 30
        ? "live"
        : locationAgeSeconds !== null && locationAgeSeconds <= 120
          ? "stale"
          : "offline";

  const hasDeliveryCoordinates =
    typeof delivery?.latitude === "number" &&
    typeof delivery?.longitude === "number";
  const hasRestaurantCoordinates =
    typeof restaurantLatitude === "number" &&
    typeof restaurantLongitude === "number";
  const hasCoordinates = hasDeliveryCoordinates || hasRestaurantCoordinates;

  const statusLabel =
    liveState === "live" ? "LIVE" : liveState === "stale" ? "STALE" : "OFFLINE";
  const StatusIcon =
    liveState === "live" ? Radio : liveState === "stale" ? SignalLow : WifiOff;

  function recenterRider() {
    const map = mapRef.current;
    if (
      !map ||
      !delivery ||
      typeof delivery.latitude !== "number" ||
      typeof delivery.longitude !== "number"
    ) {
      return;
    }

    followingRef.current = true;
    setIsFollowing(true);
    map.easeTo({
      center: [delivery.longitude, delivery.latitude],
      zoom: Math.max(map.getZoom(), 15.5),
      duration: 900,
    });
  }

  function switchRider(direction: -1 | 1) {
    if (deliveries.length < 2) return;
    setSelectedIndex(
      (current) => (current + direction + deliveries.length) % deliveries.length
    );
  }

  return (
    <section className="relative aspect-[1069/535] overflow-hidden rounded-[12px] bg-[#F2F2F2]">
      {mapboxToken ? (
        <div ref={mapContainerRef} className="absolute inset-0" />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[#F5F5F5] px-8 text-center">
          <div>
            <MapPin className="mx-auto h-6 w-6 text-black/45" strokeWidth={2} />
            <p className="mt-3 text-[11px] font-semibold text-black">
              Mapbox needs its public access token
            </p>
            <p className="mt-1 text-[9px] leading-[1.5] text-black/45">
              Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to this deployment.
            </p>
          </div>
        </div>
      )}

      <span className="absolute left-6 top-6 z-10 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-black shadow-sm">
        <StatusIcon className="h-3.5 w-3.5" strokeWidth={2.3} />
        {statusLabel}
      </span>

      {deliveries.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => switchRider(-1)}
            aria-label="Previous active rider"
            className="absolute left-4 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white text-black shadow-lg transition active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={() => switchRider(1)}
            aria-label="Next active rider"
            className="absolute right-4 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white text-black shadow-lg transition active:scale-95"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </>
      ) : null}

      {hasDeliveryCoordinates && mapboxToken ? (
        <button
          type="button"
          onClick={recenterRider}
          className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[10px] font-semibold text-black shadow-[0_5px_18px_rgba(0,0,0,0.12)] transition hover:bg-[#F6F6F6]"
        >
          <Crosshair className="h-3.5 w-3.5" strokeWidth={2.3} />
          {isFollowing ? "Following rider" : "Recenter rider"}
        </button>
      ) : null}

      {routeMeta ? (
        <div className="absolute right-4 top-[54px] z-10 inline-flex items-center gap-2 rounded-[9px] bg-black px-3 py-2 text-white shadow-lg">
          <Navigation className="h-3.5 w-3.5" strokeWidth={2.3} />
          <span className="text-[10px] font-semibold">
            {routeMeta.duration < 60
              ? "<1 min"
              : `${Math.max(1, Math.round(routeMeta.duration / 60))} min`}
          </span>
          <span className="text-[9px] text-white/55">
            {routeMeta.distance < 1000
              ? `${Math.max(1, Math.round(routeMeta.distance))} m`
              : `${(routeMeta.distance / 1000).toFixed(1)} km`}
          </span>
        </div>
      ) : null}

      <div className="absolute bottom-6 left-6 z-10 flex max-w-[380px] items-center gap-3 rounded-[8px] bg-black px-4 py-3 text-white shadow-lg">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] border border-white/15">
          <MapPin className="h-4 w-4" strokeWidth={2.3} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold">
            {delivery
              ? `${delivery.riderName} · #${delivery.orderNumber}`
              : restaurantAddress || "Restaurant location"}
          </p>
          <p className="mt-1 truncate text-[9px] font-medium text-[#B0B0B0]">
            {delivery
              ? routeMeta
                ? `${relativeAge(delivery.lastLocationAt, now)} · ${routeMeta.distance < 1000 ? `${Math.round(routeMeta.distance)}m` : `${(routeMeta.distance / 1000).toFixed(1)}km`} remaining`
                : `${relativeAge(delivery.lastLocationAt, now)} · ${delivery.status.replaceAll("_", " ").toLowerCase()}`
              : hasCoordinates
                ? "No active rider delivery right now"
                : "Add coordinates to enable the map"}
          </p>
        </div>
        {deliveries.length > 1 && delivery ? (
          <span className="shrink-0 rounded-full border border-white/15 px-2 py-1 text-[8px] font-semibold text-white/70">
            {selectedIndex + 1}/{deliveries.length}
          </span>
        ) : null}
      </div>
    </section>
  );
}
