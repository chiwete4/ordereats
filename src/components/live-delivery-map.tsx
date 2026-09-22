"use client";

import { Crosshair, MapPin, Radio, SignalLow, WifiOff } from "lucide-react";
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

export function LiveDeliveryMap({
  restaurantId,
  restaurantAddress,
  restaurantLatitude,
  restaurantLongitude,
  initialDelivery,
}: {
  restaurantId: string;
  restaurantAddress: string | null;
  restaurantLatitude: number | null;
  restaurantLongitude: number | null;
  initialDelivery: LiveDeliveryState | null;
}) {
  const [delivery, setDelivery] = useState<LiveDeliveryState | null>(initialDelivery);
  const [now, setNow] = useState(Date.now());
  const [isFollowing, setIsFollowing] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const riderMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const routeCoordinatesRef = useRef<[number, number][]>([]);
  const currentDeliveryRef = useRef<LiveDeliveryState | null>(initialDelivery);
  const followingRef = useRef(true);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() || "";

  useEffect(() => {
    currentDeliveryRef.current = delivery;
  }, [delivery]);

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
        if (!stopped) setDelivery(payload.delivery ?? null);
      } catch {
        // Keep the last known location visible if a poll fails.
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

    const initialLng =
      typeof initialDelivery?.longitude === "number"
        ? initialDelivery.longitude
        : typeof restaurantLongitude === "number"
          ? restaurantLongitude
          : 7.3986;
    const initialLat =
      typeof initialDelivery?.latitude === "number"
        ? initialDelivery.latitude
        : typeof restaurantLatitude === "number"
          ? restaurantLatitude
          : 9.0765;

    const map = new mapboxgl.Map({
      accessToken: mapboxToken,
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center: [initialLng, initialLat],
      zoom: 14.5,
      attributionControl: false,
    });

    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );

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
          geometry: {
            type: "LineString",
            coordinates: [],
          },
        },
      });

      map.addLayer({
        id: ROUTE_CASING_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#ffffff",
          "line-width": 8,
          "line-opacity": 0.9,
        },
      });

      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#111111",
          "line-width": 4,
          "line-opacity": 0.82,
        },
      });
    });

    mapRef.current = map;

    return () => {
      canvas.removeEventListener("pointerdown", stopFollowing);
      canvas.removeEventListener("wheel", stopFollowing);
      riderMarkerRef.current?.remove();
      riderMarkerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, [
    initialDelivery?.latitude,
    initialDelivery?.longitude,
    mapboxToken,
    restaurantLatitude,
    restaurantLongitude,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      !delivery ||
      typeof delivery.latitude !== "number" ||
      typeof delivery.longitude !== "number"
    ) {
      return;
    }

    const coordinate: [number, number] = [
      delivery.longitude,
      delivery.latitude,
    ];

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

    const previous = routeCoordinatesRef.current.at(-1);
    if (
      !previous ||
      Math.abs(previous[0] - coordinate[0]) > 0.000001 ||
      Math.abs(previous[1] - coordinate[1]) > 0.000001
    ) {
      routeCoordinatesRef.current.push(coordinate);
      if (routeCoordinatesRef.current.length > 120) {
        routeCoordinatesRef.current.shift();
      }
    }

    const updateRoute = () => {
      const source = map.getSource(ROUTE_SOURCE_ID) as
        | mapboxgl.GeoJSONSource
        | undefined;
      source?.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: routeCoordinatesRef.current,
        },
      });
    };

    if (map.isStyleLoaded()) {
      updateRoute();
    } else {
      map.once("load", updateRoute);
    }

    if (followingRef.current) {
      map.panTo(coordinate, { duration: 900 });
    }
  }, [
    delivery?.id,
    delivery?.lastLocationAt,
    delivery?.latitude,
    delivery?.longitude,
  ]);

  useEffect(() => {
    routeCoordinatesRef.current = [];
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

      <div className="absolute bottom-6 left-6 z-10 flex max-w-[380px] items-center gap-3 rounded-[8px] bg-black px-4 py-3 text-white shadow-lg">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] border border-white/15">
          <MapPin className="h-4 w-4" strokeWidth={2.3} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold">
            {delivery
              ? `${delivery.riderName} · #${delivery.orderNumber}`
              : restaurantAddress || "Restaurant location"}
          </p>
          <p className="mt-1 truncate text-[9px] font-medium text-[#B0B0B0]">
            {delivery
              ? `${relativeAge(delivery.lastLocationAt, now)} · ${delivery.status.replaceAll("_", " ").toLowerCase()}`
              : hasCoordinates
                ? "No active rider delivery right now"
                : "Add coordinates to enable the map"}
          </p>
        </div>
      </div>
    </section>
  );
}
