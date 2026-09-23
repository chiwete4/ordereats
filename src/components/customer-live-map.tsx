"use client";

import { Crosshair, MapPin, Radio, SignalLow, WifiOff } from "lucide-react";
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

export function CustomerLiveMap({
  restaurantOrderId,
  initialDelivery,
  fallbackLatitude,
  fallbackLongitude,
  fallbackLabel,
}: {
  restaurantOrderId: string | null;
  initialDelivery: CustomerLiveDelivery | null;
  fallbackLatitude: number | null;
  fallbackLongitude: number | null;
  fallbackLabel: string;
}) {
  const [delivery, setDelivery] = useState(initialDelivery);
  const [now, setNow] = useState(Date.now());
  const [following, setFollowing] = useState(true);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const followingRef = useRef(true);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() || "";

  useEffect(() => {
    let stopped = false;
    if (!restaurantOrderId) return;

    async function refresh() {
      try {
        const response = await fetch(
          `/api/customer/dashboard/live?restaurantOrderId=${encodeURIComponent(restaurantOrderId)}`,
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

  const age = delivery?.lastLocationAt
    ? Math.max(0, (now - new Date(delivery.lastLocationAt).getTime()) / 1000)
    : null;
  const liveState =
    age === null ? "offline" : age <= 30 ? "live" : age <= 120 ? "stale" : "offline";
  const label = liveState === "live" ? "LIVE" : liveState === "stale" ? "STALE" : "OFFLINE";
  const Icon = liveState === "live" ? Radio : liveState === "stale" ? SignalLow : WifiOff;

  function recenter() {
    if (!mapRef.current || typeof delivery?.latitude !== "number" || typeof delivery?.longitude !== "number") return;
    followingRef.current = true;
    setFollowing(true);
    mapRef.current.easeTo({
      center: [delivery.longitude, delivery.latitude],
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

      {delivery && typeof delivery.latitude === "number" ? (
        <button
          type="button"
          onClick={recenter}
          className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[10px] font-semibold text-black shadow-lg"
        >
          <Crosshair className="h-3.5 w-3.5" strokeWidth={2.3} />
          {following ? "Following rider" : "Recenter rider"}
        </button>
      ) : null}

      <div className="absolute bottom-5 left-5 z-10 flex max-w-[360px] items-center gap-3 rounded-[8px] bg-black px-4 py-3 text-white shadow-lg">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] border border-white/15">
          <MapPin className="h-4 w-4" strokeWidth={2.3} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold">
            {delivery ? `${delivery.riderName} · #${delivery.orderNumber}` : fallbackLabel}
          </p>
          <p className="mt-1 truncate text-[9px] text-white/55">
            {delivery?.lastLocationAt
              ? `Updated ${Math.max(0, Math.floor(age ?? 0))}s ago`
              : "No live rider location right now"}
          </p>
        </div>
      </div>
    </section>
  );
}
