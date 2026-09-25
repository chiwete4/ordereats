"use client";

import { ChevronLeft, ChevronRight, Crosshair, MapPin, Radio, SignalLow, WifiOff } from "lucide-react";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";

export type CustomerLiveDelivery = {
  id: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  lastLocationAt: string | null;
  riderName: string;
  riderPhone: string | null;
  orderNumber: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
};

export type CustomerTrackingOrder = {
  restaurantOrderId: string;
  delivery: CustomerLiveDelivery | null;
};

function createMarker() {
  const el = document.createElement("div");
  el.style.width = "34px";
  el.style.height = "34px";
  el.style.borderRadius = "9999px";
  el.style.background = "#000";
  el.style.border = "4px solid #fff";
  el.style.boxShadow = "0 5px 18px rgba(0,0,0,.28)";
  const dot = document.createElement("div");
  dot.style.width = "10px";
  dot.style.height = "10px";
  dot.style.borderRadius = "9999px";
  dot.style.background = "#fff";
  dot.style.margin = "8px";
  el.appendChild(dot);
  return el;
}

function createCustomerMarker() {
  const el = document.createElement("div");
  el.setAttribute("aria-label", "Your location");
  el.style.width = "26px";
  el.style.height = "26px";
  el.style.borderRadius = "9999px";
  el.style.background = "#fff";
  el.style.border = "3px solid #000";
  el.style.boxShadow = "0 4px 14px rgba(0,0,0,.2)";
  const dot = document.createElement("div");
  dot.style.width = "8px";
  dot.style.height = "8px";
  dot.style.borderRadius = "9999px";
  dot.style.background = "#000";
  dot.style.margin = "6px";
  el.appendChild(dot);
  return el;
}

