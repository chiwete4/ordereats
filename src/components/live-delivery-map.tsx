"use client";

import { MapPin, Radio, SignalLow, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type LiveDeliveryState = {
  id: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  lastLocationAt: string | null;
  riderName: string;
  orderNumber: string;
};

function relativeAge(iso: string | null, now: number) {
  if (!iso) return "No location yet";
  const delta = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (delta < 60) return `Updated ${delta}s ago`;
  const minutes = Math.floor(delta / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `Updated ${hours}h ago`;
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

  const lat =
    typeof delivery?.latitude === "number"
      ? delivery.latitude
      : restaurantLatitude;
  const lng =
    typeof delivery?.longitude === "number"
      ? delivery.longitude
      : restaurantLongitude;
  const hasCoordinates = typeof lat === "number" && typeof lng === "number";

  const mapUrl = useMemo(() => {
    if (!hasCoordinates || typeof lat !== "number" || typeof lng !== "number") {
      return null;
    }
    const delta = 0.025;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`;
  }, [hasCoordinates, lat, lng]);

  const statusLabel =
    liveState === "live" ? "LIVE" : liveState === "stale" ? "STALE" : "OFFLINE";
  const StatusIcon =
    liveState === "live" ? Radio : liveState === "stale" ? SignalLow : WifiOff;

  return (
    <section className="relative aspect-[1069/535] overflow-hidden rounded-[12px] bg-[#102D3A]">
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
        <StatusIcon className="h-3.5 w-3.5" strokeWidth={2.3} />
        {statusLabel}
      </span>

      <div className="absolute bottom-6 left-6 flex max-w-[380px] items-center gap-3 rounded-[8px] bg-black px-4 py-3 text-white">
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