export function CustomerLiveMap({
  trackingOrders,
  fallbackLatitude,
  fallbackLongitude,
  fallbackLabel,
  onCustomerLocation,
}: {
  trackingOrders: CustomerTrackingOrder[];
  fallbackLatitude: number | null;
  fallbackLongitude: number | null;
  fallbackLabel: string;
  onCustomerLocation?: (location: { latitude: number; longitude: number }) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedTrackingOrder = trackingOrders[selectedIndex] ?? null;
  const restaurantOrderId = selectedTrackingOrder?.restaurantOrderId ?? null;
  const [delivery, setDelivery] = useState<CustomerLiveDelivery | null>(
    selectedTrackingOrder?.delivery ?? null
  );
  const [now, setNow] = useState(Date.now());
  const [following, setFollowing] = useState(true);
  const [customerLocation, setCustomerLocation] = useState<[number, number] | null>(null);
  const [customerLocationError, setCustomerLocationError] = useState<string | null>(null);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const customerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const followingRef = useRef(true);
  const routeSourceReadyRef = useRef(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() || "";

  useEffect(() => {
    setDelivery(selectedTrackingOrder?.delivery ?? null);
    followingRef.current = true;
    setFollowing(true);
  }, [selectedTrackingOrder?.restaurantOrderId, selectedTrackingOrder?.delivery]);

  useEffect(() => {
    let stopped = false;
    if (!restaurantOrderId) {
      setDelivery(null);
      return;
    }
    const activeRestaurantOrderId = restaurantOrderId;

    async function refresh() {
      try {
        const response = await fetch(
          `/api/customer/dashboard/live?restaurantOrderId=${encodeURIComponent(activeRestaurantOrderId)}`,
          { cache: "no-store" }
        );
        if (!response.ok) return;
        const payload = await response.json();
        if (!stopped) setDelivery(payload.delivery ?? null);
      } catch {}
    }

    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [restaurantOrderId]);


  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        setCustomerLocation(nextLocation);
        onCustomerLocation?.({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setCustomerLocationError(null);
      },
      (error) => {
        setCustomerLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Allow location access to see yourself on the map."
            : "Your location is temporarily unavailable."
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (selectedIndex < trackingOrders.length) return;
    setSelectedIndex(Math.max(0, trackingOrders.length - 1));
  }, [selectedIndex, trackingOrders.length]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!token || !mapEl.current || mapRef.current) return;
    const center: [number, number] =
      typeof delivery?.longitude === "number" && typeof delivery?.latitude === "number"
        ? [delivery.longitude, delivery.latitude]
        : typeof fallbackLongitude === "number" && typeof fallbackLatitude === "number"
          ? [fallbackLongitude, fallbackLatitude]
          : [7.3986, 9.0765];

    const map = new mapboxgl.Map({
      accessToken: token,
      container: mapEl.current,
      style: "mapbox://styles/mapbox/standard",
      center,
      zoom: 14.5,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      if (!map.getSource("customer-rider-route")) {
        map.addSource("customer-rider-route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: [] },
          },
        });

        map.addLayer({
          id: "customer-rider-route-casing",
          type: "line",
          source: "customer-rider-route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#ffffff",
            "line-width": 8,
            "line-opacity": 0.95,
          },
        });

        map.addLayer({
          id: "customer-rider-route-line",
          type: "line",
          source: "customer-rider-route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#111111",
            "line-width": 4,
            "line-opacity": 0.9,
          },
        });

        routeSourceReadyRef.current = true;
      }
    });

    const stopFollowing = () => {
      followingRef.current = false;
      setFollowing(false);
    };
    map.on("dragstart", stopFollowing);
    map.on("zoomstart", stopFollowing);
    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      customerMarkerRef.current?.remove();
      customerMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof delivery?.latitude !== "number" || typeof delivery?.longitude !== "number") return;
    const point: [number, number] = [delivery.longitude, delivery.latitude];

    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ element: createMarker(), anchor: "center" })
        .setLngLat(point)
        .addTo(map);
    } else {
      markerRef.current.setLngLat(point);
    }

    if (followingRef.current) map.panTo(point, { duration: 900 });
  }, [delivery?.lastLocationAt, delivery?.latitude, delivery?.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      !token ||
      typeof delivery?.latitude !== "number" ||
      typeof delivery?.longitude !== "number" ||
      typeof delivery?.deliveryLatitude !== "number" ||
      typeof delivery?.deliveryLongitude !== "number"
    ) {
      const source = map?.getSource("customer-rider-route") as mapboxgl.GeoJSONSource | undefined;
      source?.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      });
      return;
    }

    let stopped = false;
    const coordinates =
      `${delivery.longitude},${delivery.latitude};${delivery.deliveryLongitude},${delivery.deliveryLatitude}`;

    fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?alternatives=false&geometries=geojson&overview=full&steps=false&access_token=${encodeURIComponent(token)}`,
      { cache: "no-store" }
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const route = payload?.routes?.[0];
        if (!route || stopped) return;

        const applyRoute = () => {
          const source = map.getSource("customer-rider-route") as mapboxgl.GeoJSONSource | undefined;
          source?.setData({
            type: "Feature",
            properties: {},
            geometry: route.geometry,
          });
        };

        if (map.isStyleLoaded()) applyRoute();
        else map.once("load", applyRoute);

        if (followingRef.current) {
          const bounds = new mapboxgl.LngLatBounds();
          bounds.extend([delivery.longitude as number, delivery.latitude as number]);
          bounds.extend([delivery.deliveryLongitude as number, delivery.deliveryLatitude as number]);
          map.fitBounds(bounds, {
            padding: 70,
            maxZoom: 15.5,
            duration: 700,
          });
        }
      })
      .catch(() => {});

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
    token,
  ]);


  useEffect(() => {
    const map = mapRef.current;
    if (!map || !customerLocation) return;

    if (!customerMarkerRef.current) {
      customerMarkerRef.current = new mapboxgl.Marker({
        element: createCustomerMarker(),
        anchor: "center",
      })
        .setLngLat(customerLocation)
        .addTo(map);
    } else {
      customerMarkerRef.current.setLngLat(customerLocation);
    }

    const hasRiderPoint =
      typeof delivery?.latitude === "number" &&
      typeof delivery?.longitude === "number";

    if (followingRef.current && !hasRiderPoint) {
      map.panTo(customerLocation, { duration: 700 });
    }
  }, [customerLocation, delivery?.latitude, delivery?.longitude]);

  const age = delivery?.lastLocationAt
    ? Math.max(0, (now - new Date(delivery.lastLocationAt).getTime()) / 1000)
    : null;
  const liveState =
    age === null ? "offline" : age <= 30 ? "live" : age <= 120 ? "stale" : "offline";
  const label = delivery
    ? liveState === "live"
      ? "LIVE"
      : liveState === "stale"
        ? "STALE"
        : "OFFLINE"
    : customerLocation
      ? "YOU"
      : "LOCATING";
  const Icon = delivery
    ? liveState === "live"
      ? Radio
      : liveState === "stale"
        ? SignalLow
        : WifiOff
    : MapPin;

  function switchTracking(direction: -1 | 1) {
    if (trackingOrders.length < 2) return;
    setSelectedIndex((current) => {
      const next = (current + direction + trackingOrders.length) % trackingOrders.length;
      return next;
    });
  }

  function recenter() {
    if (!mapRef.current) return;

    const point: [number, number] | null =
      typeof delivery?.latitude === "number" && typeof delivery?.longitude === "number"
        ? [delivery.longitude, delivery.latitude]
        : customerLocation;

    if (!point) return;

    followingRef.current = true;
    setFollowing(true);
    mapRef.current.easeTo({
      center: point,
      zoom: Math.max(mapRef.current.getZoom(), 15),
      duration: 800,
    });
  }

  return (
    <section className="relative aspect-[16/7.8] min-h-[260px] overflow-hidden rounded-[12px] bg-[#111827]">
      {token ? (
        <div ref={mapEl} className="absolute inset-0" />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[#111827] text-white/70">
          Map unavailable
        </div>
      )}

      <span className="absolute left-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-black shadow-sm">
        <Icon className="h-3.5 w-3.5" strokeWidth={2.3} />
        {label}
      </span>

      {trackingOrders.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => switchTracking(-1)}
            aria-label="Previous active delivery"
            className="absolute left-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white text-black shadow-lg transition active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={() => switchTracking(1)}
            aria-label="Next active delivery"
            className="absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white text-black shadow-lg transition active:scale-95"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </>
      ) : null}

      {(delivery && typeof delivery.latitude === "number") || customerLocation ? (
        <button
          type="button"
          onClick={recenter}
          className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[10px] font-semibold text-black shadow-lg"
        >
          <Crosshair className="h-3.5 w-3.5" strokeWidth={2.3} />
          {delivery
            ? following
              ? "Following rider"
              : "Recenter rider"
            : following
              ? "Following you"
              : "Recenter"}
        </button>
      ) : null}

      <div className="absolute bottom-5 left-5 z-10 flex max-w-[360px] items-center gap-3 rounded-[8px] bg-black px-4 py-3 text-white shadow-lg">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] border border-white/15">
          <MapPin className="h-4 w-4" strokeWidth={2.3} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold">
            {delivery
              ? `${delivery.riderName} · #${delivery.orderNumber}`
              : customerLocation
                ? "Your live location"
                : fallbackLabel}
          </p>
          <p className="mt-1 truncate text-[9px] text-white/55">
            {delivery?.lastLocationAt
              ? `Rider updated ${Math.max(0, Math.floor(age ?? 0))}s ago`
              : delivery
                ? customerLocation
                  ? "Rider location unavailable · showing your location"
                  : customerLocationError || "Waiting for your location…"
                : customerLocation
                  ? "Your location is updating on this device."
                  : customerLocationError || "Waiting for your location…"}
          </p>
        </div>
        {trackingOrders.length > 1 && delivery ? (
          <span className="shrink-0 rounded-full border border-white/15 px-2 py-1 text-[8px] font-semibold text-white/70">
            {selectedIndex + 1}/{trackingOrders.length}
          </span>
        ) : null}
      </div>
    </section>
  );
}
